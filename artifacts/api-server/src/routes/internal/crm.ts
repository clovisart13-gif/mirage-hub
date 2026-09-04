import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { logger } from "../../lib/logger";
import { triggerMeetingWebhook } from "../crm/index";

const router = Router();

// Reaproveita a mesma chave interna já usada por /api/internal/* (ex.: marketing).
function requireInternalKey(req: Request, res: Response, next: () => void) {
  const key = process.env["MARKETING_INTERNAL_API_KEY"];
  if (!key) {
    res.status(503).json({ error: "Internal API key not configured on server" });
    return;
  }
  const provided = req.headers["x-internal-key"];
  if (!provided || provided !== key) {
    res.status(401).json({ error: "Unauthorized — invalid x-internal-key" });
    return;
  }
  next();
}

const meetingBookedSchema = z.object({
  lead_name: z.string().min(1, "lead_name é obrigatório"),
  phone: z.string().min(8, "phone é obrigatório e deve ser válido"),
  scheduled_at: z.string().datetime({ message: "scheduled_at deve ser ISO 8601" }),
  email: z.string().email().optional().nullable(),
  meeting_link: z.string().url().optional().nullable(),
  tenant_id: z.string().min(1, "tenant_id é obrigatório — nenhum fallback silencioso permitido"),
  source: z.string().optional().default("crm_agendamento"),
});

// POST /api/internal/crm/meeting-booked
// Middleware server-to-server: recebe dados de reunião agendada (CRM/agendamento)
// já com telefone na origem, e dispara o workflow n8n de confirmação/lembrete via WhatsApp.
// Autenticação via header x-internal-key (não usa sessão — chamador é um serviço, não um usuário logado).
router.post("/internal/crm/meeting-booked", requireInternalKey, async (req: Request, res: Response) => {
  const parsed = meetingBookedSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const { lead_name, phone, scheduled_at, email, meeting_link, tenant_id, source } = parsed.data;

  logger.info(
    { tenantId: tenant_id, leadName: lead_name, scheduledAt: scheduled_at, source },
    "internal/crm/meeting-booked: reunião recebida, disparando webhook n8n"
  );

  try {
    const dispatched = await triggerMeetingWebhook({
      tenantId: tenant_id,
      leadName: lead_name,
      phone,
      email,
      scheduledAt: scheduled_at,
      meetingLink: meeting_link,
      source,
    });

    if (dispatched) {
      logger.info(
        { tenantId: tenant_id, leadName: lead_name },
        "internal/crm/meeting-booked: webhook n8n disparado com sucesso"
      );
    } else {
      logger.error(
        { tenantId: tenant_id, leadName: lead_name },
        "internal/crm/meeting-booked: falha ao disparar webhook n8n (ver logs de triggerMeetingWebhook)"
      );
    }

    res.json({
      success: dispatched,
      n8nStatus: dispatched ? "sent" : "failed",
      n8nResponse: dispatched
        ? "Payload aceito pelo endpoint do n8n"
        : "Disparo falhou — verifique N8N_MEETING_WEBHOOK_URL ou logs do servidor",
    });
  } catch (err: any) {
    logger.error(
      { tenantId: tenant_id, leadName: lead_name, error: err?.message },
      "internal/crm/meeting-booked: erro inesperado ao disparar webhook"
    );
    res.status(502).json({ success: false, n8nStatus: "error", n8nResponse: err?.message ?? "Erro desconhecido" });
  }
});

export default router;
