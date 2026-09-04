/**
 * Internal CRUD — Banco de Parceiros Produção + Candidatos RH
 * Auth: x-internal-key (MARKETING_INTERNAL_API_KEY)
 */
import { Router } from "express";
import type { Request, Response } from "express";
import { pool } from "@workspace/db";
import { logger } from "../../lib/logger";
import { requireAuth, requireTenantAccess } from "../../middlewares/auth";
import type { AuthenticatedRequest } from "../../middlewares/auth";

const router = Router();

function checkKey(req: Request, res: Response): boolean {
  const key = process.env["MARKETING_INTERNAL_API_KEY"];
  if (!key || req.headers["x-internal-key"] !== key) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// ── Parceiros Produção ────────────────────────────────────────────────────────

// GET /api/internal/parceiros?tenant_id=&area=&subtipo=&status=&search=&limit=&offset=
router.get("/internal/parceiros", async (req: Request, res: Response) => {
  if (!checkKey(req, res)) return;
  const { tenant_id = "r2pb", area, subtipo, status, search, limit = "100", offset = "0" } = req.query as Record<string, string>;

  const conds: string[] = ["tenant_id = $1"];
  const vals: any[] = [tenant_id];
  let i = 2;

  if (area)    { conds.push(`area = $${i++}`);    vals.push(area); }
  if (subtipo) { conds.push(`subtipo = $${i++}`); vals.push(subtipo); }
  if (status)  { conds.push(`status = $${i++}`);  vals.push(status); }
  if (search) {
    conds.push(`(nome ILIKE $${i} OR cidade ILIKE $${i} OR bairro ILIKE $${i})`);
    vals.push(`%${search}%`); i++;
  }

  const where = conds.join(" AND ");
  const { rows } = await pool.query(
    `SELECT * FROM parceiros_producao WHERE ${where} ORDER BY created_at DESC LIMIT $${i} OFFSET $${i+1}`,
    [...vals, parseInt(limit), parseInt(offset)]
  );
  const { rows: count } = await pool.query(`SELECT COUNT(*)::int FROM parceiros_producao WHERE ${where}`, vals);
  res.json({ ok: true, parceiros: rows, total: count[0].count });
});

// PATCH /api/internal/parceiros/:id
router.patch("/internal/parceiros/:id", async (req: Request, res: Response) => {
  if (!checkKey(req, res)) return;
  const { status, obs } = req.body as { status?: string; obs?: string };
  const sets: string[] = ["updated_at = NOW()"];
  const vals: any[] = [];
  let i = 1;
  if (status !== undefined) { sets.push(`status = $${i++}`); vals.push(status); }
  if (obs    !== undefined) { sets.push(`obs = $${i++}`);    vals.push(obs); }
  vals.push(req.params.id);
  await pool.query(`UPDATE parceiros_producao SET ${sets.join(", ")} WHERE id = $${i}`, vals);
  res.json({ ok: true });
});

// ── Candidatos RH ─────────────────────────────────────────────────────────────

// GET /api/internal/candidatos-rh?tenant_id=&area=&status=&search=
router.get("/internal/candidatos-rh", async (req: Request, res: Response) => {
  if (!checkKey(req, res)) return;
  const { tenant_id = "r2pb", area, status, search, limit = "100", offset = "0" } = req.query as Record<string, string>;

  const conds: string[] = ["tenant_id = $1"];
  const vals: any[] = [tenant_id];
  let i = 2;

  if (area)   { conds.push(`area = $${i++}`);   vals.push(area); }
  if (status) { conds.push(`status = $${i++}`); vals.push(status); }
  if (search) {
    conds.push(`(nome ILIKE $${i} OR cidade ILIKE $${i})`);
    vals.push(`%${search}%`); i++;
  }

  const where = conds.join(" AND ");
  const { rows } = await pool.query(
    `SELECT * FROM candidatos_rh WHERE ${where} ORDER BY created_at DESC LIMIT $${i} OFFSET $${i+1}`,
    [...vals, parseInt(limit), parseInt(offset)]
  );
  const { rows: count } = await pool.query(`SELECT COUNT(*)::int FROM candidatos_rh WHERE ${where}`, vals);
  res.json({ ok: true, candidatos: rows, total: count[0].count });
});

// PATCH /api/internal/candidatos-rh/:id
router.patch("/internal/candidatos-rh/:id", async (req: Request, res: Response) => {
  if (!checkKey(req, res)) return;
  const { status, obs } = req.body as { status?: string; obs?: string };
  const sets: string[] = ["updated_at = NOW()"];
  const vals: any[] = [];
  let i = 1;
  if (status !== undefined) { sets.push(`status = $${i++}`); vals.push(status); }
  if (obs    !== undefined) { sets.push(`obs = $${i++}`);    vals.push(obs); }
  vals.push(req.params.id);
  await pool.query(`UPDATE candidatos_rh SET ${sets.join(", ")} WHERE id = $${i}`, vals);
  res.json({ ok: true });
});

// ── Envio de formulário e cotação via Z-API ───────────────────────────────────

const PARCEIRO_FORM_LINK = process.env["PARCEIRO_FORM_LINK"] ?? "https://www.gestaomirage.com.br/onboarding-portal/fornecedores";

async function zapiSendText(phone: string, message: string) {
  const instance    = process.env["ZAPI_INSTANCE_R2PB"]    ?? "3EC7FC04DC4092E870116A599C5ED5B8";
  const token       = process.env["ZAPI_TOKEN_R2PB"]       ?? "44BCDFDD085514B19094352B";
  const clientToken = process.env["ZAPI_CLIENT_TOKEN_R2PB"] ?? "Fadbf0be3eac648c8b790477fd43310cdS";
  const r = await fetch(`https://api.z-api.io/instances/${instance}/token/${token}/send-text`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Client-Token": clientToken },
    body: JSON.stringify({ phone, message }),
  });
  return r;
}

async function zapiSendImage(phone: string, image: string, caption: string) {
  const instance    = process.env["ZAPI_INSTANCE_R2PB"]    ?? "3EC7FC04DC4092E870116A599C5ED5B8";
  const token       = process.env["ZAPI_TOKEN_R2PB"]       ?? "44BCDFDD085514B19094352B";
  const clientToken = process.env["ZAPI_CLIENT_TOKEN_R2PB"] ?? "Fadbf0be3eac648c8b790477fd43310cdS";
  const r = await fetch(`https://api.z-api.io/instances/${instance}/token/${token}/send-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Client-Token": clientToken },
    body: JSON.stringify({ phone, image, caption }),
  });
  return r;
}

// Envia botões interativos de confirmação SIM / NÃO
// Se Z-API não suportar na instância (status não-ok), cai silenciosamente
async function zapiSendCotacaoButtons(phone: string) {
  const instance    = process.env["ZAPI_INSTANCE_R2PB"]    ?? "3EC7FC04DC4092E870116A599C5ED5B8";
  const token       = process.env["ZAPI_TOKEN_R2PB"]       ?? "44BCDFDD085514B19094352B";
  const clientToken = process.env["ZAPI_CLIENT_TOKEN_R2PB"] ?? "Fadbf0be3eac648c8b790477fd43310cdS";
  const r = await fetch(`https://api.z-api.io/instances/${instance}/token/${token}/send-button-list`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Client-Token": clientToken },
    body: JSON.stringify({
      phone,
      message: "Você tem interesse e disponibilidade para este projeto?",
      buttonList: {
        buttons: [
          { id: "btn_sim", label: "✅  Sim, tenho interesse" },
          { id: "btn_nao", label: "❌  Não estou disponível" },
        ],
      },
    }),
  }).catch(() => null);
  return r;
}

// ── Hub (autenticado) ─────────────────────────────────────────────────────────
// Estes endpoints são chamados pelo Hub com cookies de sessão normais

// GET /api/kanban/parceiros
router.get("/kanban/parceiros", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res: Response) => {
  const { area, subtipo, status, search, bairro, cidade, especialidade, limit = "300", offset = "0" } = req.query as Record<string, string>;
  const conds: string[] = ["tenant_id = $1"];
  const vals: any[] = [req.tenantId!];
  let i = 2;
  if (area)    { conds.push(`LOWER(area) = LOWER($${i++})`); vals.push(area); }
  if (subtipo) { conds.push(`subtipo ILIKE $${i++}`); vals.push(subtipo); }
  if (cidade)  { conds.push(`cidade ILIKE $${i++}`); vals.push(cidade); }
  if (bairro)  { conds.push(`bairro ILIKE $${i++}`); vals.push(bairro); }
  if (especialidade) {
    // especialidades é text[] — verifica se o array contém o valor
    conds.push(`$${i++} ILIKE ANY(especialidades)`); vals.push(especialidade);
  }
  if (status) {
    // aceita status único ("ativo") ou lista separada por vírgula ("prospecto,qualificado,ativo")
    const statusList = status.split(",").map(s => s.trim()).filter(Boolean);
    if (statusList.length === 1) {
      conds.push(`status = $${i++}`); vals.push(statusList[0]);
    } else {
      conds.push(`status = ANY($${i++}::text[])`); vals.push(statusList);
    }
  }
  if (search)  { conds.push(`(nome ILIKE $${i} OR cidade ILIKE $${i} OR bairro ILIKE $${i})`); vals.push(`%${search}%`); i++; }
  const where = conds.join(" AND ");
  const { rows } = await pool.query(
    `SELECT * FROM parceiros_producao WHERE ${where} ORDER BY nome ASC LIMIT $${i} OFFSET $${i+1}`,
    [...vals, parseInt(limit), parseInt(offset)]
  );
  const { rows: ct } = await pool.query(`SELECT COUNT(*)::int FROM parceiros_producao WHERE ${where}`, vals);
  res.json({ parceiros: rows, total: ct[0].count });
});

// POST /api/kanban/parceiros/:id/enviar-formulario
router.post("/kanban/parceiros/:id/enviar-formulario", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { rows } = await pool.query(`SELECT whatsapp, nome FROM parceiros_producao WHERE id = $1`, [req.params.id]);
  if (!rows.length) { res.status(404).json({ error: "Parceiro não encontrado" }); return; }
  const { whatsapp, nome } = rows[0];
  const msg = `Olá${nome ? ` ${nome}` : ""}! 👋\n\nAcesse o link abaixo para completar seu cadastro como parceiro de produção:\n\n${PARCEIRO_FORM_LINK}`;
  const zapiRes = await zapiSendText(whatsapp, msg);
  if (!zapiRes.ok) {
    const err = await zapiRes.text().catch(() => "");
    res.status(502).json({ ok: false, error: `Z-API ${zapiRes.status}: ${err}` }); return;
  }
  await pool.query(`UPDATE parceiros_producao SET formulario_enviado_at = NOW(), updated_at = NOW() WHERE id = $1`, [req.params.id]);
  res.json({ ok: true });
});

// POST /api/kanban/parceiros/cotacao-webhook
// Sem autenticação — chamado diretamente pelo Z-API quando o parceiro responde
// Configurar no painel Z-API: "Ao receber" → URL desta rota
router.post("/kanban/parceiros/cotacao-webhook", async (req: Request, res: Response) => {
  const body = req.body as Record<string, any>;

  // Ignorar mensagens enviadas por nós ou de grupos
  if (body.fromMe !== false || body.isGroup) {
    res.json({ ok: true, ignored: true }); return;
  }

  // Normalizar telefone
  const rawPhone = String(body.phone ?? "").replace(/@.*$/, "").replace(/\D/g, "");
  if (!rawPhone) { res.json({ ok: true, ignored: true, reason: "no_phone" }); return; }
  const phoneTail = rawPhone.slice(-10);

  // --- Detectar resposta: botão interativo (buttonResponseMessage) OU texto livre ---
  let isSim = false;
  let isNao = false;

  // 1. Resposta de botão (parceiro tocou em "✅ Sim" ou "❌ Não")
  const btnId = String(body.buttonResponseMessage?.buttonId ?? body.listResponseMessage?.singleSelectReply?.selectedRowId ?? "").toLowerCase();
  if (btnId) {
    isSim = btnId.includes("sim") || btnId === "btn_sim";
    isNao = btnId.includes("nao") || btnId.includes("não") || btnId === "btn_nao";
  }

  // 2. Texto livre digitado pelo parceiro (fallback)
  if (!isSim && !isNao) {
    const rawText = String(body.text?.message ?? "").toLowerCase().trim();
    if (!rawText) { res.json({ ok: true, ignored: true, reason: "no_text_or_button" }); return; }
    isSim = /^(s|sim|yes|y|quero|tenho|ok|top|pode|claro|aceito|interesse|interessado|disponivel|disponível|com certeza|👍)/.test(rawText);
    isNao = /^(n|nao|não|no|negativo|indisponivel|indisponível|sem disponibilidade|não tenho|nao tenho|nope|agora n)/.test(rawText);
  }

  if (!isSim && !isNao) {
    res.json({ ok: true, ignored: true, reason: "not_sim_nao" }); return;
  }

  // Buscar parceiro com cotação enviada e sem resposta, cujo whatsapp termina com os mesmos dígitos
  const { rows } = await pool.query(
    `SELECT id FROM parceiros_producao
     WHERE cotacao_enviada_at IS NOT NULL
       AND cotacao_resposta IS NULL
       AND regexp_replace(whatsapp, '[^0-9]', '', 'g') LIKE $1
     LIMIT 1`,
    [`%${phoneTail}`]
  );

  if (!rows.length) {
    res.json({ ok: true, ignored: true, reason: "no_pending_cotacao" }); return;
  }

  const resposta = isSim ? "sim" : "nao";
  await pool.query(
    `UPDATE parceiros_producao SET cotacao_resposta = $1, updated_at = NOW() WHERE id = $2`,
    [resposta, rows[0].id]
  );

  logger.info({ parceiroId: rows[0].id, resposta, phoneTail, btnId }, "cotacao-webhook: resposta registrada");
  res.json({ ok: true, registered: true, parceiroId: rows[0].id, resposta });
});

// POST /api/kanban/parceiros/:id/enviar-cotacao
router.post("/kanban/parceiros/:id/enviar-cotacao", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { rows } = await pool.query(`SELECT whatsapp, nome FROM parceiros_producao WHERE id = $1`, [req.params.id]);
  if (!rows.length) { res.status(404).json({ error: "Parceiro não encontrado" }); return; }
  const { whatsapp } = rows[0];
  const { mensagem, imagens } = req.body as { mensagem?: string; imagens?: string[] };

  if (mensagem?.trim()) {
    const r = await zapiSendText(whatsapp, mensagem.trim());
    if (!r.ok) { const e = await r.text().catch(() => ""); res.status(502).json({ ok: false, error: `Z-API texto ${r.status}: ${e}` }); return; }
  }

  for (let i = 0; i < (imagens ?? []).length; i++) {
    const caption = i === 0 && !mensagem?.trim() ? "Projeto" : "";
    const r = await zapiSendImage(whatsapp, imagens![i], caption);
    if (!r.ok) { logger.warn({ id: req.params.id, i }, "kanban/parceiros: falha ao enviar imagem"); }
  }

  // Enviar botões interativos SIM / NÃO (silencioso se falhar)
  await zapiSendCotacaoButtons(whatsapp);

  // Registrar envio e resetar resposta anterior
  await pool.query(
    `UPDATE parceiros_producao SET cotacao_enviada_at = NOW(), cotacao_resposta = NULL, updated_at = NOW() WHERE id = $1`,
    [req.params.id]
  );
  res.json({ ok: true });
});

// POST /api/kanban/parceiros/:id/encaminhar-moda-conecta
router.post("/kanban/parceiros/:id/encaminhar-moda-conecta", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { email } = req.body as { email?: string };
  const { rows } = await pool.query(`SELECT * FROM parceiros_producao WHERE id = $1`, [req.params.id]);
  if (!rows.length) { res.status(404).json({ error: "Parceiro não encontrado" }); return; }
  const p = rows[0];

  const finalEmail = ((email ?? p.email ?? "") as string).trim().toLowerCase();
  if (!finalEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(finalEmail)) {
    res.status(400).json({ error: "E-mail é obrigatório para encaminhar ao Moda Conecta" }); return;
  }

  if (!p.email) {
    await pool.query(`UPDATE parceiros_producao SET email = $1, updated_at = NOW() WHERE id = $2`, [finalEmail, p.id]);
  }

  const { rows: existing } = await pool.query(
    `SELECT id FROM moda_conecta_leads WHERE email = $1 AND company_slug = 'mirage' AND campaign_source = 'r2pb_parceiros' LIMIT 1`,
    [finalEmail]
  );
  if (existing.length > 0) {
    await pool.query(`UPDATE parceiros_producao SET encaminhado_mc_at = NOW(), updated_at = NOW() WHERE id = $1`, [p.id]);
    res.json({ ok: true, leadId: existing[0].id, alreadyExists: true }); return;
  }

  const specialties: string[] = [
    ...(p.tipos_maquina ?? []),
    ...(p.tipos_acabamento ?? []),
    ...(p.linha_produto ?? []),
  ];
  const roleInChain = [p.area, p.subtipo].filter(Boolean).join(" / ");

  const { rows: inserted } = await pool.query(`
    INSERT INTO moda_conecta_leads (
      company_slug, campaign_source, full_name, email, whatsapp,
      city, state, role_in_chain, specialties, main_offer,
      lgpd_consent, lgpd_consent_at, status
    ) VALUES (
      'mirage', 'r2pb_parceiros', $1, $2, $3,
      $4, $5, $6, $7::jsonb, $8,
      true, NOW(), 'novo'
    ) RETURNING id
  `, [
    p.nome, finalEmail, p.whatsapp ?? null,
    p.cidade ?? null, p.estado ?? null,
    roleInChain || null,
    JSON.stringify(specialties.length ? specialties : null),
    p.area ?? null,
  ]);

  await pool.query(`UPDATE parceiros_producao SET encaminhado_mc_at = NOW(), updated_at = NOW() WHERE id = $1`, [p.id]);
  logger.info({ parceiroId: p.id, leadId: inserted[0].id }, "parceiro encaminhado para Moda Conecta");
  res.json({ ok: true, leadId: inserted[0].id });
});

// POST /api/kanban/parceiros — criar parceiro autenticado (hub admin)
router.post("/kanban/parceiros", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body as Record<string, any>;
  if (!body.nome?.trim() || !body.whatsapp?.trim() || !body.area?.trim()) {
    res.status(400).json({ error: "nome, whatsapp e area são obrigatórios" }); return;
  }
  const phone = String(body.whatsapp).replace(/\D/g, "");
  try {
    const { rows: [p] } = await pool.query(
      `INSERT INTO parceiros_producao
         (tenant_id, nome, whatsapp, email, empresa, area, subtipo, tipo_malha,
          qtde_costureiros, capacidade_produtiva, tipos_maquina, linha_produto,
          tipos_acabamento, especialidades, tipos_produto,
          private_label, aceita_briefing, estado, cidade, bairro, obs, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
       RETURNING *`,
      [
        req.tenantId,
        body.nome.trim(),
        phone,
        body.email    ?? null,
        body.empresa  ?? null,
        body.area,
        body.subtipo  ?? null,
        body.tipo_malha ?? null,
        body.qtde_costureiros ?? null,
        body.capacidade_produtiva ?? null,
        Array.isArray(body.tipos_maquina)    ? body.tipos_maquina    : null,
        Array.isArray(body.linha_produto)    ? body.linha_produto    : null,
        Array.isArray(body.tipos_acabamento) ? body.tipos_acabamento : null,
        Array.isArray(body.especialidades)   ? body.especialidades   : null,
        Array.isArray(body.tipos_produto)    ? body.tipos_produto    : null,
        body.private_label    ?? false,
        body.aceita_briefing  ?? true,
        body.estado  ?? null,
        body.cidade  ?? null,
        body.bairro  ?? null,
        body.obs     ?? null,
        body.status  ?? "prospecto",
      ]
    );
    res.json({ ok: true, parceiro: p });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/kanban/parceiros/:id
router.patch("/kanban/parceiros/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body as Record<string, any>;
  const textFields = ["nome","whatsapp","email","empresa","area","subtipo","tipo_malha","qtde_costureiros","capacidade_produtiva","estado","cidade","bairro","obs","status"];
  const arrayFields = ["tipos_maquina","linha_produto","tipos_acabamento","especialidades","tipos_produto"];
  const boolFields  = ["private_label","aceita_briefing"];
  const sets: string[] = ["updated_at = NOW()"];
  const vals: any[] = [];
  let i = 1;
  for (const f of textFields)  if (f in body) { sets.push(`${f} = $${i++}`); vals.push(body[f] ?? null); }
  for (const f of arrayFields) if (f in body) { sets.push(`${f} = $${i++}`); vals.push(Array.isArray(body[f]) ? body[f] : null); }
  for (const f of boolFields)  if (f in body) { sets.push(`${f} = $${i++}`); vals.push(Boolean(body[f])); }
  vals.push(req.params.id);
  await pool.query(`UPDATE parceiros_producao SET ${sets.join(", ")} WHERE id = $${i}`, vals);
  res.json({ ok: true });
});

// POST /api/kanban/parceiros/:id/responder-cotacao
// Resposta manual (sem Z-API) — admin registra sim/nao pelo dashboard
router.post("/kanban/parceiros/:id/responder-cotacao", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { resposta } = req.body as { resposta: string };
  if (!["sim", "nao"].includes(resposta)) {
    res.status(400).json({ error: "resposta deve ser 'sim' ou 'nao'" });
    return;
  }
  const novoStatus = resposta === "sim" ? "disponivel" : "nao_disponivel";
  await pool.query(
    `UPDATE parceiros_producao SET cotacao_resposta = $1, status = $2, updated_at = NOW() WHERE id = $3`,
    [resposta, novoStatus, req.params.id]
  );
  res.json({ ok: true, resposta, status: novoStatus });
});

// DELETE /api/kanban/parceiros/:id
router.delete("/kanban/parceiros/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  await pool.query(`DELETE FROM parceiros_producao WHERE id = $1`, [req.params.id]);
  res.json({ ok: true });
});

// POST /api/kanban/parceiros/enviar-cotacao-multipla
router.post("/kanban/parceiros/enviar-cotacao-multipla", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { ids, mensagem, imagens } = req.body as { ids: string[]; mensagem?: string; imagens?: string[] };
  if (!ids?.length) { res.status(400).json({ error: "ids é obrigatório" }); return; }
  if (!mensagem?.trim() && !imagens?.length) { res.status(400).json({ error: "mensagem ou imagem obrigatória" }); return; }
  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (const id of ids) {
    try {
      const { rows } = await pool.query(`SELECT whatsapp, nome FROM parceiros_producao WHERE id = $1`, [id]);
      if (!rows.length) { results.push({ id, ok: false, error: "não encontrado" }); continue; }
      const { whatsapp } = rows[0];
      if (mensagem?.trim()) {
        const r = await zapiSendText(whatsapp, mensagem.trim());
        if (!r.ok) { results.push({ id, ok: false, error: `Z-API texto ${r.status}` }); continue; }
      }
      for (let j = 0; j < (imagens ?? []).length; j++) {
        const caption = j === 0 && !mensagem?.trim() ? "Projeto" : "";
        await zapiSendImage(whatsapp, imagens![j], caption);
      }
      // Enviar botões interativos SIM / NÃO (silencioso se falhar)
      await zapiSendCotacaoButtons(whatsapp);
      await pool.query(`UPDATE parceiros_producao SET cotacao_enviada_at = NOW(), cotacao_resposta = NULL, updated_at = NOW() WHERE id = $1`, [id]);
      results.push({ id, ok: true });
    } catch (e: any) {
      results.push({ id, ok: false, error: e.message });
    }
  }
  const succeeded = results.filter(r => r.ok).length;
  res.json({ ok: true, succeeded, failed: results.length - succeeded, results });
});

// GET /api/kanban/candidatos-rh
router.get("/kanban/candidatos-rh", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res: Response) => {
  const { area, status, search, limit = "200", offset = "0" } = req.query as Record<string, string>;
  const conds: string[] = ["tenant_id = $1"];
  const vals: any[] = [req.tenantId!];
  let i = 2;
  if (area)   { conds.push(`area = $${i++}`);   vals.push(area); }
  if (status) { conds.push(`status = $${i++}`); vals.push(status); }
  if (search) { conds.push(`(nome ILIKE $${i} OR cidade ILIKE $${i})`); vals.push(`%${search}%`); i++; }
  const where = conds.join(" AND ");
  const { rows } = await pool.query(
    `SELECT * FROM candidatos_rh WHERE ${where} ORDER BY created_at DESC LIMIT $${i} OFFSET $${i+1}`,
    [...vals, parseInt(limit), parseInt(offset)]
  );
  const { rows: ct } = await pool.query(`SELECT COUNT(*)::int FROM candidatos_rh WHERE ${where}`, vals);
  res.json({ candidatos: rows, total: ct[0].count });
});

// POST /api/kanban/candidatos-rh/:id/encaminhar-moda-conecta
router.post("/kanban/candidatos-rh/:id/encaminhar-moda-conecta", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { email } = req.body as { email?: string };
  const { rows } = await pool.query(`SELECT * FROM candidatos_rh WHERE id = $1`, [req.params.id]);
  if (!rows.length) { res.status(404).json({ error: "Candidato não encontrado" }); return; }
  const c = rows[0];

  const finalEmail = ((email ?? c.email ?? "") as string).trim().toLowerCase();
  if (!finalEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(finalEmail)) {
    res.status(400).json({ error: "E-mail é obrigatório para encaminhar ao Moda Conecta" }); return;
  }

  if (!c.email) {
    await pool.query(`UPDATE candidatos_rh SET email = $1, updated_at = NOW() WHERE id = $2`, [finalEmail, c.id]);
  }

  const { rows: existing } = await pool.query(
    `SELECT id FROM moda_conecta_leads WHERE email = $1 AND company_slug = 'mirage' AND campaign_source = 'r2pb_rh' LIMIT 1`,
    [finalEmail]
  );
  if (existing.length > 0) {
    await pool.query(`UPDATE candidatos_rh SET encaminhado_mc_at = NOW(), updated_at = NOW() WHERE id = $1`, [c.id]);
    res.json({ ok: true, leadId: existing[0].id, alreadyExists: true }); return;
  }

  const { rows: inserted } = await pool.query(`
    INSERT INTO moda_conecta_leads (
      company_slug, campaign_source, full_name, email, whatsapp,
      city, state, role_in_chain,
      lgpd_consent, lgpd_consent_at, status
    ) VALUES (
      'mirage', 'r2pb_rh', $1, $2, $3,
      $4, $5, $6,
      true, NOW(), 'novo'
    ) RETURNING id
  `, [
    c.nome, finalEmail, c.whatsapp ?? null,
    c.cidade ?? null, c.estado ?? null,
    c.area ?? null,
  ]);

  await pool.query(`UPDATE candidatos_rh SET encaminhado_mc_at = NOW(), updated_at = NOW() WHERE id = $1`, [c.id]);
  logger.info({ candidatoId: c.id, leadId: inserted[0].id }, "candidato encaminhado para Moda Conecta");
  res.json({ ok: true, leadId: inserted[0].id });
});

// PATCH /api/kanban/candidatos-rh/:id
router.patch("/kanban/candidatos-rh/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body as Record<string, any>;
  const textFields = ["nome","whatsapp","email","area","funcao","experiencia","disponibilidade","resumo","estado","cidade","bairro","obs","status"];
  const boolFields  = ["experiencia_confeccao"];
  const sets: string[] = ["updated_at = NOW()"];
  const vals: any[] = [];
  let i = 1;
  for (const f of textFields) if (f in body) { sets.push(`${f} = $${i++}`); vals.push(body[f] ?? null); }
  for (const f of boolFields) if (f in body) { sets.push(`${f} = $${i++}`); vals.push(Boolean(body[f])); }
  vals.push(req.params.id);
  await pool.query(`UPDATE candidatos_rh SET ${sets.join(", ")} WHERE id = $${i}`, vals);
  logger.info({ id: req.params.id }, "kanban/candidatos-rh: updated");
  res.json({ ok: true });
});

// DELETE /api/kanban/candidatos-rh/:id
router.delete("/kanban/candidatos-rh/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  await pool.query(`DELETE FROM candidatos_rh WHERE id = $1`, [req.params.id]);
  res.json({ ok: true });
});

export default router;
