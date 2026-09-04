/**
 * ATHOS Bridge — n8n + GitHub + Supabase
 * Lê N8N_BASE_URL e N8N_API_KEY do banco (mentor_settings) ou env vars.
 */

import { db, mentorSettings, referencias, movimentacoes, kanban_fase_config } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { supabaseAdmin } from "../../lib/supabase";
import { INTERNAL_SECRET } from "../../internalSecret";
import {
  assertTenantScope,
  assertWorkflowScope,
  inferWorkflowScope,
  requireWorkflowScope,
  requireWorkflowTenantScope,
  WORKFLOW_SCOPES,
  type WorkflowScope,
} from "../../lib/workflowScope";

export {
  assertTenantScope,
  assertWorkflowScope,
  inferWorkflowScope,
  requireWorkflowScope,
  requireWorkflowTenantScope,
  WORKFLOW_SCOPES,
  type WorkflowScope,
} from "../../lib/workflowScope";

// Lê uma chave da tabela mentor_settings (fallback para env var)
async function getSetting(key: string, envFallback?: string): Promise<string | undefined> {
  try {
    const [row] = await db.select().from(mentorSettings).where(eq(mentorSettings.key, key)).limit(1);
    if (row?.value) return row.value;
  } catch {
    // silently fall back to env
  }
  return envFallback || process.env[key.toUpperCase()] || undefined;
}

async function getN8nConfig(): Promise<{ baseUrl: string; apiKey: string }> {
  const baseUrl = (await getSetting("n8n_base_url", process.env.N8N_BASE_URL))?.replace(/\/$/, "") ?? "";
  const apiKey = (await getSetting("n8n_api_key", process.env.N8N_API_KEY)) ?? "";
  return { baseUrl, apiKey };
}

const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://myoopircjguuaaqlmjax.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseHeaders = {
  apikey: SUPABASE_SERVICE_ROLE_KEY ?? "",
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY ?? ""}`,
  "Content-Type": "application/json",
};

function getGithubHeaders(): Record<string, string> {
  const token = process.env.GITHUB_PAT_PUSH?.trim() || process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    throw new Error("Credencial GitHub não configurada no API Server");
  }
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

// ── N8N ─────────────────────────────────────────────────────────────────────

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

function assertNoEmbeddedInternalSecret(value: unknown, path = "workflow"): void {
  if (typeof value === "string") {
    if (/(?:x-internal-key|authorization)/i.test(value) && !/\{\{.*(?:env|credential|secret).*?\}\}/i.test(value)) {
      throw new Error(`${path}: segredo interno não pode ser embutido no workflow; use credencial gerenciada ou relay do Hub`);
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (
      /(?:x-internal-key|authorization|api[_-]?key|access[_-]?token|secret|credentials?|token)/i.test(key)
      && typeof nested === "string"
      && nested.trim().length > 0
      && !/\{\{.*(?:env|credential|secret).*?\}\}/i.test(nested)
    ) {
      throw new Error(`${path}.${key}: segredo não pode ser embutido no workflow; use credencial gerenciada ou relay do Hub`);
    }
    assertNoEmbeddedInternalSecret(nested, `${path}.${key}`);
  }
}

function assertWorkflowPayloadScope(workflow: Record<string, unknown>, scope: WorkflowScope): void {
  const name = String(workflow.name ?? "").trim();
  if (!name) throw new Error("workflow.name obrigatório");
  assertWorkflowScope(name, scope, "workflow");
  assertNoEmbeddedInternalSecret(workflow);
}

function assertWebhookScope(webhookPath: string, scope: WorkflowScope): void {
  assertWorkflowScope(webhookPath, scope, "webhook");
}

export async function listWorkflows(scope: WorkflowScope): Promise<N8nWorkflow[]> {
  const { baseUrl, apiKey } = await getN8nConfig();
  if (!baseUrl || !apiKey) throw new Error("N8N não configurado. Use o painel de configurações do ATHOS_MENTOR para adicionar a URL e API Key do n8n.");
  const res = await fetch(`${baseUrl}/api/v1/workflows?limit=100`, {
    headers: { "X-N8N-API-KEY": apiKey, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`n8n listWorkflows: ${res.status}`);
  const data = await res.json() as { data: N8nWorkflow[] };
  return (data.data ?? []).filter(workflow => {
    const inferred = inferWorkflowScope(workflow.name);
    return inferred === scope;
  });
}

export async function getWorkflow(workflowId: string, scope: WorkflowScope): Promise<unknown> {
  const { baseUrl, apiKey } = await getN8nConfig();
  if (!baseUrl || !apiKey) throw new Error("N8N não configurado");
  const res = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}`, {
    headers: { "X-N8N-API-KEY": apiKey, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`n8n getWorkflow: ${res.status}`);
  const workflow = await res.json() as Record<string, unknown>;
  assertWorkflowScope(String(workflow.name ?? ""), scope);
  return workflow;
}

// Tenta ativar/desativar usando 3 métodos em cascata:
// 1. PATCH /workflows/:id  { active }           — mais simples, funciona em self-hosted ≥ 1.0
// 2. POST  /workflows/:id/activate|deactivate   — n8n Cloud / versões recentes
// 3. GET + PUT (objeto completo)                — fallback universal (versões antigas)
async function toggleWorkflowActive(workflowId: string, active: boolean, scope: WorkflowScope): Promise<void> {
  const { baseUrl, apiKey } = await getN8nConfig();
  if (!baseUrl || !apiKey) throw new Error("N8N não configurado");
  const headers = { "X-N8N-API-KEY": apiKey, "Content-Type": "application/json" };

  const currentRes = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}`, { headers });
  if (!currentRes.ok) throw new Error(`n8n workflow ${workflowId}: ${currentRes.status}`);
  const current = await currentRes.json() as Record<string, unknown>;
  assertWorkflowScope(String(current.name ?? ""), scope);

  // Método 1: PATCH com campo active
  const patchRes = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ active }),
  });
  if (patchRes.ok) return;

  // Método 2: POST /activate ou /deactivate
  const verb = active ? "activate" : "deactivate";
  const postRes = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}/${verb}`, {
    method: "POST",
    headers,
  });
  if (postRes.ok) return;

  // Método 3: GET + PUT objeto completo
  const { id: _id, createdAt: _c, updatedAt: _u, tags: _t, ...rest } = current;
  const putRes = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ ...rest, active }),
  });
  if (!putRes.ok) throw new Error(`n8n toggleActive PUT → ${putRes.status}`);
}

export async function activateWorkflow(workflowId: string, scope: WorkflowScope): Promise<void> {
  return toggleWorkflowActive(workflowId, true, scope);
}

export async function deactivateWorkflow(workflowId: string, scope: WorkflowScope): Promise<void> {
  return toggleWorkflowActive(workflowId, false, scope);
}

export async function createWorkflow(workflowJson: Record<string, unknown>, scope: WorkflowScope): Promise<N8nWorkflow> {
  assertWorkflowPayloadScope(workflowJson, scope);
  const { baseUrl, apiKey } = await getN8nConfig();
  if (!baseUrl || !apiKey) throw new Error("N8N não configurado");
  // `active` é read-only na API do n8n — removido antes do POST
  const { active: _active, ...rest } = workflowJson as Record<string, unknown> & { active?: unknown };
  // Injeta campos obrigatórios com defaults caso o ATHOS não os inclua
  const payload = {
    settings: { executionOrder: "v1" },
    staticData: null,
    ...rest,
  };
  const res = await fetch(`${baseUrl}/api/v1/workflows`, {
    method: "POST",
    headers: { "X-N8N-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`n8n createWorkflow: ${res.status}`);
  return res.json() as Promise<N8nWorkflow>;
}

export async function createAndActivateWorkflow(workflowJson: Record<string, unknown>, scope: WorkflowScope): Promise<{ workflow: N8nWorkflow; activated: boolean; activationError?: string }> {
  const created = await createWorkflow(workflowJson, scope);
  try {
    await activateWorkflow(String(created.id), scope);
    return { workflow: created, activated: true };
  } catch (e) {
    const activationError = e instanceof Error ? e.message : String(e);
    // Criação OK — expõe o erro de ativação para o ATHOS poder diagnosticar e retry
    return { workflow: created, activated: false, activationError };
  }
}

export async function activateWorkflowByName(name: string, scope: WorkflowScope): Promise<{ id: string; name: string; activated: boolean }> {
  assertWorkflowScope(name, scope);
  const workflows = await listWorkflows(scope);
  const match = workflows.find((w: N8nWorkflow) => w.name === name);
  if (!match) throw new Error(`Workflow não encontrado pelo nome: "${name}". Nomes disponíveis: ${workflows.map((w: N8nWorkflow) => w.name).join(", ")}`);
  await activateWorkflow(String(match.id), scope);
  return { id: String(match.id), name: match.name, activated: true };
}

export async function deactivateWorkflowByName(name: string, scope: WorkflowScope): Promise<{ id: string; name: string; activated: boolean }> {
  assertWorkflowScope(name, scope);
  const workflows = await listWorkflows(scope);
  const match = workflows.find((w: N8nWorkflow) => w.name === name);
  if (!match) throw new Error(`Workflow não encontrado pelo nome: "${name}"`);
  await deactivateWorkflow(String(match.id), scope);
  return { id: String(match.id), name: match.name, activated: false };
}

export async function updateWorkflow(workflowId: string, workflowJson: Record<string, unknown>, scope: WorkflowScope): Promise<unknown> {
  const { baseUrl, apiKey } = await getN8nConfig();
  if (!baseUrl || !apiKey) throw new Error("N8N não configurado");
  const currentRes = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}`, {
    headers: { "X-N8N-API-KEY": apiKey, "Content-Type": "application/json" },
  });
  if (!currentRes.ok) throw new Error(`n8n updateWorkflow: workflow ${workflowId} não encontrado (${currentRes.status})`);
  const current = await currentRes.json() as Record<string, unknown>;
  assertWorkflowScope(String(current.name ?? ""), scope);
  assertWorkflowPayloadScope(workflowJson, scope);
  // A resposta de GET inclui campos de interface, controle de versão e
  // metadados que o endpoint de PUT não aceita. Em vez de manter uma lista
  // frágil de exclusões, enviamos apenas o contrato público do n8n.
  const payload: Record<string, unknown> = {
    name: workflowJson.name,
    nodes: Array.isArray(workflowJson.nodes) ? workflowJson.nodes : [],
    connections: workflowJson.connections && typeof workflowJson.connections === "object"
      ? workflowJson.connections
      : {},
    settings: workflowJson.settings && typeof workflowJson.settings === "object"
      ? workflowJson.settings
      : {},
  };
  if (workflowJson.staticData !== undefined) {
    payload.staticData = workflowJson.staticData;
  }
  const res = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}`, {
    method: "PUT",
    headers: { "X-N8N-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`n8n updateWorkflow: ${res.status}`);
  return res.json();
}

export async function triggerWebhook(
  webhookPath: string,
  payload: Record<string, unknown>,
  scope: WorkflowScope,
  validatedTenant?: string,
): Promise<unknown> {
  const webhookPayload = validatedTenant && scope !== "platform"
    ? { ...payload, tenant_id: validatedTenant }
    : payload;
  if (!validatedTenant) {
    requireWorkflowTenantScope({ ...webhookPayload, scope }, "trigger_n8n_webhook");
  }
  const { baseUrl } = await getN8nConfig();
  if (!baseUrl) throw new Error("N8N não configurado");
  assertWebhookScope(webhookPath, scope);
  const res = await fetch(`${baseUrl}/webhook/${webhookPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(webhookPayload),
  });
  if (!res.ok) throw new Error(`n8n triggerWebhook: ${res.status}`);
  const text = await res.text();
  return text.trim() ? JSON.parse(text) : { ok: true };
}

// ── SUPABASE ─────────────────────────────────────────────────────────────────

export async function listSupabaseTables(): Promise<{ name: string; schema: string }[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, { headers: supabaseHeaders });
  if (!res.ok) throw new Error(`Supabase listTables: ${res.status} ${await res.text()}`);
  const schema = await res.json() as { paths?: Record<string, unknown> };
  const paths = Object.keys(schema.paths ?? {}).filter(p => p !== "/" && !p.startsWith("/rpc/"));
  return paths.map(p => ({ name: p.replace(/^\//, ""), schema: "public" }));
}

function normalizeFilter(filter: unknown): string | undefined {
  if (!filter) return undefined;
  if (typeof filter === "string") return filter;
  if (typeof filter === "object" && filter !== null) {
    return Object.entries(filter as Record<string, unknown>)
      .map(([k, v]) => {
        const val = String(v ?? "");
        const pgVal = val.startsWith("eq.") || val.startsWith("neq.") || val.startsWith("gt.") ||
          val.startsWith("gte.") || val.startsWith("lt.") || val.startsWith("lte.") ||
          val.startsWith("like.") || val.startsWith("ilike.") || val.startsWith("is.") ||
          val.startsWith("in.") || val.startsWith("cs.") || val.startsWith("cd.")
          ? val
          : `eq.${val}`;
        return `${encodeURIComponent(k)}=${encodeURIComponent(pgVal)}`;
      })
      .join("&");
  }
  return String(filter);
}

export async function querySupabaseTable(
  table: string,
  options: { select?: string; limit?: number; filter?: unknown; order?: string } = {}
): Promise<unknown[]> {
  const params = new URLSearchParams();
  params.set("select", (options.select as string | undefined) ?? "*");
  if (options.limit) params.set("limit", String(options.limit));
  const filterStr = normalizeFilter(options.filter);
  if (filterStr) {
    filterStr.split("&").forEach(f => {
      const eqIdx = f.indexOf("=");
      if (eqIdx > 0) {
        const key = decodeURIComponent(f.slice(0, eqIdx));
        const val = decodeURIComponent(f.slice(eqIdx + 1));
        if (key && val) params.set(key, val);
      }
    });
  }
  if (options.order) params.set("order", options.order as string);
  const url = `${SUPABASE_URL}/rest/v1/${encodeURIComponent(table)}?${params.toString()}`;
  const res = await fetch(url, { headers: supabaseHeaders });
  if (!res.ok) throw new Error(`Supabase query '${table}': ${res.status} ${await res.text()}`);
  return res.json() as Promise<unknown[]>;
}

export async function countSupabaseTable(table: string, filter?: unknown): Promise<number> {
  const params = new URLSearchParams({ select: "count" });
  const filterStr = normalizeFilter(filter);
  if (filterStr) {
    filterStr.split("&").forEach(f => {
      const eqIdx = f.indexOf("=");
      if (eqIdx > 0) {
        const key = decodeURIComponent(f.slice(0, eqIdx));
        const val = decodeURIComponent(f.slice(eqIdx + 1));
        if (key && val) params.set(key, val);
      }
    });
  }
  const url = `${SUPABASE_URL}/rest/v1/${encodeURIComponent(table)}?${params.toString()}`;
  const res = await fetch(url, { headers: { ...supabaseHeaders, Prefer: "count=exact" } });
  if (!res.ok) throw new Error(`Supabase count '${table}': ${res.status} ${await res.text()}`);
  const countHeader = res.headers.get("content-range");
  if (countHeader) {
    const match = countHeader.match(/\/(\d+)/);
    if (match) return parseInt(match[1]!, 10);
  }
  const data = await res.json() as unknown[];
  return data.length;
}

// ── GITHUB ───────────────────────────────────────────────────────────────────

export async function githubListFiles(repo: string, path: string = ""): Promise<{ name: string; path: string; type: string }[]> {
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;
  const res = await fetch(url, { headers: getGithubHeaders() });
  if (res.status === 404) {
    // Diretório/arquivo não encontrado — retorna vazio em vez de explodir
    return [];
  }
  if (!res.ok) throw new Error(`GitHub listFiles: ${res.status} ${await res.text()}`);
  const data = await res.json() as { name: string; path: string; type: string }[];
  return Array.isArray(data) ? data.map(f => ({ name: f.name, path: f.path, type: f.type })) : [];
}

export async function githubReadFile(repo: string, path: string): Promise<string> {
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;
  const res = await fetch(url, { headers: getGithubHeaders() });
  if (res.status === 404) {
    throw new Error(`Arquivo não encontrado no repositório: ${repo}/${path}. Verifique se o caminho está correto.`);
  }
  if (!res.ok) throw new Error(`GitHub readFile: ${res.status} ${await res.text()}`);
  const data = await res.json() as { content?: string };
  if (!data.content) throw new Error("Arquivo sem conteúdo");
  return Buffer.from(data.content, "base64").toString("utf-8");
}

export async function githubGetCommits(repo: string, perPage = 30): Promise<{ sha: string; message: string; date: string; author: string }[]> {
  const url = `https://api.github.com/repos/${repo}/commits?per_page=${perPage}`;
  const res = await fetch(url, { headers: getGithubHeaders() });
  if (!res.ok) throw new Error(`GitHub commits: ${res.status}`);
  const data = await res.json() as any[];
  return data.map(c => ({
    sha: (c.sha as string).slice(0, 7),
    message: c.commit?.message?.split("\n")[0] ?? "",
    date: c.commit?.author?.date ?? "",
    author: c.commit?.author?.name ?? "",
  }));
}

// ── LIVE SNAPSHOT ─────────────────────────────────────────────────────────────

/**
 * Gera um snapshot real do ecossistema consultando Supabase e banco local.
 * Chamado automaticamente no startup do servidor (todo deploy).
 * Retorna uma string markdown que é injetada em TODA conversa ATHOS.
 */
export async function generateLiveSnapshot(): Promise<string> {
  const lines: string[] = [];
  const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  lines.push(`## ESTADO ATUAL DO ECOSSISTEMA`);
  lines.push(`> Snapshot gerado automaticamente em: ${now} (Brasília)`);
  lines.push(`> Este bloco reflete dados reais — use-o como fonte de verdade para diagnósticos.\n`);

  // ── Tenants (Supabase) ──
  try {
    const tenantsRaw = await querySupabaseTable("tenants", {
      select: "id,name,slug,plan,assinatura_status,assinatura_expira_em,created_at",
      limit: 100,
    }) as any[];

    lines.push(`### Empresas no Hub (${tenantsRaw.length} total)`);
    if (tenantsRaw.length === 0) {
      lines.push("- Nenhuma empresa cadastrada.");
    } else {
      for (const t of tenantsRaw) {
        const status = t.assinatura_status ?? "—";
        const plano = t.plan ?? "—";
        const expira = t.assinatura_expira_em ? `expira ${t.assinatura_expira_em}` : "";
        lines.push(`- **${t.name}** (slug: ${t.slug}) — plano: ${plano} | status: ${status}${expira ? ` | ${expira}` : ""}`);
      }
    }
    const ativos = tenantsRaw.filter(t => t.assinatura_status === "ativo").length;
    const trial = tenantsRaw.filter(t => t.assinatura_status === "trial").length;
    lines.push(`\n> Resumo: ${ativos} ativo(s), ${trial} em trial, ${tenantsRaw.length - ativos - trial} outros\n`);
  } catch (err: any) {
    lines.push(`### Empresas — erro ao consultar Supabase: ${err.message}\n`);
  }

  // ── Ordens de Produção (banco local) ──
  try {
    const result = await db.execute(sql`
      SELECT fase_atual AS fase, COUNT(*) as total
      FROM referencias
      WHERE ativo = true
      GROUP BY fase_atual
      ORDER BY total DESC
      LIMIT 20
    `);
    const rows = result.rows as { fase: string; total: string }[];
    const totalOPs = rows.reduce((s, r) => s + Number(r.total), 0);
    lines.push(`### Ordens de Produção (Kanban) — ${totalOPs} total`);
    for (const r of rows) {
      lines.push(`- ${r.fase}: ${r.total}`);
    }
    lines.push("");
  } catch (err: any) {
    lines.push(`### Ordens de Produção — erro: ${err.message}\n`);
  }

  // ── Distribuição de planos ──
  try {
    const tenantsRaw = await querySupabaseTable("tenants", {
      select: "plan,assinatura_status",
      limit: 200,
    }) as any[];
    const porPlano: Record<string, number> = {};
    for (const t of tenantsRaw) {
      const p = t.plan ?? "sem_plano";
      porPlano[p] = (porPlano[p] ?? 0) + 1;
    }
    lines.push(`### Distribuição de planos`);
    for (const [plano, qty] of Object.entries(porPlano)) {
      lines.push(`- ${plano}: ${qty} tenant(s)`);
    }
    lines.push("");
  } catch {
    // silently skip
  }

  // ── Inventário completo do Hub Mirage ──
  lines.push(`### Inventário de funcionalidades do Hub Mirage`);
  lines.push(`> Este inventário é a fonte de verdade. NUNCA sugira criar algo que já existe aqui.\n`);

  lines.push(`**Autenticação & Acesso**`);
  lines.push(`- Login/Register/Recuperação de senha (Supabase Auth)`);
  lines.push(`- Sessões HTTP com express-session`);
  lines.push(`- Multi-tenant: requireAuth + requireTenantAccess em todas as rotas protegidas`);
  lines.push(`- Super admin: clovisart13@gmail.com acessa qualquer tenant`);
  lines.push("");

  lines.push(`**Hub Central (/hub)**`);
  lines.push(`- Landing page com 6 cards de apps + controle de acesso por plano`);
  lines.push(`- Sidebar unificada com todos os módulos`);
  lines.push(`- Link "Portal de Onboarding" na sidebar (abre /onboarding-portal/ em nova aba)`);
  lines.push("");

  lines.push(`**PLM — Gestão do Ciclo do Produto (/hub/plm/*)**`);
  lines.push(`- 13 tabelas DB (plm_*), 11 rotas frontend, API em /api/plm/*`);
  lines.push(`- Módulos: Dashboard, Produtos, Fichas Técnicas, Modelagem, Materiais,`);
  lines.push(`  Fornecedores PLM, Materiais & Custos, Pilotagem, Aprovações, Clientes PLM, Histórico`);
  lines.push(`- Geração de códigos automática: CAM-0001, FT-0001, MAT-0001, FOR-0001, CLI-0001, FC-0001`);
  lines.push("");

  lines.push(`**Kanban de Produção (/hub/kanban/*)**`);
  lines.push(`- 14 fases fixas de produção, multi-tenant`);
  lines.push(`- Sub-módulos: Pedidos, Estoque, Contas a Pagar, Contas a Receber, Fornecedores, Clientes`);
  lines.push("");

  lines.push(`**Custos e Orçamentos (/hub/custos/*)**`);
  lines.push(`- Fichas de custo (matéria-prima + mão de obra), orçamentos com envio por email`);
  lines.push(`- Fluxo de aprovação de orçamentos, configurações de custo`);
  lines.push(`- Valores monetários em centavos no DB`);
  lines.push("");

  lines.push(`**Relatórios (/hub/relatorios)**`);
  lines.push(`- 6 abas: KPIs gerais, BI de vendas (export Excel), controle de produção,`);
  lines.push(`  visão por cliente, histórico, contas a receber com emissão de boleto`);
  lines.push("");

  lines.push(`**Comunidade / Moda Conecta (/hub/comunidade)**`);
  lines.push(`- Perfis de fornecedores, especialidades, reviews`);
  lines.push(`- Pré-cadastro de novos fornecedores`);
  lines.push("");

  lines.push(`**CRM Helena (/hub/crm)**`);
  lines.push(`- White label do CRM Helena, multicanal (Instagram, Facebook, WhatsApp)`);
  lines.push(`- Integração embed via iframe`);
  lines.push("");

  lines.push(`**ERP VhSys (/hub/erp)**`);
  lines.push(`- Integração com VhSys: NF, clientes, pedidos`);
  lines.push(`- Criação automática de cliente VhSys ao ativar plano com ERP`);
  lines.push("");

  lines.push(`**Billing / Assinatura**`);
  lines.push(`- Planos: Starter (R$197), Pro (R$397), Enterprise (R$797)`);
  lines.push(`- Planos modulares (avulso), add-ons (usuários extras, canais)`);
  lines.push(`- Checkout com Asaas (PIX, Boleto, Cartão)`);
  lines.push(`- Webhooks Asaas para ativação/cancelamento automático`);
  lines.push(`- Trial de 14 dias sem cartão`);
  lines.push(`- Página /hub/planos com estado consciente da assinatura atual:`);
  lines.push(`  mostra plano atual, botões de upgrade/downgrade/cancelamento`);
  lines.push(`  Downgrade: modal com lista de módulos perdidos + seleção de motivo obrigatória`);
  lines.push(`  Cancelamento: modal com confirmação digitando "CANCELAR" + seleção de motivo`);
  lines.push(`- Página /hub/assinatura: histórico de faturas, apps ativos, add-ons`);
  lines.push("");

  lines.push(`**Marketing Machine (/hub/marketing)**`);
  lines.push(`- RESTRITO: visível e acessível APENAS para clovisart13@gmail.com (super admin)`);
  lines.push(`- Gerenciamento de campanhas, conteúdo, publicação automática, métricas`);
  lines.push(`- Geração de imagens via AI (em desenvolvimento)`);
  lines.push(`- Assinantes comuns NÃO veem nem acessam esta funcionalidade`);
  lines.push("");

  lines.push(`**ATHOS Mentor (/hub/mentor)**`);
  lines.push(`- RESTRITO: só clovisart13@gmail.com`);
  lines.push(`- LLM GPT via Replit AI, streaming SSE`);
  lines.push(`- Histórico em mentor_messages, snapshot em mirage_environment_snapshot`);
  lines.push(`- Bridge: n8n (list/get/create/activate/trigger), Supabase (query), GitHub (read)`);
  lines.push("");

  lines.push(`**ATHOS Mobile (/athos-mobile)**`);
  lines.push(`- PWA instalável, acesso mobile ao ecossistema`);
  lines.push("");

  lines.push(`**Onboarding Deck (/onboarding)**`);
  lines.push(`- 15 slides sequenciais (clique avança)`);
  lines.push(`- Slide 2 (Hub Central): cards clicáveis que navegam direto para o slide do módulo`);
  lines.push(`  PLM→slide3, Kanban→slide6, Custos→slide8, Relatórios→slide10, Moda Conecta→slide12, CRM→slide13`);
  lines.push("");

  lines.push(`**Portal de Onboarding (/onboarding-portal)**`);
  lines.push(`- Biblioteca pública de links para assinantes (sem login)`);
  lines.push(`- 3 cards: Hub Mirage (~30min), ERP Mirage (em breve), CRM Mirage (em breve)`);
  lines.push(`- Acessível pela sidebar do Hub`);
  lines.push("");

  lines.push(`**Closer Deck (/closer)**`);
  lines.push(`- Apresentação comercial em slides para o time de vendas`);
  lines.push("");

  lines.push(`**Mapa do Ecossistema (/hub/mapa)**`);
  lines.push(`- Visualização interativa de todos os componentes do ecossistema`);
  lines.push("");

  lines.push(`**Configurações & Admin**`);
  lines.push(`- /hub/configuracoes: configurações do tenant`);
  lines.push(`- /admin: painel de administração (super admin)`);
  lines.push(`- /hub/atos: ATOS control center`);
  lines.push(`- /hub/partners: área de parceiros`);
  lines.push("");

  // ── Commits recentes do GitHub ──
  try {
    const commits = await githubGetCommits("clovisart13-gif/kanban-producao", 25);
    if (commits.length > 0) {
      lines.push(`### Últimas implementações (commits GitHub)`);
      for (const c of commits) {
        const dt = c.date ? new Date(c.date).toLocaleDateString("pt-BR") : "";
        lines.push(`- \`${c.sha}\` ${dt} — ${c.message}`);
      }
      lines.push("");
    }
  } catch {
    // GitHub indisponível ou repo sem acesso — não bloqueia
  }

  return lines.join("\n");
}

// ── DISPATCHER ───────────────────────────────────────────────────────────────

// ── ATOS — Sistema Operacional ────────────────────────────────────────────────

// Sempre localhost para chamadas internas — evita que o proxy da Replit strip o Authorization header.
const MIRAGE_BASE_URL = `http://localhost:${process.env["PORT"] ?? "8080"}`;

async function atosRequest(path: string, method = "GET", body?: unknown): Promise<unknown> {
  const res = await fetch(`${MIRAGE_BASE_URL}/api/atos${path}`, {
    method,
    headers: {
      "Authorization": `Bearer ${INTERNAL_SECRET}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`ATOS API ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

export async function atosDispatch(decision: unknown, plan: unknown, tasks: unknown[]): Promise<unknown> {
  return atosRequest("/dispatch", "POST", { decision, plan, tasks });
}

export async function atosStatus(): Promise<unknown> {
  return atosRequest("/status");
}

export async function atosListTasks(status?: string): Promise<unknown> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return atosRequest(`/tasks${qs}`);
}

export async function atosListDecisions(): Promise<unknown> {
  return atosRequest("/decisions");
}

// Executa a próxima task ready diretamente no servidor (sem depender do n8n Cloud)
export async function atosTriggerDispatcher(): Promise<unknown> {
  return atosRequest("/execute-next", "POST", { trigger: "athos_manual" });
}

// Alias explícito para o ATHOS usar quando quiser executar múltiplas tasks em sequência
export async function atosExecuteNext(): Promise<unknown> {
  return atosRequest("/execute-next", "POST", { trigger: "athos_execute_next" });
}

// Consome a fila inteira até zerar (max 20 runs, 60s timeout por padrão)
export async function atosRunUntilEmpty(maxRuns?: number, timeoutMs?: number): Promise<unknown> {
  return atosRequest("/run-until-empty", "POST", { maxRuns: maxRuns ?? 20, timeoutMs: timeoutMs ?? 60000 });
}

// Lista entregas do Replit Agent
export async function atosListDeliveries(limit?: number): Promise<unknown> {
  const qs = limit ? `?limit=${limit}` : "";
  return atosRequest(`/deliveries${qs}`);
}

// Detalhe de uma entrega
export async function atosGetDelivery(id: number): Promise<unknown> {
  return atosRequest(`/deliveries/${id}`);
}

// Registra entrega do Replit Agent no sistema
export async function atosRegisterDelivery(delivery: unknown): Promise<unknown> {
  return atosRequest("/deliveries", "POST", delivery);
}

// Lista erros recentes
export async function atosListErrors(limit?: number): Promise<unknown> {
  const qs = limit ? `?limit=${limit}` : "";
  return atosRequest(`/errors${qs}`);
}

// ── KANBAN — Local PostgreSQL (helium/heliumdb via Drizzle) ──────────────────

const KANBAN_FASES = [
  "inicio","espera","modelagem","tecido","risco","corte",
  "beneficiamento","costura","lavanderia","acabamento",
  "passadoria","expedicao","faturamento","concluido",
] as const;

const KANBAN_FASES_PRODUTIVAS = ["corte","beneficiamento","costura","lavanderia","acabamento","passadoria"];

export async function kanbanListOrders(tenantId: string, faseAtual?: string, limit = 50): Promise<unknown[]> {
  const conds = [eq(referencias.tenant_id, tenantId), eq(referencias.ativo, true)];
  if (faseAtual) conds.push(eq(referencias.fase_atual, faseAtual));
  return db
    .select({
      id: referencias.id,
      codigo: referencias.codigo,
      descricao_modelo: referencias.descricao_modelo,
      fase_atual: referencias.fase_atual,
      nome_cliente: referencias.nome_cliente,
      quantidade: referencias.quantidade,
      numero_op: referencias.numero_op,
      data_entrada: referencias.data_entrada,
      data_prevista_entrega: referencias.data_prevista_entrega,
      cmp_centavos: referencias.cmp,
      cmo_centavos: referencias.cmo,
    })
    .from(referencias)
    .where(and(...conds))
    .orderBy(desc(referencias.created_at))
    .limit(limit);
}

export async function kanbanListStages(tenantId?: string): Promise<unknown> {
  const defaultFases = KANBAN_FASES.map((slug, i) => ({
    slug,
    ordem: i + 1,
    nome: slug.charAt(0).toUpperCase() + slug.slice(1),
    produtiva: KANBAN_FASES_PRODUTIVAS.includes(slug),
  }));
  if (!tenantId) return { sequencia_padrao: defaultFases };
  const overrides = await db.select().from(kanban_fase_config).where(eq(kanban_fase_config.tenant_id, tenantId));
  const ovrMap: Record<string, typeof overrides[number]> = {};
  for (const o of overrides) ovrMap[o.fase_id] = o;
  const merged = defaultFases.map(f => ({
    ...f,
    nomeExibicao: ovrMap[f.slug]?.nomeExibicao ?? f.nome,
    ordem: ovrMap[f.slug]?.ordem ?? f.ordem,
    oculta: ovrMap[f.slug]?.oculta ?? false,
    cor: ovrMap[f.slug]?.cor ?? null,
  })).sort((a, b) => a.ordem - b.ordem);
  return { sequencia_padrao: defaultFases, config_tenant: merged, total_overrides: overrides.length };
}

export async function kanbanGetOrder(referenciaId: string): Promise<unknown> {
  const [ref] = await db.select().from(referencias).where(eq(referencias.id, referenciaId));
  if (!ref) throw new Error(`Referência "${referenciaId}" não encontrada.`);
  const movs = await db.select().from(movimentacoes)
    .where(eq(movimentacoes.referencia_id, referenciaId))
    .orderBy(desc(movimentacoes.created_at))
    .limit(30);
  return { referencia: ref, historico_movimentacoes: movs };
}

export async function kanbanMoveOrder(referenciaId: string, novaFase: string, tenantId: string): Promise<unknown> {
  if (!(KANBAN_FASES as readonly string[]).includes(novaFase)) {
    throw new Error(`Fase inválida: "${novaFase}". Válidas: ${KANBAN_FASES.join(", ")}`);
  }
  const [ref] = await db
    .select({ id: referencias.id, fase_atual: referencias.fase_atual, tenant_id: referencias.tenant_id })
    .from(referencias).where(eq(referencias.id, referenciaId));
  if (!ref) throw new Error(`Referência "${referenciaId}" não encontrada.`);
  if (ref.tenant_id !== tenantId) throw new Error("Acesso negado — tenant mismatch.");
  await db.update(referencias).set({ fase_atual: novaFase, updated_at: sql`now()` }).where(eq(referencias.id, referenciaId));
  await db.insert(movimentacoes).values({
    tenant_id: tenantId,
    referencia_id: referenciaId,
    fase_origem: ref.fase_atual,
    fase_destino: novaFase,
    user_id: "athos_mentor",
    quantidade: 0,
    observacoes: "Movido diretamente pelo ATHOS_MENTOR",
  });
  return { success: true, de: ref.fase_atual, para: novaFase, referencia_id: referenciaId };
}

export async function kanbanUpdateStageConfig(tenantId: string, configs: Array<{ fase_id: string; nome_exibicao?: string; ordem?: number; oculta?: boolean; cor?: string }>): Promise<unknown> {
  const results = [];
  for (const cfg of configs) {
    const [existing] = await db.select({ id: kanban_fase_config.id }).from(kanban_fase_config)
      .where(and(eq(kanban_fase_config.tenant_id, tenantId), eq(kanban_fase_config.fase_id, cfg.fase_id)));
    if (existing) {
      await db.update(kanban_fase_config).set({
        nomeExibicao: cfg.nome_exibicao,
        ordem: cfg.ordem,
        oculta: cfg.oculta,
        cor: cfg.cor,
        updated_at: sql`now()`,
      }).where(eq(kanban_fase_config.id, existing.id));
      results.push({ fase_id: cfg.fase_id, action: "updated" });
    } else {
      await db.insert(kanban_fase_config).values({
        tenant_id: tenantId,
        fase_id: cfg.fase_id,
        nomeExibicao: cfg.nome_exibicao,
        ordem: cfg.ordem,
        oculta: cfg.oculta,
        cor: cfg.cor,
      });
      results.push({ fase_id: cfg.fase_id, action: "inserted" });
    }
  }
  return { success: true, results };
}

// ── MENTOR HISTORY (Supabase — compartilhado entre dev e produção) ───────────

export async function mentorGetHistory(limit = 50, offsetN = 0): Promise<unknown> {
  const { data } = await supabaseAdmin
    .from("mentor_messages")
    .select("id, role, content, created_at")
    .order("created_at", { ascending: false })
    .range(offsetN, offsetN + limit - 1);
  const rows = (data ?? []).map((m: any) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: m.created_at,
  }));
  return rows.reverse(); // cronológico
}

// ── GROWTH OS — visão de negócio cross-tenant ────────────────────────────────
// Leitura executiva do painel `/hub/growth` (aba "Tenants & Vendas"): tenants, MRR,
// funil comercial, leads e comunidade. Chamada em processo (mesmo backend do Hub),
// reutilizando a mesma agregação do endpoint HTTP `GET /marketing/growth/business-overview`
// (que é `requireAuth + requireSuperAdmin`) sem precisar simular sessão/HTTP — o bridge do
// ATHOS já roda dentro do api-server. Somente leitura; não deve ser exposta a usuários comuns.
export async function getBusinessOverview(): Promise<unknown> {
  const { getBusinessOverviewData } = await import("../marketing/index");
  const data = await getBusinessOverviewData();
  // Reordena para colocar `backlog` (o mais acionável) antes da lista completa de
  // tenants — o resultado é serializado e truncado a um tamanho fixo de caracteres
  // antes de chegar ao ATHOS (ver dispatchAction/mentor chat), então campos no fim
  // de um payload grande podem nunca aparecer. Também resume `tenants.list` para
  // não consumir todo o orçamento de caracteres sozinho.
  return {
    ok: data.ok,
    backlog: data.backlog,
    tenants: {
      total: data.tenants.total,
      mrr_cents: data.tenants.mrr_cents,
      by_plan: data.tenants.by_plan,
      by_status: data.tenants.by_status,
      list: data.tenants.list.map((t) => ({ name: t.name, plan: t.plan, status: t.status, expira_em: t.expira_em })),
    },
    sales_funnel: data.sales_funnel,
    leads_funnel: data.leads_funnel,
    community_funnel: data.community_funnel,
  };
}

export async function kanbanSql(query: string): Promise<unknown> {
  const norm = query.trim().toUpperCase();
  if (!norm.startsWith("SELECT") && !norm.startsWith("WITH")) {
    throw new Error("kanban_sql: apenas SELECT/WITH permitidos. Para mudanças use kanban_move_order ou kanban_update_stage_config.");
  }
  const result = await db.execute(sql.raw(query));
  return result.rows ?? result;
}

// ─────────────────────────────────────────────────────────────────────────────

function requireScopedWorkflowAction(args: Record<string, unknown>, action: string): WorkflowScope {
  return requireWorkflowTenantScope(args, action).scope;
}

function redactN8nResponse(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactN8nResponse);
  if (typeof value === "string") {
    return /(?:bearer\s+|x-internal-key|api[_-]?key|access[_-]?token|sb_(?:secret|publishable)_)/i.test(value)
      ? "[REDACTED]"
      : value;
  }
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
      key,
      /(?:authorization|api[_-]?key|access[_-]?token|secret|password|credentials?|token|x-internal-key)/i.test(key)
        ? "[REDACTED]"
        : redactN8nResponse(nested),
    ]),
  );
}

export async function dispatchAction(action: string, args: Record<string, unknown>): Promise<unknown> {
  switch (action) {
    case "list_n8n_workflows": {
      const scope = requireScopedWorkflowAction(args, action);
      return listWorkflows(scope);
    }
    case "get_n8n_workflow": {
      const scope = requireScopedWorkflowAction(args, action);
      return redactN8nResponse(await getWorkflow(args.workflow_id as string, scope));
    }
    case "activate_n8n_workflow": {
      const scope = requireScopedWorkflowAction(args, action);
      await activateWorkflow(args.workflow_id as string, scope);
      return { success: true, message: `Workflow ${args.workflow_id} ativado` };
    }
    case "deactivate_n8n_workflow": {
      const scope = requireScopedWorkflowAction(args, action);
      await deactivateWorkflow(args.workflow_id as string, scope);
      return { success: true, message: `Workflow ${args.workflow_id} desativado` };
    }
    case "create_n8n_workflow": {
      const scope = requireScopedWorkflowAction(args, action);
      return redactN8nResponse(await createWorkflow(args.workflow as Record<string, unknown>, scope));
    }
    case "create_and_activate_n8n_workflow": {
      const scope = requireScopedWorkflowAction(args, action);
      return redactN8nResponse(await createAndActivateWorkflow(args.workflow as Record<string, unknown>, scope));
    }
    case "activate_workflow_by_name": {
      const scope = requireScopedWorkflowAction(args, action);
      const name = String(args.name ?? args.workflow_name ?? "").trim();
      if (!name) throw new Error("activate_workflow_by_name: name/workflow_name obrigatório");
      return activateWorkflowByName(name, scope);
    }
    case "update_n8n_workflow": {
      const scope = requireScopedWorkflowAction(args, action);
      return redactN8nResponse(await updateWorkflow(args.workflow_id as string, args.workflow as Record<string, unknown>, scope));
    }
    case "list_n8n_credentials":
      throw new Error("list_n8n_credentials desabilitado para o ATHOS; credenciais devem ser gerenciadas fora dos workflows e nunca expostas entre operações");
    case "trigger_n8n_webhook": {
      const { scope, tenant } = requireWorkflowTenantScope(args, action);
      const payload = (args.payload as Record<string, unknown>) ?? {};
      const payloadTenant = payload.tenant_id ?? payload.company_slug;
      if (payloadTenant !== undefined) {
        assertTenantScope(payloadTenant, scope, `${action}.payload`);
      }
      return redactN8nResponse(
        await triggerWebhook(args.webhook_path as string, payload, scope, tenant),
      );
    }
    case "list_supabase_tables":
      return listSupabaseTables();
    case "query_supabase_table":
      return querySupabaseTable(args.table as string, {
        select: args.select as string | undefined,
        limit: args.limit as number | undefined,
        filter: args.filter as string | undefined,
        order: args.order as string | undefined,
      });
    case "count_supabase_table":
      return countSupabaseTable(args.table as string, args.filter as string | undefined);
    case "github_list_files":
      return githubListFiles((args.repo as string) ?? "clovisart13-gif/atos-control-center", (args.path as string) ?? "");
    case "github_read_file":
      return githubReadFile((args.repo as string) ?? "clovisart13-gif/atos-control-center", args.path as string);
    case "github_list_mirage_files":
      return githubListFiles("clovisart13-gif/mirage-hub", (args.path as string) ?? "");
    case "github_read_mirage_file":
      return githubReadFile("clovisart13-gif/mirage-hub", args.path as string);
    // ── ATOS ──
    case "atos_dispatch":
      return atosDispatch(args.decision, args.plan, args.tasks as unknown[]);
    case "atos_status":
      return atosStatus();
    case "atos_list_tasks":
      return atosListTasks(args.status as string | undefined);
    case "atos_list_decisions":
      return atosListDecisions();
    case "atos_trigger_dispatcher":
      return atosTriggerDispatcher();
    case "atos_execute_next":
      return atosExecuteNext();
    case "atos_run_until_empty":
      return atosRunUntilEmpty(args.maxRuns as number | undefined, args.timeoutMs as number | undefined);
    case "atos_list_deliveries":
      return atosListDeliveries(args.limit as number | undefined);
    case "atos_get_delivery":
      return atosGetDelivery(args.id as number);
    case "atos_register_delivery":
      return atosRegisterDelivery(args.delivery ?? args);
    case "atos_list_errors":
      return atosListErrors(args.limit as number | undefined);
    // ── KANBAN ──
    case "kanban_list_orders":
      return kanbanListOrders(args.tenant_id as string, args.fase_atual as string | undefined, args.limit as number | undefined);
    case "kanban_list_stages":
      return kanbanListStages(args.tenant_id as string | undefined);
    case "kanban_get_order":
      return kanbanGetOrder(args.referencia_id as string);
    case "kanban_move_order":
      return kanbanMoveOrder(args.referencia_id as string, args.nova_fase as string, args.tenant_id as string);
    case "kanban_update_stage_config":
      return kanbanUpdateStageConfig(args.tenant_id as string, args.configs as Array<{ fase_id: string; nome_exibicao?: string; ordem?: number; oculta?: boolean; cor?: string }>);
    case "kanban_sql":
      return kanbanSql(args.query as string);
    case "mentor_get_history":
      return mentorGetHistory(args.limit as number | undefined, args.offset as number | undefined);
    case "get_business_overview":
      return getBusinessOverview();
    // ── BLUEPRINT / MEMÓRIA ──
    case "update_mentor_memory": {
      const fields: Record<string, string> = {};
      if (args.current_state)     fields["current_state"]     = args.current_state as string;
      if (args.active_priorities) fields["active_priorities"] = args.active_priorities as string;
      if (args.recent_decisions)  fields["recent_decisions"]  = args.recent_decisions as string;
      if (args.open_loops)        fields["open_loops"]        = args.open_loops as string;
      fields["last_update"] = new Date().toISOString();
      const { error } = await supabaseAdmin.from("mentor_memory").update(fields).not("id", "is", null);
      if (error) throw new Error(`update_mentor_memory: ${error.message}`);
      return { success: true, updated: Object.keys(fields) };
    }
    case "update_system_blueprint": {
      const { content, version, title } = args as { content: string; version?: string; title?: string };
      if (!content) throw new Error("update_system_blueprint: campo 'content' obrigatório");
      const update: Record<string, string> = { content, updated_at: new Date().toISOString() };
      if (version) update["version"] = version;
      if (title)   update["title"]   = title;
      const { error } = await supabaseAdmin.from("system_blueprint").update(update).not("id", "is", null);
      if (error) throw new Error(`update_system_blueprint: ${error.message}`);
      return { success: true, updated: Object.keys(update) };
    }
    case "update_ecosystem_context": {
      const { content } = args as { content: string };
      if (!content) throw new Error("update_ecosystem_context: campo 'content' obrigatório");
      const { error } = await supabaseAdmin.from("ecosytem_core_context")
        .update({ content, updated_at: new Date().toISOString() })
        .not("id", "is", null);
      if (error) throw new Error(`update_ecosystem_context: ${error.message}`);
      return { success: true };
    }
    // ── HUB API INTERNA ─────────────────────────────────────────────────────────
    // call_hub_api: chama qualquer endpoint interno do Hub com autenticação automática
    // launch_marketing_campaign: atalho direto para criar campanha + gerar criativos
    case "call_hub_api": {
      const { method = "POST", path: apiPath, body: apiBody } = args as { method?: string; path: string; body?: Record<string, unknown> };
      if (!apiPath) throw new Error("call_hub_api: campo 'path' obrigatório (ex: /api/internal/marketing/launch-campaign)");
      const scope = requireWorkflowScope(args, action);
      const requestedTenant = apiBody?.tenant_id ?? apiBody?.company_slug;
      if (scope === "platform" && requestedTenant !== undefined) {
        throw new Error("call_hub_api: platform não pode operar endpoints de tenant; declare o scope do tenant proprietário");
      }
      if (scope !== "platform") assertTenantScope(requestedTenant, scope, action);
      if (scope !== "platform" && /r2pb|mirage/i.test(apiPath)) {
        assertWorkflowScope(apiPath, scope, "endpoint interno");
      }
      const hubBase = process.env["HUB_INTERNAL_BASE_URL"] ?? "http://localhost:8080";
      const internalKey = process.env["MARKETING_INTERNAL_API_KEY"] ?? INTERNAL_SECRET;
      const url = `${hubBase}${apiPath.startsWith("/") ? apiPath : `/${apiPath}`}`;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "x-internal-key": internalKey },
        body: apiBody ? JSON.stringify(apiBody) : undefined,
      });
      const text = await res.text();
      let data: unknown;
      try { data = JSON.parse(text); } catch { data = text; }
      if (!res.ok) throw new Error(`call_hub_api ${method} ${apiPath}: ${res.status} — ${text.slice(0, 300)}`);
      return data;
    }
    // ── TRÁFEGO (GA4 + Meta Ads) ────────────────────────────────────────────────
    case "traffic_ga4": {
      const days = (args.days as number) ?? 7;
      const hubBase = process.env["HUB_INTERNAL_BASE_URL"] ?? "http://localhost:8080";
      const internalKey = process.env["MARKETING_INTERNAL_API_KEY"] ?? INTERNAL_SECRET;
      const res = await fetch(`${hubBase}/api/internal/traffic/ga4?days=${days}`, {
        headers: { "x-internal-key": internalKey },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`traffic_ga4: ${JSON.stringify(data)}`);
      return data;
    }
    case "traffic_meta_ads": {
      const days = (args.days as number) ?? 7;
      const hubBase = process.env["HUB_INTERNAL_BASE_URL"] ?? "http://localhost:8080";
      const internalKey = process.env["MARKETING_INTERNAL_API_KEY"] ?? INTERNAL_SECRET;
      const res = await fetch(`${hubBase}/api/internal/traffic/meta-ads?days=${days}`, {
        headers: { "x-internal-key": internalKey },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`traffic_meta_ads: ${JSON.stringify(data)}`);
      return data;
    }
    case "traffic_summary": {
      const days = (args.days as number) ?? 7;
      const hubBase = process.env["HUB_INTERNAL_BASE_URL"] ?? "http://localhost:8080";
      const internalKey = process.env["MARKETING_INTERNAL_API_KEY"] ?? INTERNAL_SECRET;
      const res = await fetch(`${hubBase}/api/internal/traffic/summary?days=${days}`, {
        headers: { "x-internal-key": internalKey },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`traffic_summary: ${JSON.stringify(data)}`);
      return data;
    }
    case "launch_marketing_campaign": {
      // Atalho: cria campanha + dispara geração automática de criativos
      // Args: brief (obrigatório), tenant_id, channel, oferta, angulo, nicho, intencao_criativa, estagio_funil
      const { brief, tenant_id, channel, oferta, angulo, nicho, intencao_criativa, estagio_funil, slot_count, slots } = args as Record<string, any>;
      if (!brief) throw new Error("launch_marketing_campaign: campo 'brief' obrigatório");
      const scope = requireWorkflowScope(args, action);
      assertTenantScope(tenant_id, scope, action);
      const hubBase = process.env["HUB_INTERNAL_BASE_URL"] ?? "http://localhost:8080";
      const internalKey = process.env["MARKETING_INTERNAL_API_KEY"] ?? INTERNAL_SECRET;
      const res = await fetch(`${hubBase}/api/internal/marketing/launch-campaign`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-internal-key": internalKey },
        body: JSON.stringify({ brief, tenant_id, channel, oferta, angulo, nicho, intencao_criativa, estagio_funil, slot_count, slots }),
      });
      const text = await res.text();
      let data: unknown;
      try { data = JSON.parse(text); } catch { data = text; }
      if (!res.ok) throw new Error(`launch_marketing_campaign: ${res.status} — ${text.slice(0, 300)}`);
      return data;
    }
    default:
      throw new Error(`Ação desconhecida: "${action}". Disponíveis: traffic_ga4, traffic_meta_ads, traffic_summary, list_n8n_workflows, get_n8n_workflow, activate_n8n_workflow, activate_workflow_by_name, deactivate_n8n_workflow, create_n8n_workflow, create_and_activate_n8n_workflow, update_n8n_workflow, trigger_n8n_webhook, list_supabase_tables, query_supabase_table, count_supabase_table, github_list_files, github_read_file, atos_dispatch, atos_status, atos_list_tasks, atos_list_decisions, atos_trigger_dispatcher, atos_execute_next, atos_run_until_empty, atos_list_deliveries, atos_get_delivery, atos_register_delivery, atos_list_errors, kanban_list_orders, kanban_list_stages, kanban_get_order, kanban_move_order, kanban_update_stage_config, kanban_sql, mentor_get_history, get_business_overview, update_mentor_memory, update_system_blueprint, update_ecosystem_context, call_hub_api, launch_marketing_campaign`);
  }
}

// ── PRÉ-CONTEXTO (detecta intenção antes do LLM) ─────────────────────────────

export async function resolvePreContext(message: string): Promise<string | null> {
  const lower = message.toLowerCase();
  if (lower.includes("workflow") || lower.includes("fluxos") || lower.includes("automações") || lower.includes("n8n")) {
    return "[ATOS_EXECUTOR — n8n] O pré-contexto não consulta workflows automaticamente. Para ler ou operar uma automação, informe a ação com scope e tenant_id/company_slug compatíveis (r2pb ou mirage).";
  }

  if (lower.includes("tabelas") || lower.includes("supabase") || lower.includes("banco de dados") || lower.includes("database")) {
    try {
      const tables = await listSupabaseTables();
      if (tables.length === 0) return "[SUPABASE] Nenhuma tabela encontrada.";
      const list = tables.map(t => `- **${t.name}**`).join("\n");
      return `[SUPABASE] Tabelas (${tables.length}):\n${list}`;
    } catch (err: any) {
      return `[SUPABASE] Erro: ${err.message}`;
    }
  }

  if (lower.includes("atos") || lower.includes("decisão") || lower.includes("decisoes") || lower.includes("task") || lower.includes("dispatcher") || lower.includes("sistema operacional")) {
    try {
      const status = await atosStatus() as any;
      const tasks  = status.tasks ?? {};
      return `[ATOS — Sistema Operacional]\n- Decisões: ${status.decisions}\n- Tasks: ${tasks.total} total (pending:${tasks.pending} | ready:${tasks.ready} | running:${tasks.running} | completed:${tasks.completed} | failed:${tasks.failed})\n- Erros: ${status.errors}\n\nDispatcher: ATOS_EXECUTOR_DISPATCHER_V1 (webhook: atos-dispatcher) — ATIVO`;
    } catch (err: any) {
      return `[ATOS] Erro ao consultar status: ${err.message}`;
    }
  }

  return null;
}

// Exporta getSetting para uso nos endpoints
export { getSetting };
