import { Router, Request, Response } from "express";
import { db, parceirosProducao, candidatosRh } from "@workspace/db";
import { logger } from "../../lib/logger";

const router = Router();

// ── POST /api/public/r2pb/fornecedores ────────────────────────────────────────
router.post("/public/r2pb/fornecedores", async (req: Request, res: Response) => {
  try {
    const {
      nome, whatsapp, email, empresa,
      // Campos novos do formulário wizard
      areas_atuacao, especialidade_costura, especialidade_beneficiamento,
      bairro, cidade, estado, obs,
      // Campos legado (formulário antigo)
      especialidades, capacidade_produtiva,
      private_label, tipos_produto, aceita_briefing,
    } = req.body as Record<string, any>;

    if (!nome || !whatsapp) {
      res.status(400).json({ error: "nome e whatsapp são obrigatórios" });
      return;
    }

    // Mapeamento: formulário novo usa areas_atuacao[], formulário legado usava "area" direto
    const areaRaw: string = Array.isArray(areas_atuacao) && areas_atuacao.length > 0
      ? areas_atuacao[0]
      : (req.body.area ?? "fornecedor");

    // Sub-especialidade: costura ou beneficiamento
    const subtipoRaw: string | null =
      (Array.isArray(especialidade_costura) && especialidade_costura.length > 0)
        ? especialidade_costura[0]
        : (Array.isArray(especialidade_beneficiamento) && especialidade_beneficiamento.length > 0)
          ? especialidade_beneficiamento[0]
          : null;

    const [row] = await db.insert(parceirosProducao).values({
      tenant_id:            "4a21771a-2f34-4506-8bb2-176b94731387",
      nome:                 String(nome).trim(),
      whatsapp:             String(whatsapp).trim(),
      email:                email ? String(email).trim() : null,
      empresa:              empresa ? String(empresa).trim() : null,
      area:                 areaRaw,
      subtipo:              subtipoRaw,
      especialidades:       Array.isArray(especialidades) ? especialidades : [],
      capacidade_produtiva: capacidade_produtiva ? String(capacidade_produtiva) : null,
      private_label:        Boolean(private_label ?? false),
      tipos_produto:        Array.isArray(tipos_produto) ? tipos_produto : [],
      aceita_briefing:      Boolean(aceita_briefing ?? true),
      bairro:               bairro ? String(bairro).trim() : null,
      cidade:               cidade ? String(cidade).trim() : null,
      estado:               estado ? String(estado).trim() : null,
      status:               "prospecto",
      obs:                  obs ? String(obs).trim() : null,
    }).returning();

    logger.info({ id: row.id, nome: row.nome, area: areaRaw, subtipo: subtipoRaw }, "public/r2pb/fornecedores: cadastro recebido");
    res.status(201).json({ ok: true, id: row.id });
  } catch (err: any) {
    logger.error({ err: err.message }, "public/r2pb/fornecedores: erro");
    res.status(500).json({ error: "Erro ao salvar cadastro" });
  }
});

// ── POST /api/public/r2pb/candidatos ─────────────────────────────────────────
router.post("/public/r2pb/candidatos", async (req: Request, res: Response) => {
  try {
    const {
      nome, whatsapp, email,
      area, funcao, experiencia, disponibilidade,
      experiencia_confeccao, resumo,
      cidade, estado, obs,
    } = req.body as Record<string, any>;

    if (!nome || !whatsapp || !area) {
      res.status(400).json({ error: "nome, whatsapp e area são obrigatórios" });
      return;
    }

    const [row] = await db.insert(candidatosRh).values({
      tenant_id:             "4a21771a-2f34-4506-8bb2-176b94731387",
      nome:                  String(nome).trim(),
      whatsapp:              String(whatsapp).trim(),
      email:                 email ? String(email).trim() : null,
      area:                  String(area),
      funcao:                funcao ? String(funcao).trim() : null,
      experiencia:           experiencia ? String(experiencia) : null,
      disponibilidade:       disponibilidade ? String(disponibilidade) : null,
      experiencia_confeccao: Boolean(experiencia_confeccao ?? false),
      resumo:                resumo ? String(resumo).trim() : null,
      cidade:                cidade ? String(cidade).trim() : null,
      estado:                estado ? String(estado).trim() : null,
      status:               "novo",
      obs:                   obs ? String(obs).trim() : null,
    }).returning();

    logger.info({ id: row.id, nome: row.nome }, "public/r2pb/candidatos: cadastro recebido");
    res.status(201).json({ ok: true, id: row.id });
  } catch (err: any) {
    logger.error({ err: err.message }, "public/r2pb/candidatos: erro");
    res.status(500).json({ error: "Erro ao salvar cadastro" });
  }
});

export default router;
