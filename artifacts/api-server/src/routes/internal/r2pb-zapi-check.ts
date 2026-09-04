import { Router, Request, Response } from "express";
import { pool } from "@workspace/db";
import { logger } from "../../lib/logger";

const router = Router();

function requireInternalKey(req: Request, res: Response, next: () => void) {
  const key = process.env["MARKETING_INTERNAL_API_KEY"];
  const provided = req.headers["x-internal-key"];
  if (!key || provided !== key) {
    res.status(401).json({ error: "Unauthorized — invalid x-internal-key" });
    return;
  }
  next();
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("55")) return digits.slice(2);
  if (digits.length === 12 && digits.startsWith("55")) return digits.slice(2);
  return digits;
}

function phoneMatch(col: string): string {
  return `regexp_replace(${col}, '[^0-9]', '', 'g') = $1`;
}

export type ZapiAction =
  | "send_form"       // não preencheu — envia link do diagnóstico
  | "handoff"         // aprovado — transfere para humano
  | "send_rejection"  // reprovado/nutrição — informa perfil + oferece atualizar
  | "noop_client"     // já é cliente ativo — sem ação
  | "noop_supplier";  // já é fornecedor — sem ação

// ── POST /api/internal/r2pb/zapi-check ───────────────────────────────────────
// Ponto único de entrada para o n8n verificar o que fazer com um número Z-API.
//
// 1ª chamada de um número: faz o lookup completo, grava resultado e retorna ação.
// Chamadas seguintes: retorna already_handled=true com a ação cacheada (1 query rápida).
//
// Body:   { phone: "5511999887766" }
// Retorno (novo):     { already_handled: false, action, nome, status, classificacao, form_link }
// Retorno (cacheado): { already_handled: true,  action, nome }
//
// Para resetar o cache (ex.: lead quer refazer diagnóstico):
//   POST /api/internal/r2pb/zapi-reset  { phone }

const FORM_LINK = "https://www.gestaomirage.com.br/onboarding-portal/diagnostico";
const TENANT_ID = "r2pb";

router.post("/internal/r2pb/zapi-check", requireInternalKey, async (req: Request, res: Response) => {
  const { phone } = req.body as { phone?: string };

  if (!phone) {
    res.status(400).json({ error: "phone obrigatório" });
    return;
  }

  const normalized = normalizePhone(phone);
  if (normalized.length < 8) {
    res.status(400).json({ error: "número inválido" });
    return;
  }

  try {
    // ── 1. Verificar cache em lead_conversation_state ─────────────────────────
    const { rows: cached } = await pool.query<{
      diagnostico_triado: boolean;
      diagnostico_action: string | null;
      human_in_control: boolean;
      lead_name?: string;
    }>(
      `SELECT diagnostico_triado, diagnostico_action, human_in_control
       FROM lead_conversation_state
       WHERE tenant_id = $2
         AND regexp_replace(phone, '[^0-9]', '', 'g') = $1
       LIMIT 1`,
      [normalized, TENANT_ID]
    );

    if (cached.length > 0 && cached[0].diagnostico_triado) {
      logger.info({ phone: normalized, action: cached[0].diagnostico_action, cached: true }, "r2pb-zapi-check");
      res.json({
        already_handled: true,
        action: cached[0].diagnostico_action ?? "send_form",
        human_in_control: cached[0].human_in_control,
      });
      return;
    }

    // ── 2. Lookup completo (apenas na 1ª vez) ─────────────────────────────────
    let action: ZapiAction = "send_form";
    let nome: string | null = null;
    let status = "sem_registro";
    let classificacao: string | null = null;

    // 2a. Cliente ativo (PLM)
    const { rows: clientes } = await pool.query(
      `SELECT nome FROM plm_clientes
       WHERE (${phoneMatch("telefone")} OR ${phoneMatch("contato")})
         AND tenant_id = '${TENANT_ID}' LIMIT 1`,
      [normalized]
    );
    if (clientes.length > 0) {
      nome = clientes[0].nome ?? null;
      status = "cliente_ativo";
      action = "noop_client";
    }

    // 2b. Fornecedor (PLM)
    if (status === "sem_registro") {
      const { rows: fornecedores } = await pool.query(
        `SELECT nome FROM plm_fornecedores
         WHERE (${phoneMatch("telefone")} OR ${phoneMatch("contato")})
           AND tenant_id = '${TENANT_ID}' LIMIT 1`,
        [normalized]
      );
      if (fornecedores.length > 0) {
        nome = fornecedores[0].nome ?? null;
        status = "fornecedor";
        action = "noop_supplier";
      }
    }

    // 2c. Diagnóstico preenchido (triagem_r2pb)
    if (status === "sem_registro") {
      const { rows: triagem } = await pool.query(
        `SELECT nome, classificacao, score
         FROM triagem_r2pb
         WHERE ${phoneMatch("contato")} AND tenant_id = '${TENANT_ID}'
         ORDER BY created_at DESC LIMIT 1`,
        [normalized]
      );
      if (triagem.length > 0) {
        nome = triagem[0].nome ?? null;
        classificacao = triagem[0].classificacao ?? null;
        status = "diagnostico_preenchido";
        action = classificacao === "aprovado" ? "handoff" : "send_rejection";
      }
    }

    // 2d. Lead comercial (sem diagnóstico mas está no CRM)
    if (status === "sem_registro") {
      const { rows: leads } = await pool.query(
        `SELECT lead_name FROM comercial_leads
         WHERE ${phoneMatch("phone")} AND tenant_id = '${TENANT_ID}' LIMIT 1`,
        [normalized]
      );
      if (leads.length > 0) {
        nome = leads[0].lead_name ?? null;
        status = "lead_comercial";
        action = "send_form";
      }
    }

    // ── 3. Gravar resultado em lead_conversation_state (upsert) ──────────────
    const convStatus = action === "handoff" ? "handoff" : "active";

    await pool.query(
      `INSERT INTO lead_conversation_state
         (id, tenant_id, phone, conversation_status, diagnostico_triado, diagnostico_action, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, true, $4, NOW())
       ON CONFLICT (tenant_id, phone) DO UPDATE
         SET diagnostico_triado = true,
             diagnostico_action  = $4,
             conversation_status = CASE
               WHEN lead_conversation_state.human_in_control = true THEN lead_conversation_state.conversation_status
               ELSE $3
             END,
             updated_at = NOW()`,
      [TENANT_ID, normalized, convStatus, action]
    );

    logger.info({ phone: normalized, action, status, cached: false }, "r2pb-zapi-check");

    res.json({
      already_handled: false,
      action,
      nome,
      status,
      classificacao,
      form_link: action === "send_form" ? FORM_LINK : undefined,
    });
  } catch (e: any) {
    logger.error({ err: e?.message, phone: normalized }, "r2pb-zapi-check: erro");
    res.status(500).json({ error: "Erro interno" });
  }
});

// ── POST /api/internal/r2pb/zapi-reset ───────────────────────────────────────
// Limpa o cache de um número para que o zapi-check faça o lookup novamente.
// Útil quando o lead quer refazer o diagnóstico ou houve atualização de cadastro.
// Body: { phone: "5511999887766" }

router.post("/internal/r2pb/zapi-reset", requireInternalKey, async (req: Request, res: Response) => {
  const { phone } = req.body as { phone?: string };

  if (!phone) {
    res.status(400).json({ error: "phone obrigatório" });
    return;
  }

  const normalized = normalizePhone(phone);

  try {
    await pool.query(
      `UPDATE lead_conversation_state
       SET diagnostico_triado = false,
           diagnostico_action  = NULL,
           updated_at = NOW()
       WHERE tenant_id = $1
         AND regexp_replace(phone, '[^0-9]', '', 'g') = $2`,
      [TENANT_ID, normalized]
    );

    logger.info({ phone: normalized }, "r2pb-zapi-reset: cache limpo");
    res.json({ success: true, phone: normalized });
  } catch (e: any) {
    logger.error({ err: e?.message }, "r2pb-zapi-reset: erro");
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
