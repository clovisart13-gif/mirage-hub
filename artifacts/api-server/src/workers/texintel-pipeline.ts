/**
 * TexIntel AI Pipeline Worker
 *
 * Roda em background no API server. A cada 45 segundos:
 *  1. Busca até 3 empresas com status = 'pending'
 *  2. Marca como 'processing' para evitar processamento duplo
 *  3. Para cada empresa:
 *      a. Busca dados CNPJ via BrasilAPI (gratuito, sem chave)
 *      b. Scrapa site via Jina AI (r.jina.ai) se website disponível
 *      c. Envia para OpenAI (via AI Integrations) para análise estruturada
 *      d. Grava resultado via endpoint interno /api/internal/texintel/resultado
 *  4. Em caso de falha, marca status = 'error' com mensagem
 */

import { pool } from "@workspace/db";
import { logger } from "../lib/logger";

const PIPELINE_INTERVAL_MS = 45_000;
const BATCH_SIZE = 3;

// ── BrasilAPI CNPJ lookup ─────────────────────────────────────────────────────

interface BrasilApiCnpj {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  situacao: string;
  municipio: string;
  uf: string;
  data_inicio_atividade: string;
  atividade_principal: Array<{ code: string; text: string }>;
  natureza_juridica: string;
  email?: string;
}

async function fetchCnpjData(cnpj: string): Promise<BrasilApiCnpj | null> {
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) return null;
    return await r.json() as BrasilApiCnpj;
  } catch {
    return null;
  }
}

// ── Jina scraping ─────────────────────────────────────────────────────────────

async function scrapeWebsite(website: string): Promise<string | null> {
  try {
    const url = website.startsWith("http") ? website : `https://${website}`;
    const jinaUrl = `https://r.jina.ai/${url}`;
    const r = await fetch(jinaUrl, {
      headers: { "Accept": "text/plain", "X-Return-Format": "text" },
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) return null;
    const text = await r.text();
    // Limita a 6000 chars para não explodir o contexto do modelo
    return text.slice(0, 6000);
  } catch {
    return null;
  }
}

// ── OpenAI análise estruturada ────────────────────────────────────────────────

interface TexintelAnalysis {
  dores: string[];
  faturamento_estimado: string;
  fit_crm: number;
  fit_erp: number;
  fit_plm: number;
  fit_comunidade: number;
  modulo_recomendado: "CRM" | "ERP" | "PLM" | "Comunidade";
  justificativa: string;
}

const SYSTEM_PROMPT = `Você é um analista de negócios especialista em mercado têxtil e de moda no Brasil.
Sua função é analisar dados de empresas do setor moda/vestuário e identificar quais produtos de software têm maior fit.

O Hub Mirage oferece 4 módulos:
- CRM: Gestão de relacionamento, funil de vendas, automação comercial
- ERP: Gestão fiscal, financeiro, estoque, faturamento
- PLM: Gestão de produto, coleção, modelagem, aprovação de amostras
- Comunidade: Rede B2B entre marcas, atacadistas, fornecedores e representantes

Retorne APENAS um JSON válido sem markdown, com exatamente estes campos:
{
  "dores": ["dor 1", "dor 2", "dor 3"],
  "faturamento_estimado": "R$ X-Y mil/mês",
  "fit_crm": 0-100,
  "fit_erp": 0-100,
  "fit_plm": 0-100,
  "fit_comunidade": 0-100,
  "modulo_recomendado": "CRM" | "ERP" | "PLM" | "Comunidade",
  "justificativa": "Explicação em 2-3 frases de por que este módulo é o melhor entry point"
}`;

async function analyzeWithOpenAI(
  cnpjData: BrasilApiCnpj | null,
  scrapingContent: string | null,
  cnpj: string,
): Promise<TexintelAnalysis | null> {
  const openaiKey  = process.env["AI_INTEGRATIONS_OPENAI_API_KEY"];
  const openaiBase = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"] || "https://api.openai.com/v1";
  if (!openaiKey) {
    logger.warn({ msg: "[TexIntel] AI_INTEGRATIONS_OPENAI_API_KEY não configurado" });
    return null;
  }

  const userContent = `
CNPJ: ${cnpj}
Razão Social: ${cnpjData?.razao_social ?? "N/A"}
Nome Fantasia: ${cnpjData?.nome_fantasia ?? "N/A"}
Situação: ${cnpjData?.situacao ?? "N/A"}
Município: ${cnpjData?.municipio ?? "N/A"} / ${cnpjData?.uf ?? "N/A"}
Atividade Principal: ${cnpjData?.atividade_principal?.[0]?.text ?? "N/A"}
Data Início: ${cnpjData?.data_inicio_atividade ?? "N/A"}

${scrapingContent ? `CONTEÚDO DO SITE:\n${scrapingContent}` : "Site não disponível para scraping."}

Analise esta empresa têxtil/moda e retorne o JSON de análise.`.trim();

  try {
    const r = await fetch(`${openaiBase}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user",   content: userContent },
        ],
        temperature: 0.3,
        max_tokens: 600,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!r.ok) {
      const err = await r.text();
      logger.error({ msg: "[TexIntel] OpenAI error", status: r.status, err });
      return null;
    }

    const data = await r.json() as any;
    const content = data.choices?.[0]?.message?.content ?? "";
    // Remove possíveis blocos markdown ```json ... ```
    const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned) as TexintelAnalysis;
  } catch (err: unknown) {
    logger.error({ msg: "[TexIntel] Falha ao parsear resposta OpenAI", error: String(err) });
    return null;
  }
}

// ── Pipeline principal ────────────────────────────────────────────────────────

async function processBatch() {
  let companies: Array<{ id: string; cnpj: string; website: string | null }> = [];

  try {
    // Seleciona e imediatamente marca como 'processing' para evitar duplo processamento
    const result = await pool.query(`
      UPDATE texintel_companies
      SET status = 'processing'
      WHERE id IN (
        SELECT id FROM texintel_companies
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT $1
      )
      RETURNING id, cnpj, website
    `, [BATCH_SIZE]);

    companies = result.rows;
  } catch (err) {
    // processing status não existe ainda → adiciona e tenta novamente no próximo ciclo
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("invalid input value for enum") || msg.includes("processing")) {
      // fallback: processa sem usar status de lock
      try {
        const result = await pool.query(`
          SELECT id, cnpj, website FROM texintel_companies
          WHERE status = 'pending'
          ORDER BY created_at ASC
          LIMIT $1
        `, [BATCH_SIZE]);
        companies = result.rows;
      } catch { return; }
    } else {
      return;
    }
  }

  if (companies.length === 0) return;

  logger.info({ msg: `[TexIntel] Processando ${companies.length} empresa(s)` });

  for (const company of companies) {
    const { id, cnpj, website } = company;
    try {
      // 1. BrasilAPI
      const cnpjData = await fetchCnpjData(cnpj);

      // 2. Jina scraping
      const scrapingContent = website ? await scrapeWebsite(website) : null;

      // 3. OpenAI
      const analysis = await analyzeWithOpenAI(cnpjData, scrapingContent, cnpj);

      if (!analysis) {
        await pool.query(
          `UPDATE texintel_companies
           SET status = 'error', error_message = 'Falha na análise OpenAI', updated_at = NOW()
           WHERE id = $1`,
          [id],
        );
        continue;
      }

      // 4. Salva resultado diretamente no banco
      await pool.query(`
        UPDATE texintel_companies SET
          razao_social        = COALESCE($2, razao_social),
          nome_fantasia       = COALESCE($3, nome_fantasia),
          situacao            = COALESCE($4, situacao),
          atividade_principal = COALESCE($5, atividade_principal),
          municipio           = COALESCE($6, municipio),
          uf                  = COALESCE($7, uf),
          dores               = $8,
          faturamento_estimado = $9,
          fit_crm             = $10,
          fit_erp             = $11,
          fit_plm             = $12,
          fit_comunidade      = $13,
          modulo_recomendado  = $14,
          justificativa       = $15,
          raw_analysis        = $16,
          scraping_content    = $17,
          status              = 'done',
          processed_at        = NOW()
        WHERE id = $1
      `, [
        id,
        cnpjData?.razao_social ?? null,
        cnpjData?.nome_fantasia ?? null,
        cnpjData?.situacao ?? null,
        cnpjData?.atividade_principal?.[0]?.text ?? null,
        cnpjData?.municipio ?? null,
        cnpjData?.uf ?? null,
        JSON.stringify(analysis.dores ?? []),
        analysis.faturamento_estimado,
        analysis.fit_crm,
        analysis.fit_erp,
        analysis.fit_plm,
        analysis.fit_comunidade,
        analysis.modulo_recomendado,
        analysis.justificativa,
        JSON.stringify({ cnpjData, analysis }),
        scrapingContent,
      ]);

      logger.info({
        msg: "✅ [TexIntel] Empresa processada",
        cnpj,
        modulo: analysis.modulo_recomendado,
        fit_crm: analysis.fit_crm,
        fit_erp: analysis.fit_erp,
        fit_plm: analysis.fit_plm,
        fit_comunidade: analysis.fit_comunidade,
      });

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ msg: "[TexIntel] Falha ao processar empresa", cnpj, error: msg });
      await pool.query(
        `UPDATE texintel_companies SET status = 'error', error_message = $2 WHERE id = $1`,
        [id, msg.slice(0, 500)],
      );
    }
  }
}

// ── Inicialização ─────────────────────────────────────────────────────────────

export function startTexintelPipeline() {
  // Garante que a coluna updated_at existe (idempotente)
  pool.query(`ALTER TABLE texintel_companies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`)
    .catch(() => {/* coluna já existe */});

  // Intervalo principal
  setInterval(async () => {
    try {
      await processBatch();
    } catch (err: unknown) {
      logger.error({ msg: "[TexIntel] Erro no ciclo do pipeline", error: String(err) });
    }
  }, PIPELINE_INTERVAL_MS);

  logger.info({ msg: "[TexIntel] Pipeline iniciado", intervalMs: PIPELINE_INTERVAL_MS });
}
