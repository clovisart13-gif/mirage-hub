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

// Normaliza número para apenas dígitos, remove DDI 55 se presente
// Ex: "5511999887766" → "11999887766"  |  "(51) 98888-7777" → "5198888777"
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("55")) return digits.slice(2);
  if (digits.length === 12 && digits.startsWith("55")) return digits.slice(2);
  return digits;
}

// Monta cláusula SQL para comparar campo de telefone (armazenado com formatação)
// com número normalizado via regexp_replace
function phoneMatchClause(col: string): string {
  return `regexp_replace(${col}, '[^0-9]', '', 'g') = $1`;
}

export type LookupStatus =
  | "cliente_ativo"
  | "fornecedor"
  | "aprovado"
  | "nutricao"
  | "fora_de_perfil"
  | "lead_comercial"
  | "sem_registro";

interface LookupResult {
  status: LookupStatus;
  nome: string | null;
  diagnostico_preenchido: boolean;
  classificacao: string | null;
  score: number | null;
  helena_card_id: string | null;
  origem: string;
}

// ── POST /api/internal/r2pb/lookup ───────────────────────────────────────────
// Consulta identidade de um número WhatsApp para roteamento inteligente.
// Body: { whatsapp: "5511999887766" }
// Retorno: { status, nome, diagnostico_preenchido, classificacao, score, ... }
router.post("/internal/r2pb/lookup", requireInternalKey, async (req: Request, res: Response) => {
  const { whatsapp } = req.body as { whatsapp?: string };

  if (!whatsapp) {
    res.status(400).json({ error: "whatsapp obrigatório" });
    return;
  }

  const normalized = normalizePhone(whatsapp);

  if (normalized.length < 8) {
    res.status(400).json({ error: "número inválido" });
    return;
  }

  try {
    // 1. Cliente ativo (PLM)
    const { rows: clientes } = await pool.query(
      `SELECT nome FROM plm_clientes
       WHERE (${phoneMatchClause("telefone")} OR ${phoneMatchClause("contato")})
       AND tenant_id = 'r2pb'
       LIMIT 1`,
      [normalized]
    );
    if (clientes.length > 0) {
      const result: LookupResult = {
        status: "cliente_ativo",
        nome: clientes[0].nome ?? null,
        diagnostico_preenchido: false,
        classificacao: null,
        score: null,
        helena_card_id: null,
        origem: "plm_clientes",
      };
      logger.info({ whatsapp: normalized, status: "cliente_ativo" }, "r2pb-lookup");
      res.json(result);
      return;
    }

    // 2. Fornecedor (PLM)
    const { rows: fornecedores } = await pool.query(
      `SELECT nome FROM plm_fornecedores
       WHERE (${phoneMatchClause("telefone")} OR ${phoneMatchClause("contato")})
       AND tenant_id = 'r2pb'
       LIMIT 1`,
      [normalized]
    );
    if (fornecedores.length > 0) {
      const result: LookupResult = {
        status: "fornecedor",
        nome: fornecedores[0].nome ?? null,
        diagnostico_preenchido: false,
        classificacao: null,
        score: null,
        helena_card_id: null,
        origem: "plm_fornecedores",
      };
      logger.info({ whatsapp: normalized, status: "fornecedor" }, "r2pb-lookup");
      res.json(result);
      return;
    }

    // 3. Diagnóstico R2PB preenchido
    const { rows: triagem } = await pool.query(
      `SELECT nome, classificacao, score, helena_card_id
       FROM triagem_r2pb
       WHERE ${phoneMatchClause("contato")}
       AND tenant_id = 'r2pb'
       ORDER BY created_at DESC
       LIMIT 1`,
      [normalized]
    );
    if (triagem.length > 0) {
      const t = triagem[0];
      const status: LookupStatus =
        t.classificacao === "aprovado" ? "aprovado"
        : t.classificacao === "nutricao" ? "nutricao"
        : "fora_de_perfil";
      const result: LookupResult = {
        status,
        nome: t.nome ?? null,
        diagnostico_preenchido: true,
        classificacao: t.classificacao ?? null,
        score: t.score ?? null,
        helena_card_id: t.helena_card_id ?? null,
        origem: "triagem_r2pb",
      };
      logger.info({ whatsapp: normalized, status }, "r2pb-lookup");
      res.json(result);
      return;
    }

    // 4. Lead comercial (entrou no CRM mas não preencheu diagnóstico)
    const { rows: leads } = await pool.query(
      `SELECT lead_name FROM comercial_leads
       WHERE ${phoneMatchClause("phone")}
       AND tenant_id = 'r2pb'
       LIMIT 1`,
      [normalized]
    );
    if (leads.length > 0) {
      const result: LookupResult = {
        status: "lead_comercial",
        nome: leads[0].lead_name ?? null,
        diagnostico_preenchido: false,
        classificacao: null,
        score: null,
        helena_card_id: null,
        origem: "comercial_leads",
      };
      logger.info({ whatsapp: normalized, status: "lead_comercial" }, "r2pb-lookup");
      res.json(result);
      return;
    }

    // 5. Sem registro
    const result: LookupResult = {
      status: "sem_registro",
      nome: null,
      diagnostico_preenchido: false,
      classificacao: null,
      score: null,
      helena_card_id: null,
      origem: "none",
    };
    logger.info({ whatsapp: normalized, status: "sem_registro" }, "r2pb-lookup");
    res.json(result);
  } catch (e: any) {
    logger.error({ err: e?.message }, "r2pb-lookup: erro");
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
