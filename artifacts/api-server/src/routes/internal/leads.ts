import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db, leadsEspelho } from "@workspace/db";
import { logger } from "../../lib/logger";

const router = Router();

// Reaproveita a mesma chave interna já usada por /api/internal/* (ex.: marketing, crm).
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

const mirrorSchema = z.object({
  nome: z.string().min(1, "nome é obrigatório"),
  email: z.string().email("email inválido"),
  whatsapp: z.string().min(8, "whatsapp é obrigatório e deve ser válido"),
  tenant_id: z.string().min(1, "tenant_id é obrigatório — sem fallback silencioso"),
});

// POST /api/internal/leads/mirror
// Salva (ou atualiza) nome/e-mail/whatsapp de um lead numa base-espelho no Hub,
// para que o n8n consiga localizar o WhatsApp de um lead pelo e-mail do evento
// do Google Calendar quando o CRM (Helena) não expõe essa busca via API.
router.post("/internal/leads/mirror", requireInternalKey, async (req: Request, res: Response) => {
  const parsed = mirrorSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const { nome, email, whatsapp, tenant_id } = parsed.data;
  const emailNormalizado = email.trim().toLowerCase();

  try {
    const existing = await db
      .select({ id: leadsEspelho.id })
      .from(leadsEspelho)
      .where(and(eq(leadsEspelho.tenantId, tenant_id), eq(leadsEspelho.email, emailNormalizado)))
      .limit(1);

    if (existing.length > 0 && existing[0]) {
      await db
        .update(leadsEspelho)
        .set({ nome, whatsapp, updatedAt: new Date() })
        .where(eq(leadsEspelho.id, existing[0].id));

      logger.info({ tenantId: tenant_id, email: emailNormalizado }, "internal/leads/mirror: lead atualizado");
      res.json({ success: true, action: "updated" });
      return;
    }

    await db.insert(leadsEspelho).values({
      tenantId: tenant_id,
      nome,
      email: emailNormalizado,
      whatsapp,
    });

    logger.info({ tenantId: tenant_id, email: emailNormalizado }, "internal/leads/mirror: lead criado");
    res.json({ success: true, action: "created" });
  } catch (err: any) {
    logger.error(
      { tenantId: tenant_id, email: emailNormalizado, error: err?.message },
      "internal/leads/mirror: erro inesperado ao salvar lead"
    );
    res.status(500).json({ success: false, error: err?.message ?? "Erro desconhecido" });
  }
});

const byEmailQuerySchema = z.object({
  email: z.string().email("email inválido"),
  tenant_id: z.string().min(1, "tenant_id é obrigatório — sem fallback silencioso"),
});

// GET /api/internal/leads/by-email?email=...&tenant_id=...
// Usado pelo n8n para resolver o WhatsApp de um lead a partir do e-mail
// presente no evento criado no Google Calendar.
router.get("/internal/leads/by-email", requireInternalKey, async (req: Request, res: Response) => {
  const parsed = byEmailQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const { email, tenant_id } = parsed.data;
  const emailNormalizado = email.trim().toLowerCase();

  try {
    const rows = await db
      .select()
      .from(leadsEspelho)
      .where(and(eq(leadsEspelho.tenantId, tenant_id), eq(leadsEspelho.email, emailNormalizado)))
      .limit(1);

    const lead = rows[0];
    if (!lead) {
      res.status(404).json({ success: false, error: "Lead não encontrado para esse e-mail" });
      return;
    }

    res.json({
      success: true,
      lead: {
        nome: lead.nome,
        email: lead.email,
        whatsapp: lead.whatsapp,
        agendou: lead.agendou,
      },
    });
  } catch (err: any) {
    logger.error(
      { tenantId: tenant_id, email: emailNormalizado, error: err?.message },
      "internal/leads/by-email: erro inesperado ao buscar lead"
    );
    res.status(500).json({ success: false, error: err?.message ?? "Erro desconhecido" });
  }
});

const markAgendadoSchema = z.object({
  email: z.string().email("email inválido"),
  tenant_id: z.string().min(1, "tenant_id é obrigatório — sem fallback silencioso"),
});

// POST /api/internal/leads/mark-agendado
// Chamado pelo n8n assim que confirma (via /by-email) que o e-mail do evento do
// Google Calendar bate com um lead — marca que ele efetivamente agendou, para que
// ele NÃO receba a mensagem automática de reengajamento (lead que não voltou).
router.post("/internal/leads/mark-agendado", requireInternalKey, async (req: Request, res: Response) => {
  const parsed = markAgendadoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const { email, tenant_id } = parsed.data;
  const emailNormalizado = email.trim().toLowerCase();

  try {
    const result = await db
      .update(leadsEspelho)
      .set({ agendou: true, updatedAt: new Date() })
      .where(and(eq(leadsEspelho.tenantId, tenant_id), eq(leadsEspelho.email, emailNormalizado)))
      .returning({ id: leadsEspelho.id });

    if (result.length === 0) {
      res.status(404).json({ success: false, error: "Lead não encontrado para esse e-mail" });
      return;
    }

    logger.info({ tenantId: tenant_id, email: emailNormalizado }, "internal/leads/mark-agendado: lead marcado como agendado");
    res.json({ success: true });
  } catch (err: any) {
    logger.error(
      { tenantId: tenant_id, email: emailNormalizado, error: err?.message },
      "internal/leads/mark-agendado: erro inesperado"
    );
    res.status(500).json({ success: false, error: err?.message ?? "Erro desconhecido" });
  }
});

const pendingFollowupQuerySchema = z.object({
  tenant_id: z.string().min(1, "tenant_id é obrigatório — sem fallback silencioso"),
  hours: z.coerce.number().positive().optional().default(24),
});

// GET /api/internal/leads/pending-followup?tenant_id=r2pb&hours=24
// Usado pelo n8n (rodando em intervalo, ex.: a cada hora) para listar leads que
// receberam o link de agendamento há mais de X horas, nunca agendaram e ainda
// não receberam a mensagem automática de reengajamento.
router.get("/internal/leads/pending-followup", requireInternalKey, async (req: Request, res: Response) => {
  const parsed = pendingFollowupQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const { tenant_id, hours } = parsed.data;
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  try {
    const rows = await db
      .select()
      .from(leadsEspelho)
      .where(
        and(
          eq(leadsEspelho.tenantId, tenant_id),
          eq(leadsEspelho.agendou, false),
          eq(leadsEspelho.followupSent, false)
        )
      );

    const pendentes = rows.filter((row) => row.createdAt <= cutoff);

    res.json({
      success: true,
      leads: pendentes.map((lead) => ({
        nome: lead.nome,
        email: lead.email,
        whatsapp: lead.whatsapp,
        linkEnviadoEm: lead.createdAt,
      })),
    });
  } catch (err: any) {
    logger.error({ tenantId: tenant_id, error: err?.message }, "internal/leads/pending-followup: erro inesperado");
    res.status(500).json({ success: false, error: err?.message ?? "Erro desconhecido" });
  }
});

const markFollowupSentSchema = z.object({
  email: z.string().email("email inválido"),
  tenant_id: z.string().min(1, "tenant_id é obrigatório — sem fallback silencioso"),
});

// POST /api/internal/leads/mark-followup-sent
// Chamado pelo n8n logo após enviar a mensagem de reengajamento a um lead que
// não confirmou o agendamento — evita reenviar a mesma mensagem repetidamente.
router.post("/internal/leads/mark-followup-sent", requireInternalKey, async (req: Request, res: Response) => {
  const parsed = markFollowupSentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const { email, tenant_id } = parsed.data;
  const emailNormalizado = email.trim().toLowerCase();

  try {
    const result = await db
      .update(leadsEspelho)
      .set({ followupSent: true, updatedAt: new Date() })
      .where(and(eq(leadsEspelho.tenantId, tenant_id), eq(leadsEspelho.email, emailNormalizado)))
      .returning({ id: leadsEspelho.id });

    if (result.length === 0) {
      res.status(404).json({ success: false, error: "Lead não encontrado para esse e-mail" });
      return;
    }

    logger.info({ tenantId: tenant_id, email: emailNormalizado }, "internal/leads/mark-followup-sent: marcado");
    res.json({ success: true });
  } catch (err: any) {
    logger.error(
      { tenantId: tenant_id, email: emailNormalizado, error: err?.message },
      "internal/leads/mark-followup-sent: erro inesperado"
    );
    res.status(500).json({ success: false, error: err?.message ?? "Erro desconhecido" });
  }
});

// ── Normalização de telefone (espelha lógica do lead-classify) ────────────────
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

import { leadConversationState } from "@workspace/db";
import { or, sql as drizzleSql } from "drizzle-orm";
import { supabaseAdmin } from "../../lib/supabase";

// Slug → UUID (espelha lógica do lead-classify para manter tenant_id consistente)
const slugToUuidCache = new Map<string, { id: string; ts: number }>();
async function resolveSlugToUuid(slug: string): Promise<string> {
  if (slug.match(/^[0-9a-f]{8}-[0-9a-f]{4}-/i)) return slug; // já é UUID
  const cached = slugToUuidCache.get(slug);
  if (cached && Date.now() - cached.ts < 300_000) return cached.id;
  const { data } = await supabaseAdmin.from("tenants").select("id").eq("slug", slug).single();
  const id = data?.id ?? slug; // fallback para o slug se não encontrar
  slugToUuidCache.set(slug, { id, ts: Date.now() });
  return id;
}

const humanControlSchema = z.object({
  phone: z.string().min(8),
  tenant_id: z.string().min(1, "tenant_id é obrigatório — sem fallback silencioso"),
  agent_name: z.string().optional(),
});

// GET /api/internal/lead-conversation-state?company_slug=r2pb&phone=...
// Retorna o estado da conversa incluindo human_in_control — usado pelo n8n como gate pré-IA.
router.get("/internal/lead-conversation-state", requireInternalKey, async (req: Request, res: Response) => {
  const { company_slug, phone } = req.query as { company_slug?: string; phone?: string };
  if (!phone || !company_slug) {
    res.status(400).json({ success: false, error: "company_slug e phone são obrigatórios" });
    return;
  }
  const resolvedTenantId = await resolveSlugToUuid(company_slug);
  const variants = phoneVariants(phone);

  try {
    const rows = await db.execute(drizzleSql`
      SELECT phone, conversation_status, human_in_control, human_agent_name, human_took_over_at, turn_count, updated_at
      FROM lead_conversation_state
      WHERE tenant_id = ${resolvedTenantId}
        AND phone = ANY(ARRAY[${drizzleSql.join(variants.map(v => drizzleSql`${v}`), drizzleSql`, `)}])
      LIMIT 1
    `);
    const row = (rows as any).rows?.[0] ?? null;
    res.json({
      success: true,
      found: !!row,
      human_in_control: row?.human_in_control ?? false,
      human_agent_name: row?.human_agent_name ?? null,
      conversation_status: row?.conversation_status ?? null,
      turn_count: row?.turn_count ?? 0,
      phone: row?.phone ?? variants[0],
    });
  } catch (err: any) {
    logger.error({ tenantId: company_slug, phone, error: err?.message }, "internal/lead-conversation-state: erro");
    res.status(500).json({ success: false, error: err?.message ?? "Erro desconhecido" });
  }
});

// POST /api/internal/leads/set-human-control
// Marca um lead como "sob controle humano" — bloqueia toda automação para esse número.
// Chamado pelo n8n quando um agente assume a conversa no Helena, ou manualmente.
router.post("/internal/leads/set-human-control", requireInternalKey, async (req: Request, res: Response) => {
  const parsed = humanControlSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const { phone, tenant_id, agent_name } = parsed.data;
  const resolvedTenantId = await resolveSlugToUuid(tenant_id);
  const variants = phoneVariants(phone);
  const canonicalPhone = variants[0];

  try {
    // Upsert: cria ou atualiza o registro com humanInControl = true
    await db.execute(drizzleSql`
      INSERT INTO lead_conversation_state (id, tenant_id, phone, conversation_status, human_in_control, human_took_over_at, human_agent_name, updated_at)
      VALUES (gen_random_uuid(), ${resolvedTenantId}, ${canonicalPhone}, 'handoff', true, NOW(), ${agent_name ?? null}, NOW())
      ON CONFLICT (tenant_id, phone) DO UPDATE
        SET human_in_control = true,
            human_took_over_at = NOW(),
            human_agent_name = COALESCE(${agent_name ?? null}, lead_conversation_state.human_agent_name),
            conversation_status = 'handoff',
            updated_at = NOW()
    `);

    logger.info({ tenantId: tenant_id, phone: canonicalPhone, agent_name }, "internal/leads/set-human-control: humano marcado como ativo");
    res.json({ success: true, phone: canonicalPhone, human_in_control: true });
  } catch (err: any) {
    logger.error({ tenantId: tenant_id, phone: canonicalPhone, error: err?.message }, "internal/leads/set-human-control: erro");
    res.status(500).json({ success: false, error: err?.message ?? "Erro desconhecido" });
  }
});

// POST /api/internal/leads/clear-human-control
// Remove o bloqueio de humano ativo — permite que automação retome se necessário.
// Chamado pelo n8n quando o agente fecha/transfere a conversa no Helena.
router.post("/internal/leads/clear-human-control", requireInternalKey, async (req: Request, res: Response) => {
  const parsed = humanControlSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const { phone, tenant_id } = parsed.data;
  const resolvedTenantId = await resolveSlugToUuid(tenant_id);
  const variants = phoneVariants(phone);
  const canonicalPhone = variants[0];

  try {
    await db.execute(drizzleSql`
      UPDATE lead_conversation_state
        SET human_in_control = false,
            human_agent_name = NULL,
            conversation_status = 'closed',
            updated_at = NOW()
      WHERE tenant_id = ${resolvedTenantId}
        AND phone = ANY(ARRAY[${drizzleSql.join(variants.map(v => drizzleSql`${v}`), drizzleSql`, `)}])
    `);

    logger.info({ tenantId: tenant_id, phone: canonicalPhone }, "internal/leads/clear-human-control: controle humano removido");
    res.json({ success: true, phone: canonicalPhone, human_in_control: false });
  } catch (err: any) {
    logger.error({ tenantId: tenant_id, phone: canonicalPhone, error: err?.message }, "internal/leads/clear-human-control: erro");
    res.status(500).json({ success: false, error: err?.message ?? "Erro desconhecido" });
  }
});

export default router;
