import { Router } from "express";
import type { Request, Response } from "express";
import { logger } from "../../lib/logger";
import { sendMetaMessage } from "../meta/index";

const router = Router();

function requireInternalKey(req: Request, res: Response, next: () => void) {
  const key = process.env["MARKETING_INTERNAL_API_KEY"];
  if (!key) { res.status(503).json({ error: "Internal API key not configured" }); return; }
  const provided = req.headers["x-internal-key"];
  if (!provided || provided !== key) { res.status(401).json({ error: "Unauthorized" }); return; }
  next();
}

// ── POST /api/internal/meta/send-message ─────────────────────────────────────
//
// Envia uma mensagem WhatsApp via Meta Cloud API (API Oficial).
// Usa META_PHONE_NUMBER_ID e META_ACCESS_TOKEN do ambiente.
//
// Body: { phone, message, company_slug?, route_type? }
//   phone        — número destino com DDI sem + (ex: "5511999999999")
//   message      — texto a enviar
//   company_slug — identificação do tenant (opcional, para logging)
//   route_type   — para logging (ex: "nurture", "agent_marcos")
//
// Retorna: { ok, provider, phone, route_type, provider_response }

router.post(
  "/internal/meta/send-message",
  requireInternalKey,
  async (req: Request, res: Response) => {
    const { phone, message, company_slug, route_type } = req.body as {
      phone: string;
      message: string;
      company_slug?: string;
      route_type?: string;
    };

    if (!phone || !message) {
      res.status(400).json({ error: "phone e message são obrigatórios" });
      return;
    }

    if (process.env["META_OFFICIAL_ENABLED"] !== "true") {
      res.status(503).json({
        error: "Meta Official API não está ativada. Configure META_OFFICIAL_ENABLED=true.",
        hint: "Este endpoint substitui o Z-API quando a API Oficial estiver pronta.",
      });
      return;
    }

    try {
      const result = await sendMetaMessage(phone, message);

      logger.info(
        {
          phone,
          company_slug: company_slug ?? "n/a",
          route_type: route_type ?? "unknown",
          ok: result.ok,
          error: result.error,
        },
        "internal/meta/send-message: enviado"
      );

      res.status(result.ok ? 200 : 502).json({
        ok: result.ok,
        provider: "meta_official",
        phone,
        route_type: route_type ?? "unknown",
        company_slug: company_slug ?? null,
        provider_response: result.response,
        ...(result.ok ? {} : { error: result.error }),
      });
    } catch (err: any) {
      logger.error({ error: err?.message }, "internal/meta/send-message: erro");
      res.status(500).json({ error: err?.message ?? "Erro interno" });
    }
  }
);

export default router;
