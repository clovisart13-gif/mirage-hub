import { Router } from "express";
import type { Request, Response } from "express";
import { sendConversation, configureWebhook } from "../../lib/gptmakerProvider";

function requireInternalKey(req: Request, res: Response, next: () => void) {
  const key = req.headers["x-internal-key"];
  const expected = process.env.MARKETING_INTERNAL_API_KEY;
  if (!expected || key !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

const router = Router();

// ── POST /api/internal/gptmaker/conversation ──────────────────────────────────
//
// Envia uma mensagem ao agente GPTMaker e retorna a resposta normalizada.
//
// Body:
//   company_slug    — slug do tenant (para log/auditoria)
//   phone           — número do lead (ex: "5511999999999")
//   lead_name?      — nome do lead (opcional)
//   message         — mensagem recebida do lead
//   agent_id?       — override do agentId (padrão: GPTMAKER_AGENT_ID env)
//   context?        — objeto extra de contexto (passado ao payload GPTMaker)
//
// Retorna:
//   { ok, reply, agent_id, phone, raw_response }

router.post(
  "/internal/gptmaker/conversation",
  requireInternalKey,
  async (req: Request, res: Response) => {
    const {
      company_slug,
      phone,
      lead_name,
      message,
      agent_id,
      context,
    } = req.body as {
      company_slug?: string;
      phone: string;
      lead_name?: string;
      message: string;
      agent_id?: string;
      context?: Record<string, unknown>;
    };

    if (!phone || !message) {
      res.status(400).json({ error: "phone e message são obrigatórios" });
      return;
    }

    try {
      const result = await sendConversation({
        agentId:         agent_id,
        phone,
        leadName:        lead_name ?? null,
        incomingMessage: message,
        companySlug:     company_slug,
        extraContext:    context,
      });

      res.json({
        ok:           result.ok,
        reply:        result.reply,
        agent_id:     result.agentId,
        phone:        result.phone,
        raw_response: result.rawResponse,
        ...(result.error ? { error: result.error } : {}),
      });
    } catch (err: any) {
      req.log.error({ error: err?.message }, "gptmaker/conversation: erro inesperado");
      res.status(500).json({ error: err?.message ?? "Erro interno" });
    }
  },
);

// ── POST /api/internal/gptmaker/configure-webhook ────────────────────────────
//
// Registra ou atualiza o webhook do agente GPTMaker.
//
// Body:
//   webhook_url  — URL que o GPTMaker vai chamar com respostas async
//   agent_id?    — override do agentId (padrão: GPTMAKER_AGENT_ID env)

router.post(
  "/internal/gptmaker/configure-webhook",
  requireInternalKey,
  async (req: Request, res: Response) => {
    const { webhook_url, agent_id } = req.body as {
      webhook_url: string;
      agent_id?: string;
    };

    if (!webhook_url) {
      res.status(400).json({ error: "webhook_url é obrigatório" });
      return;
    }

    try {
      const result = await configureWebhook(webhook_url, agent_id);
      res.json(result);
    } catch (err: any) {
      req.log.error({ error: err?.message }, "gptmaker/configure-webhook: erro");
      res.status(500).json({ error: err?.message ?? "Erro interno" });
    }
  },
);

export default router;
