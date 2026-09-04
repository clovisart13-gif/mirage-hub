/**
 * Monitor de saúde dos workflows n8n
 *
 * Roda a cada 5 minutos e inspeciona as execuções recentes de todos os
 * workflows ATIVOS. Detecta dois cenários distintos:
 *
 * 1. LIMITE DE PLANO — Vários workflows falham simultaneamente em <500ms
 *    com erro de "Execution limit reached". Não adianta desativar — o
 *    problema é de cota. Alerta Clóvis via WhatsApp para upgrade.
 *
 * 2. BUG DE CÓDIGO — Um workflow específico tem ≥5 erros consecutivos
 *    (sem intercalar sucesso). Desativa o workflow automaticamente e
 *    alerta Clóvis com o nome, ID e hora do primeiro erro.
 *
 * Anti-spam: cada workflow tem cooldown de 2 horas entre alertas.
 *            O alerta de limite de plano tem cooldown de 4 horas.
 */

import { logger } from "../lib/logger";
import { deactivateWorkflow as deactivateScopedWorkflow, inferWorkflowScope } from "../routes/mentor/athosBridge";

// ── Config ────────────────────────────────────────────────────────────────────

// n8n Cloud — lê da env (mesmas vars que o athosBridge usa)
const N8N_BASE_URL  = process.env["N8N_BASE_URL"]  ?? "https://clovisart13.app.n8n.cloud";
const N8N_API_KEY   = process.env["N8N_API_KEY"]   ?? "";

// ⚠️ Canal administrativo da Mirage — configurar ZAPI_INSTANCE_ADMIN / ZAPI_TOKEN_ADMIN nos secrets.
// Se não configurados, alertas são emitidos apenas no log (sem WhatsApp via Z-API).
const ZAPI_INSTANCE = process.env["ZAPI_INSTANCE_ADMIN"] ?? "";
const ZAPI_TOKEN    = process.env["ZAPI_TOKEN_ADMIN"]    ?? "";
const ADMIN_PHONE   = process.env["ALERT_PHONE_ADMIN"] ?? "5511969243563";

// Thresholds
const CONSECUTIVE_ERRORS_TO_DEACTIVATE = 5;  // erros seguidos sem sucesso
const PLAN_LIMIT_DURATION_MS = 500;           // execuções < 500ms = provável limite de plano
const PLAN_LIMIT_MIN_WORKFLOWS = 2;           // quantos workflows simultâneos = alerta de plano
const CHECK_INTERVAL_MS  = 5  * 60 * 1000;   // verificar a cada 5 min
const COOLDOWN_WORKFLOW  = 2  * 60 * 60 * 1000; // 2h entre alertas por workflow
const COOLDOWN_PLAN      = 4  * 60 * 60 * 1000; // 4h entre alertas de limite de plano
const WINDOW_MS          = 30 * 60 * 1000;   // janela de análise: últimos 30 min

// ── Estado em memória ─────────────────────────────────────────────────────────

/** Timestamp do último alerta por workflowId */
const lastAlertByWorkflow = new Map<string, number>();
/** Timestamp do último alerta de limite de plano */
let lastPlanLimitAlertAt = 0;
/** Timer do interval */
let monitorInterval: ReturnType<typeof setInterval> | null = null;
/** Handoffs já criados por workflowId — evita duplicatas */
const handoffCreatedForWorkflow = new Map<string, number>();
/** Cooldown para criação de handoff (24h — se já falhou hoje, não cria de novo) */
const HANDOFF_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface N8nExecution {
  id: string;
  status: "success" | "error" | "waiting" | "running" | "canceled";
  workflowId: string;
  startedAt: string;
  stoppedAt: string | null;
}

interface WorkflowHealth {
  workflowId: string;
  workflowName: string;
  active: boolean;
  recentErrors: number;
  recentSuccesses: number;
  consecutiveErrors: number;
  likelyPlanLimit: boolean;
  avgDurationMs: number | null;
  lastErrorAt: string | null;
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

async function n8nGet<T>(path: string): Promise<T> {
  const key = N8N_API_KEY || (await getN8nKeyFromDb());
  const res = await fetch(`${N8N_BASE_URL}${path}`, {
    headers: { "X-N8N-API-KEY": key, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`n8n GET ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

async function getN8nKeyFromDb(): Promise<string> {
  try {
    const { db, mentorSettings } = await import("@workspace/db");
    const { eq } = await import("drizzle-orm");
    const [row] = await db.select().from(mentorSettings).where(eq(mentorSettings.key, "n8n_api_key")).limit(1);
    return row?.value ?? "";
  } catch {
    return "";
  }
}

// ── WhatsApp alert ────────────────────────────────────────────────────────────

async function sendAlert(message: string): Promise<void> {
  const { sendAdminAlert } = await import("../lib/adminAlert");
  await sendAdminAlert("N8nMonitor", message);
}

// ── Criação de handoff de reparo ──────────────────────────────────────────────

async function createRepairHandoff(h: {
  workflowId: string;
  workflowName: string;
  consecutiveErrors: number;
  avgDurationMs: number | null;
  lastErrorAt: string | null;
}): Promise<void> {
  // Anti-duplicata: não cria handoff para o mesmo workflow dentro de 24h
  const lastCreated = handoffCreatedForWorkflow.get(h.workflowId) ?? 0;
  if (Date.now() - lastCreated < HANDOFF_COOLDOWN_MS) {
    logger.info({ workflowId: h.workflowId }, "[N8nMonitor] handoff já criado recentemente — suprimido");
    return;
  }

  // Verifica se já existe handoff pendente para este workflow
  try {
    const { db, agentHandoffs } = await import("@workspace/db");
    const { sql } = await import("drizzle-orm");

    // Checar se já há handoff pending/in_progress com este workflowId no título ou contexto
    const existing = await db
      .select({ id: agentHandoffs.id })
      .from(agentHandoffs)
      .where(sql`status IN ('pending','in_progress') AND (title ILIKE ${'%' + h.workflowId + '%'} OR context ILIKE ${'%' + h.workflowId + '%'})`)
      .limit(1);

    if (existing.length > 0) {
      logger.info({ workflowId: h.workflowId, existingId: existing[0]?.id }, "[N8nMonitor] handoff já existe — não cria duplicata");
      return;
    }

    const n8nBase = N8N_BASE_URL;
    const lastErrStr = h.lastErrorAt
      ? new Date(h.lastErrorAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
      : "desconhecido";

    await db.insert(agentHandoffs).values({
      title: `🔴 Reparo automático: ${h.workflowName}`,
      instruction: [
        `O workflow n8n "${h.workflowName}" (ID: ${h.workflowId}) foi desativado automaticamente após ${h.consecutiveErrors} erros consecutivos.`,
        ``,
        `MISSÃO:`,
        `1. Investigue a causa raiz acessando o histórico de execuções via API n8n:`,
        `   GET ${n8nBase}/api/v1/executions?workflowId=${h.workflowId}&limit=10`,
        `   GET ${n8nBase}/api/v1/executions/<id_do_ultimo_erro>  (para ver o detalhe do erro)`,
        ``,
        `2. Se o problema for configuração do workflow (credencial expirada, URL errada, nó mal configurado):`,
        `   - Corrija via API n8n: GET + PUT /api/v1/workflows/${h.workflowId}`,
        `   - Reative: POST ${n8nBase}/api/v1/workflows/${h.workflowId}/activate`,
        ``,
        `3. Se o problema for no código do servidor (TypeScript):`,
        `   - Identifique o arquivo com bug`,
        `   - Aplique o menor fix possível`,
        `   - Chame complete_task, depois restart_server`,
        ``,
        `4. NUNCA crie nova funcionalidade. Apenas restaure o que estava funcionando.`,
      ].join("\n"),
      context: JSON.stringify({
        workflowId: h.workflowId,
        workflowName: h.workflowName,
        consecutiveErrors: h.consecutiveErrors,
        avgDurationMs: h.avgDurationMs,
        lastErrorAt: h.lastErrorAt,
        lastErrorFormatted: lastErrStr,
        n8nBase,
        detectedAt: new Date().toISOString(),
      }),
      acceptanceCriteria: `O workflow "${h.workflowName}" está ativo e executando sem erros. O resumo explica a causa raiz e o que foi corrigido.`,
      originAgent: "n8n-health-monitor",
      targetAgent: "replit",
      priority: "high",
      tags: ["repair", "auto-detected", "n8n"],
      status: "pending",
    });

    handoffCreatedForWorkflow.set(h.workflowId, Date.now());
    logger.info({ workflowId: h.workflowId, workflowName: h.workflowName }, "[N8nMonitor] ✅ handoff de reparo criado");

  } catch (err: any) {
    logger.error({ err: err?.message, workflowId: h.workflowId }, "[N8nMonitor] falha ao criar handoff de reparo");
  }
}

// ── Core check ───────────────────────────────────────────────────────────────

export async function checkN8nWorkflowHealth(): Promise<WorkflowHealth[]> {
  const key = N8N_API_KEY || (await getN8nKeyFromDb());
  if (!key) {
    logger.warn("[N8nMonitor] N8N_API_KEY não configurada — monitor desativado");
    return [];
  }

  // 1. Busca workflows ativos
  const wfData = await n8nGet<{ data: Array<{ id: string; name: string; active: boolean }> }>(
    "/api/v1/workflows?limit=100"
  );
  const activeWorkflows = wfData.data.filter(w => {
    if (!w.active) return false;
    if (inferWorkflowScope(w.name)) return true;
    logger.warn(
      { workflowId: w.id, workflowName: w.name },
      "[N8nMonitor] workflow ativo ignorado: não possui prefixo de escopo válido"
    );
    return false;
  });
  if (activeWorkflows.length === 0) return [];

  const nameById = new Map(activeWorkflows.map(w => [w.id, w.name]));

  // 2. Busca execuções recentes (janela de 30 min)
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const execData = await n8nGet<{ data: N8nExecution[] }>(
    `/api/v1/executions?limit=200&includeData=false`
  );
  const recentExecs = execData.data.filter(e => {
    if (!e.startedAt) return false;
    return new Date(e.startedAt).getTime() > Date.now() - WINDOW_MS;
  });

  // 3. Agrupa por workflowId (apenas workflows ativos)
  const byWorkflow = new Map<string, N8nExecution[]>();
  for (const e of recentExecs) {
    if (!nameById.has(e.workflowId)) continue;
    if (!byWorkflow.has(e.workflowId)) byWorkflow.set(e.workflowId, []);
    byWorkflow.get(e.workflowId)!.push(e);
  }

  // 4. Analisa cada workflow
  const healths: WorkflowHealth[] = [];
  for (const wf of activeWorkflows) {
    const execs = byWorkflow.get(wf.id) ?? [];
    if (execs.length === 0) continue; // sem execuções recentes = não avalia

    const errors   = execs.filter(e => e.status === "error");
    const successes = execs.filter(e => e.status === "success");

    // Erros consecutivos (mais recentes primeiro — API retorna DESC)
    let consecutiveErrors = 0;
    for (const e of execs) {
      if (e.status === "error") consecutiveErrors++;
      else break;
    }

    // Duração média dos erros (ms)
    const errorDurations = errors
      .filter(e => e.stoppedAt)
      .map(e => new Date(e.stoppedAt!).getTime() - new Date(e.startedAt).getTime())
      .filter(d => d >= 0);
    const avgDurationMs = errorDurations.length > 0
      ? Math.round(errorDurations.reduce((a, b) => a + b, 0) / errorDurations.length)
      : null;

    // Heurística de "limite de plano": falha muito rápida (< 500ms)
    const likelyPlanLimit = avgDurationMs !== null && avgDurationMs < PLAN_LIMIT_DURATION_MS && errors.length >= 3;

    const lastError = errors.length > 0
      ? errors.reduce((a, b) => new Date(a.startedAt) > new Date(b.startedAt) ? a : b)
      : null;

    healths.push({
      workflowId: wf.id,
      workflowName: wf.name,
      active: true,
      recentErrors: errors.length,
      recentSuccesses: successes.length,
      consecutiveErrors,
      likelyPlanLimit,
      avgDurationMs,
      lastErrorAt: lastError?.startedAt ?? null,
    });
  }

  return healths;
}

async function runMonitorCycle(): Promise<void> {
  let healths: WorkflowHealth[];
  try {
    healths = await checkN8nWorkflowHealth();
  } catch (err: any) {
    logger.error({ err: err?.message }, "[N8nMonitor] erro ao buscar dados do n8n");
    return;
  }

  if (healths.length === 0) return;

  const now = Date.now();
  const nowBR = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  // ── Detecta limite de plano ───────────────────────────────────────────────
  const planLimitWorkflows = healths.filter(h => h.likelyPlanLimit);
  if (planLimitWorkflows.length >= PLAN_LIMIT_MIN_WORKFLOWS) {
    logger.error(
      { count: planLimitWorkflows.length, names: planLimitWorkflows.map(h => h.workflowName) },
      "[N8nMonitor] 🚨 LIMITE DE PLANO N8N detectado — múltiplos workflows falhando instantaneamente"
    );

    const sinceLastAlert = now - lastPlanLimitAlertAt;
    if (lastPlanLimitAlertAt === 0 || sinceLastAlert > COOLDOWN_PLAN) {
      const names = planLimitWorkflows.map(h => `• ${h.workflowName}`).join("\n");
      const msg = [
        "🚨 *ALERTA CRÍTICO — Mirage Hub*",
        "",
        "⛔ *Limite de execuções do plano n8n atingido!*",
        "",
        `Os workflows abaixo falharam ${planLimitWorkflows[0]?.recentErrors ?? "várias"} vezes em < 500ms — sinal claro de cota esgotada:`,
        "",
        names,
        "",
        "👉 *Ação necessária:*",
        "Acesse n8n → Settings → Usage para ver a cota.",
        "Considere fazer upgrade do plano ou aguardar a renovação.",
        "",
        `🕐 ${nowBR}`,
      ].join("\n");

      await sendAlert(msg);
      lastPlanLimitAlertAt = now;
    }
    return; // não tenta deactivar workflows quando é problema de plano
  }

  // ── Detecta bugs de código (erros consecutivos) ───────────────────────────
  for (const h of healths) {
    if (h.consecutiveErrors < CONSECUTIVE_ERRORS_TO_DEACTIVATE) continue;

    logger.error(
      { workflowId: h.workflowId, workflowName: h.workflowName, consecutiveErrors: h.consecutiveErrors },
      "[N8nMonitor] 🔴 workflow com erros consecutivos — desativando automaticamente"
    );

    const lastAlert = lastAlertByWorkflow.get(h.workflowId) ?? 0;
    const sinceLastAlert = now - lastAlert;
    if (lastAlert > 0 && sinceLastAlert < COOLDOWN_WORKFLOW) {
      logger.info({ workflowId: h.workflowId, sinceLastAlert }, "[N8nMonitor] alerta suprimido por cooldown");
      continue;
    }

    const workflowScope = inferWorkflowScope(h.workflowName);
    if (!workflowScope) {
      logger.error(
        { workflowId: h.workflowId, workflowName: h.workflowName },
        "[N8nMonitor] desativação bloqueada: workflow sem escopo identificável"
      );
      continue;
    }

    // Desativa apenas depois de validar o escopo que o nome do workflow declara.
    const deactivated = await deactivateScopedWorkflow(h.workflowId, workflowScope)
      .then(() => true)
      .catch(err => {
        logger.error(
          { err: err?.message, workflowId: h.workflowId, workflowScope },
          "[N8nMonitor] falha na desativação escopada"
        );
        return false;
      });
    const statusIcon = deactivated ? "✅ desativado automaticamente" : "⚠️ falha ao desativar — verifique manualmente";

    const lastErrStr = h.lastErrorAt
      ? new Date(h.lastErrorAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
      : "desconhecido";

    const msg = [
      "🔴 *WORKFLOW DESATIVADO — Mirage Hub*",
      "",
      `*${h.workflowName}*`,
      `ID: \`${h.workflowId}\``,
      "",
      `❌ ${h.consecutiveErrors} erros consecutivos detectados`,
      `⏱ Duração média: ${h.avgDurationMs !== null ? `${h.avgDurationMs}ms` : "N/A"}`,
      `🕐 Último erro: ${lastErrStr}`,
      "",
      statusIcon,
      "",
      "👉 Verifique o workflow no n8n, corrija o erro e reative quando pronto.",
      `ATHOS pode reativar com: *"ative o workflow ${h.workflowName}"*`,
    ].join("\n");

    await sendAlert(msg);
    lastAlertByWorkflow.set(h.workflowId, now);

    if (deactivated) {
      logger.info({ workflowId: h.workflowId }, "[N8nMonitor] workflow desativado com sucesso");
    } else {
      logger.warn({ workflowId: h.workflowId }, "[N8nMonitor] não foi possível desativar via API");
    }

    // Cria handoff para o agentExecutor investigar e corrigir
    await createRepairHandoff(h);
  }

  // Log de ciclo saudável
  const sickCount = healths.filter(h => h.consecutiveErrors >= 3).length;
  const healthyCount = healths.filter(h => h.consecutiveErrors === 0).length;
  logger.info(
    { total: healths.length, healthy: healthyCount, withErrors: sickCount },
    "[N8nMonitor] ciclo concluído"
  );
}

// ── API pública ───────────────────────────────────────────────────────────────

export function startN8nHealthMonitor(): void {
  if (monitorInterval) return;

  const key = N8N_API_KEY || process.env["N8N_API_KEY"] || "";
  if (!key) {
    // Vai tentar ler do banco — não bloqueia o start
    logger.info("[N8nMonitor] N8N_API_KEY não está no env; tentará ler do banco a cada ciclo");
  }

  logger.info(
    { checkIntervalMin: CHECK_INTERVAL_MS / 60_000, windowMin: WINDOW_MS / 60_000 },
    "[N8nMonitor] monitor iniciado"
  );

  // Primeira verificação após 3 min (servidor precisa subir)
  setTimeout(() => {
    runMonitorCycle().catch(e =>
      logger.error({ err: e?.message }, "[N8nMonitor] erro no ciclo inicial")
    );
  }, 3 * 60 * 1000);

  monitorInterval = setInterval(() => {
    runMonitorCycle().catch(e =>
      logger.error({ err: e?.message }, "[N8nMonitor] erro no ciclo periódico")
    );
  }, CHECK_INTERVAL_MS);
}

export function stopN8nHealthMonitor(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
}

/** Retorna o estado atual dos cooldowns (para diagnóstico via API) */
export function getN8nMonitorState(): {
  running: boolean;
  lastPlanLimitAlertAt: string | null;
  workflowCooldowns: Array<{ workflowId: string; lastAlertAt: string; cooldownRemainingMin: number }>;
} {
  const now = Date.now();
  return {
    running: monitorInterval !== null,
    lastPlanLimitAlertAt: lastPlanLimitAlertAt > 0 ? new Date(lastPlanLimitAlertAt).toISOString() : null,
    workflowCooldowns: Array.from(lastAlertByWorkflow.entries()).map(([id, ts]) => ({
      workflowId: id,
      lastAlertAt: new Date(ts).toISOString(),
      cooldownRemainingMin: Math.max(0, Math.ceil((COOLDOWN_WORKFLOW - (now - ts)) / 60_000)),
    })),
  };
}
