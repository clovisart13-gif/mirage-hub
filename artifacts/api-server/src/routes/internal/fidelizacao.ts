import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { logger } from "../../lib/logger";

const router = Router();

// Pipeline FIDELIZAÇÃO/RECOMPRA
const FIDELIZACAO_STEP_ENTREGUE = "69508c16-93ef-423f-a2af-087182bcf8dc";

const WTS_BASE = "https://api.wts.chat";

function requireInternalKey(req: Request, res: Response, next: () => void) {
  const key = process.env["MARKETING_INTERNAL_API_KEY"];
  if (!key) { res.status(503).json({ error: "Internal API key not configured" }); return; }
  const provided = req.headers["x-internal-key"];
  if (!provided || provided !== key) { res.status(401).json({ error: "Unauthorized" }); return; }
  next();
}

const entradaSchema = z.object({
  nome:      z.string().min(1),
  phone:     z.string().min(8),
  descricao: z.string().optional(),
});

// ── POST /api/internal/fidelizacao/entrada ────────────────────────────────────
// Chamado pelo n8n quando um card chega na última etapa do Pós-Venda.
// Cria um card na etapa ENTREGUE do pipeline Fidelização/Recompra.
//
// Body: { nome, phone, descricao? }
// Headers: x-internal-key
//
router.post("/internal/fidelizacao/entrada", requireInternalKey, async (req: Request, res: Response) => {
  const parse = entradaSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Dados inválidos", details: parse.error.flatten() });
    return;
  }

  const { nome, phone, descricao } = parse.data;
  const token = process.env.HELENA_API_TOKEN;

  if (!token) {
    res.status(503).json({ error: "HELENA_API_TOKEN não configurado" });
    return;
  }

  const titulo = `${nome} — Fidelização`;
  const desc = descricao ?? `📦 Pedido entregue — iniciando ciclo de fidelização\n👤 ${nome}  |  📱 ${phone}`;

  logger.info({ nome, phone }, "fidelizacao/entrada: criando card ENTREGUE");

  const helenRes = await fetch(`${WTS_BASE}/crm/v2/panel/card`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ title: titulo, stepId: FIDELIZACAO_STEP_ENTREGUE, description: desc }),
  });

  if (!helenRes.ok) {
    const err = await helenRes.text().catch(() => "");
    logger.error({ status: helenRes.status, err }, "fidelizacao/entrada: falha ao criar card Helena");
    res.status(502).json({ ok: false, error: "Falha ao criar card na Helena", details: err });
    return;
  }

  const data = await helenRes.json() as Record<string, unknown>;
  const cardId = (data.id as any)?.value ?? data.id ?? null;

  logger.info({ cardId, nome, phone }, "fidelizacao/entrada: card ENTREGUE criado");
  res.json({ ok: true, cardId });
});

export default router;
