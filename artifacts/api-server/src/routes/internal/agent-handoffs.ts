/**
 * /internal/agent-handoffs — Barramento de handoff entre agentes
 *
 * Permite que ATHOS registre tarefas para o Replit executar e que o Replit
 * atualize status/resultado — sem depender de intermediário humano.
 *
 * Auth: x-internal-key (MARKETING_INTERNAL_API_KEY)
 */

import { Router } from "express";
import type { Request, Response } from "express";
import { eq, and, desc, inArray } from "drizzle-orm";
import { db, agentHandoffs } from "@workspace/db";
import { logger } from "../../lib/logger";

const router = Router();

// ── Auth ──────────────────────────────────────────────────────────────────────

function requireInternalKey(req: Request, res: Response, next: () => void) {
  const key = process.env["MARKETING_INTERNAL_API_KEY"];
  if (!key) { res.status(503).json({ error: "Internal key not configured" }); return; }
  const provided = req.headers["x-internal-key"];
  if (!provided || provided !== key) { res.status(401).json({ error: "Unauthorized" }); return; }
  next();
}

// ── POST /internal/agent-handoffs — criar handoff ────────────────────────────

router.post("/internal/agent-handoffs", requireInternalKey, async (req: Request, res: Response) => {
  const {
    title,
    instruction,
    context,
    relevant_files,
    acceptance_criteria,
    origin_agent = "athos",
    target_agent = "replit",
    priority = "normal",
    tags,
  } = req.body as Record<string, unknown>;

  if (!title || !instruction) {
    return res.status(400).json({ error: "title e instruction são obrigatórios" });
  }

  const [handoff] = await db.insert(agentHandoffs).values({
    title:              String(title),
    instruction:        String(instruction),
    context:            context ? String(context) : null,
    relevantFiles:      relevant_files ?? null,
    acceptanceCriteria: acceptance_criteria ? String(acceptance_criteria) : null,
    originAgent:        String(origin_agent),
    targetAgent:        String(target_agent),
    priority:           String(priority),
    tags:               tags ?? null,
    status:             "pending",
  }).returning();

  logger.info({ handoffId: handoff.id, title: handoff.title }, "agent-handoffs: criado");
  res.status(201).json({ ok: true, handoff });
});

// ── GET /internal/agent-handoffs — listar ────────────────────────────────────

router.get("/internal/agent-handoffs", requireInternalKey, async (req: Request, res: Response) => {
  const { status, target_agent, origin_agent, limit = "50" } = req.query as Record<string, string>;

  const conditions = [];
  if (status) {
    const statuses = status.split(",").map(s => s.trim());
    if (statuses.length === 1) {
      conditions.push(eq(agentHandoffs.status, statuses[0]));
    } else {
      conditions.push(inArray(agentHandoffs.status, statuses));
    }
  }
  if (target_agent) conditions.push(eq(agentHandoffs.targetAgent, target_agent));
  if (origin_agent) conditions.push(eq(agentHandoffs.originAgent, origin_agent));

  const rows = await db
    .select()
    .from(agentHandoffs)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(agentHandoffs.createdAt))
    .limit(Math.min(Number(limit) || 50, 200));

  res.json({ ok: true, handoffs: rows, count: rows.length });
});

// ── GET /internal/agent-handoffs/:id — detalhe ───────────────────────────────

router.get("/internal/agent-handoffs/:id", requireInternalKey, async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const [handoff] = await db.select().from(agentHandoffs).where(eq(agentHandoffs.id, id)).limit(1);
  if (!handoff) return res.status(404).json({ error: "Handoff não encontrado" });
  res.json({ ok: true, handoff });
});

// ── POST /internal/agent-handoffs/:id/claim — marcar in_progress ─────────────

router.post("/internal/agent-handoffs/:id/claim", requireInternalKey, async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const [handoff] = await db
    .update(agentHandoffs)
    .set({ status: "in_progress", claimedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(agentHandoffs.id, id), inArray(agentHandoffs.status, ["pending", "sent"])))
    .returning();

  if (!handoff) return res.status(404).json({ error: "Handoff não encontrado ou não está em status claimable (pending/sent)" });
  logger.info({ handoffId: id }, "agent-handoffs: claimed");
  res.json({ ok: true, handoff });
});

// ── POST /internal/agent-handoffs/:id/complete — marcar done ─────────────────

router.post("/internal/agent-handoffs/:id/complete", requireInternalKey, async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { result_summary, result_payload } = req.body as Record<string, unknown>;

  const [handoff] = await db
    .update(agentHandoffs)
    .set({
      status:        "done",
      resultSummary: result_summary ? String(result_summary) : null,
      resultPayload: result_payload ?? null,
      completedAt:   new Date(),
      updatedAt:     new Date(),
    })
    .where(eq(agentHandoffs.id, id))
    .returning();

  if (!handoff) return res.status(404).json({ error: "Handoff não encontrado" });
  logger.info({ handoffId: id }, "agent-handoffs: completed");
  res.json({ ok: true, handoff });
});

// ── POST /internal/agent-handoffs/:id/fail — marcar failed ───────────────────

router.post("/internal/agent-handoffs/:id/fail", requireInternalKey, async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { error_message } = req.body as Record<string, unknown>;

  const [handoff] = await db
    .update(agentHandoffs)
    .set({
      status:       "failed",
      errorMessage: error_message ? String(error_message) : "Falha sem detalhe",
      completedAt:  new Date(),
      updatedAt:    new Date(),
    })
    .where(eq(agentHandoffs.id, id))
    .returning();

  if (!handoff) return res.status(404).json({ error: "Handoff não encontrado" });
  logger.info({ handoffId: id }, "agent-handoffs: failed");
  res.json({ ok: true, handoff });
});

// ── POST /internal/notify — disparo manual de WhatsApp (sem handoff) ─────────
// Usado pelo Replit Agent ao final de qualquer trabalho direto no chat.

router.post("/internal/notify", requireInternalKey, async (req: Request, res: Response) => {
  const { message, title } = req.body as { message?: string; title?: string };

  const phone = process.env["ALERT_PHONE_ADMIN"] ?? "5511969243563";
  const instanceId = "3EC7FC04DC4092E870116A599C5ED5B8";
  const token      = "44BCDFDD085514B19094352B";
  const clientToken = "Fadbf0be3eac648c8b790477fd43310cdS";

  const text = [
    `✅ *${title ?? "Tarefa concluída"}*`,
    "",
    message ?? "Trabalho direto no chat finalizado.",
    "",
    `_Nenhuma intervenção necessária_ 🤖`,
    `_Verifique o Hub se quiser confirmar._`,
  ].join("\n");

  try {
    const r = await fetch(
      `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "Client-Token": clientToken },
        body: JSON.stringify({ phone, message: text }),
      }
    );
    const body = await r.json() as Record<string, unknown>;
    if (!r.ok) {
      logger.warn({ status: r.status, body }, "notify: Z-API error");
      return res.status(502).json({ ok: false, error: body });
    }
    logger.info({ phone, messageId: body.messageId }, "notify: WhatsApp enviado");
    res.json({ ok: true, messageId: body.messageId });
  } catch (err: any) {
    logger.error({ err: err.message }, "notify: falha ao enviar WhatsApp");
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
