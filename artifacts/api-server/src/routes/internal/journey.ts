/**
 * /api/internal/journey/*
 *
 * Camada soberana de estado da jornada do lead.
 * Fonte de verdade única para: WhatsApp, formulário, pipelines, marketing e relatórios.
 * Consumida pelo n8n para roteamento e pelo Hub para relatórios.
 *
 * Auth: x-internal-key (MARKETING_INTERNAL_API_KEY)
 */
import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { pool } from "@workspace/db";
import { logger } from "../../lib/logger";

const router = Router();

// ── Auth ──────────────────────────────────────────────────────────────────────
function requireInternalKey(req: Request, res: Response, next: () => void) {
  const key = process.env["MARKETING_INTERNAL_API_KEY"];
  if (!key) { res.status(503).json({ error: "Internal API key not configured" }); return; }
  const provided = req.headers["x-internal-key"];
  if (!provided || provided !== key) { res.status(401).json({ error: "Unauthorized — invalid x-internal-key" }); return; }
  next();
}

// ── Normalização de telefone ──────────────────────────────────────────────────
function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

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

// ── Schemas de validação ──────────────────────────────────────────────────────
const VALID_STATUSES = [
  "novo", "aguardando_formulario", "em_triagem",
  "aprovado_vendas", "nutricao", "fora_de_perfil",
  "suporte", "producao", "fornecedor",
  "reativacao", "pos_venda", "fechado", "perdido",
] as const;

const upsertSchema = z.object({
  phone:                  z.string().min(8),
  tenant_id:              z.string().min(1).default("r2pb"),
  nome:                   z.string().optional().nullable(),
  origem:                 z.string().optional().nullable(),
  canal_atual:            z.string().optional().nullable(),
  status:                 z.enum(VALID_STATUSES).optional(),
  etapa_atual:            z.string().optional().nullable(),
  pergunta_pendente:      z.string().optional().nullable(),
  pipeline_atual:         z.string().optional().nullable(),
  departamento_destino:   z.string().optional().nullable(),
  responsavel_humano:     z.string().optional().nullable(),
  responsavel_id:         z.string().optional().nullable(),
  ultima_interacao:       z.string().datetime().optional().nullable(),
  origem_evento:          z.string().optional().default("api"),
  criado_por:             z.string().optional().nullable(),
});

const eventSchema = z.object({
  phone:           z.string().min(8),
  tenant_id:       z.string().min(1).default("r2pb"),
  evento:          z.string().min(1),
  status_anterior: z.string().optional().nullable(),
  status_novo:     z.string().optional().nullable(),
  dados:           z.record(z.unknown()).optional().nullable(),
  origem:          z.string().optional().nullable(),
  criado_por:      z.string().optional().nullable(),
});

// ── Helper: buscar jornada por qualquer variação do telefone ──────────────────
async function findJourney(tenantId: string, phone: string) {
  const variants = phoneVariants(phone);
  const placeholders = variants.map((_, i) => `$${i + 2}`).join(", ");
  const { rows } = await pool.query(
    `SELECT * FROM lead_journey
     WHERE tenant_id = $1 AND phone = ANY(ARRAY[${placeholders}])
     LIMIT 1`,
    [tenantId, ...variants]
  );
  return rows[0] ?? null;
}

// ── Helper: registrar evento ──────────────────────────────────────────────────
async function insertEvent(
  tenantId: string, phone: string, evento: string,
  statusAnterior: string | null, statusNovo: string | null,
  dados: unknown, origem: string | null, criadoPor: string | null
) {
  await pool.query(
    `INSERT INTO lead_journey_events
       (tenant_id, phone, evento, status_anterior, status_novo, dados, origem, criado_por)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [tenantId, phone, evento, statusAnterior, statusNovo,
     dados ? JSON.stringify(dados) : null, origem, criadoPor]
  );
}

// ── GET /api/internal/journey/lead ────────────────────────────────────────────
// Retorna estado atual da jornada do lead por telefone.
// Query: phone=<phone>&tenant_id=<tenant>
router.get("/internal/journey/lead", requireInternalKey, async (req: Request, res: Response) => {
  const { phone, tenant_id = "r2pb" } = req.query as Record<string, string>;
  if (!phone) { res.status(400).json({ error: "'phone' é obrigatório" }); return; }

  try {
    const journey = await findJourney(tenant_id, phone);
    res.json({ ok: true, found: journey !== null, journey });
  } catch (err: any) {
    logger.error({ err: err?.message }, "internal/journey: GET lead erro");
    res.status(500).json({ error: err?.message });
  }
});

// ── POST /api/internal/journey/lead ──────────────────────────────────────────
// Cria ou atualiza (upsert) a jornada do lead.
// Se o status mudar, registra automaticamente um evento "status_mudado".
router.post("/internal/journey/lead", requireInternalKey, async (req: Request, res: Response) => {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const d = parsed.data;
  const phone = normalizePhone(d.phone);
  const tenantId = d.tenant_id;

  try {
    const existing = await findJourney(tenantId, phone);
    const statusAnterior = existing?.status ?? null;
    const statusNovo = d.status ?? existing?.status ?? "novo";
    const statusMudou = existing && d.status && d.status !== statusAnterior;

    if (existing) {
      await pool.query(
        `UPDATE lead_journey SET
           nome                = COALESCE($3, nome),
           origem              = COALESCE($4, origem),
           canal_atual         = COALESCE($5, canal_atual),
           status              = COALESCE($6, status),
           etapa_atual         = COALESCE($7, etapa_atual),
           pergunta_pendente   = $8,
           pipeline_atual      = COALESCE($9, pipeline_atual),
           departamento_destino = COALESCE($10, departamento_destino),
           responsavel_humano  = COALESCE($11, responsavel_humano),
           responsavel_id      = COALESCE($12, responsavel_id),
           ultima_interacao    = COALESCE($13, ultima_interacao),
           updated_at          = NOW()
         WHERE tenant_id = $1 AND phone = $2`,
        [tenantId, existing.phone,
         d.nome ?? null, d.origem ?? null, d.canal_atual ?? null,
         d.status ?? null, d.etapa_atual ?? null, d.pergunta_pendente ?? null,
         d.pipeline_atual ?? null, d.departamento_destino ?? null,
         d.responsavel_humano ?? null, d.responsavel_id ?? null,
         d.ultima_interacao ? new Date(d.ultima_interacao) : null]
      );
    } else {
      await pool.query(
        `INSERT INTO lead_journey
           (tenant_id, phone, nome, origem, canal_atual, status,
            etapa_atual, pergunta_pendente, pipeline_atual,
            departamento_destino, responsavel_humano, responsavel_id, ultima_interacao)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [tenantId, phone,
         d.nome ?? null, d.origem ?? null, d.canal_atual ?? null,
         d.status ?? "novo",
         d.etapa_atual ?? null, d.pergunta_pendente ?? null,
         d.pipeline_atual ?? null, d.departamento_destino ?? null,
         d.responsavel_humano ?? null, d.responsavel_id ?? null,
         d.ultima_interacao ? new Date(d.ultima_interacao) : null]
      );
      await insertEvent(tenantId, phone, "origem_registrada", null, statusNovo,
        { origem: d.origem, canal: d.canal_atual }, d.origem_evento, d.criado_por ?? null);
    }

    if (statusMudou) {
      await insertEvent(tenantId, phone, "status_mudado", statusAnterior, statusNovo,
        { etapa: d.etapa_atual }, d.origem_evento, d.criado_por ?? null);
    }

    const updated = await findJourney(tenantId, phone);
    logger.info({ tenantId, phone, status: updated?.status, action: existing ? "updated" : "created" },
      "internal/journey: upsert");
    res.json({ ok: true, action: existing ? "updated" : "created", journey: updated });
  } catch (err: any) {
    logger.error({ err: err?.message }, "internal/journey: POST lead erro");
    res.status(500).json({ error: err?.message });
  }
});

// ── POST /api/internal/journey/event ─────────────────────────────────────────
// Registra um evento de auditoria na jornada do lead.
// Não modifica o estado — só appenda ao histórico.
router.post("/internal/journey/event", requireInternalKey, async (req: Request, res: Response) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const d = parsed.data;
  const phone = normalizePhone(d.phone);

  try {
    await insertEvent(
      d.tenant_id, phone, d.evento,
      d.status_anterior ?? null, d.status_novo ?? null,
      d.dados ?? null, d.origem ?? null, d.criado_por ?? null
    );
    logger.info({ tenantId: d.tenant_id, phone, evento: d.evento }, "internal/journey: evento registrado");
    res.json({ ok: true });
  } catch (err: any) {
    logger.error({ err: err?.message }, "internal/journey: POST event erro");
    res.status(500).json({ error: err?.message });
  }
});

// ── GET /api/internal/journey/lead/context ────────────────────────────────────
// Contexto completo do lead: jornada + últimos 20 eventos + comercial_leads + conv state.
// Endpoint principal para o n8n decidir roteamento.
router.get("/internal/journey/lead/context", requireInternalKey, async (req: Request, res: Response) => {
  const { phone, tenant_id = "r2pb" } = req.query as Record<string, string>;
  if (!phone) { res.status(400).json({ error: "'phone' é obrigatório" }); return; }

  const variants = phoneVariants(phone);
  const phonePlaceholders = variants.map((_, i) => `$${i + 2}`).join(", ");

  try {
    const [journey, events, comercial, convState] = await Promise.all([
      // 1. Estado da jornada
      findJourney(tenant_id, phone),

      // 2. Últimos 20 eventos
      pool.query(
        `SELECT evento, status_anterior, status_novo, dados, origem, criado_por, created_at
         FROM lead_journey_events
         WHERE tenant_id = $1 AND phone = ANY(ARRAY[${phonePlaceholders}])
         ORDER BY created_at DESC LIMIT 20`,
        [tenant_id, ...variants]
      ).then(r => r.rows),

      // 3. Dados comerciais (triagem, classificação, score)
      pool.query(
        `SELECT id, lead_name, email, segmento, classificacao, score,
                diagnostico_triado, status, pipeline_key, stage_key,
                responsavel_nome, last_handoff_at, updated_at
         FROM comercial_leads
         WHERE tenant_id = $1 AND phone = ANY(ARRAY[${phonePlaceholders}])
         LIMIT 1`,
        [tenant_id, ...variants]
      ).then(r => r.rows[0] ?? null),

      // 4. Estado da conversa (agentes)
      pool.query(
        `SELECT conversation_status, turn_count, conversation_goal,
                handoff_required, handoff_reason, human_in_control,
                human_agent_name, last_activity_at
         FROM lead_conversation_state
         WHERE tenant_id = $1 AND phone = ANY(ARRAY[${phonePlaceholders}])
         LIMIT 1`,
        [tenant_id, ...variants]
      ).then(r => r.rows[0] ?? null),
    ]);

    const context = {
      found: journey !== null || comercial !== null,
      phone: normalizePhone(phone),
      tenant_id,
      journey,
      comercial,
      conversa: convState,
      historico: events,
      // Resumo executivo para n8n decidir sem lógica extra
      resumo: {
        status_jornada:       journey?.status ?? "desconhecido",
        classificacao:        comercial?.classificacao ?? null,
        score:                comercial?.score ?? null,
        human_in_control:     convState?.human_in_control ?? false,
        diagnostico_triado:   comercial?.diagnostico_triado ?? false,
        pipeline_atual:       journey?.pipeline_atual ?? comercial?.pipeline_key ?? null,
        ultima_interacao:     journey?.ultima_interacao ?? journey?.updated_at ?? null,
        proximo_passo:        journey?.etapa_atual ?? null,
        departamento_destino: journey?.departamento_destino ?? null,
      },
    };

    logger.info({ tenantId: tenant_id, phone, found: context.found, status: context.resumo.status_jornada },
      "internal/journey: context consultado");
    res.json({ ok: true, context });
  } catch (err: any) {
    logger.error({ err: err?.message }, "internal/journey: GET context erro");
    res.status(500).json({ error: err?.message });
  }
});

// ── GET /api/internal/journey/leads ──────────────────────────────────────────
// Lista leads por status. Útil para relatórios e dashboards.
// Query: tenant_id=r2pb&status=aprovado_vendas&limit=50
router.get("/internal/journey/leads", requireInternalKey, async (req: Request, res: Response) => {
  const { tenant_id = "r2pb", status, limit = "50", offset = "0" } = req.query as Record<string, string>;
  const lim = Math.min(Number(limit), 200);
  const off = Number(offset);

  try {
    const whereStatus = status ? "AND status = $3" : "";
    const params: unknown[] = status ? [tenant_id, lim, status, off] : [tenant_id, lim, off];
    const limitIdx = 2;
    const offsetIdx = status ? 4 : 3;

    const { rows } = await pool.query(
      `SELECT id, phone, nome, origem, canal_atual, status, etapa_atual,
              pipeline_atual, departamento_destino, responsavel_humano,
              ultima_interacao, created_at, updated_at
       FROM lead_journey
       WHERE tenant_id = $1 ${whereStatus}
       ORDER BY updated_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    );

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) as total FROM lead_journey WHERE tenant_id = $1 ${whereStatus}`,
      status ? [tenant_id, status] : [tenant_id]
    );

    res.json({ ok: true, leads: rows, total: Number(countRows[0]?.total ?? 0) });
  } catch (err: any) {
    logger.error({ err: err?.message }, "internal/journey: GET leads erro");
    res.status(500).json({ error: err?.message });
  }
});

export default router;
