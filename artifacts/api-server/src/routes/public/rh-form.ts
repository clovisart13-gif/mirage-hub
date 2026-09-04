import { Router } from "express";
import type { Request, Response } from "express";
import { pool } from "@workspace/db";
import { logger } from "../../lib/logger";

const router = Router();

interface CandidatoBody {
  nome:     string;
  whatsapp: string;
  area:     string;
  estado?:  string;
  cidade?:  string;
  bairro?:  string;
}

// POST /api/public/r2pb/candidato
router.post("/public/r2pb/candidato", async (req: Request, res: Response) => {
  const body = req.body as CandidatoBody;

  if (!body.nome?.trim() || !body.whatsapp?.trim() || !body.area?.trim()) {
    res.status(400).json({ error: "nome, whatsapp e area são obrigatórios" });
    return;
  }

  const phone = body.whatsapp.replace(/\D/g, "");

  try {
    await pool.query(
      `INSERT INTO candidatos_rh
         (tenant_id, nome, whatsapp, area, estado, cidade, bairro, status)
       VALUES ('r2pb', $1, $2, $3, $4, $5, $6, 'novo')`,
      [body.nome.trim(), phone, body.area, body.estado ?? null, body.cidade ?? null, body.bairro ?? null]
    );

    logger.info({ nome: body.nome, area: body.area }, "public/rh-form: candidato salvo");
    res.json({ ok: true });
  } catch (e: any) {
    logger.error({ err: e?.message }, "public/rh-form: erro ao salvar");
    res.status(500).json({ error: "Erro ao salvar" });
  }
});

export default router;
