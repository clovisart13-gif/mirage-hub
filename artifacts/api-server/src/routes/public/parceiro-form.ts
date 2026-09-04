import { Router } from "express";
import type { Request, Response } from "express";
import { pool } from "@workspace/db";
import { logger } from "../../lib/logger";

const router = Router();

interface ParceiroBody {
  nome:             string;
  whatsapp:         string;
  area:             string;
  subtipo?:         string;
  tipo_malha?:      string;
  qtde_costureiros?:string;
  tipos_maquina?:   string[];
  linha_produto?:   string[];
  tipos_acabamento?:string[];
  estado?:          string;
  cidade?:          string;
  bairro?:          string;
}

// POST /api/public/r2pb/parceiro
router.post("/public/r2pb/parceiro", async (req: Request, res: Response) => {
  const body = req.body as ParceiroBody;

  if (!body.nome?.trim() || !body.whatsapp?.trim() || !body.area?.trim()) {
    res.status(400).json({ error: "nome, whatsapp e area são obrigatórios" });
    return;
  }

  const phone = body.whatsapp.replace(/\D/g, "");

  try {
    await pool.query(
      `INSERT INTO parceiros_producao
         (tenant_id, nome, whatsapp, area, subtipo, tipo_malha,
          qtde_costureiros, tipos_maquina, linha_produto, tipos_acabamento,
          estado, cidade, bairro, status)
       VALUES ('4a21771a-2f34-4506-8bb2-176b94731387', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'prospecto')
       ON CONFLICT DO NOTHING`,
      [
        body.nome.trim(),
        phone,
        body.area,
        body.subtipo   ?? null,
        body.tipo_malha ?? null,
        body.qtde_costureiros ?? null,
        body.tipos_maquina    ? `{${body.tipos_maquina.join(",")}}` : null,
        body.linha_produto    ? `{${body.linha_produto.join(",")}}` : null,
        body.tipos_acabamento ? `{${body.tipos_acabamento.join(",")}}` : null,
        body.estado ?? null,
        body.cidade ?? null,
        body.bairro ?? null,
      ]
    );

    logger.info({ nome: body.nome, area: body.area, subtipo: body.subtipo }, "public/parceiro-form: parceiro salvo");
    res.json({ ok: true });
  } catch (e: any) {
    logger.error({ err: e?.message }, "public/parceiro-form: erro ao salvar");
    res.status(500).json({ error: "Erro ao salvar" });
  }
});

export default router;
