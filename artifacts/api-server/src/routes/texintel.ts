import { Router } from "express";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";

const router = Router();

// GET /api/texintel/companies
router.get("/texintel/companies", async (req, res) => {
  try {
    const { status, modulo, limit = "50", offset = "0" } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    if (modulo) {
      params.push(modulo);
      conditions.push(`modulo_recomendado = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limitN = Math.min(parseInt(limit, 10) || 50, 200);
    const offsetN = parseInt(offset, 10) || 0;

    const result = await pool.query(
      `SELECT id, cnpj, razao_social, nome_fantasia, situacao, municipio, uf,
              website, atividade_principal, dores, faturamento_estimado,
              fit_crm, fit_erp, fit_plm, fit_comunidade, modulo_recomendado,
              justificativa, status, created_at, processed_at
       FROM texintel_companies
       ${where}
       ORDER BY created_at DESC
       LIMIT ${limitN} OFFSET ${offsetN}`,
      params,
    );
    res.json(result.rows);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "texintel/companies list error", error: msg });
    res.status(500).json({ error: msg });
  }
});

// GET /api/texintel/companies/top
router.get("/texintel/companies/top", async (req, res) => {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) || "10", 10), 50);
    const result = await pool.query(
      `SELECT id, cnpj, razao_social, nome_fantasia, municipio, uf,
              fit_crm, fit_erp, fit_plm, fit_comunidade, modulo_recomendado,
              justificativa, status, created_at, processed_at
       FROM texintel_companies
       WHERE status = 'done'
         AND modulo_recomendado IS NOT NULL
       ORDER BY GREATEST(
         COALESCE(fit_crm, 0), COALESCE(fit_erp, 0),
         COALESCE(fit_plm, 0), COALESCE(fit_comunidade, 0)
       ) DESC
       LIMIT $1`,
      [limit],
    );
    res.json(result.rows);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "texintel/companies/top error", error: msg });
    res.status(500).json({ error: msg });
  }
});

// GET /api/texintel/stats
router.get("/texintel/stats", async (_req, res) => {
  try {
    const [totals, byModulo] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)                                        AS total,
          COUNT(*) FILTER (WHERE status = 'done')        AS done,
          COUNT(*) FILTER (WHERE status = 'pending')     AS pending,
          COUNT(*) FILTER (WHERE status = 'error')       AS error
        FROM texintel_companies
      `),
      pool.query(`
        SELECT modulo_recomendado, COUNT(*) AS qty
        FROM texintel_companies
        WHERE status = 'done' AND modulo_recomendado IS NOT NULL
        GROUP BY modulo_recomendado
      `),
    ]);

    const row = totals.rows[0];
    const moduloMap: Record<string, number> = { crm: 0, erp: 0, plm: 0, comunidade: 0 };
    for (const r of byModulo.rows) {
      const key = (r.modulo_recomendado as string).toLowerCase();
      if (key in moduloMap) moduloMap[key] = parseInt(r.qty, 10);
    }

    res.json({
      total:      parseInt(row.total, 10),
      done:       parseInt(row.done, 10),
      pending:    parseInt(row.pending, 10),
      error:      parseInt(row.error, 10),
      por_modulo: moduloMap,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "texintel/stats error", error: msg });
    res.status(500).json({ error: msg });
  }
});

// GET /api/texintel/companies/:id
router.get("/texintel/companies/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM texintel_companies WHERE id = $1`,
      [req.params.id],
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Empresa não encontrada" });
    res.json(result.rows[0]);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// POST /api/texintel/companies/analyze
router.post("/texintel/companies/analyze", async (req, res) => {
  try {
    const { cnpj, website } = req.body as { cnpj?: string; website?: string };
    if (!cnpj) return res.status(400).json({ error: "CNPJ obrigatório" });

    // Normaliza CNPJ (remove pontuação)
    const cnpjClean = cnpj.replace(/\D/g, "");
    if (cnpjClean.length !== 14) return res.status(400).json({ error: "CNPJ inválido" });

    // Upsert com status pending (pipeline externo vai enriquecer)
    const result = await pool.query(
      `INSERT INTO texintel_companies (cnpj, website, status)
       VALUES ($1, $2, 'pending')
       ON CONFLICT (cnpj) DO UPDATE
         SET status = CASE WHEN texintel_companies.status = 'done' THEN 'done' ELSE 'pending' END,
             website = COALESCE($2, texintel_companies.website)
       RETURNING id, cnpj, status`,
      [cnpjClean, website || null],
    );

    const company = result.rows[0];
    res.status(202).json({
      id:      company.id,
      cnpj:    company.cnpj,
      status:  company.status,
      message: "CNPJ enfileirado para análise. O pipeline TexIntel irá enriquecê-lo em breve.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "texintel/analyze error", error: msg });
    res.status(500).json({ error: msg });
  }
});

// POST /api/internal/texintel/resultado  (receptor do pipeline TexIntel AI)
router.post("/internal/texintel/resultado", async (req, res) => {
  const internalKey = req.headers["x-internal-key"];
  const expectedKey = process.env["TEXINTEL_INTERNAL_KEY"] || process.env["MARKETING_INTERNAL_API_KEY"];
  if (!internalKey || internalKey !== expectedKey) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  try {
    const {
      cnpj, razao_social, nome_fantasia, situacao, atividade_principal,
      municipio, uf, website, dores, faturamento_estimado,
      fit_crm, fit_erp, fit_plm, fit_comunidade,
      modulo_recomendado, justificativa, raw_analysis, scraping_content,
    } = req.body;

    if (!cnpj) return res.status(400).json({ error: "CNPJ obrigatório" });
    const cnpjClean = String(cnpj).replace(/\D/g, "");

    const result = await pool.query(
      `INSERT INTO texintel_companies (
         cnpj, razao_social, nome_fantasia, situacao, atividade_principal,
         municipio, uf, website, dores, faturamento_estimado,
         fit_crm, fit_erp, fit_plm, fit_comunidade,
         modulo_recomendado, justificativa, raw_analysis, scraping_content,
         status, processed_at
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8, $9, $10,
         $11, $12, $13, $14,
         $15, $16, $17, $18,
         'done', NOW()
       )
       ON CONFLICT (cnpj) DO UPDATE SET
         razao_social        = EXCLUDED.razao_social,
         nome_fantasia       = EXCLUDED.nome_fantasia,
         situacao            = EXCLUDED.situacao,
         atividade_principal = EXCLUDED.atividade_principal,
         municipio           = EXCLUDED.municipio,
         uf                  = EXCLUDED.uf,
         website             = COALESCE(EXCLUDED.website, texintel_companies.website),
         dores               = EXCLUDED.dores,
         faturamento_estimado = EXCLUDED.faturamento_estimado,
         fit_crm             = EXCLUDED.fit_crm,
         fit_erp             = EXCLUDED.fit_erp,
         fit_plm             = EXCLUDED.fit_plm,
         fit_comunidade      = EXCLUDED.fit_comunidade,
         modulo_recomendado  = EXCLUDED.modulo_recomendado,
         justificativa       = EXCLUDED.justificativa,
         raw_analysis        = EXCLUDED.raw_analysis,
         scraping_content    = EXCLUDED.scraping_content,
         status              = 'done',
         processed_at        = NOW()
       RETURNING id, cnpj, status`,
      [
        cnpjClean, razao_social, nome_fantasia, situacao, atividade_principal,
        municipio, uf, website, JSON.stringify(dores || []), faturamento_estimado,
        fit_crm, fit_erp, fit_plm, fit_comunidade,
        modulo_recomendado, justificativa, raw_analysis, scraping_content,
      ],
    );

    logger.info({ msg: "✅ TexIntel enriquecimento recebido", cnpj: cnpjClean, modulo: modulo_recomendado });
    res.json({ ok: true, id: result.rows[0].id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "texintel/interno/resultado error", error: msg });
    res.status(500).json({ error: msg });
  }
});

export default router;
