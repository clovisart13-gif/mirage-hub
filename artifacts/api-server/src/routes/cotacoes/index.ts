import { Router } from "express";
import type { Response } from "express";
import { pool } from "@workspace/db";
import { logger } from "../../lib/logger";
import { requireAuth, requireTenantAccess } from "../../middlewares/auth";
import type { AuthenticatedRequest } from "../../middlewares/auth";

const router = Router();

// ── Z-API helpers ────────────────────────────────────────────────────────────
function zapiHeaders() {
  return {
    "Content-Type": "application/json",
    "Client-Token": process.env["ZAPI_CLIENT_TOKEN_R2PB"] ?? "Fadbf0be3eac648c8b790477fd43310cdS",
  } as Record<string, string>;
}
function zapiBase() {
  const i = process.env["ZAPI_INSTANCE_R2PB"] ?? "3EC7FC04DC4092E870116A599C5ED5B8";
  const t = process.env["ZAPI_TOKEN_R2PB"]    ?? "44BCDFDD085514B19094352B";
  return `https://api.z-api.io/instances/${i}/token/${t}`;
}

async function zapiSendText(phone: string, message: string) {
  return fetch(`${zapiBase()}/send-text`, {
    method: "POST", headers: zapiHeaders(),
    body: JSON.stringify({ phone, message }),
  });
}
async function zapiSendImage(phone: string, image: string, caption: string) {
  return fetch(`${zapiBase()}/send-image`, {
    method: "POST", headers: zapiHeaders(),
    body: JSON.stringify({ phone, image, caption }),
  });
}
async function zapiSendButtons(phone: string) {
  return fetch(`${zapiBase()}/send-button-list`, {
    method: "POST", headers: zapiHeaders(),
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
}

// ── GET /api/kanban/cotacoes ─────────────────────────────────────────────────
// Lista cotações do tenant com stats de resposta
router.get("/kanban/cotacoes", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        c.id, c.numero, c.titulo, c.mensagem, c.status,
        c.created_at, c.updated_at,
        COUNT(cd.id)::int                                                             AS total,
        COUNT(CASE WHEN cd.resposta = 'sim' THEN 1 END)::int                         AS sim,
        COUNT(CASE WHEN cd.resposta = 'nao' THEN 1 END)::int                         AS nao,
        COUNT(CASE WHEN cd.resposta IS NULL AND cd.enviado_at IS NOT NULL THEN 1 END)::int AS pendente
      FROM cotacoes c
      LEFT JOIN cotacao_destinatarios cd ON cd.cotacao_id = c.id
      WHERE c.tenant_id = $1
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `, [req.tenantId]);
    res.json({ cotacoes: rows });
  } catch (err: any) {
    logger.error({ err: err.message }, "cotacoes: erro ao listar");
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/kanban/cotacoes/:id ─────────────────────────────────────────────
router.get("/kanban/cotacoes/:id", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rows: [cotacao] } = await pool.query(
      `SELECT * FROM cotacoes WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.tenantId]
    );
    if (!cotacao) { res.status(404).json({ error: "Cotação não encontrada" }); return; }

    const { rows: destinatarios } = await pool.query(
      `SELECT cd.*, pp.area, pp.subtipo, pp.cidade, pp.bairro
       FROM cotacao_destinatarios cd
       LEFT JOIN parceiros_producao pp ON pp.id = cd.parceiro_id
       WHERE cd.cotacao_id = $1
       ORDER BY cd.parceiro_nome`,
      [req.params.id]
    );
    res.json({ cotacao, destinatarios });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/kanban/cotacoes/criar-e-enviar ─────────────────────────────────
// Cria a cotação + envia para todos os parceiros selecionados em uma operação
router.post("/kanban/cotacoes/criar-e-enviar", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res: Response) => {
  const { titulo, mensagem, imagens, parceiro_ids } = req.body as {
    titulo: string;
    mensagem?: string;
    imagens?: string[];
    parceiro_ids: string[];
  };

  if (!titulo?.trim())     { res.status(400).json({ error: "título é obrigatório" }); return; }
  if (!parceiro_ids?.length) { res.status(400).json({ error: "selecione ao menos 1 parceiro" }); return; }
  if (!mensagem?.trim() && !imagens?.length) {
    res.status(400).json({ error: "mensagem ou imagem é obrigatória" }); return;
  }

  try {
    // Gerar número sequencial COT-NNNN
    const { rows: [{ next }] } = await pool.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM 5) AS INT)), 0) + 1 AS next
       FROM cotacoes WHERE tenant_id = $1`,
      [req.tenantId]
    );
    const numero = `COT-${String(next).padStart(4, "0")}`;

    // Criar cotação
    const { rows: [cot] } = await pool.query(
      `INSERT INTO cotacoes (tenant_id, numero, titulo, mensagem, status)
       VALUES ($1, $2, $3, $4, 'enviada') RETURNING *`,
      [req.tenantId, numero, titulo.trim(), mensagem?.trim() ?? null]
    );

    // Buscar parceiros selecionados
    const { rows: parceiros } = await pool.query(
      `SELECT id, nome, whatsapp FROM parceiros_producao
       WHERE id = ANY($1::uuid[]) AND tenant_id = $2`,
      [parceiro_ids, req.tenantId]
    );

    // Enviar para cada parceiro
    const results: { id: string; nome: string; ok: boolean; error?: string }[] = [];
    for (const p of parceiros) {
      try {
        // Inserir destinatário
        await pool.query(
          `INSERT INTO cotacao_destinatarios (cotacao_id, parceiro_id, parceiro_nome, parceiro_whatsapp, enviado_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [cot.id, p.id, p.nome, p.whatsapp]
        );

        // Enviar mensagem de texto
        if (mensagem?.trim()) {
          const r = await zapiSendText(p.whatsapp, mensagem.trim());
          if (!r.ok) {
            const txt = await r.text().catch(() => "");
            results.push({ id: p.id, nome: p.nome, ok: false, error: `Z-API ${r.status}: ${txt}` });
            continue;
          }
        }

        // Enviar imagens
        for (let i = 0; i < (imagens ?? []).length; i++) {
          const caption = i === 0 && !mensagem?.trim() ? "Projeto" : "";
          await zapiSendImage(p.whatsapp, imagens![i], caption);
        }

        // Enviar botões SIM / NÃO
        await zapiSendButtons(p.whatsapp);

        results.push({ id: p.id, nome: p.nome, ok: true });
      } catch (e: any) {
        results.push({ id: p.id, nome: p.nome, ok: false, error: e.message });
      }
    }

    const succeeded = results.filter(r => r.ok).length;
    logger.info({ cotacaoId: cot.id, numero, total: parceiros.length, succeeded }, "cotacao: criada e enviada");
    res.json({ ok: true, cotacao: cot, succeeded, failed: results.length - succeeded, results });
  } catch (err: any) {
    logger.error({ err: err.message }, "cotacoes: erro ao criar e enviar");
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/kanban/cotacoes/:id/destinatarios/:destId/resposta ────────────
// Resposta manual pelo admin (quando botão Z-API não chega ao parceiro)
router.patch("/kanban/cotacoes/:id/destinatarios/:destId/resposta", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res: Response) => {
  const { resposta } = req.body as { resposta: string };
  if (!["sim", "nao"].includes(resposta)) {
    res.status(400).json({ error: "resposta deve ser 'sim' ou 'nao'" });
    return;
  }
  // Verifica que a cotação pertence ao tenant
  const { rows: cotRows } = await pool.query(
    `SELECT id FROM cotacoes WHERE id = $1 AND tenant_id = $2`,
    [req.params.id, req.tenantId]
  );
  if (!cotRows.length) { res.status(404).json({ error: "Cotação não encontrada" }); return; }

  await pool.query(
    `UPDATE cotacao_destinatarios SET resposta = $1, resposta_at = NOW() WHERE id = $2 AND cotacao_id = $3`,
    [resposta, req.params.destId, req.params.id]
  );

  // Atualiza também o status do parceiro em parceiros_producao
  const novoStatus = resposta === "sim" ? "disponivel" : "nao_disponivel";
  const { rows: destRows } = await pool.query(
    `SELECT parceiro_id FROM cotacao_destinatarios WHERE id = $1`,
    [req.params.destId]
  );
  if (destRows.length && destRows[0].parceiro_id) {
    await pool.query(
      `UPDATE parceiros_producao SET cotacao_resposta = $1, status = $2, updated_at = NOW() WHERE id = $3`,
      [resposta, novoStatus, destRows[0].parceiro_id]
    );
  }

  res.json({ ok: true, resposta });
});

// ── PATCH /api/kanban/cotacoes/:id ──────────────────────────────────────────
router.patch("/kanban/cotacoes/:id", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.body as { status?: string };
  if (!status) { res.status(400).json({ error: "status é obrigatório" }); return; }
  await pool.query(
    `UPDATE cotacoes SET status = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
    [status, req.params.id, req.tenantId]
  );
  res.json({ ok: true });
});

// ── DELETE /api/kanban/cotacoes/:id ─────────────────────────────────────────
router.delete("/kanban/cotacoes/:id", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res: Response) => {
  await pool.query(`DELETE FROM cotacoes WHERE id = $1 AND tenant_id = $2`, [req.params.id, req.tenantId]);
  res.json({ ok: true });
});

export default router;
