import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { fichas_custo, itens_orcamento_custos } from "@workspace/db";
import { eq, and, inArray, desc, like, asc, isNotNull, sql } from "drizzle-orm";
import { requireAuth, requireTenantAccess, type AuthenticatedRequest } from "../../middlewares/auth";

const router: IRouter = Router();

const CAMPOS_CUSTO = [
  "modelagem", "piloto", "corte", "beneficiamento",
  "costura", "lavanderia", "acabamento", "passadoria",
  "tecido", "aviamento",
] as const;

function mapFicha(f: any, temOrcamento = false) {
  const custoMO = (Number(f.modelagem) || 0) + (Number(f.piloto) || 0) + (Number(f.corte) || 0)
    + (Number(f.beneficiamento) || 0) + (Number(f.costura) || 0) + (Number(f.lavanderia) || 0)
    + (Number(f.acabamento) || 0) + (Number(f.passadoria) || 0);
  const custoMP = (Number(f.tecido) || 0) + (Number(f.aviamento) || 0);
  const custoTotal = custoMO + custoMP;
  return {
    id: f.id,
    tenantId: f.tenant_id,
    referencia: f.referencia,
    tipo: f.tipo,
    familia: f.familia,
    cliente: f.cliente,
    codigoCliente: f.codigo_cliente,
    origem: f.origem ?? "manual",
    plmProdutoId: f.plm_produto_id,
    plmFichaTecnicaId: f.plm_ficha_tecnica_id,
    fotoUrl: f.foto_url,
    modelagem: Number(f.modelagem),
    piloto: Number(f.piloto),
    corte: Number(f.corte),
    beneficiamento: Number(f.beneficiamento),
    costura: Number(f.costura),
    lavanderia: Number(f.lavanderia),
    acabamento: Number(f.acabamento),
    passadoria: Number(f.passadoria),
    tecido: Number(f.tecido),
    aviamento: Number(f.aviamento),
    observacoes: f.observacoes,
    ativo: f.ativo,
    custoMO: Number(custoMO.toFixed(2)),
    custoMP: Number(custoMP.toFixed(2)),
    custoTotal: Number(custoTotal.toFixed(2)),
    temOrcamento,
    createdAt: f.created_at,
    updatedAt: f.updated_at,
  };
}

async function getFichasComOrcamento(tenantId: string): Promise<Set<string>> {
  const rows = await db.selectDistinct({ ficha_id: itens_orcamento_custos.ficha_id })
    .from(itens_orcamento_custos)
    .where(and(
      eq(itens_orcamento_custos.tenant_id, tenantId),
      isNotNull(itens_orcamento_custos.ficha_id),
    ));
  return new Set(rows.map(r => r.ficha_id as string));
}

async function gerarProximoCodigo(tenantId: string, familia?: string): Promise<string> {
  const prefixFamilia = familia ? familia.substring(0, 3).toUpperCase() : "REF";
  const ano = String(new Date().getFullYear()).substring(2);
  const prefix = `${ano}${prefixFamilia}`;

  const lista = await db.select({ ref: fichas_custo.referencia }).from(fichas_custo)
    .where(and(eq(fichas_custo.tenant_id, tenantId), like(fichas_custo.referencia, `${prefix}-%`)));

  let maxSeq = 0;
  for (const { ref } of lista) {
    const parts = ref.split("-");
    const num = parseInt(parts[parts.length - 1] ?? "0", 10);
    if (!isNaN(num) && num > maxSeq) maxSeq = num;
  }
  return `${prefix}-${String(maxSeq + 1).padStart(3, "0")}`;
}

// GET /custos/fichas — lista com filtros
router.get("/custos/fichas", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const { busca, tipo, familia, cliente } = req.query;

  const conditions = [eq(fichas_custo.tenant_id, tenantId), eq(fichas_custo.ativo, true)];
  if (tipo) conditions.push(eq(fichas_custo.tipo, tipo as string));
  if (familia) conditions.push(eq(fichas_custo.familia, familia as string));
  if (cliente) conditions.push(sql`UPPER(TRIM(${fichas_custo.cliente})) = ${(cliente as string).trim().toUpperCase()}`);
  if (busca) conditions.push(like(fichas_custo.referencia, `%${busca}%`));

  const [lista, comOrc] = await Promise.all([
    db.select().from(fichas_custo).where(and(...conditions)).orderBy(desc(fichas_custo.created_at)),
    getFichasComOrcamento(tenantId),
  ]);

  res.json(lista.map(f => mapFicha(f, comOrc.has(f.id))));
});

// GET /custos/fichas/distinct-values — valores distintos para filtros
router.get("/custos/fichas/distinct-values", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const [tipos, familias, clientes] = await Promise.all([
    db.selectDistinct({ tipo: fichas_custo.tipo }).from(fichas_custo)
      .where(and(eq(fichas_custo.tenant_id, tenantId), eq(fichas_custo.ativo, true)))
      .orderBy(asc(fichas_custo.tipo)),
    db.selectDistinct({ familia: fichas_custo.familia }).from(fichas_custo)
      .where(and(eq(fichas_custo.tenant_id, tenantId), eq(fichas_custo.ativo, true)))
      .orderBy(asc(fichas_custo.familia)),
    db.select({ cliente: sql<string>`UPPER(TRIM(${fichas_custo.cliente}))` })
      .from(fichas_custo)
      .where(and(eq(fichas_custo.tenant_id, tenantId), eq(fichas_custo.ativo, true)))
      .groupBy(sql`UPPER(TRIM(${fichas_custo.cliente}))`)
      .orderBy(sql`UPPER(TRIM(${fichas_custo.cliente}))`),
  ]);
  res.json({
    tipos: tipos.map((t) => t.tipo).filter(Boolean),
    familias: familias.map((f) => f.familia).filter(Boolean),
    clientes: clientes.map((c) => c.cliente).filter((c): c is string => !!c),
  });
});

// GET /custos/fichas/codigo-proximo — gera próximo código de referência
router.get("/custos/fichas/codigo-proximo", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const { familia } = req.query as { familia?: string };
  const codigo = await gerarProximoCodigo(tenantId, familia);
  res.json({ codigo });
});

// GET /custos/fichas/:id — detalhe
router.get("/custos/fichas/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const [f] = await db.select().from(fichas_custo)
    .where(and(eq(fichas_custo.id, req.params.id), inArray(fichas_custo.tenant_id, req.userTenantIds ?? [])))
    .limit(1);
  if (!f) { res.status(404).json({ error: "Ficha não encontrada" }); return; }

  const [itemVinculado] = await db.select({ id: itens_orcamento_custos.id })
    .from(itens_orcamento_custos)
    .where(eq(itens_orcamento_custos.ficha_id, f.id))
    .limit(1);

  res.json(mapFicha(f, !!itemVinculado));
});

// POST /custos/fichas — cria nova ficha
router.post("/custos/fichas", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const {
    referencia, tipo, familia, cliente, fotoUrl,
    modelagem, piloto, corte, beneficiamento, costura,
    lavanderia, acabamento, passadoria, tecido, aviamento, observacoes,
  } = req.body;

  if (!referencia || !tipo || !familia || !cliente) {
    res.status(400).json({ error: "referencia, tipo, familia e cliente são obrigatórios" }); return;
  }

  const [existente] = await db.select({ id: fichas_custo.id }).from(fichas_custo)
    .where(and(
      eq(fichas_custo.tenant_id, tenantId),
      eq(fichas_custo.referencia, referencia.trim()),
      eq(fichas_custo.ativo, true),
    ))
    .limit(1);

  if (existente) {
    res.status(409).json({ error: `Já existe uma ficha com a referência "${referencia}". Cada referência deve ser única.` });
    return;
  }

  const [f] = await db.insert(fichas_custo).values({
    tenant_id: tenantId,
    referencia: referencia.trim(),
    tipo,
    familia,
    cliente: (cliente as string).trim().toUpperCase(),
    foto_url: fotoUrl ?? null,
    modelagem: String(modelagem ?? 0),
    piloto: String(piloto ?? 0),
    corte: String(corte ?? 0),
    beneficiamento: String(beneficiamento ?? 0),
    costura: String(costura ?? 0),
    lavanderia: String(lavanderia ?? 0),
    acabamento: String(acabamento ?? 0),
    passadoria: String(passadoria ?? 0),
    tecido: String(tecido ?? 0),
    aviamento: String(aviamento ?? 0),
    observacoes: observacoes ?? null,
    ativo: true,
  }).returning();

  res.status(201).json(mapFicha(f));
});

// PATCH /custos/fichas/:id — atualiza ficha
router.patch("/custos/fichas/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const fichaId = req.params.id;

  const [f] = await db.select().from(fichas_custo)
    .where(and(eq(fichas_custo.id, fichaId), inArray(fichas_custo.tenant_id, req.userTenantIds ?? [])))
    .limit(1);
  if (!f) { res.status(404).json({ error: "Ficha não encontrada" }); return; }

  const {
    referencia, tipo, familia, cliente, fotoUrl,
    modelagem, piloto, corte, beneficiamento, costura,
    lavanderia, acabamento, passadoria, tecido, aviamento, observacoes,
  } = req.body;

  // Proteção: campos de custo são imutáveis se ficha tem orçamento vinculado
  const tentandoAlterarCusto = CAMPOS_CUSTO.some(c => req.body[c] !== undefined);
  if (tentandoAlterarCusto) {
    const [itemVinculado] = await db.select({ id: itens_orcamento_custos.id })
      .from(itens_orcamento_custos)
      .where(eq(itens_orcamento_custos.ficha_id, fichaId))
      .limit(1);

    if (itemVinculado) {
      res.status(409).json({
        error: "Esta ficha já está vinculada a orçamentos — os valores de custo não podem ser alterados. Duplique a ficha para criar uma nova versão com custos atualizados.",
      });
      return;
    }
  }

  // Verificar unicidade se a referência está sendo alterada
  if (referencia !== undefined && referencia.trim() !== f.referencia) {
    const [existente] = await db.select({ id: fichas_custo.id }).from(fichas_custo)
      .where(and(
        eq(fichas_custo.tenant_id, f.tenant_id),
        eq(fichas_custo.referencia, referencia.trim()),
        eq(fichas_custo.ativo, true),
      ))
      .limit(1);
    if (existente) {
      res.status(409).json({ error: `Já existe uma ficha com a referência "${referencia}".` });
      return;
    }
  }

  const update: Record<string, any> = { updated_at: new Date() };
  if (referencia !== undefined) update.referencia = referencia.trim();
  if (tipo !== undefined) update.tipo = tipo;
  if (familia !== undefined) update.familia = familia;
  if (cliente !== undefined) update.cliente = (cliente as string).trim().toUpperCase();
  if (fotoUrl !== undefined) update.foto_url = fotoUrl;
  if (modelagem !== undefined) update.modelagem = String(modelagem);
  if (piloto !== undefined) update.piloto = String(piloto);
  if (corte !== undefined) update.corte = String(corte);
  if (beneficiamento !== undefined) update.beneficiamento = String(beneficiamento);
  if (costura !== undefined) update.costura = String(costura);
  if (lavanderia !== undefined) update.lavanderia = String(lavanderia);
  if (acabamento !== undefined) update.acabamento = String(acabamento);
  if (passadoria !== undefined) update.passadoria = String(passadoria);
  if (tecido !== undefined) update.tecido = String(tecido);
  if (aviamento !== undefined) update.aviamento = String(aviamento);
  if (observacoes !== undefined) update.observacoes = observacoes;

  const [updated] = await db.update(fichas_custo)
    .set(update)
    .where(eq(fichas_custo.id, fichaId))
    .returning();

  res.json(mapFicha(updated));
});

// DELETE /custos/fichas/:id — soft delete
router.delete("/custos/fichas/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  await db.update(fichas_custo)
    .set({ ativo: false, updated_at: new Date() })
    .where(and(eq(fichas_custo.id, req.params.id), inArray(fichas_custo.tenant_id, req.userTenantIds ?? [])));
  res.status(204).send();
});

// POST /custos/fichas/:id/duplicar — duplica ficha com código automático (nunca "cópia")
router.post("/custos/fichas/:id/duplicar", requireAuth, async (req: AuthenticatedRequest, res) => {
  const [original] = await db.select().from(fichas_custo)
    .where(and(eq(fichas_custo.id, req.params.id), inArray(fichas_custo.tenant_id, req.userTenantIds ?? [])))
    .limit(1);
  if (!original) { res.status(404).json({ error: "Ficha não encontrada" }); return; }

  const novoCodigo = await gerarProximoCodigo(original.tenant_id, original.familia);

  const [copia] = await db.insert(fichas_custo).values({
    tenant_id: original.tenant_id,
    referencia: novoCodigo,
    tipo: original.tipo,
    familia: original.familia,
    cliente: original.cliente,
    foto_url: original.foto_url,
    modelagem: original.modelagem,
    piloto: original.piloto,
    corte: original.corte,
    beneficiamento: original.beneficiamento,
    costura: original.costura,
    lavanderia: original.lavanderia,
    acabamento: original.acabamento,
    passadoria: original.passadoria,
    tecido: original.tecido,
    aviamento: original.aviamento,
    observacoes: original.observacoes,
    ativo: true,
  }).returning();

  res.status(201).json(mapFicha(copia));
});

export default router;
