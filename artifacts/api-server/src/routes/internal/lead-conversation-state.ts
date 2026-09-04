import { Router } from "express";
import type { Request, Response } from "express";
import { eq, and, or, desc } from "drizzle-orm";
import { db, leadConversationState } from "@workspace/db";
import { logger } from "../../lib/logger";

const router = Router();

// ── Auth ──────────────────────────────────────────────────────────────────────
function requireInternalKey(req: Request, res: Response, next: () => void) {
  const key = process.env["MARKETING_INTERNAL_API_KEY"];
  if (!key) { res.status(503).json({ error: "Internal API key not configured" }); return; }
  const provided = req.headers["x-internal-key"];
  if (!provided || provided !== key) { res.status(401).json({ error: "Unauthorized" }); return; }
  next();
}

// ── Normalização de telefone ──────────────────────────────────────────────────
function phoneVariants(raw: string): string[] {
  const digits = raw.replace(/\D/g, "");
  const variants = new Set<string>([digits]);
  if (digits.startsWith("55") && digits.length >= 12) variants.add(digits.slice(2));
  if (!digits.startsWith("55") && digits.length <= 11) variants.add("55" + digits);
  const withoutDDI = digits.startsWith("55") ? digits.slice(2) : digits;
  if (withoutDDI.length === 10) {
    const with9 = withoutDDI.slice(0, 2) + "9" + withoutDDI.slice(2);
    variants.add(with9);
    variants.add("55" + with9);
  }
  if (withoutDDI.length === 11 && withoutDDI[2] === "9") {
    const without9 = withoutDDI.slice(0, 2) + withoutDDI.slice(3);
    variants.add(without9);
    variants.add("55" + without9);
  }
  return Array.from(variants);
}

// ── GET /api/internal/lead-conversation-state ─────────────────────────────────
// Retorna o estado atual da conversa de um lead.
// Query: company_slug=r2pb&phone=+5511999999999
router.get(
  "/internal/lead-conversation-state",
  requireInternalKey,
  async (req: Request, res: Response) => {
    const { company_slug, tenant_id, phone } = req.query as Record<string, string>;

    if (!phone) {
      res.status(400).json({ error: "Parâmetro 'phone' é obrigatório" });
      return;
    }
    const tenantId = tenant_id ?? company_slug;
    if (!tenantId) {
      res.status(400).json({ error: "Informe company_slug ou tenant_id" });
      return;
    }

    try {
      const variants = phoneVariants(phone);
      const rows = await db.select().from(leadConversationState).where(
        and(
          eq(leadConversationState.tenantId, tenantId),
          or(...variants.map(v => eq(leadConversationState.phone, v)))
        )
      ).limit(1);

      if (!rows[0]) {
        return res.json({ ok: true, found: false, state: null });
      }

      const s = rows[0];
      return res.json({
        ok: true,
        found: true,
        state: {
          id: s.id,
          phone: s.phone,
          conversation_status: s.conversationStatus,
          turn_count: s.turnCount,
          max_turns: s.maxTurns,
          conversation_goal: s.conversationGoal,
          last_ai_response: s.lastAiResponse,
          last_lead_message: s.lastLeadMessage,
          handoff_required: s.handoffRequired,
          handoff_reason: s.handoffReason,
          window_opened_at: s.windowOpenedAt,
          last_activity_at: s.lastActivityAt,
        },
      });
    } catch (err: any) {
      logger.error({ error: err?.message }, "lead-conversation-state GET: erro");
      res.status(500).json({ error: err?.message });
    }
  }
);

// ── GET /api/internal/lead-conversation-state/active ─────────────────────────
// Lista todas as conversas ativas para um tenant.
// Query: company_slug=r2pb&limit=50
router.get(
  "/internal/lead-conversation-state/active",
  requireInternalKey,
  async (req: Request, res: Response) => {
    const { company_slug, tenant_id, limit: limitStr } = req.query as Record<string, string>;
    const tenantId = tenant_id ?? company_slug;
    if (!tenantId) {
      res.status(400).json({ error: "Informe company_slug ou tenant_id" });
      return;
    }

    try {
      const limit = Math.min(parseInt(limitStr ?? "50", 10), 200);
      const rows = await db.select().from(leadConversationState).where(
        and(
          eq(leadConversationState.tenantId, tenantId),
          eq(leadConversationState.conversationStatus, "active")
        )
      ).orderBy(desc(leadConversationState.lastActivityAt)).limit(limit);

      return res.json({ ok: true, total: rows.length, conversations: rows });
    } catch (err: any) {
      logger.error({ error: err?.message }, "lead-conversation-state/active: erro");
      res.status(500).json({ error: err?.message });
    }
  }
);

// ── POST /api/internal/lead-conversation-state/close ─────────────────────────
// Fecha uma conversa (humano assumiu ou concluiu atendimento).
// Body: { company_slug, phone, reason? }
router.post(
  "/internal/lead-conversation-state/close",
  requireInternalKey,
  async (req: Request, res: Response) => {
    const { company_slug, tenant_id, phone, reason } = req.body as {
      company_slug?: string;
      tenant_id?: string;
      phone: string;
      reason?: string;
    };

    if (!phone) {
      res.status(400).json({ error: "phone é obrigatório" });
      return;
    }
    const tenantId = tenant_id ?? company_slug;
    if (!tenantId) {
      res.status(400).json({ error: "Informe company_slug ou tenant_id" });
      return;
    }

    try {
      const variants = phoneVariants(phone);
      const result = await db.update(leadConversationState)
        .set({
          conversationStatus: "closed",
          handoffReason: reason ?? "human_closed",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(leadConversationState.tenantId, tenantId),
            or(...variants.map(v => eq(leadConversationState.phone, v)))
          )
        )
        .returning({ id: leadConversationState.id });

      if (!result[0]) {
        return res.json({ ok: true, updated: false, message: "Nenhum estado encontrado para este phone" });
      }

      logger.info({ tenantId, phone, reason }, "lead-conversation-state: conversa fechada");
      return res.json({ ok: true, updated: true, id: result[0].id });
    } catch (err: any) {
      logger.error({ error: err?.message }, "lead-conversation-state/close: erro");
      res.status(500).json({ error: err?.message });
    }
  }
);

// ── POST /api/internal/lead-conversation-state/reset ─────────────────────────
// Reseta o estado de uma conversa (para testes ou reabertura manual).
// Body: { company_slug, phone }
router.post(
  "/internal/lead-conversation-state/reset",
  requireInternalKey,
  async (req: Request, res: Response) => {
    const { company_slug, tenant_id, phone } = req.body as {
      company_slug?: string;
      tenant_id?: string;
      phone: string;
    };

    if (!phone) {
      res.status(400).json({ error: "phone é obrigatório" });
      return;
    }
    const tenantId = tenant_id ?? company_slug;
    if (!tenantId) {
      res.status(400).json({ error: "Informe company_slug ou tenant_id" });
      return;
    }

    try {
      const variants = phoneVariants(phone);
      const result = await db.update(leadConversationState)
        .set({
          conversationStatus: "active",
          turnCount: 0,
          conversationGoal: null,
          lastAiResponse: null,
          lastLeadMessage: null,
          handoffRequired: false,
          handoffReason: null,
          windowOpenedAt: new Date(),
          lastActivityAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(leadConversationState.tenantId, tenantId),
            or(...variants.map(v => eq(leadConversationState.phone, v)))
          )
        )
        .returning({ id: leadConversationState.id });

      if (!result[0]) {
        return res.json({ ok: true, reset: false, message: "Nenhum estado encontrado para este phone" });
      }

      logger.info({ tenantId, phone }, "lead-conversation-state: estado resetado");
      return res.json({ ok: true, reset: true, id: result[0].id });
    } catch (err: any) {
      logger.error({ error: err?.message }, "lead-conversation-state/reset: erro");
      res.status(500).json({ error: err?.message });
    }
  }
);

export default router;
