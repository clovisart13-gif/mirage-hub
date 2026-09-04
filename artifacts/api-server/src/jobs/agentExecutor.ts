/**
 * agentExecutor.ts — Executor autônomo de handoffs
 *
 * Faz polling na tabela agent_handoffs a cada 30s.
 * Quando encontra uma tarefa `pending`, reivindica e executa via OpenAI
 * function-calling com acesso a ferramentas reais (ler/escrever arquivos,
 * rodar comandos, HTTP).
 *
 * Ao concluir (done ou failed), envia notificação WhatsApp via Z-API.
 */

import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { eq, inArray } from "drizzle-orm";
import { db, agentHandoffs } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "../lib/logger";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";

const execAsync = promisify(exec);

// ── Configuração ──────────────────────────────────────────────────────────────

// process.cwd() = artifacts/api-server/ quando o servidor roda via pnpm
// Sobe 2 níveis: api-server → artifacts → workspace root
// (funciona tanto em dev quanto após o build em dist/)
const WORKSPACE_ROOT   = path.resolve(process.cwd(), "../../");
// ⚠️ Credenciais do canal administrativo da Mirage — nunca usar instância de tenant.
// Configurar ZAPI_INSTANCE_ADMIN / ZAPI_TOKEN_ADMIN / ZAPI_CLIENT_TOKEN_ADMIN nos secrets.
// Se não configurados, alertas são emitidos apenas no log (sem WhatsApp).
const ZAPI_INSTANCE_ID = process.env["ZAPI_INSTANCE_ADMIN"] ?? "";
const ZAPI_TOKEN       = process.env["ZAPI_TOKEN_ADMIN"]    ?? "";
const ADMIN_PHONE      = process.env["ALERT_PHONE_ADMIN"] ?? "5511969243563";
const EXECUTOR_MODEL   = process.env["AGENT_EXECUTOR_MODEL"] ?? "gpt-5";
const MAX_ITERATIONS   = 30;    // max turnos por tarefa
const POLL_INTERVAL_MS = 30_000;
const MAX_FILE_CHARS   = 60_000; // evita overflow de contexto
const MAX_PARALLEL     = 2;      // máx tarefas simultâneas

/** IDs de handoffs atualmente em execução — evita duplo claim */
const inFlight = new Set<string>();

// ── Definição das ferramentas ─────────────────────────────────────────────────

const TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "read_file",
      description:
        "Lê o conteúdo de um arquivo do projeto. " +
        "Use caminhos relativos à raiz do workspace (ex: artifacts/hub/src/App.tsx).",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Caminho relativo à raiz do workspace" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description:
        "Cria ou substitui completamente um arquivo. " +
        "Cria diretórios intermediários automaticamente.",
      parameters: {
        type: "object",
        properties: {
          path:    { type: "string", description: "Caminho relativo à raiz do workspace" },
          content: { type: "string", description: "Conteúdo completo do arquivo" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_directory",
      description: "Lista arquivos e pastas em um diretório do projeto.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Caminho relativo à raiz do workspace (ex: artifacts/hub/src)",
          },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_code",
      description:
        "Busca texto ou padrão regex nos arquivos do projeto via grep. " +
        "Retorna as linhas correspondentes com número de linha.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Texto ou regex a buscar",
          },
          directory: {
            type: "string",
            description:
              "Diretório onde buscar (relativo à raiz). Padrão: raiz do workspace.",
          },
          file_glob: {
            type: "string",
            description: "Padrão de extensão (ex: '*.ts', '*.tsx'). Opcional.",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_command",
      description:
        "Executa um comando shell no workspace. " +
        "Use para instalar pacotes, compilar TypeScript, rodar builds, etc. " +
        "Timeout: 120s. Comandos destrutivos (rm -rf, DROP TABLE, etc.) são bloqueados.",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description:
              "Comando a executar (ex: 'pnpm --filter @workspace/hub add lodash')",
          },
          cwd: {
            type: "string",
            description:
              "Diretório de trabalho relativo à raiz. Padrão: raiz do workspace.",
          },
        },
        required: ["command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "http_request",
      description:
        "Faz uma requisição HTTP para APIs externas (n8n, Z-API, Supabase REST, etc.).",
      parameters: {
        type: "object",
        properties: {
          method:  { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"] },
          url:     { type: "string", description: "URL completa" },
          headers: {
            type: "object",
            description: "Headers adicionais (chave/valor). Opcional.",
            additionalProperties: { type: "string" },
          },
          body: {
            type: "object",
            description: "Body JSON. Opcional.",
          },
        },
        required: ["method", "url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "complete_task",
      description:
        "Sinaliza que a tarefa foi concluída com sucesso. " +
        "Chame isso quando TODOS os objetivos listados na instrução forem alcançados. " +
        "O resumo será salvo no painel e enviado por WhatsApp.",
      parameters: {
        type: "object",
        properties: {
          summary: {
            type: "string",
            description:
              "Resumo detalhado do que foi feito: arquivos criados/editados, " +
              "comandos rodados, resultados obtidos.",
          },
        },
        required: ["summary"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "restart_server",
      description:
        "Reinicia o servidor API para aplicar correções de código. " +
        "Use SOMENTE após corrigir um bug em código TypeScript e confirmar que o arquivo foi salvo. " +
        "O processo sai graciosamente e o Replit o reinicia automaticamente com o código novo. " +
        "Chame complete_task ANTES de restart_server para registrar o que foi feito.",
      parameters: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            description: "Motivo do restart (ex: 'Corrigi o bug em n8nHealthMonitor.ts linha 42')",
          },
        },
        required: ["reason"],
      },
    },
  },
];

// ── Implementações das ferramentas ────────────────────────────────────────────

function assertInsideWorkspace(absPath: string): void {
  // path.resolve pode normalizar ".." - garantimos que está dentro do workspace
  const rel = path.relative(WORKSPACE_ROOT, absPath);
  if (rel.startsWith("..")) {
    throw new Error(`Acesso fora do workspace negado: ${absPath}`);
  }
}

async function toolReadFile(relPath: string): Promise<string> {
  const abs = path.resolve(WORKSPACE_ROOT, relPath);
  assertInsideWorkspace(abs);
  const content = await fs.readFile(abs, "utf-8");
  if (content.length > MAX_FILE_CHARS) {
    return (
      content.slice(0, MAX_FILE_CHARS) +
      `\n\n[... TRUNCADO — mais ${content.length - MAX_FILE_CHARS} chars omitidos ...]`
    );
  }
  return content;
}

async function toolWriteFile(relPath: string, content: string): Promise<string> {
  const abs = path.resolve(WORKSPACE_ROOT, relPath);
  assertInsideWorkspace(abs);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, content, "utf-8");
  return `✅ Arquivo salvo: ${relPath} (${content.length} chars)`;
}

async function toolListDirectory(relPath: string): Promise<string> {
  const abs = path.resolve(WORKSPACE_ROOT, relPath);
  assertInsideWorkspace(abs);
  const entries = await fs.readdir(abs, { withFileTypes: true });
  return entries
    .map(e => (e.isDirectory() ? `📁 ${e.name}/` : `📄 ${e.name}`))
    .join("\n");
}

async function toolSearchCode(
  query: string,
  directory?: string,
  fileGlob?: string
): Promise<string> {
  const dir = directory
    ? path.resolve(WORKSPACE_ROOT, directory)
    : WORKSPACE_ROOT;
  assertInsideWorkspace(dir);

  const globArgs = fileGlob
    ? `--include="${fileGlob}"`
    : `--include="*.ts" --include="*.tsx" --include="*.js" --include="*.json"`;

  const safeQuery = query.replace(/"/g, '\\"');
  const cmd = `grep -r ${globArgs} -n --max-count=4 "${safeQuery}" "${dir}" 2>/dev/null | head -50`;

  const { stdout } = await execAsync(cmd, { timeout: 15_000 }).catch(() => ({ stdout: "" }));
  return stdout.trim() || "Nenhum resultado encontrado.";
}

const BLOCKED_PATTERNS: RegExp[] = [
  /rm\s+-rf\s+\//i,               // rm -rf /
  /rm\s+-rf\s+\*/i,               // rm -rf *
  /DROP\s+TABLE/i,                 // SQL DROP
  /TRUNCATE\s+TABLE/i,             // SQL TRUNCATE
  /DELETE\s+FROM\s+\w+\s*;?\s*$/i, // DELETE sem WHERE
  />\s*\/dev\/(sda|hda|nvme)/i,    // escrita em dispositivo
];

async function toolRunCommand(command: string, cwd?: string): Promise<string> {
  for (const pat of BLOCKED_PATTERNS) {
    if (pat.test(command)) {
      return `🚫 Comando bloqueado por segurança: "${command}"`;
    }
  }

  const workDir = cwd
    ? path.resolve(WORKSPACE_ROOT, cwd)
    : WORKSPACE_ROOT;
  assertInsideWorkspace(workDir);

  const { stdout, stderr } = await execAsync(command, {
    cwd: workDir,
    timeout: 120_000,
    env: { ...process.env, CI: "true" },
  }).catch((err: any) => ({
    stdout: "",
    stderr: err?.stderr ?? err?.message ?? "Erro desconhecido",
  }));

  const out = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");
  return (out || "(sem output)").slice(0, 8_000);
}

async function toolHttpRequest(
  method: string,
  url: string,
  headers?: Record<string, string>,
  body?: unknown
): Promise<string> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", ...(headers ?? {}) },
    body: body != null ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text().catch(() => "");
  return `HTTP ${res.status} ${res.statusText}: ${text.slice(0, 4_000)}`;
}

// ── Notificação admin (Z-API → Resend → log) ─────────────────────────────────

async function notifyWhatsApp(message: string): Promise<void> {
  const { sendAdminAlert } = await import("../lib/adminAlert");
  await sendAdminAlert("AgentExecutor", message);
}

// ── Loop de execução ──────────────────────────────────────────────────────────

async function executeHandoff(handoffId: string): Promise<void> {
  // Claim atômico: só atualiza se ainda estiver pending
  const [handoff] = await db
    .update(agentHandoffs)
    .set({ status: "in_progress", claimedAt: new Date(), updatedAt: new Date() })
    .where(
      eq(agentHandoffs.id, handoffId)
    )
    .returning();

  if (!handoff) {
    logger.warn({ handoffId }, "[AgentExecutor] handoff desapareceu antes do claim");
    inFlight.delete(handoffId);
    return;
  }

  logger.info(
    { handoffId, title: handoff.title, priority: handoff.priority },
    "[AgentExecutor] 🚀 iniciando execução"
  );

  const isRepairTask = Array.isArray(handoff.tags) && (handoff.tags as string[]).includes("repair");

  const systemPrompt = `Você é um agente de engenharia autônomo operando no workspace Mirage Hub.

Você tem acesso ao código do projeto via ferramentas. Execute a tarefa com precisão.

WORKSPACE ROOT: ${WORKSPACE_ROOT}

Principais diretórios:
- artifacts/hub/src/          → React frontend (Vite + TypeScript)
- artifacts/api-server/src/   → Backend Express (TypeScript)
- lib/db/src/schema/          → Schema Drizzle ORM (PostgreSQL)
- artifacts/hub/src/pages/    → Páginas do Hub (React)

Padrões do projeto:
- TypeScript estrito em todo o projeto
- ORM: Drizzle (db + schema exports de @workspace/db)
- Auth: sessão Express + Supabase
- Rotas backend: Express Router, auth via requireAuth/requireSuperAdmin

${isRepairTask ? `
╔══════════════════════════════════════════════════════════╗
║  MISSÃO DE REPARO AUTÔNOMO — REGRAS INVIOLÁVEIS          ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  ✅ PERMITIDO:                                           ║
║   • Diagnosticar a causa raiz do erro                    ║
║   • Corrigir o que estava funcionando e quebrou          ║
║   • Chamar APIs n8n para investigar execuções            ║
║   • Editar arquivos para restaurar comportamento prévio  ║
║   • Reativar workflows n8n que foram desativados         ║
║   • Reiniciar o servidor após corrigir código            ║
║                                                          ║
║  ❌ PROIBIDO:                                            ║
║   • Criar nova funcionalidade não existente antes        ║
║   • Refatorar código que não tem relação com o bug       ║
║   • Alterar APIs ou contratos entre serviços             ║
║   • Modificar qualquer coisa além do necessário          ║
║                                                          ║
║  FLUXO OBRIGATÓRIO:                                      ║
║   1. Investigue a causa (leia logs, código, n8n API)     ║
║   2. Identifique o menor fix possível                    ║
║   3. Aplique o fix                                       ║
║   4. Chame complete_task com resumo do que foi feito     ║
║   5. Se foi código: chame restart_server em seguida      ║
║   6. Se foi n8n config: reative o workflow via http      ║
║                                                          ║
║  O dono do sistema (Clóvis) vai receber WhatsApp com     ║
║  o resumo. Seja específico: o que quebrou, por quê,      ║
║  e o que exatamente você corrigiu.                       ║
╚══════════════════════════════════════════════════════════╝

Credenciais n8n disponíveis para investigação:
- Base URL: ${process.env["N8N_BASE_URL"] ?? "https://clovisart13.app.n8n.cloud"}
- API Key: use a env var N8N_API_KEY ou busque em mentor_settings via Supabase
- Endpoints úteis:
  GET  /api/v1/executions?workflowId=<id>&limit=10  → histórico
  GET  /api/v1/executions/<id>                      → detalhe com erro
  POST /api/v1/workflows/<id>/activate              → reativar
  POST /api/v1/workflows/<id>/deactivate            → desativar
` : ""}

Contexto do handoff:
${handoff.context ?? "Nenhum contexto adicional."}

Arquivos relevantes indicados:
${handoff.relevantFiles ? JSON.stringify(handoff.relevantFiles, null, 2) : "Nenhum especificado."}

Critério de aceitação:
${handoff.acceptanceCriteria ?? "Não especificado — use seu julgamento."}

IMPORTANTE: quando a tarefa estiver 100% completa, chame complete_task com um resumo detalhado.`;

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user",   content: handoff.instruction },
  ];

  let iterations   = 0;
  let taskDone     = false;
  let finalSummary = "";

  try {
    while (!taskDone && iterations < MAX_ITERATIONS) {
      iterations++;

      const response = await openai.chat.completions.create({
        model:        EXECUTOR_MODEL,
        messages,
        tools:        TOOLS,
        tool_choice:  "auto",
        temperature:  0.2,
        max_tokens:   4096,
      });

      const choice = response.choices[0];
      if (!choice) break;

      // Adiciona a resposta do assistente ao histórico
      const assistantMsg = choice.message;
      messages.push(assistantMsg as ChatCompletionMessageParam);

      // Parou sem tool calls → resposta final textual
      if (!assistantMsg.tool_calls?.length) {
        finalSummary = assistantMsg.content ?? "Concluído.";
        taskDone = true;
        break;
      }

      // Processa cada tool call
      for (const tc of assistantMsg.tool_calls) {
        const fnName = tc.function.name;
        let result   = "";

        try {
          const args = JSON.parse(tc.function.arguments) as Record<string, any>;
          logger.info({ handoffId, fn: fnName, args }, "[AgentExecutor] tool call");

          switch (fnName) {
            case "read_file":
              result = await toolReadFile(args.path as string);
              break;
            case "write_file":
              result = await toolWriteFile(args.path as string, args.content as string);
              break;
            case "list_directory":
              result = await toolListDirectory(args.path as string);
              break;
            case "search_code":
              result = await toolSearchCode(
                args.query as string,
                args.directory as string | undefined,
                args.file_glob as string | undefined
              );
              break;
            case "run_command":
              result = await toolRunCommand(
                args.command as string,
                args.cwd as string | undefined
              );
              break;
            case "http_request":
              result = await toolHttpRequest(
                args.method as string,
                args.url as string,
                args.headers as Record<string, string> | undefined,
                args.body
              );
              break;
            case "complete_task":
              finalSummary = args.summary as string;
              taskDone     = true;
              result       = "✅ Tarefa sinalizada como concluída.";
              break;
            case "restart_server":
              result = "🔄 Restart agendado em 4s — servidor vai reiniciar com o código corrigido.";
              logger.info({ handoffId, reason: args.reason }, "[AgentExecutor] 🔄 restart_server solicitado");
              setTimeout(() => {
                logger.info("[AgentExecutor] saindo para reinicialização do servidor...");
                process.exit(0);
              }, 4_000);
              break;
            default:
              result = `Ferramenta desconhecida: ${fnName}`;
          }
        } catch (err: any) {
          result = `❌ Erro em ${fnName}: ${err?.message ?? "desconhecido"}`;
          logger.warn({ handoffId, fnName, error: err?.message }, "[AgentExecutor] erro em ferramenta");
        }

        messages.push({
          role:         "tool",
          tool_call_id: tc.id,
          content:      result,
        });
      }
    }

    if (!finalSummary) {
      finalSummary = `Executado em ${iterations} iterações. O agente não chamou complete_task explicitamente.`;
    }

    // ── Marca como done ────────────────────────────────────────────────────────
    await db.update(agentHandoffs).set({
      status:        "done",
      resultSummary: finalSummary,
      completedAt:   new Date(),
      updatedAt:     new Date(),
    }).where(eq(agentHandoffs.id, handoffId));

    logger.info({ handoffId, iterations }, "[AgentExecutor] ✅ concluído");

    await notifyWhatsApp(
      `✅ *Tarefa concluída automaticamente*\n\n` +
      `*${handoff.title}*\n\n` +
      `${finalSummary.slice(0, 700)}\n\n` +
      `_${iterations} iteração(ões) — nenhuma intervenção necessária_ 🤖\n` +
      `_Verifique o Hub antes de publicar em produção._`
    );

  } catch (err: any) {
    const errorMsg = (err?.message ?? "Erro desconhecido").slice(0, 2_000);
    logger.error({ handoffId, error: errorMsg }, "[AgentExecutor] ❌ falhou");

    await db.update(agentHandoffs).set({
      status:       "failed",
      errorMessage: errorMsg,
      completedAt:  new Date(),
      updatedAt:    new Date(),
    }).where(eq(agentHandoffs.id, handoffId));

    await notifyWhatsApp(
      `❌ *Tarefa falhou*\n\n` +
      `*${handoff.title}*\n\n` +
      `Erro: ${errorMsg.slice(0, 500)}\n\n` +
      `_Verifique o painel de handoffs no Hub._`
    );
  } finally {
    inFlight.delete(handoffId);
  }
}

// ── Polling ───────────────────────────────────────────────────────────────────

async function pollAndExecute(): Promise<void> {
  if (inFlight.size >= MAX_PARALLEL) return; // já no limite

  try {
    const slots   = MAX_PARALLEL - inFlight.size;
    const pending = await db
      .select()
      .from(agentHandoffs)
      .where(inArray(agentHandoffs.status, ["pending"]))
      .limit(slots);

    for (const handoff of pending) {
      if (inFlight.has(handoff.id)) continue;
      inFlight.add(handoff.id);
      // fire-and-forget — executeHandoff gerencia próprio ciclo de vida
      executeHandoff(handoff.id).catch(err => {
        logger.error(
          { handoffId: handoff.id, error: err?.message },
          "[AgentExecutor] erro não capturado"
        );
        inFlight.delete(handoff.id);
      });
    }
  } catch (err: any) {
    logger.warn({ error: err?.message }, "[AgentExecutor] erro no poll");
  }
}

// ── Ponto de entrada ──────────────────────────────────────────────────────────

export function startAgentExecutor(): void {
  logger.info(
    {
      workspaceRoot:   WORKSPACE_ROOT,
      model:           EXECUTOR_MODEL,
      pollIntervalMs:  POLL_INTERVAL_MS,
      maxParallel:     MAX_PARALLEL,
      maxIterations:   MAX_ITERATIONS,
    },
    "[AgentExecutor] 🤖 iniciado — aguardando handoffs em agent_handoffs"
  );

  // Aguarda 10s após o boot para dar tempo ao servidor subir completamente
  setTimeout(() => {
    pollAndExecute();
    setInterval(pollAndExecute, POLL_INTERVAL_MS);
  }, 10_000);
}
