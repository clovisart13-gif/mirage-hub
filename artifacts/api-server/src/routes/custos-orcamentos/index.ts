import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  orcamentos_custos,
  itens_orcamento_custos,
  fichas_custo,
  pedidos,
  itens_pedido,
  contas_a_receber,
  configuracoes_empresa,
  observacoes_templates,
  orcamento_parcelas,
  pedido_sinais,
  clientes,
} from "@workspace/db";
import { eq, and, inArray, desc, like, max, sql } from "drizzle-orm";
import { requireAuth, requireTenantAccess, type AuthenticatedRequest } from "../../middlewares/auth";
import { plm_produtos, plm_sequencias, plm_familias_produto } from "@workspace/db";

function tenantRefPrefix(tenantId: string): string {
  return tenantId.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "").substring(0, 4).toUpperCase().padEnd(4, "X");
}

async function assegurarFamiliaProduto(executor: any, tenantId: string, nome: string) {
  const familia = nome.trim().toUpperCase() || "OUTRO";
  await executor.insert(plm_familias_produto).values({ tenant_id: tenantId, nome: familia })
    .onConflictDoNothing();
}

async function plmGerarReferenciaTecnica(executor: any, tenantId: string): Promise<string> {
  const result = await executor.execute(sql`
    INSERT INTO plm_sequencias (tenant_id, prefixo, ultimo_numero)
    VALUES (${tenantId}, 'TECH', 1)
    ON CONFLICT (tenant_id, prefixo)
    DO UPDATE SET ultimo_numero = plm_sequencias.ultimo_numero + 1
    RETURNING ultimo_numero
  `);
  return `${tenantRefPrefix(tenantId)}-${String(Number((result.rows[0] as any).ultimo_numero)).padStart(4, "0")}`;
}

const router: IRouter = Router();

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function gerarNumeroOrcamento(tenantId: string): Promise<string> {
  const ano = new Date().getFullYear();
  const prefix = `ORC-${ano}-`;
  // Usa extração numérica (não ordenação lexicográfica) para funcionar independente do número de dígitos
  const result = await db.execute(
    sql`SELECT MAX(CAST(SUBSTRING(numero FROM '[0-9]+$') AS INTEGER)) AS max_seq
        FROM orcamentos_custos
        WHERE tenant_id = ${tenantId} AND numero LIKE ${prefix + "%"}`
  );
  const maxSeq = (result.rows[0] as any)?.max_seq;
  const seq = maxSeq != null ? parseInt(String(maxSeq), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

function calcularTotais(itens: any[], descontoTipo: string, descontoValor: number) {
  const subtotal = itens.reduce((s: number, i: any) => s + (Number(i.quantidade) * Number(i.valor_unitario)), 0);
  const desconto = descontoTipo === "percentual"
    ? subtotal * (descontoValor / 100)
    : descontoValor;
  const total = Math.max(0, subtotal - desconto);
  return { subtotal, total };
}

function mapOrcamentoParaFrontend(orc: any, itens: any[]) {
  const { subtotal, total } = calcularTotais(
    itens,
    orc.desconto_tipo ?? "percentual",
    Number(orc.desconto_valor ?? 0)
  );

  const calcPgto = (pct: number, tipo: string, base: number) =>
    tipo === "valor" ? pct : (base * pct) / 100;

  return {
    id: orc.id,
    tenant_id: orc.tenant_id,
    numero: orc.numero,
    nomeCliente: orc.nome_cliente,
    marca: orc.marca ?? "",
    validadeDias: orc.validade_dias ?? 30,
    prazoEntregaTexto: orc.prazo_entrega_texto ?? "",
    dataEntregaPrevista: orc.data_entrega_prevista ? orc.data_entrega_prevista.toISOString().split("T")[0] : null,
    observacoes: orc.observacoes ?? "",
    descontoTipo: orc.desconto_tipo ?? "percentual",
    descontoValor: Number(orc.desconto_valor ?? 0),
    percentualSinal: Number(orc.percentual_sinal ?? 0),
    tipoSinal: orc.tipo_sinal ?? "percentual",
    percentualRetirada: Number(orc.percentual_retirada ?? 0),
    tipoRetirada: orc.tipo_retirada ?? "percentual",
    percentualPrazo: Number(orc.percentual_prazo ?? 0),
    tipoPrazo: orc.tipo_prazo ?? "percentual",
    status: orc.status ?? "pendente",
    enviadoParaKanban: orc.enviado_para_kanban ?? false,
    pedidoId: orc.pedido_id ?? null,
    ativo: orc.ativo,
    createdAt: orc.created_at,
    updatedAt: orc.updated_at,
    // Aliases para compatibilidade com CustoPlus
    numeroOrcamento: orc.numero,
    dataEmissao: orc.created_at,
    validade: orc.validade_dias ?? 30,
    prazoDias: orc.validade_dias ?? 30,
    enviado: orc.enviado_para_kanban ?? false,
    // Calculados
    subtotal,
    total,
    valorSinal: calcPgto(Number(orc.percentual_sinal ?? 0), orc.tipo_sinal ?? "percentual", total),
    valorRetirada: calcPgto(Number(orc.percentual_retirada ?? 0), orc.tipo_retirada ?? "percentual", total),
    valorPrazo: calcPgto(Number(orc.percentual_prazo ?? 0), orc.tipo_prazo ?? "percentual", total),
    totalPecas: itens.reduce((s: number, i: any) => s + Number(i.quantidade), 0),
    itens: itens.map((i) => ({
      id: i.id,
      orcamentoId: i.orcamento_id,
      fichaId: i.ficha_id ?? null,
      plmProdutoId: i.plm_produto_id ?? null,
      plmFichaTecnicaId: i.plm_ficha_tecnica_id ?? null,
      referenciaTecnica: i.referencia_tecnica ?? null,
      referencia: i.referencia ?? "",
      descricao: i.descricao,
      quantidade: Number(i.quantidade),
      custo: Number(i.custo ?? 0),
      valorUnitario: Number(i.valor_unitario),
      markupDivisor: Number(i.markup_divisor ?? 0.5),
      total: Number(i.quantidade) * Number(i.valor_unitario),
      valorTotal: Number(i.quantidade) * Number(i.valor_unitario),
      isAviamento: i.is_aviamento ?? false,
      isDesenvolvimento: i.is_desenvolvimento ?? false,
      createdAt: i.created_at,
    })),
  };
}

// ─── ORÇAMENTOS ───────────────────────────────────────────────────────────────

// GET /custos/orcamentos — lista com KPIs
router.get("/custos/orcamentos", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const { status } = req.query;

  const conditions = [eq(orcamentos_custos.tenant_id, tenantId), eq(orcamentos_custos.ativo, true)];
  if (status) conditions.push(eq(orcamentos_custos.status, status as string));

  const lista = await db
    .select()
    .from(orcamentos_custos)
    .where(and(...conditions))
    .orderBy(desc(orcamentos_custos.created_at));

  if (lista.length === 0) { res.json({ orcamentos: [], kpis: { pendente: 0, aprovado: 0, reprovado: 0, totalAprovado: 0 } }); return; }

  const ids = lista.map((o) => o.id);
  const todosItens = await db
    .select()
    .from(itens_orcamento_custos)
    .where(inArray(itens_orcamento_custos.orcamento_id, ids));

  const orcamentos = lista.map((o) => {
    const itens = todosItens.filter((i) => i.orcamento_id === o.id);
    return mapOrcamentoParaFrontend(o, itens);
  });

  const kpis = {
    pendente: orcamentos.filter((o) => o.status === "pendente").length,
    aprovado: orcamentos.filter((o) => o.status === "aprovado").length,
    reprovado: orcamentos.filter((o) => o.status === "reprovado").length,
    totalAprovado: orcamentos.filter((o) => o.status === "aprovado").reduce((s, o) => s + o.total, 0),
    totalPendente: orcamentos.filter((o) => o.status === "pendente").reduce((s, o) => s + o.total, 0),
  };

  res.json({ orcamentos, kpis });
});

// GET /custos/orcamentos/:id — detalhes completos
router.get("/custos/orcamentos/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  let [orc] = await db
    .select()
    .from(orcamentos_custos)
    .where(and(eq(orcamentos_custos.id, req.params.id), inArray(orcamentos_custos.tenant_id, req.userTenantIds ?? [])))
    .limit(1);
  if (!orc) { res.status(404).json({ error: "Orçamento não encontrado" }); return; }

  const itens = await db
    .select()
    .from(itens_orcamento_custos)
    .where(eq(itens_orcamento_custos.orcamento_id, orc.id))
    .orderBy(itens_orcamento_custos.created_at);

  res.json(mapOrcamentoParaFrontend(orc, itens));
});

// POST /custos/orcamentos — cria novo orçamento (sem items obrigatórios)
router.post("/custos/orcamentos", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const {
    nomeCliente, marca, validadeDias, prazoEntregaTexto, observacoes,
    descontoTipo, descontoValor,
  } = req.body;

  if (!nomeCliente) { res.status(400).json({ error: "nomeCliente é obrigatório" }); return; }

  const numero = await gerarNumeroOrcamento(tenantId);

  const [orc] = await db.insert(orcamentos_custos).values({
    tenant_id: tenantId,
    numero,
    nome_cliente: nomeCliente,
    marca: marca ?? null,
    validade_dias: validadeDias ?? 30,
    prazo_entrega_texto: prazoEntregaTexto ?? null,
    observacoes: observacoes ?? null,
    desconto_tipo: descontoTipo ?? "percentual",
    desconto_valor: String(descontoValor ?? 0),
    status: "pendente",
  }).returning();

  res.status(201).json(mapOrcamentoParaFrontend(orc, []));
});

// POST /custos/orcamentos/criar-das-fichas — cria orçamento a partir de fichas selecionadas
router.post("/custos/orcamentos/criar-das-fichas", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const {
    nomeCliente, marca, descricao, markup, observacoes,
    descontoTipo, descontoValor, fichaIds,
  } = req.body;

  if (!nomeCliente) { res.status(400).json({ error: "nomeCliente é obrigatório" }); return; }
  if (!fichaIds || !Array.isArray(fichaIds) || fichaIds.length === 0) {
    res.status(400).json({ error: "Selecione ao menos uma ficha" }); return;
  }

  const markupDivisor = Number(markup ?? 0.5);
  if (markupDivisor <= 0 || markupDivisor >= 1) {
    res.status(400).json({ error: "Markup deve ser entre 0 e 1 (ex: 0.5 = 50%)" }); return;
  }

  // Busca fichas selecionadas
  const fichas = await db.select().from(fichas_custo)
    .where(and(eq(fichas_custo.tenant_id, tenantId), inArray(fichas_custo.id, fichaIds)));

  if (fichas.length === 0) { res.status(404).json({ error: "Fichas não encontradas" }); return; }

  const numero = await gerarNumeroOrcamento(tenantId);

  const [orc] = await db.insert(orcamentos_custos).values({
    tenant_id: tenantId,
    numero,
    nome_cliente: nomeCliente,
    marca: marca ?? null,
    validade_dias: 7,
    prazo_entrega_texto: null,
    observacoes: observacoes ?? null,
    desconto_tipo: descontoTipo ?? "percentual",
    desconto_valor: String(descontoValor ?? 0),
    status: "pendente",
  }).returning();

  // Cria itens a partir das fichas
  const itensData = fichas.map((f: any) => {
    const custoTotal = (Number(f.modelagem) || 0) + (Number(f.piloto) || 0) + (Number(f.corte) || 0)
      + (Number(f.beneficiamento) || 0) + (Number(f.costura) || 0) + (Number(f.lavanderia) || 0)
      + (Number(f.acabamento) || 0) + (Number(f.passadoria) || 0)
      + (Number(f.tecido) || 0) + (Number(f.aviamento) || 0);
    const precoVenda = custoTotal / markupDivisor;
    return {
      tenant_id: tenantId,
      orcamento_id: orc.id,
      ficha_id: f.id,
      referencia: f.referencia,
      descricao: f.tipo,
      quantidade: "1",
      custo: String(Number(custoTotal.toFixed(2))),
      valor_unitario: String(Number(precoVenda.toFixed(2))),
      markup_divisor: String(markupDivisor),
      total: String(Number(precoVenda.toFixed(2))),
    };
  });

  const itens = await db.insert(itens_orcamento_custos).values(itensData).returning();

  res.status(201).json(mapOrcamentoParaFrontend(orc, itens));
});

// PATCH /custos/orcamentos/:id/cliente — atualizar nome/marca
router.patch("/custos/orcamentos/:id/cliente", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { nomeCliente, marca } = req.body;
  const [orc] = await db.update(orcamentos_custos)
    .set({ nome_cliente: nomeCliente, marca: marca ?? null, updated_at: new Date() })
    .where(and(eq(orcamentos_custos.id, req.params.id), inArray(orcamentos_custos.tenant_id, req.userTenantIds ?? [])))
    .returning();
  if (!orc) { res.status(404).json({ error: "Orçamento não encontrado" }); return; }
  const itens = await db.select().from(itens_orcamento_custos).where(eq(itens_orcamento_custos.orcamento_id, orc.id));
  res.json(mapOrcamentoParaFrontend(orc, itens));
});

// PATCH /custos/orcamentos/:id/validade — atualizar validade e prazo
router.patch("/custos/orcamentos/:id/validade", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { validadeDias, prazoEntregaTexto, dataEntregaPrevista } = req.body;
  const [orc] = await db.update(orcamentos_custos)
    .set({
      validade_dias: validadeDias,
      prazo_entrega_texto: prazoEntregaTexto ?? null,
      data_entrega_prevista: dataEntregaPrevista ? new Date(dataEntregaPrevista) : null,
      updated_at: new Date(),
    })
    .where(and(eq(orcamentos_custos.id, req.params.id), inArray(orcamentos_custos.tenant_id, req.userTenantIds ?? [])))
    .returning();
  if (!orc) { res.status(404).json({ error: "Orçamento não encontrado" }); return; }
  const itens = await db.select().from(itens_orcamento_custos).where(eq(itens_orcamento_custos.orcamento_id, orc.id));
  res.json(mapOrcamentoParaFrontend(orc, itens));
});

// PATCH /custos/orcamentos/:id/desconto — atualizar desconto e observações
router.patch("/custos/orcamentos/:id/desconto", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { descontoTipo, descontoValor, observacoes } = req.body;
  const update: Record<string, any> = { updated_at: new Date() };
  if (descontoTipo !== undefined) update.desconto_tipo = descontoTipo;
  if (descontoValor !== undefined) update.desconto_valor = String(descontoValor);
  if (observacoes !== undefined) update.observacoes = observacoes;
  const [orc] = await db.update(orcamentos_custos)
    .set(update)
    .where(and(eq(orcamentos_custos.id, req.params.id), inArray(orcamentos_custos.tenant_id, req.userTenantIds ?? [])))
    .returning();
  if (!orc) { res.status(404).json({ error: "Orçamento não encontrado" }); return; }
  const itens = await db.select().from(itens_orcamento_custos).where(eq(itens_orcamento_custos.orcamento_id, orc.id));
  res.json(mapOrcamentoParaFrontend(orc, itens));
});

// PATCH /custos/orcamentos/:id/pagamento — atualizar condições de pagamento
router.patch("/custos/orcamentos/:id/pagamento", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { percentualSinal, tipoSinal, percentualRetirada, tipoRetirada, percentualPrazo, tipoPrazo } = req.body;
  const [orc] = await db.update(orcamentos_custos)
    .set({
      percentual_sinal: String(percentualSinal ?? 0),
      tipo_sinal: tipoSinal ?? "percentual",
      percentual_retirada: String(percentualRetirada ?? 0),
      tipo_retirada: tipoRetirada ?? "percentual",
      percentual_prazo: String(percentualPrazo ?? 0),
      tipo_prazo: tipoPrazo ?? "percentual",
      updated_at: new Date(),
    })
    .where(and(eq(orcamentos_custos.id, req.params.id), inArray(orcamentos_custos.tenant_id, req.userTenantIds ?? [])))
    .returning();
  if (!orc) { res.status(404).json({ error: "Orçamento não encontrado" }); return; }
  const itens = await db.select().from(itens_orcamento_custos).where(eq(itens_orcamento_custos.orcamento_id, orc.id));
  res.json(mapOrcamentoParaFrontend(orc, itens));
});

// PATCH /custos/orcamentos/:id/status — atualizar status
router.patch("/custos/orcamentos/:id/status", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { status } = req.body;
  const validos = ["pendente", "aprovado", "reprovado"];
  if (!validos.includes(status)) { res.status(400).json({ error: "Status inválido" }); return; }
  // Ao reverter para pendente, limpa também o vínculo com Kanban
  const extraFields = status === "pendente"
    ? { enviado_para_kanban: false, pedido_id: null }
    : {};
  const result = await db.transaction(async (tx) => {
    const [orc] = await tx.update(orcamentos_custos)
      .set({ status, updated_at: new Date(), ...extraFields })
      .where(and(eq(orcamentos_custos.id, req.params.id), inArray(orcamentos_custos.tenant_id, req.userTenantIds ?? [])))
      .returning();
    if (!orc) return null;

    let itens = await tx.select().from(itens_orcamento_custos).where(eq(itens_orcamento_custos.orcamento_id, orc.id));
    if (status === "aprovado") {
      let clienteCentralId: string | null = null;
      const nomeCliente = orc.nome_cliente?.trim();
      if (nomeCliente) {
        const [existente] = await tx.select({ id: clientes.id }).from(clientes)
          .where(and(eq(clientes.tenant_id, orc.tenant_id), eq(clientes.nome, nomeCliente), eq(clientes.ativo, true))).limit(1);
        if (existente) clienteCentralId = existente.id;
        else {
          const [criado] = await tx.insert(clientes).values({
            tenant_id: orc.tenant_id, nome: nomeCliente,
          }).returning({ id: clientes.id });
          clienteCentralId = criado?.id ?? null;
        }
      }
      if (!clienteCentralId) throw new Error("Cliente central é obrigatório para aprovar o orçamento");

      for (const item of itens) {
        const ref = item.referencia?.trim() || item.descricao?.trim();
        if (!ref || item.is_aviamento || item.is_desenvolvimento) continue;
        let [produto] = await tx.select().from(plm_produtos)
          .where(and(
            eq(plm_produtos.tenant_id, orc.tenant_id),
            eq(plm_produtos.cliente_central_id, clienteCentralId),
            sql`LOWER(BTRIM(${plm_produtos.referencia})) = LOWER(BTRIM(${ref}))`,
          )).limit(1);
        if (!produto) {
          await assegurarFamiliaProduto(tx, orc.tenant_id, "OUTRO");
          const referenciaTecnica = await plmGerarReferenciaTecnica(tx, orc.tenant_id);
          [produto] = await tx.insert(plm_produtos).values({
            tenant_id: orc.tenant_id, codigo: referenciaTecnica, nome: item.descricao ?? ref,
            referencia: ref, referencia_cliente: referenciaTecnica, referencia_tecnica: referenciaTecnica,
            categoria: "OUTRO", cliente_central_id: clienteCentralId,
            status: "rascunho", observacoes: `Criado pelo orçamento ${orc.numero}`,
          }).returning();
        } else if (clienteCentralId && !produto.cliente_central_id) {
          [produto] = await tx.update(plm_produtos)
            .set({ cliente_central_id: clienteCentralId, updated_at: new Date() })
            .where(eq(plm_produtos.id, produto.id)).returning();
        }
        const referenciaTecnica = produto.referencia_tecnica
          || await plmGerarReferenciaTecnica(tx, orc.tenant_id);
        [produto] = await tx.update(plm_produtos)
          .set({
            codigo: referenciaTecnica,
            referencia: ref,
            referencia_cliente: referenciaTecnica,
            referencia_tecnica: referenciaTecnica,
            cliente_central_id: clienteCentralId,
            updated_at: new Date(),
          })
          .where(eq(plm_produtos.id, produto.id)).returning();
        if (!produto?.referencia_tecnica) throw new Error("Produto sem referência técnica");
        const referenciaTecnicaProduto = produto.referencia_tecnica;

        await tx.update(itens_orcamento_custos).set({
          plm_produto_id: produto.id,
          plm_ficha_tecnica_id: null,
          referencia_tecnica: referenciaTecnicaProduto,
          updated_at: new Date(),
        }).where(eq(itens_orcamento_custos.id, item.id));
        if (item.ficha_id) {
          await tx.update(fichas_custo).set({
            plm_produto_id: produto.id,
            plm_ficha_tecnica_id: null,
            referencia_tecnica: referenciaTecnicaProduto,
            origem: "comercial",
            updated_at: new Date(),
          }).where(and(eq(fichas_custo.id, item.ficha_id), eq(fichas_custo.tenant_id, orc.tenant_id)));
        }
      }
      itens = await tx.select().from(itens_orcamento_custos).where(eq(itens_orcamento_custos.orcamento_id, orc.id));
    }
    return { orc, itens };
  });
  if (!result) { res.status(404).json({ error: "Orçamento não encontrado" }); return; }
  res.json(mapOrcamentoParaFrontend(result.orc, result.itens));
});

// DELETE /custos/orcamentos/:id — soft delete
router.delete("/custos/orcamentos/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  await db.update(orcamentos_custos)
    .set({ ativo: false, updated_at: new Date() })
    .where(and(eq(orcamentos_custos.id, req.params.id), inArray(orcamentos_custos.tenant_id, req.userTenantIds ?? [])));
  res.status(204).send();
});

// POST /custos/orcamentos/:id/enviar-kanban — cria pedido no Kanban local
router.post("/custos/orcamentos/:id/enviar-kanban", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;

  let [orc] = await db
    .select()
    .from(orcamentos_custos)
    .where(and(eq(orcamentos_custos.id, req.params.id), inArray(orcamentos_custos.tenant_id, req.userTenantIds ?? [])))
    .limit(1);
  if (!orc) { res.status(404).json({ error: "Orçamento não encontrado" }); return; }
  if (orc.status !== "aprovado") { res.status(400).json({ error: "Somente orçamentos aprovados podem ser enviados para o Kanban" }); return; }

  const envio = await db.transaction(async tx => {
    const [orcBloqueado] = await tx.select().from(orcamentos_custos)
      .where(and(eq(orcamentos_custos.id, req.params.id), eq(orcamentos_custos.tenant_id, tenantId)))
      .for("update");
    if (!orcBloqueado) return { kind: "not_found" as const };
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${tenantId}:orcamento:${orcBloqueado.id}`}, 0))`);
    if (orcBloqueado.enviado_para_kanban) {
      return { kind: "already_sent" as const, pedidoId: orcBloqueado.pedido_id, numeroPedido: null };
    }
    if (orcBloqueado.status !== "aprovado") throw new Error("Somente orçamentos aprovados podem ser enviados para o Kanban");
    orc = orcBloqueado;

  const itens = await tx
    .select()
    .from(itens_orcamento_custos)
    .where(eq(itens_orcamento_custos.orcamento_id, orc.id));

  const mapped = mapOrcamentoParaFrontend(orc, itens);

  // Número do pedido = mesmo número do orçamento (PED-YY-NNN)
  const anoYY = new Date().getFullYear().toString().slice(-2);
  const orcPartes = (orc.numero ?? "").split("-");
  const orcSeq = parseInt(orcPartes[orcPartes.length - 1] ?? "1", 10);
  const numeroPedido = `PED-${anoYY}-${String(isNaN(orcSeq) ? 1 : orcSeq).padStart(3, "0")}`;

  // Busca parcelas personalizadas do orçamento
  const parcelasOrc = await tx.select().from(orcamento_parcelas)
    .where(eq(orcamento_parcelas.orcamento_id, orc.id))
    .orderBy(orcamento_parcelas.ordem);

  // Valor sinal = primeira parcela (ou valorSinal legado)
  const valorSinalParcela = parcelasOrc.length > 0
    ? (parcelasOrc[0].tipo === "valor"
        ? Number(parcelasOrc[0].valor)
        : (mapped.total * Number(parcelasOrc[0].valor)) / 100)
    : mapped.valorSinal;

  // Monta observações com parcelas
  const parcelasObs = parcelasOrc.length > 0
    ? `\nCondições de pagamento:\n${parcelasOrc.map((p, i) => {
        const v = p.tipo === "valor" ? Number(p.valor) : (mapped.total * Number(p.valor)) / 100;
        return `  ${i + 1}. ${p.titulo}: R$ ${v.toFixed(2)}`;
      }).join("\n")}`
    : "";

  // Cria o pedido
  const [pedido] = await tx.insert(pedidos).values({
    tenant_id: tenantId,
    numero_pedido: numeroPedido,
    nome_cliente: orc.nome_cliente,
    observacoes: `Importado do orçamento ${orc.numero}${parcelasObs}`,
    valor_total_cents: Math.round(mapped.total * 100),
    valor_sinal_cents: Math.round(valorSinalParcela * 100),
    acrescimo_tipo: "valor",
    desconto_tipo: orc.desconto_tipo ?? "valor",
    desconto_valor: orc.desconto_tipo === "valor"
      ? Math.round(Number(orc.desconto_valor ?? 0) * 100)   // centavos
      : Math.round(Number(orc.desconto_valor ?? 0)),          // percentual inteiro (7.09% → 7)
    status: "pendente",
    origem: "orcamento",
    orcamento_id: orc.id,
    orcamento_numero: orc.numero,
    prazo_entrega: orc.data_entrega_prevista ?? null,
    data_entrega_prevista: orc.data_entrega_prevista ?? null,
  }).returning();

  // Cria itens do pedido com valor_unitario bruto (sem desconto)
  // O desconto já está aplicado no valor_total_cents do pedido (via mapped.total)
  if (itens.length > 0) {
    let clienteCentralId = orc.cliente_id ?? null;
    if (clienteCentralId) {
      const [clienteValido] = await tx.select({ id: clientes.id }).from(clientes)
        .where(and(eq(clientes.id, clienteCentralId), eq(clientes.tenant_id, tenantId)))
        .limit(1);
      clienteCentralId = clienteValido?.id ?? null;
    }
    if (!clienteCentralId && orc.nome_cliente?.trim()) {
      const [clientePorNome] = await tx.select({ id: clientes.id }).from(clientes)
        .where(and(
          eq(clientes.tenant_id, tenantId),
          sql`LOWER(BTRIM(${clientes.nome})) = LOWER(BTRIM(${orc.nome_cliente.trim()}))`,
        ))
        .orderBy(sql`${clientes.ativo} DESC`, clientes.created_at)
        .limit(1);
      clienteCentralId = clientePorNome?.id ?? null;
    }

    const temItensProdutivos = itens.some(i => !i.is_aviamento && !i.is_desenvolvimento);
    const produtos = clienteCentralId && temItensProdutivos
      ? await tx.select({
          id: plm_produtos.id,
          referencia: plm_produtos.referencia,
          referenciaCliente: plm_produtos.referencia_cliente,
        }).from(plm_produtos).where(and(
          eq(plm_produtos.tenant_id, tenantId),
          eq(plm_produtos.cliente_central_id, clienteCentralId),
        ))
      : [];
    const produtoPorReferencia = new Map(produtos.map(produto => [
      (produto.referencia ?? "").trim().toLocaleLowerCase("pt-BR"),
      produto,
    ]));

    await tx.insert(itens_pedido).values(
      itens.map((i) => {
        const referenciaOriginal = i.referencia?.trim() || i.descricao.trim();
        const produto = produtoPorReferencia.get(referenciaOriginal.toLocaleLowerCase("pt-BR"));
        if (!i.is_aviamento && !i.is_desenvolvimento && !produto) {
          throw new Error(
            `Produto PLM não encontrado para a referência "${referenciaOriginal}" e o cliente do orçamento`,
          );
        }
        return {
          tenant_id: tenantId,
          pedido_id: pedido.id,
          referencia: referenciaOriginal,
          referencia_cliente: produto?.referenciaCliente ?? null,
          descricao: i.descricao,
          quantidade_total: Math.round(Number(i.quantidade)),
          valor_unitario: Math.round(Number(i.valor_unitario) * 100),
          cmp: i.custo ? Math.round(Number(i.custo) * 100) : 0,
          ficha_custo_id: i.ficha_id,
          plm_produto_id: produto?.id ?? null,
          plm_ficha_tecnica_id: null,
          is_aviamento: i.is_aviamento ?? false,
          is_desenvolvimento: i.is_desenvolvimento ?? false,
        };
      })
    );
  }

  // ── Auto-criar 1º sinal no pedido a partir do orçamento ──────────────────
  if (valorSinalParcela > 0) {
    const descSinal = parcelasOrc.length > 0
      ? parcelasOrc[0].titulo ?? "1º Sinal"
      : "Sinal (Orçamento)";
    await tx.insert(pedido_sinais).values({
      tenant_id: tenantId,
      pedido_id: pedido.id,
      descricao: descSinal,
      valor_cents: Math.round(valorSinalParcela * 100),
      data_recebido: null,
    });
  }

  // Marca o orçamento como enviado
  await tx.update(orcamentos_custos)
    .set({ enviado_para_kanban: true, pedido_id: pedido.id, updated_at: new Date() })
    .where(eq(orcamentos_custos.id, orc.id));

  // ── Gerar Conta a Receber automaticamente ─────────────────────────────────
  const valorTotal = mapped.total;
  if (valorTotal > 0) {
    await tx.insert(contas_a_receber).values({
      tenant_id: tenantId,
      descricao: `Pedido ${numeroPedido} — ${orc.nome_cliente}`,
      valor: String(valorTotal.toFixed(2)),
      data_vencimento: null,
      status: "pendente",
    });
  }

  return { kind: "created" as const, pedidoId: pedido.id, numeroPedido };
  });
  if (envio.kind === "not_found") { res.status(404).json({ error: "Orçamento não encontrado" }); return; }
  if (envio.kind === "already_sent") {
    res.status(200).json({ pedidoId: envio.pedidoId, numeroPedido: envio.numeroPedido });
    return;
  }
  res.status(201).json({ pedidoId: envio.pedidoId, numeroPedido: envio.numeroPedido });
});

// ─── PARCELAS DE ORÇAMENTO ────────────────────────────────────────────────────

// GET /custos/orcamentos/:id/parcelas
router.get("/custos/orcamentos/:id/parcelas", requireAuth, async (req: AuthenticatedRequest, res) => {
  const [orc] = await db.select({ id: orcamentos_custos.id }).from(orcamentos_custos)
    .where(and(eq(orcamentos_custos.id, req.params.id), inArray(orcamentos_custos.tenant_id, req.userTenantIds ?? [])))
    .limit(1);
  if (!orc) { res.status(404).json({ error: "Orçamento não encontrado" }); return; }
  const parcelas = await db.select().from(orcamento_parcelas)
    .where(eq(orcamento_parcelas.orcamento_id, req.params.id))
    .orderBy(orcamento_parcelas.ordem);
  res.json(parcelas);
});

// PUT /custos/orcamentos/:id/parcelas — substitui todas as parcelas
router.put("/custos/orcamentos/:id/parcelas", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const [orc] = await db.select({ id: orcamentos_custos.id }).from(orcamentos_custos)
    .where(and(eq(orcamentos_custos.id, req.params.id), inArray(orcamentos_custos.tenant_id, req.userTenantIds ?? [])))
    .limit(1);
  if (!orc) { res.status(404).json({ error: "Orçamento não encontrado" }); return; }

  const { parcelas } = req.body as { parcelas: Array<{ titulo: string; tipo: string; valor: number }> };
  if (!Array.isArray(parcelas)) { res.status(400).json({ error: "parcelas deve ser um array" }); return; }

  await db.delete(orcamento_parcelas).where(eq(orcamento_parcelas.orcamento_id, orc.id));

  let inserted: any[] = [];
  if (parcelas.length > 0) {
    inserted = await db.insert(orcamento_parcelas).values(
      parcelas.map((p, i) => ({
        tenant_id: tenantId,
        orcamento_id: orc.id,
        ordem: i,
        titulo: p.titulo,
        tipo: p.tipo ?? "percentual",
        valor: String(Number(p.valor ?? 0)),
      }))
    ).returning();
  }
  res.json(inserted);
});

// ─── ITENS DE ORÇAMENTO ───────────────────────────────────────────────────────

// POST /custos/orcamentos/:id/itens — adiciona item
router.post("/custos/orcamentos/:id/itens", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { referencia, descricao, quantidade, valorUnitario, fichaId, custo, markupDivisor, isAviamento, isDesenvolvimento } = req.body;
  if (!descricao || !valorUnitario) {
    res.status(400).json({ error: "descricao e valorUnitario são obrigatórios" }); return;
  }

  const [orc] = await db.select().from(orcamentos_custos)
    .where(and(eq(orcamentos_custos.id, req.params.id), inArray(orcamentos_custos.tenant_id, req.userTenantIds ?? [])))
    .limit(1);
  if (!orc) { res.status(404).json({ error: "Orçamento não encontrado" }); return; }

  const qtd = Number(quantidade ?? 1);
  const vUnit = Number(valorUnitario);
  const [fichaSelecionada] = fichaId
    ? await db.select().from(fichas_custo)
        .where(and(eq(fichas_custo.id, fichaId), eq(fichas_custo.tenant_id, orc.tenant_id)))
        .limit(1)
    : [];

  const [item] = await db.insert(itens_orcamento_custos).values({
    tenant_id: orc.tenant_id,
    orcamento_id: orc.id,
    ficha_id: fichaId ?? null,
    plm_produto_id: fichaSelecionada?.plm_produto_id ?? null,
    plm_ficha_tecnica_id: fichaSelecionada?.plm_ficha_tecnica_id ?? null,
    referencia_tecnica: fichaSelecionada?.referencia_tecnica ?? null,
    referencia: referencia ?? null,
    descricao,
    quantidade: String(qtd),
    custo: String(Number(custo ?? 0)),
    valor_unitario: String(vUnit),
    markup_divisor: String(Number(markupDivisor ?? 0.5)),
    total: String(qtd * vUnit),
    is_aviamento: Boolean(isAviamento ?? false),
    is_desenvolvimento: Boolean(isDesenvolvimento ?? false),
  }).returning();

  res.status(201).json({
    id: item.id,
    orcamentoId: item.orcamento_id,
    fichaId: item.ficha_id,
    referencia: item.referencia ?? "",
    descricao: item.descricao,
    quantidade: Number(item.quantidade),
    custo: Number(item.custo ?? 0),
    valorUnitario: Number(item.valor_unitario),
    markupDivisor: Number(item.markup_divisor ?? 0.5),
    total: Number(item.total),
    valorTotal: Number(item.total),
    isAviamento: item.is_aviamento ?? false,
    isDesenvolvimento: item.is_desenvolvimento ?? false,
  });
});

// PATCH /custos/itens/:id — editar item
router.patch("/custos/itens/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { referencia, descricao, quantidade, valorUnitario, markupDivisor, isAviamento, isDesenvolvimento } = req.body;
  const qtd = quantidade !== undefined ? Number(quantidade) : undefined;
  const vUnit = valorUnitario !== undefined ? Number(valorUnitario) : undefined;
  const update: Record<string, any> = { updated_at: new Date() };
  if (referencia !== undefined) update.referencia = referencia;
  if (descricao !== undefined) update.descricao = descricao;
  if (qtd !== undefined) update.quantidade = String(qtd);
  if (vUnit !== undefined) update.valor_unitario = String(vUnit);
  if (markupDivisor !== undefined) update.markup_divisor = String(Number(markupDivisor));
  if (qtd !== undefined && vUnit !== undefined) update.total = String(qtd * vUnit);
  if (isAviamento !== undefined) update.is_aviamento = Boolean(isAviamento);
  if (isDesenvolvimento !== undefined) update.is_desenvolvimento = Boolean(isDesenvolvimento);

  const [item] = await db.update(itens_orcamento_custos)
    .set(update)
    .where(and(eq(itens_orcamento_custos.id, req.params.id), inArray(itens_orcamento_custos.tenant_id, req.userTenantIds ?? [])))
    .returning();
  if (!item) { res.status(404).json({ error: "Item não encontrado" }); return; }
  res.json({
    id: item.id,
    orcamentoId: item.orcamento_id,
    referencia: item.referencia ?? "",
    descricao: item.descricao,
    quantidade: Number(item.quantidade),
    valorUnitario: Number(item.valor_unitario),
    total: Number(item.total),
    isAviamento: item.is_aviamento ?? false,
    isDesenvolvimento: item.is_desenvolvimento ?? false,
  });
});

// DELETE /custos/itens/:id — deletar item
router.delete("/custos/itens/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  await db.delete(itens_orcamento_custos)
    .where(and(eq(itens_orcamento_custos.id, req.params.id), inArray(itens_orcamento_custos.tenant_id, req.userTenantIds ?? [])));
  res.status(204).send();
});

// ─── CONFIGURAÇÕES DA EMPRESA ─────────────────────────────────────────────────

// GET /custos/configuracoes-empresa — busca configurações do tenant
router.get("/custos/configuracoes-empresa", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const [config] = await db.select().from(configuracoes_empresa)
    .where(eq(configuracoes_empresa.tenant_id, tenantId))
    .limit(1);
  res.json(config ?? { tenant_id: tenantId });
});

// PUT /custos/configuracoes-empresa — salva/atualiza configurações
router.put("/custos/configuracoes-empresa", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const { nome_empresa, logo_url, endereco, cidade_estado_cep, cnpj, pix, email, site, telefone } = req.body;

  const [existing] = await db.select({ id: configuracoes_empresa.id })
    .from(configuracoes_empresa)
    .where(eq(configuracoes_empresa.tenant_id, tenantId))
    .limit(1);

  if (existing) {
    const [updated] = await db.update(configuracoes_empresa)
      .set({ nome_empresa, logo_url, endereco, cidade_estado_cep, cnpj, pix, email, site, telefone, updated_at: new Date() })
      .where(eq(configuracoes_empresa.tenant_id, tenantId))
      .returning();
    res.json(updated);
  } else {
    const [created] = await db.insert(configuracoes_empresa)
      .values({ tenant_id: tenantId, nome_empresa, logo_url, endereco, cidade_estado_cep, cnpj, pix, email, site, telefone })
      .returning();
    res.json(created);
  }
});

// ─── TEMPLATES DE OBSERVAÇÕES ─────────────────────────────────────────────────

// GET /custos/observacoes-templates — lista templates do tenant
router.get("/custos/observacoes-templates", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const templates = await db.select().from(observacoes_templates)
    .where(eq(observacoes_templates.tenant_id, tenantId))
    .orderBy(observacoes_templates.created_at);
  res.json(templates);
});

// POST /custos/observacoes-templates — cria novo template
router.post("/custos/observacoes-templates", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const { titulo, texto } = req.body;
  if (!titulo || !texto) { res.status(400).json({ error: "titulo e texto são obrigatórios" }); return; }
  const [template] = await db.insert(observacoes_templates)
    .values({ tenant_id: tenantId, titulo, texto })
    .returning();
  res.status(201).json(template);
});

// DELETE /custos/observacoes-templates/:id — remove template
router.delete("/custos/observacoes-templates/:id", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  await db.delete(observacoes_templates)
    .where(and(eq(observacoes_templates.id, req.params.id), eq(observacoes_templates.tenant_id, tenantId)));
  res.status(204).send();
});

export default router;
