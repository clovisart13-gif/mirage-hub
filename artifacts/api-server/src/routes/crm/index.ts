import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireTenantAccess, type AuthenticatedRequest } from "../../middlewares/auth";

const router = Router();

// ─── Configuração ─────────────────────────────────────────────────────────────
// N8N_MEETING_WEBHOOK_URL é o fallback global (usado se o tenant não tiver URL própria).
// ⚠️ Cada tenant deve ter sua própria URL de agendamento configurada em sales_automation_config.
// Nunca usar URL de outro tenant como fallback silencioso.
const N8N_MEETING_WEBHOOK_URL_GLOBAL = process.env.N8N_MEETING_WEBHOOK_URL ?? "";

// ─── Helper: resolve webhook URL por tenant ──────────────────────────────────
// Tenta ler a URL de meeting do tenant no banco antes de usar a global.
async function resolveMeetingWebhookUrl(tenantId: string): Promise<string | null> {
  try {
    const { pool } = await import("@workspace/db");
    const { rows } = await pool.query(
      `SELECT meeting_webhook_url FROM sales_automation_config
       WHERE tenant_id = $1 AND meeting_webhook_url IS NOT NULL LIMIT 1`,
      [tenantId]
    );
    if (rows[0]?.meeting_webhook_url) return rows[0].meeting_webhook_url;
  } catch {
    // coluna pode não existir ainda — silencioso, cai no fallback
  }

  // Fallback global — só permitido se o tenant for r2pb (único tenant com URL configurada).
  // Para outros tenants, bloqueia com log explícito.
  if (N8N_MEETING_WEBHOOK_URL_GLOBAL) {
    console.warn(`[CRM:agendamento] ⚠️ Tenant '${tenantId}' usando URL global de agendamento — configure meeting_webhook_url em sales_automation_config para este tenant.`);
    return N8N_MEETING_WEBHOOK_URL_GLOBAL;
  }

  return null;
}

// ─── Helper reutilizável ──────────────────────────────────────────────────────
// Dispara payload de agendamento comercial para o n8n (fire-and-forget).
// Retorna true se o disparo foi aceito, false em caso de erro ou sem URL configurada.
export async function triggerMeetingWebhook(params: {
  tenantId: string;
  leadName: string;
  phone: string;
  email?: string | null;
  scheduledAt: string;
  timezone?: string;
  meetingLink?: string | null;
  source?: string;
}): Promise<boolean> {
  const webhookUrl = await resolveMeetingWebhookUrl(params.tenantId);
  if (!webhookUrl) {
    console.warn(`[CRM:agendamento] Sem URL de agendamento para tenant='${params.tenantId}' — disparo bloqueado.`);
    return false;
  }

  const payload = {
    tenant_id: params.tenantId,
    lead_name: params.leadName,
    phone: params.phone,
    email: params.email ?? null,
    scheduled_at: params.scheduledAt,
    timezone: params.timezone ?? "America/Sao_Paulo",
    meeting_link: params.meetingLink ?? null,
    source: params.source ?? "crm_agendamento",
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error(`[CRM:agendamento] n8n retornou ${res.status} para tenant=${params.tenantId} lead="${params.leadName}"`);
      return false;
    }

    console.log(`[CRM:agendamento] ✅ Agendamento enviado ao n8n | tenant=${params.tenantId} lead="${params.leadName}" scheduled_at=${params.scheduledAt}`);
    return true;
  } catch (err) {
    console.error(`[CRM:agendamento] ❌ Falha ao disparar webhook n8n:`, err);
    return false;
  }
}

// ─── Validação do payload ─────────────────────────────────────────────────────
const agendamentoSchema = z.object({
  lead_name: z.string().min(1, "Nome do lead é obrigatório"),
  phone: z.string().min(8, "Telefone inválido"),
  email: z.string().email().optional().nullable(),
  scheduled_at: z.string().datetime({ message: "scheduled_at deve ser ISO 8601" }),
  timezone: z.string().optional().default("America/Sao_Paulo"),
  meeting_link: z.string().url().optional().nullable(),
  source: z.string().optional().default("crm_agendamento"),
});

// ─── POST /api/crm/agendamento ────────────────────────────────────────────────
// Confirma/registra um agendamento comercial e dispara automação no n8n.
// Protegido por sessão + isolamento de tenant.
// Só dispara ao n8n se houver telefone válido e scheduled_at definido.
router.post(
  "/crm/agendamento",
  requireAuth,
  requireTenantAccess,
  async (req: AuthenticatedRequest, res) => {
    const parsed = agendamentoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: parsed.error.flatten() });
    }

    const { lead_name, phone, email, scheduled_at, timezone, meeting_link, source } = parsed.data;
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(403).json({ ok: false, error: "Tenant não identificado — agendamento bloqueado." });
    }

    console.log(`[CRM:agendamento] Novo agendamento | tenant=${tenantId} lead="${lead_name}" phone=${phone} scheduled_at=${scheduled_at}`);

    const dispatched = await triggerMeetingWebhook({
      tenantId,
      leadName: lead_name,
      phone,
      email,
      scheduledAt: scheduled_at,
      timezone,
      meetingLink: meeting_link,
      source,
    });

    return res.json({
      ok: true,
      dispatched,
      message: dispatched
        ? "Agendamento registrado e enviado ao n8n com sucesso"
        : "Agendamento registrado. Disparo ao n8n ignorado (sem URL configurada ou falha)",
    });
  }
);

// ── POST /api/crm/human-control ────────────────────────────────────────────
// Permite que o Hub ligue/desligue manualmente o controle humano para um lead.
// action: "set" → bloqueia Joana | "clear" → libera Joana
// ⚠️ ISOLAMENTO: tenant_id vem SEMPRE do contexto autenticado (req.tenantId), nunca do body.
router.post(
  "/crm/human-control",
  requireAuth,
  requireTenantAccess,
  async (req: AuthenticatedRequest, res) => {
    const parsed = z.object({
      phone:      z.string().min(1),
      action:     z.enum(["set", "clear"]),
      agent_name: z.string().optional(),
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: parsed.error.flatten() });
    }

    const tenantId = req.tenantId!;
    const { phone, action, agent_name } = parsed.data;
    const internalKey = process.env.MARKETING_INTERNAL_API_KEY ?? "";
    const selfUrl = `http://localhost:${process.env.PORT ?? 3001}`;
    const endpoint = action === "set" ? "set-human-control" : "clear-human-control";

    try {
      const r = await fetch(`${selfUrl}/api/internal/leads/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-internal-key": internalKey },
        body: JSON.stringify({ phone, tenant_id: tenantId, ...(agent_name ? { agent_name } : {}) }),
      });
      const data = await r.json();
      return res.status(r.status).json(data);
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message });
    }
  }
);

// ── GET /api/crm/contatos ────────────────────────────────────────────────────
// Lista contatos comerciais do tenant (leads, qualificados, etc.)
router.get(
  "/crm/contatos",
  requireAuth,
  requireTenantAccess,
  async (req: AuthenticatedRequest, res) => {
    const { pool } = await import("@workspace/db");
    const tenantId = req.tenantId!;
    const search = (req.query.q as string | undefined)?.trim() ?? "";
    const limit  = Math.min(Number(req.query.limit ?? 100), 200);
    const offset = Number(req.query.offset ?? 0);

    // Aceita UUID (padrão atual) OU slug antigo (registros salvos antes da correção de tenant_id)
    const tenantFilter = `(tenant_id = $1 OR tenant_id = (SELECT slug FROM tenants WHERE id = $1 LIMIT 1))`;
    const whereSearch = search
      ? `AND (lead_name ILIKE $2 OR phone ILIKE $2 OR email ILIKE $2 OR empresa ILIKE $2)`
      : "";
    const params: unknown[] = search
      ? [tenantId, `%${search}%`, limit, offset]
      : [tenantId, limit, offset];

    const limitIdx  = search ? 3 : 2;
    const offsetIdx = search ? 4 : 3;

    try {
      const { rows } = await pool.query(
        `SELECT id, lead_name, phone, email, empresa, segmento, classificacao, score,
                diagnostico_triado, formulario_enviado_at, status, obs, created_at, updated_at
         FROM comercial_leads
         WHERE ${tenantFilter} ${whereSearch}
         ORDER BY updated_at DESC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        params
      );
      const { rows: countRows } = await pool.query(
        `SELECT COUNT(*) as total FROM comercial_leads WHERE ${tenantFilter} ${whereSearch}`,
        search ? [tenantId, `%${search}%`] : [tenantId]
      );
      return res.json({ ok: true, contatos: rows, total: Number(countRows[0]?.total ?? 0) });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message });
    }
  }
);

// ── POST /api/crm/contatos ───────────────────────────────────────────────────
// Cria contato comercial manualmente
router.post(
  "/crm/contatos",
  requireAuth,
  requireTenantAccess,
  async (req: AuthenticatedRequest, res) => {
    const parsed = z.object({
      phone:   z.string().min(8),
      nome:    z.string().optional(),
      email:   z.string().email().optional().nullable(),
      empresa: z.string().optional().nullable(),
      obs:     z.string().optional().nullable(),
    }).safeParse(req.body);

    if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.flatten() });

    const { pool } = await import("@workspace/db");
    const tenantId = req.tenantId!;
    let { phone, nome, email, empresa, obs } = parsed.data;
    phone = phone.replace(/\D/g, "");
    if (!phone.startsWith("55")) phone = "55" + phone;

    try {
      const { rows } = await pool.query(
        `INSERT INTO comercial_leads (tenant_id, phone, lead_name, email, empresa, obs, classificacao, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'lead', NOW())
         ON CONFLICT (tenant_id, phone) DO UPDATE SET
           lead_name = COALESCE(EXCLUDED.lead_name, comercial_leads.lead_name),
           email     = COALESCE(EXCLUDED.email, comercial_leads.email),
           empresa   = COALESCE(EXCLUDED.empresa, comercial_leads.empresa),
           obs       = COALESCE(EXCLUDED.obs, comercial_leads.obs),
           updated_at = NOW()
         RETURNING *`,
        [tenantId, phone, nome ?? null, email ?? null, empresa ?? null, obs ?? null]
      );
      return res.json({ ok: true, contato: rows[0] });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message });
    }
  }
);

// ── POST /api/crm/diagnostico/enviar ────────────────────────────────────────
// Envio manual do formulário de diagnóstico via Z-API.
// ⚠️  ISOLAMENTO DE TENANT: esta rota só opera no contexto do tenant autenticado.
//     O diagnóstico R2PB só é enviado quando o tenant for explicitamente 'r2pb'.
//     Nenhum fallback silencioso para 'r2pb' é permitido.
router.post(
  "/crm/diagnostico/enviar",
  requireAuth,
  requireTenantAccess,
  async (req: AuthenticatedRequest, res) => {
    const tenantId = req.tenantId!;

    // Bloqueia explicitamente se o tenant não for r2pb — o diagnóstico R2PB
    // não pode ser disparado em contexto de outro tenant ou da Mirage.
    // Quando outros tenants precisarem de diagnóstico próprio, criaremos
    // configuração por tenant em salesAutomationConfig.
    const { rows: tenantRows } = await (await import("@workspace/db")).pool.query(
      `SELECT slug FROM tenants WHERE id = $1 OR slug = $1 LIMIT 1`,
      [tenantId]
    );
    const tenantSlug: string = tenantRows[0]?.slug ?? tenantId;

    if (tenantSlug !== "r2pb") {
      console.warn(`[diagnostico/enviar] Bloqueado: tenant '${tenantSlug}' tentou acionar diagnóstico R2PB`);
      return res.status(403).json({
        ok: false,
        error: `Diagnóstico R2PB não está disponível para o tenant '${tenantSlug}'. Configure o diagnóstico correto para este tenant.`,
      });
    }

    const parsed = z.object({
      phone:    z.string().min(8),
      nome:     z.string().optional(),
      contatoId: z.string().optional(),
    }).safeParse(req.body);

    if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.flatten() });

    const { pool } = await import("@workspace/db");
    let { phone, nome, contatoId } = parsed.data;
    phone = phone.replace(/\D/g, "");
    if (!phone.startsWith("55")) phone = "55" + phone;

    const FORM_URL = `https://www.gestaomirage.com.br/onboarding-portal/diagnostico?phone=${encodeURIComponent(phone)}`;
    const nomeStr  = nome?.trim() ? `, ${nome.trim()}` : "";
    const msg      = `Olá${nomeStr}! 👋 Para entendermos como a R2PB pode te ajudar, preencha nosso formulário de diagnóstico em menos de 2 minutos:\n\n${FORM_URL}`;

    const ZAPI_INSTANCE    = process.env.ZAPI_INSTANCE_R2PB    ?? "3EC7FC04DC4092E870116A599C5ED5B8";
    const ZAPI_TOKEN       = process.env.ZAPI_TOKEN_R2PB       ?? "44BCDFDD085514B19094352B";
    const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN_R2PB ?? "Fadbf0be3eac648c8b790477fd43310cdS";

    try {
      const zapiRes = await fetch(
        `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-text`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "Client-Token": ZAPI_CLIENT_TOKEN },
          body: JSON.stringify({ phone, message: msg }),
          signal: AbortSignal.timeout(12_000),
        }
      );

      if (!zapiRes.ok) {
        const errText = await zapiRes.text().catch(() => "");
        return res.status(502).json({ ok: false, error: `Z-API retornou ${zapiRes.status}: ${errText}` });
      }

      // Atualiza comercial_leads — sempre usando o tenant autenticado (nunca hardcode)
      const updateQuery = contatoId
        ? `UPDATE comercial_leads SET formulario_enviado_at = NOW(), updated_at = NOW() WHERE id = $1`
        : `INSERT INTO comercial_leads (tenant_id, phone, lead_name, formulario_enviado_at, classificacao, updated_at)
           VALUES ($1, $2, $3, NOW(), 'lead', NOW())
           ON CONFLICT (tenant_id, phone) DO UPDATE SET
             formulario_enviado_at = NOW(), updated_at = NOW()`;
      const updateParams = contatoId ? [contatoId] : [tenantId, phone, nome ?? null];
      await pool.query(updateQuery, updateParams).catch(() => {});

      console.info(`[diagnostico/enviar] Diagnóstico enviado para ${phone} (tenant: ${tenantSlug})`);
      return res.json({ ok: true, phone, message: "Formulário enviado com sucesso via WhatsApp" });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message ?? "Erro ao enviar via Z-API" });
    }
  }
);

export default router;
