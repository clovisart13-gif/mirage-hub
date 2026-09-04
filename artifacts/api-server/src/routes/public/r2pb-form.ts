import { Router } from "express";
import type { Request, Response } from "express";
import { pool } from "@workspace/db";
import { logger } from "../../lib/logger";
import { supabaseAdmin } from "../../lib/supabase";

// Resolve UUID do tenant r2pb uma vez e cacheia (evita query repetida a cada submit)
let _r2pbTenantUuid: string | null = null;
async function getR2PBTenantUuid(): Promise<string | null> {
  if (_r2pbTenantUuid) return _r2pbTenantUuid;
  const { data } = await supabaseAdmin.from("tenants").select("id").eq("slug", "r2pb").single();
  _r2pbTenantUuid = data?.id ?? null;
  if (!_r2pbTenantUuid) logger.warn("public/r2pb-form: UUID do tenant r2pb não encontrado na tabela tenants");
  return _r2pbTenantUuid;
}

const router = Router();

// ── Helena config ─────────────────────────────────────────────────────────────
const WTS_BASE            = "https://api.wts.chat";
const VENDAS_PRO_STEP_ID  = process.env["VENDAS_PRO_PRIMEIRO_STEP_ID"] ?? "b6eea3b1-7832-4ea7-bd67-a0f35bee1298";
const NUTRICAO_STEP_ID    = process.env["NUTRICAO_STEP_ID"]            ?? "";

async function criarCardHelena(p: {
  titulo: string;
  stepId: string;
  descricao: string;
}): Promise<string | null> {
  const token = process.env["HELENA_API_TOKEN"];
  if (!token) {
    logger.warn("public/r2pb-form: HELENA_API_TOKEN não configurado — card não criado");
    return null;
  }
  if (!p.stepId) {
    logger.warn("public/r2pb-form: stepId vazio — card não criado");
    return null;
  }

  logger.info({ stepId: p.stepId, titulo: p.titulo }, "public/r2pb-form: tentando criar card Helena");

  try {
    const res = await fetch(`${WTS_BASE}/crm/v2/panel/card`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ title: p.titulo, stepId: p.stepId, description: p.descricao }),
    });
    const rawBody = await res.text().catch(() => "");
    if (!res.ok) {
      logger.warn({ status: res.status, body: rawBody, stepId: p.stepId }, "public/r2pb-form: Helena card creation failed");
      return null;
    }
    let data: Record<string, unknown> = {};
    try { data = JSON.parse(rawBody); } catch { /* ignore */ }
    const cardId = (data.id as Record<string, unknown>)?.value ?? data.id ?? null;
    logger.info({ cardId, rawBody: rawBody.slice(0, 300) }, "public/r2pb-form: Helena card API respondeu");
    return cardId ? String(cardId) : null;
  } catch (e: any) {
    logger.warn({ err: e?.message }, "public/r2pb-form: Helena network error");
    return null;
  }
}

// ── Z-API: envia mensagem WhatsApp ao lead ────────────────────────────────────
async function sendZapiToLead(phone: string, message: string): Promise<void> {
  try {
    const tenantUuid = await getR2PBTenantUuid();
    // Busca por UUID (padrão) ou slug como fallback
    const { rows } = await pool.query<{ whatsapp_instances: unknown }>(
      `SELECT whatsapp_instances FROM sales_automation_config WHERE tenant_id = $1 OR tenant_id = 'r2pb' LIMIT 1`,
      [tenantUuid ?? 'r2pb']
    );
    if (!rows.length || !rows[0].whatsapp_instances) {
      logger.warn("public/r2pb-form: sales_automation_config sem instâncias Z-API para r2pb");
      return;
    }

    const instances = rows[0].whatsapp_instances as {
      canal?: string;
      instanceId?: string;
      token?: string;
      clientToken?: string;
    }[];

    const target = instances.find(i => i.canal === "zapi" && i.instanceId && i.token);
    if (!target) {
      logger.warn("public/r2pb-form: nenhuma instância Z-API encontrada para r2pb");
      return;
    }

    const phoneCleaned = phone.replace(/\D/g, "");
    const url = `https://api.z-api.io/instances/${target.instanceId}/token/${target.token}/send-text`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (target.clientToken) headers["Client-Token"] = target.clientToken;

    const zapiRes = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ phone: phoneCleaned, message }),
    });
    const zapiBody = await zapiRes.json().catch(() => null);
    logger.info(
      { phone: phoneCleaned, status: zapiRes.status, ok: zapiRes.ok, body: zapiBody },
      "public/r2pb-form: Z-API → lead"
    );
  } catch (e: any) {
    logger.warn({ err: e?.message }, "public/r2pb-form: falha ao enviar Z-API ao lead");
  }
}

// ── Ensure tables ─────────────────────────────────────────────────────────────
async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS triagem_r2pb (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id TEXT NOT NULL,
      tipo_perfil TEXT,
      segmento TEXT,
      publico_alvo TEXT,
      estagio TEXT,
      necessidade TEXT,
      volume_mensal TEXT,
      investimento TEXT,
      tem_cnpj TEXT,
      prazo TEXT,
      canal_preferido TEXT,
      nome TEXT,
      contato TEXT,
      classificacao TEXT,
      score INTEGER DEFAULT 0,
      helena_card_id TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      tenant_id TEXT DEFAULT 'r2pb',
      created_at TIMESTAMPTZ DEFAULT now()
    );
    ALTER TABLE triagem_r2pb ADD COLUMN IF NOT EXISTS segmento TEXT;
    ALTER TABLE triagem_r2pb ADD COLUMN IF NOT EXISTS publico_alvo TEXT;
    ALTER TABLE triagem_r2pb ADD COLUMN IF NOT EXISTS investimento TEXT;

    CREATE TABLE IF NOT EXISTS triagem_r2pb_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id TEXT NOT NULL,
      event TEXT NOT NULL,
      step_name TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    ALTER TABLE triagem_r2pb ADD COLUMN IF NOT EXISTS helena_card_id TEXT;
  `);
}

ensureTables().catch((e) =>
  logger.warn({ err: e?.message }, "public/r2pb-form: tabelas não criadas")
);

// ── Classification (mirrors client logic) ─────────────────────────────────────
type Classificacao = "aprovado" | "nutricao" | "fora_de_perfil";

interface FormBody {
  sessionId: string;
  tipoPerfil?: string;
  estagio?: string;
  segmento?: string;
  publicoAlvo?: string;
  necessidade?: string;
  volume?: string;
  investimento?: string;
  temCnpj?: string;
  prazo?: string;
  canalPreferido?: string;
  nome?: string;
  contato?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

function calcular(a: FormBody): { classificacao: Classificacao; score: number } {
  // Hard disqualifiers — no human contact
  if (a.tipoPerfil   === "explorando") return { classificacao: "fora_de_perfil", score: 0 };
  if (a.publicoAlvo  === "cd")         return { classificacao: "fora_de_perfil", score: 0 };
  if (a.temCnpj      === "nao")        return { classificacao: "fora_de_perfil", score: 0 };
  if (a.investimento === "<3k")        return { classificacao: "fora_de_perfil", score: 0 };

  // Volume < 72 → nutrição (fala com humano)
  if (a.volume === "<72") return { classificacao: "nutricao", score: 10 };

  let score = 0;
  if (a.tipoPerfil === "marca_consolidada") score += 30;
  else if (a.tipoPerfil === "marca_formacao") score += 20;

  if (a.estagio === "consolidacao") score += 20;
  else if (a.estagio === "crescimento") score += 15;
  else if (a.estagio === "inicio") score += 5;

  if (a.volume === "500+")     score += 30;
  else if (a.volume === "200-500") score += 25;
  else if (a.volume === "72-200")  score += 10;

  if (a.investimento === "150k+")      score += 20;
  else if (a.investimento === "50-150k")  score += 15;
  else if (a.investimento === "10-50k")   score += 5;
  else if (a.investimento === "<10k")     score -= 5;
  else if (a.investimento === "indefinido") score -= 5;

  if (a.temCnpj === "sim")       score += 15;
  else if (a.temCnpj === "processo") score += 8;

  if (a.prazo === "agora")         score += 15;
  else if (a.prazo === "3meses")   score += 10;
  else if (a.prazo === "3meses+")  score += 2;
  else if (a.prazo === "explorando") score -= 10;

  const classificacao: Classificacao = score >= 60 ? "aprovado" : score >= 20 ? "nutricao" : "fora_de_perfil";
  return { classificacao, score };
}

function formatDescricao(a: FormBody, clf: Classificacao, score: number): string {
  const fields: [string, string | undefined][] = [
    ["Perfil",          a.tipoPerfil],
    ["Segmento",        a.segmento],
    ["Público-alvo",    a.publicoAlvo],
    ["Estágio",         a.estagio],
    ["Necessidade",     a.necessidade],
    ["Volume/mês",      a.volume],
    ["Investimento",    a.investimento],
    ["CNPJ",            a.temCnpj],
    ["Prazo",           a.prazo],
    ["Canal preferido", a.canalPreferido],
    ["Nome",            a.nome],
    ["Contato",         a.contato],
  ];
  const lines = fields.map(([label, val]) => `${label}: ${val ?? "—"}`).join("\n");
  return `✅ Diagnóstico R2PB — Formulário Online\n📊 Score: ${score} | Classificação: ${clf}\n\n${lines}\n\nOrigem: formulário online (UTM: ${a.utmSource ?? "direto"})`;
}

// ── POST /api/public/r2pb/form/submit ─────────────────────────────────────────
router.post("/public/r2pb/form/submit", async (req: Request, res: Response) => {
  const body = req.body as FormBody;

  if (!body.sessionId) {
    res.status(400).json({ error: "sessionId obrigatório" });
    return;
  }

  const { classificacao, score } = calcular(body);

  logger.info(
    {
      sessionId: body.sessionId,
      nome: body.nome ?? null,
      contato: body.contato ?? null,
      whatsappPhone: (body as any).whatsappPhone ?? null,
      classificacao,
      score,
      tipoPerfil: body.tipoPerfil ?? null,
    },
    "public/r2pb-form: submit recebido"
  );

  // Check for existing record by WhatsApp number (upsert by contato)
  let existingHelenaCardId: string | null = null;
  let existingClassificacao: string | null = null;
  let isUpdate = false;

  if (body.contato) {
    const { rows: byWhatsapp } = await pool.query(
      "SELECT id, helena_card_id, classificacao FROM triagem_r2pb WHERE contato = $1 AND tenant_id = $2 ORDER BY created_at DESC LIMIT 1",
      [body.contato, "r2pb"]
    );
    if (byWhatsapp.length > 0) {
      existingHelenaCardId = byWhatsapp[0].helena_card_id ?? null;
      existingClassificacao = byWhatsapp[0].classificacao ?? null;
      isUpdate = true;
    }
  }

  try {
    if (isUpdate && body.contato) {
      // Update existing record for this WhatsApp
      await pool.query(
        `UPDATE triagem_r2pb SET
          session_id = $1, tipo_perfil = $2, segmento = $3, publico_alvo = $4,
          estagio = $5, necessidade = $6, volume_mensal = $7, investimento = $8,
          tem_cnpj = $9, prazo = $10, canal_preferido = $11, nome = $12,
          classificacao = $13, score = $14,
          utm_source = $15, utm_medium = $16, utm_campaign = $17
         WHERE contato = $18 AND tenant_id = 'r2pb'`,
        [
          body.sessionId, body.tipoPerfil, body.segmento ?? null, body.publicoAlvo ?? null,
          body.estagio, body.necessidade ?? null,
          body.volume, body.investimento ?? null, body.temCnpj, body.prazo,
          body.canalPreferido ?? null, body.nome ?? null,
          classificacao, score,
          body.utmSource ?? null, body.utmMedium ?? null, body.utmCampaign ?? null,
          body.contato,
        ]
      );
      logger.info({ contato: body.contato, classificacao, score }, "public/r2pb-form: registro atualizado (mesmo WhatsApp)");
    } else {
      // New record
      await pool.query(
        `INSERT INTO triagem_r2pb
          (session_id, tipo_perfil, segmento, publico_alvo, estagio, necessidade,
           volume_mensal, investimento, tem_cnpj, prazo,
           canal_preferido, nome, contato, classificacao, score,
           utm_source, utm_medium, utm_campaign, tenant_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'r2pb')
         ON CONFLICT DO NOTHING`,
        [
          body.sessionId, body.tipoPerfil, body.segmento ?? null, body.publicoAlvo ?? null,
          body.estagio, body.necessidade ?? null,
          body.volume, body.investimento ?? null, body.temCnpj, body.prazo,
          body.canalPreferido ?? null, body.nome ?? null, body.contato ?? null,
          classificacao, score,
          body.utmSource ?? null, body.utmMedium ?? null, body.utmCampaign ?? null,
        ]
      );
    }
  } catch (e: any) {
    logger.error({ err: e?.message }, "public/r2pb-form: DB error");
  }

  // ── Ações pós-classificação (async, não bloqueiam a resposta) ─────────────────
  const leadPhoneForAction = body.contato ? body.contato.replace(/\D/g, "") : null;

  void (async () => {
    // 1. Card Helena para aprovados sem card ainda
    if (classificacao === "aprovado" && body.nome && body.contato && !existingHelenaCardId) {
      const descricao = formatDescricao(body, classificacao, score);
      const titulo = `${body.nome ?? "Lead"} · ${body.contato ?? "—"} · 🟢 Aprovado`;

      const cardId = await criarCardHelena({ titulo, stepId: VENDAS_PRO_STEP_ID, descricao });
      if (cardId) {
        await pool.query(
          "UPDATE triagem_r2pb SET helena_card_id = $1 WHERE contato = $2 AND tenant_id = 'r2pb'",
          [cardId, body.contato]
        ).catch(() => {});
        logger.info({ cardId, nome: body.nome }, "public/r2pb-form: card Helena criado (aprovado)");
      } else {
        logger.warn({ nome: body.nome, contato: body.contato, stepId: VENDAS_PRO_STEP_ID }, "public/r2pb-form: card Helena NÃO criado — verificar stepId e token");
      }
    }

    // 2. Mensagem Z-API ao lead aprovado
    if (classificacao === "aprovado" && leadPhoneForAction) {
      const nomeDisplay = body.nome ? body.nome.split(" ")[0] : "Olá";
      await sendZapiToLead(
        leadPhoneForAction,
        `✅ *${nomeDisplay}, suas respostas foram analisadas!*\n\n` +
        `Você tem perfil para produzir com a R2PB — nossa equipe comercial vai entrar em contato em breve para entender melhor o seu projeto.\n\n` +
        `_R2PB · Rede de Produção para Moda Premium_`
      );
    }

    // 3. Mensagem Z-API ao lead em nutrição
    if (classificacao === "nutricao" && leadPhoneForAction) {
      const nomeDisplay = body.nome ? body.nome.split(" ")[0] : "Olá";
      await sendZapiToLead(
        leadPhoneForAction,
        `📋 *${nomeDisplay}, recebemos suas respostas!*\n\n` +
        `Seu perfil está em análise. Nossa equipe vai entrar em contato para entender melhor o momento da sua marca e ver como podemos ajudar.\n\n` +
        `_R2PB · Rede de Produção para Moda Premium_`
      );
    }
  })();

  // Marca diagnostico_triado = true no lead_conversation_state para não reenviar o link
  const phone = (body as any).whatsappPhone as string | undefined;
  if (phone) {
    pool.query(
      `INSERT INTO lead_conversation_state (tenant_id, phone, diagnostico_triado, updated_at)
       VALUES ('r2pb', $1, true, NOW())
       ON CONFLICT (tenant_id, phone) DO UPDATE SET diagnostico_triado = true, updated_at = NOW()`,
      [phone]
    ).catch((e: any) => logger.warn({ err: e?.message }, "public/r2pb-form: falha ao marcar diagnostico_triado"));
  }

  // Upsert em comercial_leads — banco unificado da área comercial
  const phoneNorm = phone ? phone.replace(/\D/g, "") : null;
  const contatoPhone = body.contato ? body.contato.replace(/\D/g, "") : null;
  const leadPhone = phoneNorm || contatoPhone;
  if (leadPhone) {
    // Resolve UUID do tenant para que o CRM da Hub encontre o lead
    void (async () => {
      const tenantUuid = await getR2PBTenantUuid();
      const tenantIdForCRM = tenantUuid ?? 'r2pb'; // fallback para slug se UUID não resolver
      try {
        await pool.query(
          `INSERT INTO comercial_leads
             (tenant_id, phone, lead_name, email, segmento, classificacao, score,
              triagem_session_id, diagnostico_triado, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW())
           ON CONFLICT (tenant_id, phone) DO UPDATE SET
             lead_name         = COALESCE(EXCLUDED.lead_name, comercial_leads.lead_name),
             email             = COALESCE(EXCLUDED.email, comercial_leads.email),
             segmento          = COALESCE(EXCLUDED.segmento, comercial_leads.segmento),
             classificacao     = EXCLUDED.classificacao,
             score             = EXCLUDED.score,
             triagem_session_id = EXCLUDED.triagem_session_id,
             diagnostico_triado = true,
             updated_at        = NOW()`,
          [tenantIdForCRM, leadPhone, body.nome ?? null, null,
           body.segmento ?? null, classificacao, score, body.sessionId]
        );
        logger.info({ tenantIdForCRM, leadPhone, classificacao }, "public/r2pb-form: comercial_leads upsert OK");
      } catch (e: any) {
        logger.warn({ err: e?.message }, "public/r2pb-form: falha ao upsert comercial_leads");
      }
    })();

    // Atualiza/cria estado soberano da jornada
    const journeyStatus =
      classificacao === "aprovado" ? "aprovado_vendas" :
      classificacao === "nutricao" ? "nutricao"        :
                                     "fora_de_perfil";

    pool.query(
      `INSERT INTO lead_journey
         (tenant_id, phone, nome, origem, canal_atual, status, etapa_atual, ultima_interacao)
       VALUES ('r2pb', $1, $2, 'formulario', 'whatsapp', $3, $4, NOW())
       ON CONFLICT (tenant_id, phone) DO UPDATE SET
         nome             = COALESCE(EXCLUDED.nome, lead_journey.nome),
         status           = $3,
         etapa_atual      = $4,
         ultima_interacao = NOW(),
         updated_at       = NOW()`,
      [leadPhone, body.nome ?? null, journeyStatus,
       classificacao === "aprovado" ? "aguardando_contato_comercial" : "triagem_concluida"]
    ).then(() =>
      pool.query(
        `INSERT INTO lead_journey_events
           (tenant_id, phone, evento, status_anterior, status_novo, dados, origem, criado_por)
         VALUES ('r2pb', $1, 'formulario_preenchido', NULL, $2, $3, 'formulario', 'r2pb-form')`,
        [leadPhone, journeyStatus,
         JSON.stringify({ classificacao, score, segmento: body.segmento ?? null, session_id: body.sessionId })]
      )
    ).catch((e: any) => logger.warn({ err: e?.message }, "public/r2pb-form: falha ao sync lead_journey"));
  }

  logger.info({ sessionId: body.sessionId, classificacao, score, nome: body.nome, phone }, "public/r2pb-form: submit processado");

  res.json({ ok: true, classificacao, score });
});

// ── POST /api/public/r2pb/form/event — telemetria ────────────────────────────
router.post("/public/r2pb/form/event", async (req: Request, res: Response) => {
  const { sessionId, event, stepName, metadata } = req.body as {
    sessionId: string; event: string; stepName?: string; metadata?: Record<string, unknown>;
  };
  if (!sessionId || !event) { res.status(400).json({ error: "sessionId e event obrigatórios" }); return; }
  try {
    await pool.query(
      "INSERT INTO triagem_r2pb_events (session_id, event, step_name, metadata) VALUES ($1,$2,$3,$4)",
      [sessionId, event, stepName ?? null, metadata ? JSON.stringify(metadata) : null]
    );
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});

// ── POST /api/public/r2pb/fornecedores — formulário completo /fornecedores ────
router.post("/public/r2pb/fornecedores", async (req: Request, res: Response) => {
  const body = req.body as {
    nome?: string; empresa?: string; whatsapp?: string; email?: string;
    cidade?: string; estado?: string; bairro?: string;
    areas_atuacao?: string[]; especialidade_costura?: string[];
    especialidade_beneficiamento?: string[]; obs?: string;
  };

  const nome     = (body.nome ?? "").trim();
  const whatsapp = (body.whatsapp ?? "").replace(/\D/g, "");
  if (!nome || !whatsapp) {
    res.status(400).json({ error: "nome e whatsapp são obrigatórios" });
    return;
  }

  // Área principal (primeiro item de areas_atuacao)
  const area = (body.areas_atuacao ?? [])[0] ?? null;

  // Especialidades mescladas em array
  const especialidades: string[] = [
    ...(body.especialidade_costura ?? []),
    ...(body.especialidade_beneficiamento ?? []),
  ];

  const tenantUuid = await getR2PBTenantUuid();
  const tenantId   = tenantUuid ?? "r2pb";

  try {
    await pool.query(
      `INSERT INTO parceiros_producao
         (tenant_id, nome, whatsapp, email, empresa, area,
          especialidades, cidade, estado, bairro, obs, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'prospecto')
       ON CONFLICT DO NOTHING`,
      [
        tenantId, nome, whatsapp,
        body.email?.trim() || null,
        body.empresa?.trim() || null,
        area,
        especialidades.length ? especialidades : null,
        body.cidade?.trim() || null,
        body.estado?.trim() || null,
        body.bairro?.trim() || null,
        body.obs?.trim() || null,
      ]
    );
    logger.info({ nome, whatsapp, area }, "public/r2pb/fornecedores: parceiro cadastrado");
  } catch (e: any) {
    logger.error({ err: e?.message }, "public/r2pb/fornecedores: erro ao salvar");
    res.status(500).json({ error: "Erro ao salvar cadastro" });
    return;
  }

  // Confirmação WhatsApp (silenciosa se falhar)
  void (async () => {
    const instance    = process.env["ZAPI_INSTANCE_R2PB"]     ?? "3EC7FC04DC4092E870116A599C5ED5B8";
    const token       = process.env["ZAPI_TOKEN_R2PB"]        ?? "44BCDFDD085514B19094352B";
    const clientToken = process.env["ZAPI_CLIENT_TOKEN_R2PB"] ?? "Fadbf0be3eac648c8b790477fd43310cdS";
    const phone = whatsapp.startsWith("55") ? whatsapp : `55${whatsapp}`;
    const msg = `Olá${nome ? ` ${nome.split(" ")[0]}` : ""}! 👋\n\nRecebemos seu cadastro como parceiro produtivo da R2PB.\n\nNossa equipe de parcerias vai entrar em contato em breve pelo WhatsApp. Obrigado! 🤝`;
    await fetch(`https://api.z-api.io/instances/${instance}/token/${token}/send-text`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Client-Token": clientToken },
      body: JSON.stringify({ phone, message: msg }),
    }).catch(() => {});
  })();

  res.json({ ok: true });
});

// ── GET /api/public/r2pb/form/results ─────────────────────────────────────────
router.get("/public/r2pb/form/results", async (_req: Request, res: Response) => {
  try {
    const { rows: summary } = await pool.query(`
      SELECT classificacao, COUNT(*) as total FROM triagem_r2pb
      WHERE tenant_id = 'r2pb' GROUP BY classificacao
    `);
    const { rows: recent } = await pool.query(`
      SELECT nome, contato, classificacao, canal_preferido, volume_mensal, tem_cnpj, prazo, helena_card_id, created_at
      FROM triagem_r2pb WHERE tenant_id = 'r2pb'
      ORDER BY created_at DESC LIMIT 50
    `);
    res.json({ ok: true, summary, recent });
  } catch (e: any) {
    res.status(500).json({ error: e?.message });
  }
});

export default router;
