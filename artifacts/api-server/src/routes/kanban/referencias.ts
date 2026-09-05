import { Router, type IRouter } from "express";
import { db, referencias, movimentacoes, clientes, imagens_referencia, fornecedores, contas_a_pagar, itens_pedido, estoque, estoque_grades, grades, fichas_custo } from "@workspace/db";
import { eq, and, ilike, inArray, desc, sql } from "drizzle-orm";
import { requireAuth, requireTenantAccess, type AuthenticatedRequest } from "../../middlewares/auth";

const router: IRouter = Router();

export const FASES = [
  "inicio","espera","modelagem","tecido","risco","corte",
  "beneficiamento","costura","lavanderia","acabamento",
  "passadoria","expedicao","faturamento","concluido"
] as const;

export const FASES_PRODUTIVAS = ["corte","beneficiamento","costura","lavanderia","acabamento","passadoria"];
export const FASES_ORIGEM_COM_POPUP = ["corte","beneficiamento","costura","lavanderia","acabamento","passadoria"];

// ─── FASES ─────────────────────────────────────────────────────────────────
router.get("/kanban/fases", requireAuth, (_req, res) => {
  res.json(FASES.map((slug, i) => ({
    slug,
    ordem: i + 1,
    nome: slug.charAt(0).toUpperCase() + slug.slice(1),
    produtiva: FASES_PRODUTIVAS.includes(slug),
  })));
});

// ─── BOARD ─────────────────────────────────────────────────────────────────
router.get("/kanban/referencias/board", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { cliente_id, busca } = req.query;
  const tenantId = req.tenantId!;

  const conditions = [
    eq(referencias.tenant_id, tenantId),
    eq(referencias.ativo, true),
  ];
  if (cliente_id) conditions.push(eq(referencias.cliente_id, cliente_id as string));
  if (busca) conditions.push(ilike(referencias.codigo, `%${busca}%`));

  const refs = await db
    .select({
      id: referencias.id,
      codigo: referencias.codigo,
      referencia_cliente: referencias.referencia_cliente,
      descricao: referencias.descricao,
      descricao_modelo: referencias.descricao_modelo,
      fase_atual: referencias.fase_atual,
      quantidade: referencias.quantidade,
      quantidade_total: referencias.quantidade_total,
      quantidade_inicial: referencias.quantidade_inicial,
      nome_cliente: referencias.nome_cliente,
      cliente_id: referencias.cliente_id,
      numero_op: referencias.numero_op,
      numero_pedido: referencias.numero_pedido,
      cmp: referencias.cmp,
      cmo: referencias.cmo,
      valor_venda: referencias.valor_venda,
      fornecedor: referencias.fornecedor,
      fornecedor_id: referencias.fornecedor_id,
      foto_url: referencias.foto_url,
      cores: referencias.cores,
      grade: referencias.grade,
      data_entrada: referencias.data_entrada,
      data_prevista_entrega: referencias.data_prevista_entrega,
      previsao_conclusao: referencias.previsao_conclusao,
      data_inicio: referencias.data_inicio,
      data_termino_prevista: referencias.data_termino_prevista,
      data_termino_real: referencias.data_termino_real,
      observacoes: referencias.observacoes,
      ativo: referencias.ativo,
      created_at: referencias.created_at,
      updated_at: referencias.updated_at,
    })
    .from(referencias)
    .where(and(...conditions))
    .orderBy(desc(referencias.updated_at));

  const refIds = refs.map(r => r.id);
  const imagens = refIds.length > 0
    ? await db.select().from(imagens_referencia).where(inArray(imagens_referencia.referencia_id, refIds))
    : [];

  const clienteIds = [...new Set(refs.map(r => r.cliente_id).filter(Boolean))] as string[];
  const clientesData = clienteIds.length > 0
    ? await db.select().from(clientes).where(inArray(clientes.id, clienteIds))
    : [];
  const clientesMap = Object.fromEntries(clientesData.map(c => [c.id, c]));

  const refsEnrichidas = refs.map(ref => ({
    ...ref,
    imagens: imagens.filter(img => img.referencia_id === ref.id),
    cliente: ref.cliente_id ? clientesMap[ref.cliente_id] ?? null : null,
  }));

  const board: Record<string, typeof refsEnrichidas> = {};
  FASES.forEach(f => { board[f] = []; });
  refsEnrichidas.forEach(ref => {
    const fase = ref.fase_atual;
    if (board[fase]) {
      board[fase]!.push(ref);
    } else {
      board["inicio"]!.push({ ...ref, fase_atual: "inicio" });
    }
  });

  res.json({ fases: [...FASES], board });
});

// ─── LIST ───────────────────────────────────────────────────────────────────
router.get("/kanban/referencias", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { fase, cliente_id, busca } = req.query;
  const tenantId = req.tenantId!;

  const conditions = [
    eq(referencias.tenant_id, tenantId),
    eq(referencias.ativo, true),
  ];
  if (fase) conditions.push(eq(referencias.fase_atual, fase as string));
  if (cliente_id) conditions.push(eq(referencias.cliente_id, cliente_id as string));
  if (busca) conditions.push(ilike(referencias.codigo, `%${busca}%`));

  const data = await db.select().from(referencias).where(and(...conditions)).orderBy(desc(referencias.updated_at));
  res.json(data);
});

// ─── GET BY ID ──────────────────────────────────────────────────────────────
router.get("/kanban/referencias/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const tenantIds = req.userTenantIds ?? [];

  const [ref] = await db.select().from(referencias)
    .where(and(eq(referencias.id, id), inArray(referencias.tenant_id, tenantIds)));

  if (!ref) { res.status(404).json({ error: "Referência não encontrada" }); return; }

  const [imagens, movs, cliente, fichaData] = await Promise.all([
    db.select().from(imagens_referencia).where(eq(imagens_referencia.referencia_id, id)),
    db.select().from(movimentacoes).where(eq(movimentacoes.referencia_id, id)).orderBy(desc(movimentacoes.created_at)),
    ref.cliente_id ? db.select().from(clientes).where(eq(clientes.id, ref.cliente_id)).then(r => r[0] ?? null) : Promise.resolve(null),
    (ref as any).ficha_id
      ? db.select().from(fichas_custo).where(eq(fichas_custo.id, (ref as any).ficha_id)).then(r => r[0] ?? null)
      : Promise.resolve(null),
  ]);

  res.json({ ...ref, imagens, movimentacoes: movs, cliente, fichaData });
});

// ─── CREATE ─────────────────────────────────────────────────────────────────
router.post("/kanban/referencias", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const {
    codigo, descricao, descricao_modelo, cliente_id, nome_cliente,
    familia_id, quantidade, quantidade_total, quantidade_inicial,
    cmp, cmo, valor_venda, data_entrada, data_prevista_entrega,
    previsao_conclusao, numero_op, numero_pedido, fornecedor, fornecedor_id,
    foto_url, cores, grade, observacoes, ficha_id,
  } = req.body;

  const tenantId = req.tenantId!;
  if (!codigo) { res.status(400).json({ error: "codigo é obrigatório" }); return; }

  const qtd = quantidade ?? quantidade_total ?? 0;

  // Auto-calcular CMP da ficha se ficha_id for fornecido
  let cmpFinal = cmp ?? 0;
  if (ficha_id) {
    const [ficha] = await db.select().from(fichas_custo).where(eq(fichas_custo.id, ficha_id)).limit(1);
    if (ficha) {
      const cmpUnit = Number(ficha.modelagem) + Number(ficha.piloto) + Number(ficha.tecido) + Number(ficha.aviamento);
      cmpFinal = Math.round(cmpUnit * qtd * 100);
    }
  }

  // Auto-gerar numero_op se não fornecido: [CODIGO] - [SEQ_PADDED]
  let opGerado = numero_op || null;
  if (!opGerado && numero_pedido) {
    const existentes = await db
      .select({ id: referencias.id })
      .from(referencias)
      .where(and(eq(referencias.tenant_id, tenantId), eq(referencias.numero_pedido, numero_pedido)));
    // Sufixo = total de referências do pedido (existentes + esta nova)
    const totalRefs = existentes.length + 1;
    const ano = new Date().getFullYear().toString().slice(-2);
    const partesPed = numero_pedido.split('-');
    const pedSeq = partesPed[partesPed.length - 1] ?? '001';
    opGerado = `OP-${ano}-${pedSeq}-${totalRefs}`;
  }

  const [data] = await db.insert(referencias).values({
    tenant_id: tenantId,
    codigo: codigo.toUpperCase(),
    descricao,
    descricao_modelo,
    cliente_id: cliente_id || null,
    nome_cliente: nome_cliente || null,
    familia_id: familia_id || null,
    fase_atual: "inicio",
    quantidade: qtd,
    quantidade_inicial: qtd,
    quantidade_total: qtd,
    cmp: cmpFinal,
    cmo: cmo ?? 0,
    ...(ficha_id ? { ficha_id } : {}),
    valor_venda: valor_venda ? String(valor_venda) : null,
    data_entrada: data_entrada ? new Date(data_entrada) : new Date(),
    data_prevista_entrega: data_prevista_entrega ? new Date(data_prevista_entrega) : null,
    previsao_conclusao: previsao_conclusao ? new Date(previsao_conclusao) : null,
    numero_op: opGerado,
    numero_pedido: numero_pedido || null,
    fornecedor: fornecedor || null,
    fornecedor_id: fornecedor_id || null,
    foto_url: foto_url || null,
    cores: cores || null,
    grade: grade || null,
    observacoes: observacoes || null,
    ativo: true,
  }).returning();

  res.status(201).json(data);
});

// ─── UPDATE ─────────────────────────────────────────────────────────────────
router.patch("/kanban/referencias/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const tenantIds = req.userTenantIds ?? [];

  const {
    codigo, descricao, descricao_modelo, cliente_id, nome_cliente,
    familia_id, quantidade, quantidade_total, cmp, cmo, valor_venda,
    data_prevista_entrega, previsao_conclusao, numero_op, numero_pedido,
    fornecedor, fornecedor_id, foto_url, cores, grade, observacoes, ativo,
  } = req.body;

  const updateData: Record<string, unknown> = { updated_at: new Date() };
  if (codigo !== undefined) updateData.codigo = codigo.toUpperCase();
  if (descricao !== undefined) updateData.descricao = descricao;
  if (descricao_modelo !== undefined) updateData.descricao_modelo = descricao_modelo;
  if (cliente_id !== undefined) updateData.cliente_id = cliente_id || null;
  if (nome_cliente !== undefined) updateData.nome_cliente = nome_cliente || null;
  if (familia_id !== undefined) updateData.familia_id = familia_id || null;
  if (quantidade !== undefined) updateData.quantidade = quantidade;
  if (quantidade_total !== undefined) updateData.quantidade_total = quantidade_total;
  if (cmp !== undefined) updateData.cmp = cmp;
  if (cmo !== undefined) updateData.cmo = cmo;
  if (valor_venda !== undefined) updateData.valor_venda = valor_venda ? String(valor_venda) : null;
  if (data_prevista_entrega !== undefined) updateData.data_prevista_entrega = data_prevista_entrega ? new Date(data_prevista_entrega) : null;
  if (previsao_conclusao !== undefined) updateData.previsao_conclusao = previsao_conclusao ? new Date(previsao_conclusao) : null;
  if (numero_op !== undefined) updateData.numero_op = numero_op || null;
  if (numero_pedido !== undefined) updateData.numero_pedido = numero_pedido || null;
  if (fornecedor !== undefined) updateData.fornecedor = fornecedor || null;
  if (fornecedor_id !== undefined) updateData.fornecedor_id = fornecedor_id || null;
  if (foto_url !== undefined) updateData.foto_url = foto_url || null;
  if (cores !== undefined) updateData.cores = cores || null;
  if (grade !== undefined) updateData.grade = grade || null;
  if (observacoes !== undefined) updateData.observacoes = observacoes || null;
  if (ativo !== undefined) updateData.ativo = ativo;

  const [data] = await db.update(referencias)
    .set(updateData as any)
    .where(and(eq(referencias.id, id), inArray(referencias.tenant_id, tenantIds)))
    .returning();

  if (!data) { res.status(404).json({ error: "Referência não encontrada" }); return; }
  res.json(data);
});

// ─── DELETE (soft) ──────────────────────────────────────────────────────────
router.delete("/kanban/referencias/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const tenantIds = req.userTenantIds ?? [];
  const refId = req.params.id;
  // Soft-delete the referencia
  await db.update(referencias)
    .set({ ativo: false, updated_at: new Date() })
    .where(and(eq(referencias.id, refId), inArray(referencias.tenant_id, tenantIds)));
  // Clear referencia_id from pedido items so they become editable again
  await db.update(itens_pedido)
    .set({ referencia_id: null })
    .where(eq(itens_pedido.referencia_id, refId));
  res.status(204).send();
});

// ─── MOVER (Drag & Drop / Fase) ─────────────────────────────────────────────
router.post("/kanban/referencias/:id/mover", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const {
    fase_destino, fornecedor_id, fornecedor,
    cmo, cmo_previsto, cmp, data_prevista, data_real,
    quantidade, quantidade_conferida, perda_quantidade,
    detalhes_corte, observacoes,
  } = req.body;

  const tenantIds = req.userTenantIds ?? [];
  const faseDestino = fase_destino as string;

  if (!faseDestino) {
    res.status(400).json({ error: "fase_destino é obrigatória" }); return;
  }

  const [ref] = await db.select().from(referencias)
    .where(and(eq(referencias.id, id), inArray(referencias.tenant_id, tenantIds)));

  if (!ref) { res.status(404).json({ error: "Referência não encontrada" }); return; }

  const faseOrigem = ref.fase_atual;

  const movValues: typeof movimentacoes.$inferInsert = {
    tenant_id: ref.tenant_id,
    referencia_id: id,
    fase_origem: faseOrigem,
    fase_destino: faseDestino,
    user_id: req.user!.id,
    fornecedor_id: fornecedor_id ?? null,
    cmp: cmp ?? 0,
    cmo: 0,
    cmo_previsto: cmo ?? cmo_previsto ?? 0,
    quantidade: quantidade ?? ref.quantidade ?? 0,
    quantidade_conferida: quantidade_conferida ?? null,
    perda_quantidade: perda_quantidade ?? 0,
    data_prevista: data_prevista ? new Date(data_prevista) : null,
    data_real: data_real ? new Date(data_real) : null,
    detalhes_corte: detalhes_corte ?? null,
    observacoes: observacoes ?? null,
  };
  await db.insert(movimentacoes).values(movValues);

  const refUpdate: Record<string, unknown> = {
    fase_atual: faseDestino,
    updated_at: new Date(),
    data_inicio: new Date(),
  };
  if (fornecedor_id) refUpdate.fornecedor_id = fornecedor_id;
  if (fornecedor) refUpdate.fornecedor = fornecedor;
  if (data_prevista) refUpdate.data_termino_prevista = new Date(data_prevista);
  if (quantidade !== undefined && perda_quantidade) {
    refUpdate.quantidade = (ref.quantidade ?? 0) - (perda_quantidade ?? 0);
  }
  if (faseDestino === "concluido") {
    refUpdate.data_termino_real = new Date();
  }

  const [updated] = await db.update(referencias)
    .set(refUpdate as any)
    .where(eq(referencias.id, id))
    .returning();

  // ── Ao entrar em expedição via mover: criar estoque automaticamente ──────────
  if (faseDestino === "expedicao") {
    const [estoqueExistente] = await db.select({ id: estoque.id })
      .from(estoque)
      .where(and(eq(estoque.referencia_id, id), eq(estoque.tenant_id, ref.tenant_id)));

    if (!estoqueExistente) {
      const itens = await db.select().from(itens_pedido)
        .where(eq(itens_pedido.referencia_id, id));

      const coresSet = [...new Set(itens.map(i => i.cor_nome).filter(Boolean))] as string[];
      const coresFinal = coresSet.length > 0 ? coresSet : ["Padrão"];

      let tamanhos: string[] = [];
      const primeiroComGrade = itens.find(i => i.grade_id);
      if (primeiroComGrade?.grade_id) {
        const [gradeRow] = await db.select().from(grades).where(eq(grades.id, primeiroComGrade.grade_id));
        tamanhos = gradeRow?.tamanhos ?? [];
      }
      if (tamanhos.length === 0) tamanhos = ["Único"];

      const valorUnit = itens[0]?.valor_unitario ?? 0;

      const [novoEstoque] = await db.insert(estoque).values({
        tenant_id: ref.tenant_id,
        referencia_id: id,
        quantidade_total: updated.quantidade ?? 0,
        qtd_inicial: updated.quantidade ?? 0,
        qtd_cortada: ref.quantidade_cortada ?? (quantidade_conferida ?? ref.quantidade ?? 0),
        nome_cliente: ref.nome_cliente ?? null,
        numero_pedido: ref.numero_pedido ?? null,
        numero_op: ref.numero_op ?? null,
        valor_unitario_cents: valorUnit,
        status_erp: "pendente",
        faturado: false,
      }).returning();

      if (novoEstoque && coresFinal.length > 0 && tamanhos.length > 0) {
        await db.insert(estoque_grades).values(
          coresFinal.flatMap(cor =>
            tamanhos.map(tam => ({
              tenant_id: ref.tenant_id,
              estoque_id: novoEstoque.id,
              cor_nome: cor,
              tamanho: tam,
              qtd_primeira: 0,
              qtd_segunda: 0,
            }))
          )
        );
      }
    }
  }

  res.json(updated);
});

// ─── CONCLUIR FASE ──────────────────────────────────────────────────────────
router.post("/kanban/referencias/:id/concluir-fase", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const {
    quantidade_conferida, perda_quantidade, cmo, cmo_previsto, cmp,
    detalhes_corte, observacoes, data_real, data_vencimento,
  } = req.body;

  const tenantIds = req.userTenantIds ?? [];
  const [ref] = await db.select().from(referencias)
    .where(and(eq(referencias.id, id), inArray(referencias.tenant_id, tenantIds)));

  if (!ref) { res.status(404).json({ error: "Referência não encontrada" }); return; }

  const faseAtual = ref.fase_atual;
  const faseIdx = FASES.indexOf(faseAtual as typeof FASES[number]);
  const proxFase = faseIdx >= 0 && faseIdx < FASES.length - 1 ? FASES[faseIdx + 1] : "concluido";

  await db.insert(movimentacoes).values({
    tenant_id: ref.tenant_id,
    referencia_id: id,
    fase_origem: faseAtual,
    fase_destino: proxFase,
    user_id: req.user!.id,
    cmp: cmp ?? 0,
    cmo: cmo ?? 0,
    cmo_previsto: cmo_previsto ?? 0,
    quantidade: quantidade_conferida ?? ref.quantidade ?? 0,
    quantidade_conferida: quantidade_conferida ?? null,
    perda_quantidade: perda_quantidade ?? 0,
    data_real: data_real ? new Date(data_real) : new Date(),
    detalhes_corte: detalhes_corte ?? null,
    observacoes: observacoes ?? null,
  });

  const novaQtd = (ref.quantidade ?? 0) - (perda_quantidade ?? 0);
  const [updated] = await db.update(referencias).set({
    fase_atual: proxFase,
    quantidade: novaQtd,
    cmo: cmo ?? 0,
    data_termino_real: data_real ? new Date(data_real) : new Date(),
    data_inicio: new Date(),
    updated_at: new Date(),
  }).where(eq(referencias.id, id)).returning();

  // ── Gerar conta a pagar para a fase concluída (se produtiva e com CMO) ──────
  const temFornecedor = !!(ref.fornecedor_id || ref.fornecedor);
  if (FASES_PRODUTIVAS.includes(faseAtual) && cmo && cmo > 0 && temFornecedor) {
    let forn = null;
    if (ref.fornecedor_id) {
      [forn] = await db.select().from(fornecedores).where(eq(fornecedores.id, ref.fornecedor_id));
    }
    await db.insert(contas_a_pagar).values({
      tenant_id: ref.tenant_id,
      referencia_id: id,
      fornecedor_id: ref.fornecedor_id ?? null,
      fornecedor_nome: forn?.nome ?? ref.fornecedor ?? null,
      fase: faseAtual,
      descricao: `Saída da etapa ${faseAtual} - Ref ${ref.codigo}`,
      valor: String(((cmo * (quantidade_conferida ?? ref.quantidade ?? 0)) / 100).toFixed(2)),
      data_vencimento: data_vencimento ? new Date(data_vencimento) : (data_real ? new Date(data_real) : new Date()),
      cnpj_fornecedor: forn?.cnpj ?? null,
      pix_fornecedor: forn?.pix ?? null,
      status: "pendente",
    });
  }

  // ── Ao entrar em expedição via concluir-fase: criar estoque automaticamente ──
  if (proxFase === "expedicao") {
    const [estoqueExistente] = await db.select({ id: estoque.id })
      .from(estoque)
      .where(and(eq(estoque.referencia_id, id), eq(estoque.tenant_id, ref.tenant_id)));

    if (!estoqueExistente) {
      const itens = await db.select().from(itens_pedido)
        .where(eq(itens_pedido.referencia_id, id));

      const coresSet = [...new Set(itens.map(i => i.cor_nome).filter(Boolean))] as string[];
      const coresFinal = coresSet.length > 0 ? coresSet : ["Padrão"];

      let tamanhos: string[] = [];
      const primeiroComGrade = itens.find(i => i.grade_id);
      if (primeiroComGrade?.grade_id) {
        const [gradeRow] = await db.select().from(grades).where(eq(grades.id, primeiroComGrade.grade_id));
        tamanhos = gradeRow?.tamanhos ?? [];
      }
      if (tamanhos.length === 0) tamanhos = ["Único"];

      const valorUnit = itens[0]?.valor_unitario ?? 0;

      const [novoEstoque] = await db.insert(estoque).values({
        tenant_id: ref.tenant_id,
        referencia_id: id,
        quantidade_total: updated.quantidade ?? 0,
        qtd_inicial: updated.quantidade ?? 0,
        qtd_cortada: ref.quantidade_cortada ?? (quantidade_conferida ?? ref.quantidade ?? 0),
        nome_cliente: ref.nome_cliente ?? null,
        numero_pedido: ref.numero_pedido ?? null,
        numero_op: ref.numero_op ?? null,
        valor_unitario_cents: valorUnit,
        status_erp: "pendente",
        faturado: false,
      }).returning();

      if (novoEstoque && coresFinal.length > 0 && tamanhos.length > 0) {
        await db.insert(estoque_grades).values(
          coresFinal.flatMap(cor =>
            tamanhos.map(tam => ({
              tenant_id: ref.tenant_id,
              estoque_id: novoEstoque.id,
              cor_nome: cor,
              tamanho: tam,
              qtd_primeira: 0,
              qtd_segunda: 0,
            }))
          )
        );
      }
    }
  }

  res.json({ referencia: updated, proximo_fase: proxFase });
});

// ─── INICIAR PROXIMA FASE ────────────────────────────────────────────────────
router.post("/kanban/referencias/:id/iniciar-proxima", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { fase_destino, fornecedor_id, fornecedor, cmo, cmo_previsto, data_prevista, quantidade, observacoes } = req.body;

  const tenantIds = req.userTenantIds ?? [];
  const [ref] = await db.select().from(referencias)
    .where(and(eq(referencias.id, id), inArray(referencias.tenant_id, tenantIds)));

  if (!ref) { res.status(404).json({ error: "Referência não encontrada" }); return; }

  if (!fase_destino) { res.status(400).json({ error: "fase_destino é obrigatória" }); return; }

  await db.insert(movimentacoes).values({
    tenant_id: ref.tenant_id,
    referencia_id: id,
    fase_origem: ref.fase_atual,
    fase_destino,
    user_id: req.user!.id,
    fornecedor_id: fornecedor_id ?? null,
    cmo: 0,
    cmo_previsto: cmo ?? cmo_previsto ?? 0,
    quantidade: quantidade ?? ref.quantidade ?? 0,
    data_prevista: data_prevista ? new Date(data_prevista) : null,
    observacoes: observacoes ?? null,
  });

  const [updated] = await db.update(referencias).set({
    fase_atual: fase_destino,
    fornecedor_id: fornecedor_id ?? null,
    fornecedor: fornecedor ?? null,
    cmo: cmo ?? 0,   // valor operacional da fase iniciada (aparece no card e no acumulado)
    data_inicio: new Date(),
    data_termino_prevista: data_prevista ? new Date(data_prevista) : null,
    updated_at: new Date(),
  }).where(eq(referencias.id, id)).returning();

  // ── Ao entrar em expedição: criar entrada de estoque automaticamente ─────────
  if (fase_destino === "expedicao") {
    // Verificar se já existe estoque para esta referência
    const [estoqueExistente] = await db.select({ id: estoque.id })
      .from(estoque)
      .where(and(eq(estoque.referencia_id, id), eq(estoque.tenant_id, ref.tenant_id)));

    if (!estoqueExistente) {
      // Buscar itens do pedido vinculados a esta referência para pegar cores e grade
      const itens = await db.select().from(itens_pedido)
        .where(eq(itens_pedido.referencia_id, id));

      // Cores distintas dos itens
      const coresSet = [...new Set(itens.map(i => i.cor_nome).filter(Boolean))] as string[];
      const coresFinal = coresSet.length > 0 ? coresSet : ["Padrão"];

      // Tamanhos da grade do primeiro item com grade_id
      let tamanhos: string[] = [];
      const primeiroComGrade = itens.find(i => i.grade_id);
      if (primeiroComGrade?.grade_id) {
        const [gradeRow] = await db.select().from(grades).where(eq(grades.id, primeiroComGrade.grade_id));
        tamanhos = gradeRow?.tamanhos ?? [];
      }
      if (tamanhos.length === 0) tamanhos = ["Único"];

      const valorUnit = itens[0]?.valor_unitario ?? 0;

      const [novoEstoque] = await db.insert(estoque).values({
        tenant_id: ref.tenant_id,
        referencia_id: id,
        quantidade_total: ref.quantidade ?? 0,
        qtd_inicial: ref.quantidade ?? 0,
        qtd_cortada: ref.quantidade_cortada ?? 0,
        nome_cliente: ref.nome_cliente ?? null,
        numero_pedido: ref.numero_pedido ?? null,
        numero_op: ref.numero_op ?? null,
        valor_unitario_cents: valorUnit,
        status_erp: "pendente",
        faturado: false,
      }).returning();

      // Criar linhas de grade para cada cor × tamanho
      if (novoEstoque && coresFinal.length > 0 && tamanhos.length > 0) {
        const gradeRows = coresFinal.flatMap(cor =>
          tamanhos.map(tam => ({
            tenant_id: ref.tenant_id,
            estoque_id: novoEstoque.id,
            cor_nome: cor,
            tamanho: tam,
            qtd_primeira: 0,
            qtd_segunda: 0,
          }))
        );
        await db.insert(estoque_grades).values(gradeRows);
      }
    }
  }

  res.json(updated);
});

// ─── IMAGENS ────────────────────────────────────────────────────────────────
router.get("/kanban/referencias/:id/imagens", requireAuth, async (req, res) => {
  const imgs = await db.select().from(imagens_referencia)
    .where(eq(imagens_referencia.referencia_id, req.params.id))
    .orderBy(imagens_referencia.ordem);
  res.json(imgs);
});

router.post("/kanban/referencias/:id/imagens", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { url, nome, descricao, principal, ordem } = req.body;
  if (!url) { res.status(400).json({ error: "url é obrigatória" }); return; }

  if (principal) {
    await db.update(imagens_referencia)
      .set({ principal: false })
      .where(eq(imagens_referencia.referencia_id, req.params.id));
  }

  const [img] = await db.insert(imagens_referencia).values({
    tenant_id: req.tenantId!,
    referencia_id: req.params.id,
    url, nome, descricao,
    principal: principal ?? false,
    ordem: ordem ?? 0,
  }).returning();

  res.status(201).json(img);
});

router.delete("/kanban/referencias/:id/imagens/:imgId", requireAuth, async (req, res) => {
  await db.delete(imagens_referencia).where(eq(imagens_referencia.id, req.params.imgId));
  res.status(204).send();
});

// PATCH /kanban/referencias/:id/imagens/:imgId/capa — define como capa (principal)
router.patch("/kanban/referencias/:id/imagens/:imgId/capa", requireAuth, async (req, res) => {
  // Remove principal de todas as imagens da referência
  await db.update(imagens_referencia)
    .set({ principal: false })
    .where(eq(imagens_referencia.referencia_id, req.params.id));
  // Define a imagem selecionada como principal
  const [img] = await db.update(imagens_referencia)
    .set({ principal: true })
    .where(eq(imagens_referencia.id, req.params.imgId))
    .returning();
  res.json(img);
});

// ─── MOVIMENTACOES ──────────────────────────────────────────────────────────
router.get("/kanban/referencias/:id/movimentacoes", requireAuth, async (req, res) => {
  const movs = await db.select().from(movimentacoes)
    .where(eq(movimentacoes.referencia_id, req.params.id))
    .orderBy(desc(movimentacoes.created_at));
  res.json(movs);
});

export default router;
