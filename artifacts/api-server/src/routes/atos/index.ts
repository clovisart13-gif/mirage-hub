/**
 * ATOS API — Sistema Operacional ATHOS→ATOS
 *
 * Endpoints:
 *   POST /api/atos/dispatch              → cria decisão + plano + tasks atomicamente
 *   POST /api/atos/run-until-empty       → consome fila inteira com limite de segurança
 *   GET  /api/atos/decisions             → lista decisões
 *   GET  /api/atos/decisions/:id         → decisão completa (plano, tasks, erros, entregas)
 *   GET  /api/atos/tasks                 → lista tasks (filtro por status/planId)
 *   GET  /api/atos/tasks/next            → próxima task ready (marca como running)
 *   POST /api/atos/tasks/:id/result      → salva resultado do executor
 *   POST /api/atos/tasks/:id/ready       → libera task para execução (pending|failed → ready)
 *   POST /api/atos/execute-next          → executa próxima task diretamente no servidor
 *   POST /api/atos/errors                → registra erro do dispatcher
 *   GET  /api/atos/errors                → lista erros
 *   POST /api/atos/deliveries            → registra entrega do Replit Agent
 *   GET  /api/atos/deliveries            → lista entregas
 *   GET  /api/atos/deliveries/:id        → detalhe de uma entrega
 *   GET  /api/atos/status                → resumo operacional completo
 */

import { Router } from "express";
import { eq, and, asc, desc, inArray, sql } from "drizzle-orm";
import {
  db,
  atosDecisions, atosPlans, atosTasks, atosErrors, atosDeliveries, atosTaskEvents, mentorSettings,
} from "@workspace/db";
import { requireAuth, requireSuperAdmin, type AuthenticatedRequest } from "../../middlewares/auth";
import { INTERNAL_SECRET } from "../../internalSecret";
import {
  activateWorkflow,
  createWorkflow,
  deactivateWorkflow,
} from "../mentor/athosBridge";
import {
  assertWorkflowScope,
  requireWorkflowTenantScope,
} from "../../lib/workflowScope";
import { z } from "zod";

const router = Router();

// Cache do token externo (n8n cloud) para não bater no banco em cada request
let _cachedAtosToken: string | null = null;

async function getAtosToken(): Promise<string | null> {
  if (_cachedAtosToken) return _cachedAtosToken;
  const [row] = await db.select().from(mentorSettings)
    .where(eq(mentorSettings.key, "atos_api_token"));
  _cachedAtosToken = row?.value ?? null;
  return _cachedAtosToken;
}

// Aceita: (1) chamadas de loopback (mesmo processo), (2) INTERNAL_SECRET, (3) token n8n no DB, (4) sessão admin
async function atosAuth(req: any, res: any, next: () => void) {
  // Chamadas de localhost são sempre internas (bridge no mesmo processo)
  const remoteAddr: string = req.socket?.remoteAddress ?? req.connection?.remoteAddress ?? "";
  const isLoopback = remoteAddr === "127.0.0.1" || remoteAddr === "::1" || remoteAddr === "::ffff:127.0.0.1";
  if (isLoopback) { next(); return; }

  const authHeader = req.headers["authorization"] as string | undefined;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    // Segredo interno de processo
    if (token === INTERNAL_SECRET) { next(); return; }
    // Token externo persistido no banco (para n8n cloud)
    const stored = await getAtosToken();
    if (stored && token === stored) { next(); return; }
    res.status(401).json({ error: "Token ATOS inválido" }); return;
  }
  requireAuth(req, res, () => requireSuperAdmin(req, res, next));
}

const adminOnly = atosAuth;

// ── helper: registra evento de transição de status ────────────────────────
async function recordEvent(
  taskId: number,
  fromStatus: string | null,
  toStatus: string,
  origin: "athos" | "replit_agent" | "system",
  notes?: string,
) {
  try {
    await db.insert(atosTaskEvents).values({
      taskId,
      fromStatus: fromStatus ?? null,
      toStatus,
      origin,
      notes: notes ?? null,
    });
  } catch (_) {
    // não bloqueia a operação principal se o evento falhar
  }
}

// ── Transições válidas para tasks replit_agent_handoff ───────────────────
const REPLIT_TRANSITIONS: Record<string, string> = {
  pending_handoff:    "captured_by_replit",
  captured_by_replit: "running",
  running:            "delivered",
};

// ── POST /api/atos/dispatch ────────────────────────────────────────────────
const TaskTypeEnum = z.enum([
  "n8n_workflow_builder",
  "n8n_workflow_activation",
  "http_integration_test",
  "hub_backend_handoff",
  "supabase_schema_ops",
  "documentation",
  "replit_agent_handoff",
  "strategy_decision",
  "content_creation",
  "ux_improvement",
]);

type N8nTaskType = "n8n_workflow_builder" | "n8n_workflow_activation";

function getScopedN8nTaskPayload(
  taskType: N8nTaskType,
  payloadJson: unknown,
): { payload: Record<string, unknown>; scope: ReturnType<typeof requireWorkflowTenantScope>["scope"] } {
  if (!payloadJson || typeof payloadJson !== "object" || Array.isArray(payloadJson)) {
    throw new Error(`${taskType}: payload_json obrigatório`);
  }

  const payload = payloadJson as Record<string, unknown>;
  const forbiddenKey = Object.keys(payload).find(key =>
    /(?:n8n_)?api[_-]?key|authorization|access[_-]?token|secret|x-internal-key/i.test(key),
  );
  if (forbiddenKey) {
    throw new Error(`${taskType}: ${forbiddenKey} não pode ser enviado no payload; use a credencial gerenciada pelo bridge`);
  }

  const { scope } = requireWorkflowTenantScope(payload, taskType);
  return { payload, scope };
}

function validateN8nTaskForDispatch(task: {
  taskType: string;
  executorTarget?: string;
  payloadJson?: unknown;
}): void {
  if (task.taskType !== "n8n_workflow_builder" && task.taskType !== "n8n_workflow_activation") return;

  const { payload, scope } = getScopedN8nTaskPayload(task.taskType, task.payloadJson);
  if (task.taskType === "n8n_workflow_activation") {
    if (!task.executorTarget && !payload.workflow_id) {
      throw new Error("n8n_workflow_activation: workflow_id obrigatório");
    }
    return;
  }

  const workflow = payload.workflow_json ?? payload.workflow;
  if (!workflow || typeof workflow !== "object" || Array.isArray(workflow)) {
    throw new Error("n8n_workflow_builder: workflow_json obrigatório");
  }
  const name = String((workflow as Record<string, unknown>).name ?? "").trim();
  if (!name) throw new Error("n8n_workflow_builder: workflow_json.name obrigatório");
  assertWorkflowScope(name, scope, "n8n_workflow_builder.workflow_json");
}

const dispatchSchema = z.object({
  decision: z.object({
    title:         z.string().min(3),
    summary:       z.string().min(3),
    justification: z.string().optional(),
    scope:         z.string().optional(),
    decisionType:  z.string().optional(),
    companySlug:   z.string().optional(),
    metadataJson:  z.unknown().optional(),
  }),
  plan: z.object({
    planTitle:   z.string().min(3),
    planVersion: z.string().optional(),
    planJson:    z.unknown().optional(),
    description: z.string().optional(),
  }),
  tasks: z.array(z.object({
    taskCode:       z.string(),
    title:          z.string(),
    description:    z.string().optional(),
    taskType:       TaskTypeEnum,
    executorTarget: z.string().optional(),
    payloadJson:    z.unknown().optional(),
    dependsOn:      z.unknown().optional(),
    priority:       z.number().int().min(1).max(10).optional(),
    autoReady:      z.boolean().optional(),
  })).min(0).default([]),
});

router.post("/atos/dispatch", adminOnly, async (req: AuthenticatedRequest, res) => {
  const parsed = dispatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Payload inválido", details: parsed.error.issues });
    return;
  }

  const { decision, plan, tasks } = parsed.data;

  try {
    tasks.forEach(validateN8nTaskForDispatch);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
    return;
  }

  try {
    const [newDecision] = await db.insert(atosDecisions).values({
      title:         decision.title,
      summary:       decision.summary,
      justification: decision.justification,
      scope:         decision.scope,
      decisionType:  decision.decisionType ?? "strategic",
      companySlug:   decision.companySlug ?? null, // ⚠️ null = decisão de plataforma; jamais assume tenant r2pb por padrão
      status:        "pending",
      metadataJson:  (decision.metadataJson ?? null) as any,
    }).returning();

    const [newPlan] = await db.insert(atosPlans).values({
      decisionId:  newDecision.id,
      planTitle:   plan.planTitle,
      planVersion: plan.planVersion ?? "v1",
      status:      "pending",
      planJson:    (plan.planJson ?? null) as any,
    }).returning();

    const taskRows = tasks.map(t => ({
      planId:         newPlan.id,
      decisionId:     newDecision.id,
      taskCode:       t.taskCode,
      title:          t.title,
      description:    t.description,
      taskType:       t.taskType,
      executorTarget: t.executorTarget,
      payloadJson:    (t.payloadJson ?? null) as any,
      dependsOn:      (t.dependsOn ?? null) as any,
      priority:       t.priority ?? 5,
      // replit_agent_handoff sempre nasce como pending_handoff — aguarda captura explícita do Agent
      status:         t.taskType === "replit_agent_handoff"
                        ? "pending_handoff"
                        : t.autoReady ? "ready" : "pending",
      attemptCount:   0,
    }));

    const insertedTasks = taskRows.length > 0
      ? await db.insert(atosTasks).values(taskRows).returning()
      : [];

    const hasReady = insertedTasks.some(t => t.status === "ready");
    if (hasReady) {
      await db.update(atosDecisions)
        .set({ status: "ready", updatedAt: new Date() })
        .where(eq(atosDecisions.id, newDecision.id));
      await db.update(atosPlans)
        .set({ status: "ready", updatedAt: new Date() })
        .where(eq(atosPlans.id, newPlan.id));
    }

    res.json({
      ok: true,
      decisionId: newDecision.id,
      planId: newPlan.id,
      tasksCreated: insertedTasks.length,
      readyTasks: insertedTasks.filter(t => t.status === "ready").length,
      tasks: insertedTasks.map(t => ({
        id: t.id,
        taskCode: t.taskCode,
        status: t.status,
        taskType: t.taskType,
      })),
    });
  } catch (err: any) {
    req.log.error({ err: err.message }, "atos dispatch error");
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/atos/decisions ────────────────────────────────────────────────
router.get("/atos/decisions", adminOnly, async (_req: AuthenticatedRequest, res) => {
  const decisions = await db.select().from(atosDecisions).orderBy(asc(atosDecisions.id));
  res.json(decisions);
});

// ── GET /api/atos/decisions/:id ────────────────────────────────────────────
// Retorna decisão completa: plano, tasks, erros e entregas relacionadas (BLOCO 6)
router.get("/atos/decisions/:id", adminOnly, async (req: AuthenticatedRequest, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const [decision] = await db.select().from(atosDecisions).where(eq(atosDecisions.id, id));
  if (!decision) { res.status(404).json({ error: "Decisão não encontrada" }); return; }

  const plans      = await db.select().from(atosPlans).where(eq(atosPlans.decisionId, id));
  const planIds    = plans.map(p => p.id);
  const tasksList  = planIds.length
    ? await db.select().from(atosTasks).where(inArray(atosTasks.planId, planIds)).orderBy(asc(atosTasks.priority), asc(atosTasks.id))
    : [];
  const taskIds    = tasksList.map(t => t.id);
  const errorsList = taskIds.length
    ? await db.select().from(atosErrors).where(inArray(atosErrors.taskId, taskIds)).orderBy(desc(atosErrors.createdAt))
    : [];
  const deliveries = await db.select().from(atosDeliveries)
    .where(eq(atosDeliveries.relatedDecisionId, id))
    .orderBy(desc(atosDeliveries.createdAt));

  res.json({ ...decision, plans, tasks: tasksList, errors: errorsList, deliveries });
});

// ── GET /api/atos/tasks ────────────────────────────────────────────────────
router.get("/atos/tasks", adminOnly, async (req: AuthenticatedRequest, res) => {
  const statusRaw    = req.query.status;
  const planIdRaw    = req.query.planId;
  const statusFilter = typeof statusRaw  === "string" ? statusRaw  : Array.isArray(statusRaw)  ? String(statusRaw[0])  : undefined;
  const planIdStr    = typeof planIdRaw  === "string" ? planIdRaw  : Array.isArray(planIdRaw)   ? String(planIdRaw[0])  : undefined;
  const planId       = planIdStr ? parseInt(planIdStr, 10) : undefined;

  const tasksList = (statusFilter || (planId && !isNaN(planId)))
    ? await db.select().from(atosTasks)
        .where(and(
          statusFilter              ? eq(atosTasks.status, statusFilter) : undefined,
          planId && !isNaN(planId)  ? eq(atosTasks.planId, planId)      : undefined,
        ))
        .orderBy(asc(atosTasks.priority), asc(atosTasks.id))
    : await db.select().from(atosTasks)
        .orderBy(asc(atosTasks.priority), asc(atosTasks.id));

  res.json(tasksList);
});

// ── GET /api/atos/tasks/next ───────────────────────────────────────────────
// Retorna a próxima task ready e a marca como running atomicamente.
// Chamado pelo ATOS_EXECUTOR_DISPATCHER_V1 no n8n.
router.get("/atos/tasks/next", adminOnly, async (req: AuthenticatedRequest, res) => {
  try {
    const [task] = await db.select().from(atosTasks)
      .where(eq(atosTasks.status, "ready"))
      .orderBy(asc(atosTasks.priority), asc(atosTasks.id))
      .limit(1);

    if (!task) {
      res.json({ task: null, message: "Nenhuma task ready disponível" });
      return;
    }

    await db.update(atosTasks).set({
      status: "running",
      attemptCount: (task.attemptCount ?? 0) + 1,
      updatedAt: new Date(),
    }).where(eq(atosTasks.id, task.id));

    res.json({ task: { ...task, status: "running" } });
  } catch (err: any) {
    req.log.error({ err: err.message }, "atos tasks/next error");
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/atos/tasks/:id/result ───────────────────────────────────────
const resultSchema = z.object({
  success:    z.boolean(),
  resultJson: z.unknown().optional(),
  errorJson:  z.unknown().optional(),
});

router.post("/atos/tasks/:id/result", adminOnly, async (req: AuthenticatedRequest, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const parsed = resultSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Payload inválido" }); return; }

  const { success, resultJson, errorJson } = parsed.data;
  const status = success ? "completed" : "failed";

  await db.update(atosTasks).set({
    status,
    resultJson: (resultJson ?? null) as any,
    errorJson:  (errorJson  ?? null) as any,
    updatedAt: new Date(),
  }).where(eq(atosTasks.id, id));

  if (!success && errorJson) {
    const [task] = await db.select().from(atosTasks).where(eq(atosTasks.id, id));
    await db.insert(atosErrors).values({
      source:       "n8n_dispatcher",
      taskId:       id,
      workflowName: task?.executorTarget ?? null,
      errorMessage: (errorJson as any)?.message ?? "erro desconhecido",
      errorJson:    errorJson as any,
    });
  }

  res.json({ ok: true, taskId: id, status });
});

// ── GET /api/atos/tasks/:id/events ────────────────────────────────────────
router.get("/atos/tasks/:id/events", adminOnly, async (req: AuthenticatedRequest, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  const events = await db.select().from(atosTaskEvents)
    .where(eq(atosTaskEvents.taskId, id))
    .orderBy(asc(atosTaskEvents.createdAt));
  res.json(events);
});

// ── POST /api/atos/tasks/:id/replit-status ────────────────────────────────
// Permite ao Replit Agent atualizar o status de uma task replit_agent_handoff
// com transições validadas e auditoria completa de eventos.
const replitStatusSchema = z.object({
  status:          z.enum(["captured_by_replit", "running", "delivered"]),
  notes:           z.string().optional(),
  deliverySummary: z.string().optional(),
  deliveryPayload: z.unknown().optional(),
});

router.post("/atos/tasks/:id/replit-status", adminOnly, async (req: AuthenticatedRequest, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const parsed = replitStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Payload inválido", details: parsed.error.issues });
    return;
  }

  const { status: newStatus, notes, deliverySummary, deliveryPayload } = parsed.data;

  // Buscar task atual
  const [task] = await db.select().from(atosTasks).where(eq(atosTasks.id, id));
  if (!task) { res.status(404).json({ error: "Task não encontrada" }); return; }

  // Validar tipo
  if (task.taskType !== "replit_agent_handoff") {
    res.status(400).json({ error: "Este endpoint só aceita tasks do tipo replit_agent_handoff" });
    return;
  }

  // Validar transição
  const expectedFrom = REPLIT_TRANSITIONS[task.status];
  if (expectedFrom !== newStatus) {
    res.status(409).json({
      error: "Transição inválida",
      current: task.status,
      requested: newStatus,
      allowed: expectedFrom ?? "(nenhuma — ciclo encerrado)",
    });
    return;
  }

  // Montar update
  const updatePayload: Record<string, any> = {
    status: newStatus,
    updatedAt: new Date(),
  };

  if (newStatus === "delivered") {
    updatePayload.resultJson = {
      deliverySummary: deliverySummary ?? null,
      deliveryPayload: deliveryPayload ?? null,
      deliveredAt: new Date().toISOString(),
    };
  }

  await db.update(atosTasks).set(updatePayload).where(eq(atosTasks.id, id));

  await recordEvent(id, task.status, newStatus, "replit_agent", notes);

  res.json({
    ok: true,
    taskId: id,
    taskCode: task.taskCode,
    previousStatus: task.status,
    newStatus,
  });
});

// ── POST /api/atos/tasks/:id/ready ────────────────────────────────────────
// Aceita: pending → ready OU failed → ready (retry)
router.post("/atos/tasks/:id/ready", adminOnly, async (req: AuthenticatedRequest, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  await db.update(atosTasks).set({ status: "ready", updatedAt: new Date() })
    .where(eq(atosTasks.id, id));

  res.json({ ok: true, taskId: id, status: "ready" });
});

// ── POST /api/atos/errors ──────────────────────────────────────────────────
const errorSchema = z.object({
  source:       z.string().optional(),
  taskId:       z.number().int().optional(),
  workflowName: z.string().optional(),
  errorMessage: z.string(),
  errorJson:    z.unknown().optional(),
});

router.post("/atos/errors", adminOnly, async (req: AuthenticatedRequest, res) => {
  const parsed = errorSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Payload inválido" }); return; }

  const { source, taskId, workflowName, errorMessage, errorJson } = parsed.data;

  const [newErr] = await db.insert(atosErrors).values({
    source:       source ?? "n8n",
    taskId:       taskId ?? null,
    workflowName: workflowName ?? null,
    errorMessage,
    errorJson:    (errorJson ?? null) as any,
  }).returning();

  res.json({ ok: true, errorId: newErr.id });
});

// ── POST /api/atos/execute-next ───────────────────────────────────────────
// Pega a próxima task ready e a executa diretamente no servidor Node.js.
// Isso evita a dependência de fetch/require no Code node do n8n Cloud.
// n8n só dispara este endpoint via HTTP Request node; a lógica fica aqui.
router.post("/atos/execute-next", adminOnly, async (req: AuthenticatedRequest, res) => {
  // 1. Pegar próxima task ready (atomicamente)
  const [task] = await db.select().from(atosTasks)
    .where(eq(atosTasks.status, "ready"))
    .orderBy(asc(atosTasks.priority), asc(atosTasks.id))
    .limit(1);

  if (!task) {
    res.json({ skipped: true, message: "Nenhuma task ready" });
    return;
  }

  await db.update(atosTasks).set({
    status: "running",
    attemptCount: (task.attemptCount ?? 0) + 1,
    updatedAt: new Date(),
  }).where(eq(atosTasks.id, task.id));

  const payload = (task.payloadJson as Record<string, any>) ?? {};
  let success = false;
  let resultJson: unknown = null;
  let errorJson: unknown = null;

  try {
    if (task.taskType === "http_integration_test") {
      const target = task.executorTarget || payload["url"] as string;
      if (!target) throw new Error("executor_target não definido");
      const r = await fetch(target, { method: payload["method"] ?? "GET" });
      success    = r.ok;
      resultJson = { status: r.status, ok: r.ok, url: target };
      if (!r.ok) errorJson = { message: `HTTP ${r.status} from ${target}` };

    } else if (task.taskType === "n8n_workflow_activation") {
      const { payload: scopedPayload, scope } = getScopedN8nTaskPayload("n8n_workflow_activation", payload);
      const wfId = task.executorTarget || (scopedPayload["workflow_id"] as string);
      if (!wfId) throw new Error("workflow_id não definido");
      const activate = payload["action"] !== "deactivate";
      if (activate) await activateWorkflow(wfId, scope);
      else await deactivateWorkflow(wfId, scope);
      success = true;
      resultJson = { workflowId: wfId, activated: activate };

    } else if (task.taskType === "n8n_workflow_builder") {
      const { payload: scopedPayload, scope } = getScopedN8nTaskPayload("n8n_workflow_builder", payload);
      const wfDef = (scopedPayload["workflow_json"] ?? scopedPayload["workflow"]) as Record<string, unknown>;
      const created = await createWorkflow(wfDef, scope);
      success = true;
      resultJson = { workflowId: created.id, name: created.name };

    } else if (task.taskType === "hub_backend_handoff") {
      const target = task.executorTarget;
      if (!target) throw new Error("executor_target não definido");
      const method  = (payload["method"] as string) ?? "GET";
      const port    = process.env["PORT"] ?? "8080";
      const baseUrl = `http://localhost:${port}`;
      const bodyStr = method !== "GET" && payload["body"]
        ? JSON.stringify(payload["body"]) : undefined;
      // Inclui o Bearer token para chamadas internas que exigem auth
      const selfToken = await getAtosToken();
      const r = await fetch(baseUrl + target, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": selfToken ? `Bearer ${selfToken}` : "",
          ...(payload["extra_headers"] as Record<string, string> ?? {}),
        },
        body: bodyStr,
      });
      const data = await r.json().catch(() => ({}));
      success    = r.ok;
      resultJson = { status: r.status, ok: r.ok, data };
      if (!r.ok) errorJson = { message: `Hub API ${r.status}`, data };

    } else if (task.taskType === "supabase_schema_ops") {
      // Operações de schema com whitelist de segurança (BLOCO 5)
      const operation = payload["operation"] as string;
      const ALLOWED_OPS = ["create_table", "add_column", "create_index", "add_comment"];
      if (!operation || !ALLOWED_OPS.includes(operation)) {
        errorJson = { message: `supabase_schema_ops: operation inválida. Permitidas: ${ALLOWED_OPS.join(", ")}` };
      } else {
        const sql_raw = payload["sql"] as string;
        if (!sql_raw) throw new Error("sql não definido no payload");
        // Bloquear DDL perigosos
        const DANGEROUS = /drop\s+table|drop\s+database|truncate|delete\s+from|update\s+/i;
        if (DANGEROUS.test(sql_raw)) {
          errorJson = { message: "supabase_schema_ops: SQL contém operação destrutiva não permitida" };
        } else {
          const { Pool } = await import("pg");
          const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? "" });
          try {
            await pool.query(sql_raw);
            success    = true;
            resultJson = { operation, executed: true, sql: sql_raw.slice(0, 200) };
          } catch (pgErr: any) {
            errorJson = { message: pgErr.message, operation, sql: sql_raw.slice(0, 200) };
          } finally {
            await pool.end();
          }
        }
      }

    } else if (
      task.taskType === "documentation" ||
      task.taskType === "strategy_decision" ||
      task.taskType === "content_creation" ||
      task.taskType === "ux_improvement"
    ) {
      // Tarefas de registro/documentação — não há executor automático, apenas marca como concluído
      success    = true;
      resultJson = { taskType: task.taskType, message: "Registrado. Sem execução automática necessária." };

    } else if (task.taskType === "replit_agent_handoff") {
      // replit_agent_handoff nunca é executado automaticamente pelo execute-next.
      // O ciclo é: pending_handoff → captured_by_replit → running → delivered
      // via POST /api/atos/tasks/:id/replit-status pelo próprio Replit Agent.
      // Se chegou aqui como "ready" por engano, devolve ao pending_handoff.
      await db.update(atosTasks).set({ status: "pending_handoff", updatedAt: new Date() })
        .where(eq(atosTasks.id, task.id));
      res.json({ skipped: true, reason: "replit_agent_handoff — requer captura explícita pelo Replit Agent", taskId: task.id });
      return;

    } else {
      errorJson = { message: `task_type desconhecido: ${task.taskType}` };
    }
  } catch (err: any) {
    errorJson = { message: err.message, type: "execution_error" };
    req.log.error({ err: err.message, taskId: task.id }, "atos execute-next error");
  }

  // 2. Salvar resultado
  const status = success ? "completed" : "failed";
  await db.update(atosTasks).set({
    status,
    resultJson: (resultJson ?? null) as any,
    errorJson:  (errorJson  ?? null) as any,
    updatedAt: new Date(),
  }).where(eq(atosTasks.id, task.id));

  if (!success && errorJson) {
    await db.insert(atosErrors).values({
      source:       "execute-next",
      taskId:       task.id,
      workflowName: task.executorTarget ?? null,
      errorMessage: (errorJson as any)?.message ?? "erro desconhecido",
      errorJson:    errorJson as any,
    });
  }

  res.json({ taskId: task.id, taskCode: task.taskCode, taskType: task.taskType, success, resultJson, errorJson });
});

// ── POST /api/atos/run-until-empty ────────────────────────────────────────
// Consome a fila de tasks ready até zerar (BLOCO 3 — Opção A)
const runUntilEmptySchema = z.object({
  maxRuns:    z.number().int().min(1).max(50).default(20),
  timeoutMs:  z.number().int().min(1000).max(120000).default(60000),
});

router.post("/atos/run-until-empty", adminOnly, async (req: AuthenticatedRequest, res) => {
  const parsed = runUntilEmptySchema.safeParse(req.body ?? {});
  const { maxRuns, timeoutMs } = parsed.success ? parsed.data : { maxRuns: 20, timeoutMs: 60000 };

  const startTime = Date.now();
  const log: Array<{ run: number; taskId?: number; taskCode?: string; success?: boolean; skipped?: boolean; elapsed?: number; error?: string }> = [];
  let run = 0;

  while (run < maxRuns) {
    if (Date.now() - startTime > timeoutMs) {
      log.push({ run, skipped: true, error: "timeout atingido" });
      break;
    }

    // Chama o próprio execute-next interno via fetch local
    const port  = process.env["PORT"] ?? "8080";
    const token = await getAtosToken();
    let result: any;
    try {
      const r = await fetch(`http://localhost:${port}/api/atos/execute-next`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ trigger: "run-until-empty" }),
      });
      result = await r.json();
    } catch (e: any) {
      log.push({ run, error: e.message });
      break;
    }

    run++;
    if (result.skipped) {
      log.push({ run, skipped: true });
      break; // fila vazia
    }
    log.push({ run, taskId: result.taskId, taskCode: result.taskCode, success: result.success, elapsed: Date.now() - startTime });
  }

  const completed = log.filter(l => l.success === true).length;
  const failed    = log.filter(l => l.success === false).length;
  const skipped   = log.some(l => l.skipped && !l.error);
  res.json({ ok: true, runsExecuted: run, completed, failed, queueEmpty: skipped, elapsed: Date.now() - startTime, log });
});

// ── GET /api/atos/errors ───────────────────────────────────────────────────
router.get("/atos/errors", adminOnly, async (req: AuthenticatedRequest, res) => {
  const limitRaw = req.query.limit;
  const limit    = limitRaw ? Math.min(parseInt(String(limitRaw), 10) || 50, 200) : 50;
  const errors   = await db.select().from(atosErrors).orderBy(desc(atosErrors.createdAt)).limit(limit);
  res.json(errors);
});

// ── POST /api/atos/deliveries ─────────────────────────────────────────────
const deliverySchema = z.object({
  source:               z.string().default("replit_agent"),
  title:                z.string().min(1),
  summary:              z.string().optional(),
  status:               z.string().default("delivered"),
  relatedDecisionId:    z.number().int().optional(),
  relatedPlanId:        z.number().int().optional(),
  relatedTaskId:        z.number().int().optional(),
  filesChangedJson:     z.unknown().optional(),
  endpointsChangedJson: z.unknown().optional(),
  workflowsChangedJson: z.unknown().optional(),
  databaseChangesJson:  z.unknown().optional(),
  validationJson:       z.unknown().optional(),
  rawOutputJson:        z.unknown().optional(),
});

router.post("/atos/deliveries", adminOnly, async (req: AuthenticatedRequest, res) => {
  const parsed = deliverySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Payload inválido", details: parsed.error.flatten() }); return; }

  const [delivery] = await db.insert(atosDeliveries).values({
    ...parsed.data,
    filesChangedJson:     (parsed.data.filesChangedJson     ?? null) as any,
    endpointsChangedJson: (parsed.data.endpointsChangedJson ?? null) as any,
    workflowsChangedJson: (parsed.data.workflowsChangedJson ?? null) as any,
    databaseChangesJson:  (parsed.data.databaseChangesJson  ?? null) as any,
    validationJson:       (parsed.data.validationJson        ?? null) as any,
    rawOutputJson:        (parsed.data.rawOutputJson         ?? null) as any,
  }).returning();

  res.status(201).json(delivery);
});

// ── GET /api/atos/deliveries ──────────────────────────────────────────────
router.get("/atos/deliveries", adminOnly, async (req: AuthenticatedRequest, res) => {
  const limitRaw = req.query.limit;
  const limit    = limitRaw ? Math.min(parseInt(String(limitRaw), 10) || 20, 100) : 20;
  const list     = await db.select().from(atosDeliveries).orderBy(desc(atosDeliveries.createdAt)).limit(limit);
  res.json(list);
});

// ── GET /api/atos/deliveries/:id ──────────────────────────────────────────
router.get("/atos/deliveries/:id", adminOnly, async (req: AuthenticatedRequest, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  const [delivery] = await db.select().from(atosDeliveries).where(eq(atosDeliveries.id, id));
  if (!delivery) { res.status(404).json({ error: "Entrega não encontrada" }); return; }
  res.json(delivery);
});

// ── GET /api/atos/status ───────────────────────────────────────────────────
router.get("/atos/status", adminOnly, async (_req: AuthenticatedRequest, res) => {
  const [decisionCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(atosDecisions);

  const [taskCounts] = await db.select({
    total:              sql<number>`count(*)::int`,
    pending:            sql<number>`count(*) filter (where status = 'pending')::int`,
    ready:              sql<number>`count(*) filter (where status = 'ready')::int`,
    running:            sql<number>`count(*) filter (where status = 'running')::int`,
    completed:          sql<number>`count(*) filter (where status = 'completed')::int`,
    failed:             sql<number>`count(*) filter (where status = 'failed')::int`,
    cancelled:          sql<number>`count(*) filter (where status = 'cancelled')::int`,
    pending_handoff:    sql<number>`count(*) filter (where status = 'pending_handoff')::int`,
    captured_by_replit: sql<number>`count(*) filter (where status = 'captured_by_replit')::int`,
    delivered:          sql<number>`count(*) filter (where status = 'delivered')::int`,
  }).from(atosTasks);

  const [errorCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(atosErrors);

  const [deliveryCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(atosDeliveries);

  res.json({
    decisions: decisionCount.count,
    tasks: taskCounts,
    errors: errorCount.count,
    deliveries: deliveryCount.count,
  });
});

export default router;
