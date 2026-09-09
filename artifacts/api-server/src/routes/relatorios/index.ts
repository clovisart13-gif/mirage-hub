import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  pedidos, referencias, itens_pedido, movimentacoes,
  orcamentos_custos, itens_orcamento_custos, fichas_custo,
} from "@workspace/db";
import { eq, and, gte, lte, sql, desc, count } from "drizzle-orm";
import { requireAuth, requireTenantAccess, type AuthenticatedRequest } from "../../middlewares/auth";

const router: IRouter = Router();

// ─── GET /relatorios/resumo ────────────────────────────────────────────────
// KPIs gerais: pedidos, faturamento, orçamentos, conversão
router.get("/relatorios/resumo", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tid = req.tenantId!;
  try {
  const [pedidosAll, orcamentosAll, aviamentosRows] = await Promise.all([
    db.select({
      id: pedidos.id,
      status: pedidos.status,
      valor_total_cents: pedidos.valor_total_cents,
      created_at: pedidos.created_at,
    }).from(pedidos).where(eq(pedidos.tenant_id, tid)),

    db.select({
      id: orcamentos_custos.id,
      status: orcamentos_custos.status,
      enviado_para_kanban: orcamentos_custos.enviado_para_kanban,
      created_at: orcamentos_custos.created_at,
    }).from(orcamentos_custos).where(eq(orcamentos_custos.tenant_id, tid)),

    db.select({
      totalItens: count(),
      pecas: sql<number>`COALESCE(SUM(${itens_pedido.quantidade_total}), 0)`,
      valorCents: sql<number>`COALESCE(SUM(${itens_pedido.valor_unitario} * ${itens_pedido.quantidade_total}), 0)`,
    }).from(itens_pedido)
      .innerJoin(pedidos, eq(itens_pedido.pedido_id, pedidos.id))
      .where(and(
        eq(itens_pedido.tenant_id, tid),
        eq(itens_pedido.is_aviamento, true),
        sql`${pedidos.status} != 'cancelado'`,
      )),
  ]);

  const faturamentoBruto = pedidosAll
    .filter(p => p.status !== "cancelado")
    .reduce((s, p) => s + (p.valor_total_cents ?? 0), 0);

  const orcamentosAprovados = orcamentosAll.filter(o => o.status === "aprovado").length;
  const orcamentosEnviadosKanban = orcamentosAll.filter(o => o.enviado_para_kanban).length;
  const totalOrcamentos = orcamentosAll.length;
  const taxaConversao = totalOrcamentos > 0 ? Math.round((orcamentosAprovados / totalOrcamentos) * 100) : 0;

  const pedidosConcluidos = pedidosAll.filter(p => p.status === "concluido").length;
  const pedidosEmProducao = pedidosAll.filter(p => p.status === "em_producao").length;
  const pedidosPendentes = pedidosAll.filter(p => p.status === "pendente").length;

  const avi = aviamentosRows[0] ?? { totalItens: 0, pecas: 0, valorCents: 0 };

  res.json({
    totalPedidos: pedidosAll.length,
    pedidosConcluidos,
    pedidosEmProducao,
    pedidosPendentes,
    faturamentoBruto,
    totalOrcamentos,
    orcamentosAprovados,
    orcamentosEnviadosKanban,
    taxaConversao,
    aviamentos: {
      totalItens: Number(avi.totalItens),
      pecas: Number(avi.pecas),
      valorCents: Number(avi.valorCents),
    },
  });
  } catch (err: any) {
    req.log.error({ err: err.message, tenantId: tid, op: "relatorios.resumo" }, "Erro ao carregar resumo de relatórios");
    res.status(500).json({ error: "Erro ao carregar resumo" });
  }
});

// ─── GET /relatorios/faturamento-mensal ───────────────────────────────────
// Faturamento por mês (últimos 12 meses)
router.get("/relatorios/faturamento-mensal", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tid = req.tenantId!;

  const rows = await db.select({
    mes: sql<string>`TO_CHAR(${pedidos.created_at}, 'YYYY-MM')`,
    total_cents: sql<number>`SUM(${pedidos.valor_total_cents})`,
    qtd: sql<number>`COUNT(*)`,
  })
    .from(pedidos)
    .where(and(
      eq(pedidos.tenant_id, tid),
      sql`${pedidos.status} != 'cancelado'`,
      gte(pedidos.created_at, sql`NOW() - INTERVAL '12 months'`),
    ))
    .groupBy(sql`TO_CHAR(${pedidos.created_at}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${pedidos.created_at}, 'YYYY-MM')`);

  // Preenche meses sem dados com zero
  const meses: Record<string, { mes: string; totalCents: number; qtd: number; label: string }> = {};
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
    meses[key] = { mes: key, totalCents: 0, qtd: 0, label };
  }
  for (const r of rows) {
    if (meses[r.mes]) {
      meses[r.mes].totalCents = Number(r.total_cents);
      meses[r.mes].qtd = Number(r.qtd);
    }
  }

  res.json(Object.values(meses));
});

// ─── GET /relatorios/kanban-fases ─────────────────────────────────────────
// Distribuição de cartões por fase atual
router.get("/relatorios/kanban-fases", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tid = req.tenantId!;

  const rows = await db.select({
    fase: referencias.fase_atual,
    qtd: sql<number>`COUNT(*)`,
    total_pecas: sql<number>`SUM(${referencias.quantidade})`,
  })
    .from(referencias)
    .where(eq(referencias.tenant_id, tid))
    .groupBy(referencias.fase_atual);

  const LABEL: Record<string, string> = {
    inicio: "Início", espera: "Espera", modelagem: "Modelagem",
    tecido: "Tecido", risco: "Risco", corte: "Corte",
    beneficiamento: "Beneficiamento", costura: "Costura",
    lavanderia: "Lavanderia", acabamento: "Acabamento",
    passadoria: "Passadoria", expedicao: "Expedição",
    faturamento: "Faturamento", concluido: "Concluído",
  };

  const data = rows.map(r => ({
    fase: r.fase,
    label: LABEL[r.fase] ?? r.fase,
    qtd: Number(r.qtd),
    totalPecas: Number(r.total_pecas),
  }));

  res.json(data);
});

// ─── GET /relatorios/orcamentos-status ────────────────────────────────────
// Orçamentos por status com valor total
router.get("/relatorios/orcamentos-status", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tid = req.tenantId!;

  const itens = await db.select({
    orcamento_id: itens_orcamento_custos.orcamento_id,
    total: itens_orcamento_custos.total,
  }).from(itens_orcamento_custos).where(eq(itens_orcamento_custos.tenant_id, tid));

  const orcamentos = await db.select({
    id: orcamentos_custos.id,
    status: orcamentos_custos.status,
    nome_cliente: orcamentos_custos.nome_cliente,
    numero: orcamentos_custos.numero,
    enviado_para_kanban: orcamentos_custos.enviado_para_kanban,
    created_at: orcamentos_custos.created_at,
    desconto_valor: orcamentos_custos.desconto_valor,
    desconto_tipo: orcamentos_custos.desconto_tipo,
  }).from(orcamentos_custos).where(eq(orcamentos_custos.tenant_id, tid))
    .orderBy(desc(orcamentos_custos.created_at));

  // Calcular total por orçamento
  const totalPorOrcamento: Record<string, number> = {};
  for (const it of itens) {
    totalPorOrcamento[it.orcamento_id] = (totalPorOrcamento[it.orcamento_id] ?? 0) + Number(it.total ?? 0);
  }

  const contagem = { pendente: 0, aprovado: 0, reprovado: 0 };
  const valor = { pendente: 0, aprovado: 0, reprovado: 0 };
  for (const o of orcamentos) {
    const st = (o.status ?? "pendente") as keyof typeof contagem;
    const subtotal = totalPorOrcamento[o.id] ?? 0;
    let desconto = 0;
    if (o.desconto_tipo === "percentual") {
      desconto = subtotal * (Number(o.desconto_valor ?? 0) / 100);
    } else {
      desconto = Number(o.desconto_valor ?? 0);
    }
    const total = subtotal - desconto;
    if (st in contagem) {
      contagem[st]++;
      valor[st] += total;
    }
  }

  const meses: Record<string, { mes: string; label: string; pendente: number; aprovado: number; reprovado: number }> = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    meses[key] = { mes: key, label: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }), pendente: 0, aprovado: 0, reprovado: 0 };
  }
  for (const o of orcamentos) {
    const key = `${o.created_at.getFullYear()}-${String(o.created_at.getMonth() + 1).padStart(2, "0")}`;
    if (meses[key]) {
      const st = (o.status ?? "pendente") as "pendente" | "aprovado" | "reprovado";
      if (st in meses[key]) meses[key][st]++;
    }
  }

  res.json({
    contagem,
    valor,
    porMes: Object.values(meses),
    taxaConversao: (contagem.pendente + contagem.aprovado + contagem.reprovado) > 0
      ? Math.round((contagem.aprovado / (contagem.pendente + contagem.aprovado + contagem.reprovado)) * 100)
      : 0,
  });
});

// ─── GET /relatorios/margem-fichas ────────────────────────────────────────
// Top fichas: custo total vs. markup médio praticado
router.get("/relatorios/margem-fichas", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tid = req.tenantId!;

  const fichas = await db.select().from(fichas_custo)
    .where(and(eq(fichas_custo.tenant_id, tid), eq(fichas_custo.ativo, true)));

  const itens = await db.select({
    ficha_id: itens_orcamento_custos.ficha_id,
    valor_unitario: itens_orcamento_custos.valor_unitario,
    custo: itens_orcamento_custos.custo,
    markup_divisor: itens_orcamento_custos.markup_divisor,
    quantidade: itens_orcamento_custos.quantidade,
  }).from(itens_orcamento_custos).where(eq(itens_orcamento_custos.tenant_id, tid));

  // Agrupa por ficha_id
  const itensPorFicha: Record<string, { totalVenda: number; totalCusto: number; qtd: number }> = {};
  for (const it of itens) {
    if (!it.ficha_id) continue;
    if (!itensPorFicha[it.ficha_id]) itensPorFicha[it.ficha_id] = { totalVenda: 0, totalCusto: 0, qtd: 0 };
    const q = Number(it.quantidade ?? 1);
    itensPorFicha[it.ficha_id].totalVenda += Number(it.valor_unitario ?? 0) * q;
    itensPorFicha[it.ficha_id].totalCusto += Number(it.custo ?? 0) * q;
    itensPorFicha[it.ficha_id].qtd += q;
  }

  const data = fichas.map(f => {
    const custoMO = [f.modelagem, f.piloto, f.corte, f.beneficiamento, f.costura, f.lavanderia, f.acabamento, f.passadoria]
      .reduce((s, v) => s + Number(v ?? 0), 0);
    const custoMP = Number(f.tecido ?? 0) + Number(f.aviamento ?? 0);
    const custoTotal = custoMO + custoMP;

    const agg = itensPorFicha[f.id];
    const precoMedio = agg && agg.qtd > 0 ? agg.totalVenda / agg.qtd : 0;
    const margem = precoMedio > 0 ? Math.round(((precoMedio - custoTotal) / precoMedio) * 100) : null;

    return {
      id: f.id,
      referencia: f.referencia,
      tipo: f.tipo,
      custoMO,
      custoMP,
      custoTotal,
      precoMedio,
      margem,
      pecasVendidas: agg?.qtd ?? 0,
    };
  }).filter(f => f.custoTotal > 0)
    .sort((a, b) => (b.pecasVendidas - a.pecasVendidas) || (b.custoTotal - a.custoTotal))
    .slice(0, 20);

  res.json(data);
});

// ─── GET /relatorios/mix-producao ─────────────────────────────────────────
// Mix de produção: top referências por quantidade de peças no Kanban
router.get("/relatorios/mix-producao", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tid = req.tenantId!;

  const rows = await db.select({
    referencia: referencias.codigo,
    nome_cliente: referencias.nome_cliente,
    qtd_total: sql<number>`SUM(${referencias.quantidade})`,
    qtd_ops: sql<number>`COUNT(*)`,
  })
    .from(referencias)
    .where(eq(referencias.tenant_id, tid))
    .groupBy(referencias.codigo, referencias.nome_cliente)
    .orderBy(desc(sql`SUM(${referencias.quantidade})`))
    .limit(15);

  const total = rows.reduce((s, r) => s + Number(r.qtd_total), 0);

  res.json(rows.map(r => ({
    referencia: r.referencia,
    nomeCliente: r.nome_cliente,
    qtdTotal: Number(r.qtd_total),
    qtdOps: Number(r.qtd_ops),
    participacao: total > 0 ? Math.round((Number(r.qtd_total) / total) * 100) : 0,
  })));
});

// ─── GET /relatorios/pedidos-recentes ─────────────────────────────────────
router.get("/relatorios/pedidos-recentes", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tid = req.tenantId!;

  const rows = await db.select({
    id: pedidos.id,
    numero_pedido: pedidos.numero_pedido,
    nome_cliente: pedidos.nome_cliente,
    status: pedidos.status,
    valor_total_cents: pedidos.valor_total_cents,
    origem: pedidos.origem,
    prazo_entrega: pedidos.prazo_entrega,
    created_at: pedidos.created_at,
  }).from(pedidos)
    .where(eq(pedidos.tenant_id, tid))
    .orderBy(desc(pedidos.created_at))
    .limit(10);

  res.json(rows.map(r => ({
    id: r.id,
    numeroPedido: r.numero_pedido,
    nomeCliente: r.nome_cliente,
    status: r.status,
    valorTotal: r.valor_total_cents ?? 0,
    origem: r.origem,
    prazoEntrega: r.prazo_entrega,
    criadoEm: r.created_at,
  })));
});

// ─── GET /relatorios/por-cliente ──────────────────────────────────────────
// Relatório por Cliente: refs agrupadas por nome_cliente, com detecção de atraso
router.get("/relatorios/por-cliente", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tid = req.tenantId!;
  const rows = await db.execute(sql`
    SELECT
      r.id, r.numero_op, r.codigo AS referencia, r.descricao,
      r.nome_cliente, r.numero_pedido, r.fase_atual,
      r.quantidade, r.quantidade_cortada, r.fornecedor,
      r.valor_venda,
      r.data_prevista_entrega,
      r.data_termino_real
    FROM referencias r
    WHERE r.tenant_id = ${tid}
    ORDER BY r.nome_cliente, r.numero_pedido, r.codigo
  `);

  const now = new Date();
  type Card = {
    id: string; numeroOp: string | null; referencia: string; descricao: string | null;
    numeroPedido: string | null; faseAtual: string; quantidade: number;
    fornecedor: string | null; valorVenda: number | null;
    dataPrevista: string | null; dataTerminoReal: string | null;
    atrasado: boolean; concluido: boolean;
  };
  const clienteMap = new Map<string, { nomeCliente: string; atrasados: number; cards: Card[] }>();

  for (const r of rows.rows as any[]) {
    const nc = r.nome_cliente ?? "Sem cliente";
    if (!clienteMap.has(nc)) clienteMap.set(nc, { nomeCliente: nc, atrasados: 0, cards: [] });
    const g = clienteMap.get(nc)!;
    const concluido = r.fase_atual === "concluido";
    const atrasado = !concluido && r.data_prevista_entrega && new Date(r.data_prevista_entrega) < now;
    if (atrasado) g.atrasados++;
    g.cards.push({
      id: r.id, numeroOp: r.numero_op, referencia: r.referencia,
      descricao: r.descricao, numeroPedido: r.numero_pedido,
       faseAtual: r.fase_atual,
      quantidade: Number(r.quantidade ?? 0),
      fornecedor: r.fornecedor,
      valorVenda: r.valor_venda !== null ? Number(r.valor_venda) : null,
      dataPrevista: r.data_prevista_entrega,
      dataTerminoReal: r.data_termino_real,
      atrasado: !!atrasado, concluido,
    });
  }

  const clientes = Array.from(clienteMap.values()).sort((a, b) => a.nomeCliente.localeCompare(b.nomeCliente));
  res.json({ clientes });
});

// ─── GET /relatorios/historico ─────────────────────────────────────────────
// Histórico por pedido/cliente — retorna refs com movimentações agrupadas
router.get("/relatorios/historico", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tid = req.tenantId!;
  const { cliente, pedido } = req.query as { cliente?: string; pedido?: string };

  // Filtros dinâmicos
  const clienteFilter = cliente && cliente !== "todos" ? sql`AND r.nome_cliente = ${cliente}` : sql``;
  const pedidoFilter  = pedido  && pedido  !== "todos" ? sql`AND r.numero_pedido = ${pedido}`  : sql``;

  // 1) Metadados: clientes únicos e pedidos únicos (sem filtro de pedido para popular o dropdown de pedidos)
  const metaRows = await db.execute(sql`
    SELECT DISTINCT nome_cliente, numero_pedido
    FROM referencias
    WHERE tenant_id = ${tid} AND nome_cliente IS NOT NULL
    ORDER BY nome_cliente, numero_pedido
  `);
  const clientesUnicos: string[] = [];
  const pedidosPorCliente: Record<string, string[]> = {};
  for (const row of metaRows.rows as any[]) {
    if (!clientesUnicos.includes(row.nome_cliente)) clientesUnicos.push(row.nome_cliente);
    if (!pedidosPorCliente[row.nome_cliente]) pedidosPorCliente[row.nome_cliente] = [];
    if (row.numero_pedido && !pedidosPorCliente[row.nome_cliente].includes(row.numero_pedido))
      pedidosPorCliente[row.nome_cliente].push(row.numero_pedido);
  }

  // 2) Referências com movimentações (filtradas)
  const refRows = await db.execute(sql`
    SELECT
      r.id, r.codigo, r.descricao, r.nome_cliente, r.numero_pedido,
       r.fase_atual, r.quantidade, r.quantidade_cortada, r.cmp, r.cmo,
      r.data_entrada, r.data_prevista_entrega, r.data_termino_real,
      COALESCE(
        json_agg(
          json_build_object(
            'id',          m.id,
            'faseOrigem',  m.fase_origem,
            'faseDestino', m.fase_destino,
            'cmp',         m.cmp,
            'cmo',         m.cmo,
             'quantidade',  m.quantidade,
             'quantidadeConferida', m.quantidade_conferida,
            'perda',       m.perda_quantidade,
            'observacoes', m.observacoes,
            'createdAt',   m.created_at
          ) ORDER BY m.created_at
        ) FILTER (WHERE m.id IS NOT NULL),
        '[]'
      ) AS movimentacoes
    FROM referencias r
    LEFT JOIN movimentacoes m ON m.referencia_id = r.id AND m.tenant_id = r.tenant_id
    WHERE r.tenant_id = ${tid} ${clienteFilter} ${pedidoFilter}
    GROUP BY r.id, r.codigo, r.descricao, r.nome_cliente, r.numero_pedido,
              r.fase_atual, r.quantidade, r.quantidade_cortada, r.cmp, r.cmo,
             r.data_entrada, r.data_prevista_entrega, r.data_termino_real
    ORDER BY r.nome_cliente, r.numero_pedido, r.codigo
  `);

  const referencias = (refRows.rows as any[]).map(r => ({
    id: r.id,
    codigo: r.codigo,
    descricao: r.descricao,
    nomeCliente: r.nome_cliente,
    numeroPedido: r.numero_pedido,
    faseAtual: r.fase_atual,
    quantidade: Number(r.quantidade ?? 0),
    quantidadeCortada: Number(r.quantidade_cortada ?? 0),
    quantidadeOperacional: Number(r.quantidade ?? 0),
    cmp: Number(r.cmp ?? 0),
    cmo: Number(r.cmo ?? 0),
    dataEntrada: r.data_entrada,
    dataPrevista: r.data_prevista_entrega,
    dataTermino: r.data_termino_real,
    movimentacoes: (typeof r.movimentacoes === "string" ? JSON.parse(r.movimentacoes) : r.movimentacoes) ?? [],
  }));

  res.json({ clientesUnicos, pedidosPorCliente, referencias, total: referencias.length });
});

// ─── GET /relatorios/contas-receber ───────────────────────────────────────
// Contas a Receber: saldo, sinal, faturado por pedido (com statusFaturamento)
router.get("/relatorios/contas-receber", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tid = req.tenantId!;

  const pedRows = await db.execute(sql`
    SELECT
      p.id, p.numero_pedido, p.nome_cliente,
      p.status, p.valor_total_cents, p.valor_sinal_cents,
      p.status_faturamento, p.valor_faturado, p.data_faturamento,
      p.data_entrega_prevista, p.prazo_entrega,
      COUNT(ip.id)                           AS qtd_itens,
      COALESCE(SUM(ip.quantidade_total), 0)  AS qtd_prev,
       COALESCE(SUM(r.quantidade), 0)         AS qtd_real
    FROM pedidos p
    LEFT JOIN itens_pedido ip ON ip.pedido_id = p.id
    LEFT JOIN referencias  r  ON r.id = ip.referencia_id
    WHERE p.tenant_id = ${tid}
      AND p.status != 'cancelado'
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `);

  let totalValor = 0, totalSinal = 0, totalItens = 0, totalQtdPrev = 0, totalQtdReal = 0, totalFaturado = 0;

  const pedidosList = (pedRows.rows as any[]).map(p => {
    const valorTotal        = Number(p.valor_total_cents ?? 0);
    const sinal             = Number(p.valor_sinal_cents ?? 0);
    const saldoPrev         = valorTotal - sinal;
    const qtdPrev           = Number(p.qtd_prev ?? 0);
    const qtdReal           = Number(p.qtd_real ?? 0);
    const perdasQuantidade  = qtdReal - qtdPrev;
    const statusFaturamento = p.status_faturamento ?? "faturar";
    const valorFaturado     = Number(p.valor_faturado ?? 0);
    // Saldo Real = ajustado pela variação de quantidade
    const saldoReal         = qtdPrev > 0 && qtdReal !== qtdPrev
      ? Math.round(saldoPrev * (qtdReal / qtdPrev))
      : saldoPrev;
    const perdaFaturamento  = statusFaturamento === "faturado" ? valorFaturado - saldoReal : 0;

    totalValor     += valorTotal;
    totalSinal     += sinal;
    totalItens     += Number(p.qtd_itens ?? 0);
    totalQtdPrev   += qtdPrev;
    totalQtdReal   += qtdReal;
    totalFaturado  += statusFaturamento === "faturado" ? valorFaturado : 0;

    return {
      id: p.id,
      pedidoId: p.id,
      numeroPedido: p.numero_pedido,
      nomeCliente: p.nome_cliente,
      status: p.status,
      statusFaturamento,
      qtdItens: Number(p.qtd_itens ?? 0),
      estoquePrevisto: qtdPrev,
      estoqueReal: qtdReal,
      perdasQuantidade,
      qtdPrev, qtdReal,
      valorTotal, sinal,
      saldoPrev,
      saldoReal,
      valorFaturado,
      perdaFaturamento,
      dataFaturamento: p.data_faturamento,
      dataPrevista: p.data_entrega_prevista ?? p.prazo_entrega,
    };
  });

  const totalSaldoPrev  = totalValor - totalSinal;
  const totalSaldoReal  = pedidosList.reduce((s, p) => s + p.saldoReal, 0);
  const totalPerdasQtd  = totalQtdReal - totalQtdPrev;
  const totalPerdaFaturamento = pedidosList.reduce((s, p) => s + p.perdaFaturamento, 0);

  res.json({
    pedidos: pedidosList,
    totais: {
      totalItens, totalQtdPrev, totalQtdReal, totalPerdasQtd,
      totalValor, totalSinal, totalSaldoPrev, totalSaldoReal, totalFaturado,
      totalPerdaFaturamento,
    },
  });
});

// ─── POST /relatorios/contas-receber/faturar ──────────────────────────────
// Marcar pedido como faturado com valor informado
router.post("/relatorios/contas-receber/faturar", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tid = req.tenantId!;
  const { pedidoId, valorFaturado } = req.body;

  if (!pedidoId) return res.status(400).json({ error: "pedidoId obrigatório" });
  if (typeof valorFaturado !== "number" || valorFaturado < 0) return res.status(400).json({ error: "valorFaturado inválido" });

  const result = await db.execute(sql`
    UPDATE pedidos
    SET status_faturamento = 'faturado',
        valor_faturado     = ${valorFaturado},
        data_faturamento   = NOW(),
        updated_at         = NOW()
    WHERE id = ${pedidoId}
      AND tenant_id = ${tid}
    RETURNING id
  `);

  if ((result.rows as any[]).length === 0) return res.status(404).json({ error: "Pedido não encontrado" });
  res.json({ success: true });
});

// ─── POST /relatorios/contas-receber/desfaturar ───────────────────────────
// Reverter faturamento de um pedido
router.post("/relatorios/contas-receber/desfaturar", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tid = req.tenantId!;
  const { pedidoId } = req.body;

  if (!pedidoId) return res.status(400).json({ error: "pedidoId obrigatório" });

  const result = await db.execute(sql`
    UPDATE pedidos
    SET status_faturamento = 'faturar',
        valor_faturado     = 0,
        data_faturamento   = NULL,
        updated_at         = NOW()
    WHERE id = ${pedidoId}
      AND tenant_id = ${tid}
    RETURNING id
  `);

  if ((result.rows as any[]).length === 0) return res.status(404).json({ error: "Pedido não encontrado" });
  res.json({ success: true });
});

// ─── PUT /relatorios/contas-receber/valor-faturado ────────────────────────
// Atualizar apenas o valor faturado (pedido já está faturado)
router.put("/relatorios/contas-receber/valor-faturado", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tid = req.tenantId!;
  const { pedidoId, valorFaturado } = req.body;

  if (!pedidoId) return res.status(400).json({ error: "pedidoId obrigatório" });
  if (typeof valorFaturado !== "number" || valorFaturado < 0) return res.status(400).json({ error: "valorFaturado inválido" });

  const result = await db.execute(sql`
    UPDATE pedidos
    SET valor_faturado = ${valorFaturado},
        updated_at     = NOW()
    WHERE id = ${pedidoId}
      AND tenant_id = ${tid}
      AND status_faturamento = 'faturado'
    RETURNING id
  `);

  if ((result.rows as any[]).length === 0) return res.status(404).json({ error: "Pedido não encontrado ou não está faturado" });
  res.json({ success: true });
});

// ─── GET /relatorios/vendas-bi ────────────────────────────────────────────
// Relatório de Vendas BI: por referência (OP/cartão), com CMO Acumulado das movimentações
// Agrupa: Cliente → Pedido → Referência (layout igual ao Manus)
router.get("/relatorios/vendas-bi", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tid = req.tenantId!;

  const rows = await db.execute(sql`
    SELECT
      r.id,
      r.codigo,
      r.numero_op,
      r.nome_cliente,
      r.numero_pedido,
      r.quantidade,
      r.quantidade_cortada,
      r.fase_atual,
      r.cmp                                    AS cmp_total,
      MAX(ip.valor_unitario)                   AS valor_unit_pedido,
      COALESCE((
        SELECT SUM(m.cmo)
        FROM movimentacoes m
        WHERE m.referencia_id = r.id AND m.tenant_id = r.tenant_id
      ), 0)                                    AS cmo_acumulado
    FROM referencias r
    LEFT JOIN itens_pedido ip ON ip.referencia_id = r.id AND ip.tenant_id = r.tenant_id
    WHERE r.tenant_id = ${tid}
    GROUP BY r.id, r.codigo, r.numero_op, r.nome_cliente, r.numero_pedido, r.quantidade, r.quantidade_cortada, r.fase_atual, r.cmp
    ORDER BY r.nome_cliente, r.numero_pedido, r.codigo
  `);

  type RefRow = {
    id: string; codigo: string; cmpUnit: number; cmoUnit: number; cmoAcumulado: number;
    ctUnit: number; vendaUnit: number; ctTotal: number; vendaTotal: number;
    quantidade: number; margem: number; margemPct: number;
  };
  type PedidoGroup = {
    numeroPedido: string; qtdTotal: number; custoTotal: number;
    vendaTotal: number; margem: number; margemPct: number; refs: RefRow[];
  };
  type ClienteGroup = {
    nomeCliente: string; qtdTotal: number; custoTotal: number;
    vendaTotal: number; margem: number; margemPct: number; pedidos: PedidoGroup[];
  };

  const clienteMap = new Map<string, ClienteGroup>();

  for (const row of rows.rows as any[]) {
    const qtd = Number(row.quantidade ?? 0);
    const cmpTotal = Number(row.cmp_total ?? 0);
    const cmoAcumulado = Number(row.cmo_acumulado ?? 0);
    // r.cmp = CMP unitário (centavos/peça) — NÃO dividir por qtd
    const cmpUnit = cmpTotal;
    // SUM(m.cmo) = soma dos CMOs unitários de cada fase (centavos/peça) — NÃO dividir por qtd
    const cmoUnit = cmoAcumulado;
    const ctUnit = cmpUnit + cmoUnit;
    // valor_unit_pedido vem de itens_pedido.valor_unitario — já em centavos
    const vendaUnit = Number(row.valor_unit_pedido ?? 0); // centavos/peça
    const ctTotal = ctUnit * qtd;
    const vendaTotal = vendaUnit * qtd; // centavos total
    const margem = vendaTotal - ctTotal;
    const margemPct = vendaTotal > 0 ? (margem / vendaTotal) * 100 : 0;

    const refRow: RefRow = {
      id: row.id, codigo: row.codigo,
      quantidade: qtd, cmpUnit, cmoUnit, cmoAcumulado,
      ctUnit, vendaUnit, ctTotal, vendaTotal, margem,
      margemPct: Math.round(margemPct * 10) / 10,
    };

    const nomeCliente = row.nome_cliente ?? "Sem cliente";
    if (!clienteMap.has(nomeCliente)) {
      clienteMap.set(nomeCliente, { nomeCliente, qtdTotal: 0, custoTotal: 0, vendaTotal: 0, margem: 0, margemPct: 0, pedidos: [] });
    }
    const cliente = clienteMap.get(nomeCliente)!;

    const numPedido = row.numero_pedido ?? "Sem pedido";
    let pedidoGroup = cliente.pedidos.find(p => p.numeroPedido === numPedido);
    if (!pedidoGroup) {
      pedidoGroup = { numeroPedido: numPedido, qtdTotal: 0, custoTotal: 0, vendaTotal: 0, margem: 0, margemPct: 0, refs: [] };
      cliente.pedidos.push(pedidoGroup);
    }

    pedidoGroup.refs.push(refRow);
    pedidoGroup.qtdTotal += qtd;
    pedidoGroup.custoTotal += ctTotal;
    pedidoGroup.vendaTotal += vendaTotal;
    pedidoGroup.margem += margem;

    cliente.qtdTotal += qtd;
    cliente.custoTotal += ctTotal;
    cliente.vendaTotal += vendaTotal;
    cliente.margem += margem;
  }

  for (const c of clienteMap.values()) {
    c.margemPct = c.vendaTotal > 0 ? Math.round((c.margem / c.vendaTotal) * 1000) / 10 : 0;
    for (const p of c.pedidos) {
      p.margemPct = p.vendaTotal > 0 ? Math.round((p.margem / p.vendaTotal) * 1000) / 10 : 0;
    }
  }

  const clientes = Array.from(clienteMap.values()).sort((a, b) => b.vendaTotal - a.vendaTotal);
  const totalVendas = clientes.reduce((s, c) => s + c.vendaTotal, 0);
  const totalCusto  = clientes.reduce((s, c) => s + c.custoTotal, 0);
  const totalMargem = totalVendas - totalCusto;
  const margemPctGeral = totalVendas > 0 ? Math.round((totalMargem / totalVendas) * 1000) / 10 : 0;

  res.json({ clientes, totalVendas, totalCusto, totalMargem, margemPctGeral });
});

// ─── GET /relatorios/movimentacoes-horizontal ──────────────────────────────
// Layout horizontal: 1 linha por referência, CMO por fase como coluna
router.get("/relatorios/movimentacoes-horizontal", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tid = req.tenantId!;
  const { cliente } = req.query as { cliente?: string };

  const clienteFilter = cliente && cliente !== "todos"
    ? sql`AND r.nome_cliente = ${cliente}`
    : sql``;

  const rows = await db.execute(sql`
    SELECT
      r.id,
      r.codigo,
      r.nome_cliente,
      r.numero_pedido,
      r.cmp                                                                                   AS cmp_total,
      r.quantidade,
      r.quantidade_cortada,
      COALESCE(SUM(CASE WHEN m.fase_destino = 'tecido'          THEN m.cmo ELSE 0 END), 0)  AS tecido,
      COALESCE(SUM(CASE WHEN m.fase_destino = 'corte'           THEN m.cmo ELSE 0 END), 0)  AS corte,
      COALESCE(SUM(CASE WHEN m.fase_destino = 'beneficiamento'  THEN m.cmo ELSE 0 END), 0)  AS beneficiamento,
      COALESCE(SUM(CASE WHEN m.fase_destino = 'costura'         THEN m.cmo ELSE 0 END), 0)  AS costura,
      COALESCE(SUM(CASE WHEN m.fase_destino = 'lavanderia'      THEN m.cmo ELSE 0 END), 0)  AS lavanderia,
      COALESCE(SUM(CASE WHEN m.fase_destino = 'acabamento'      THEN m.cmo ELSE 0 END), 0)  AS acabamento,
      COALESCE(SUM(CASE WHEN m.fase_destino = 'passadoria'      THEN m.cmo ELSE 0 END), 0)  AS passadoria,
      COALESCE(SUM(m.cmo), 0)                                                                 AS cmo_acumulado,
      r.cmp + COALESCE(SUM(m.cmo), 0)                                                        AS custo_total
    FROM referencias r
    LEFT JOIN movimentacoes m ON m.referencia_id = r.id AND m.tenant_id = r.tenant_id
    WHERE r.tenant_id = ${tid} ${clienteFilter}
    GROUP BY r.id, r.codigo, r.nome_cliente, r.numero_pedido, r.cmp, r.quantidade, r.quantidade_cortada
    ORDER BY r.nome_cliente, r.numero_pedido, r.codigo
  `);

  const data = (rows.rows as any[]).map(r => ({
    id: r.id,
    codigo: r.codigo,
    nomeCliente: r.nome_cliente,
    numeroPedido: r.numero_pedido,
    cmp: Number(r.cmp_total ?? 0),
    quantidade: Number(r.quantidade ?? 0),
    quantidadeCortada: Number(r.quantidade_cortada ?? 0),
    tecido: Number(r.tecido ?? 0),
    corte: Number(r.corte ?? 0),
    beneficiamento: Number(r.beneficiamento ?? 0),
    costura: Number(r.costura ?? 0),
    lavanderia: Number(r.lavanderia ?? 0),
    acabamento: Number(r.acabamento ?? 0),
    passadoria: Number(r.passadoria ?? 0),
    cmoAcumulado: Number(r.cmo_acumulado ?? 0),
    custoTotal: Number(r.custo_total ?? 0),
  }));

  // Lista de clientes únicos para filtro
  const clientesUnicos = Array.from(new Set(data.map(d => d.nomeCliente).filter(Boolean))).sort();

  res.json({ data, clientesUnicos, total: data.length });
});

// PUT /relatorios/movimentacoes/cmo-fase — editar CMO de uma fase específica de uma referência
router.put("/relatorios/movimentacoes/cmo-fase", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tid = req.tenantId!;
  const { referenciaId, fase, cmo } = req.body;
  if (!referenciaId || !fase || typeof cmo !== "number") return res.status(400).json({ error: "referenciaId, fase e cmo são obrigatórios" });

  // Atualiza a movimentação mais recente para essa fase
  const upd = await db.execute(sql`
    UPDATE movimentacoes SET cmo = ${cmo}
    WHERE id = (
      SELECT id FROM movimentacoes
      WHERE referencia_id = ${referenciaId} AND tenant_id = ${tid} AND fase_destino = ${fase}
      ORDER BY created_at DESC LIMIT 1
    )
    RETURNING id
  `);

  if ((upd.rows as any[]).length === 0) return res.status(404).json({ error: "Movimentação não encontrada para essa fase" });

  // Recalcula CMO total da referência
  await db.execute(sql`
    UPDATE referencias SET cmo = (
      SELECT COALESCE(SUM(cmo), 0) FROM movimentacoes WHERE referencia_id = ${referenciaId} AND tenant_id = ${tid}
    ) WHERE id = ${referenciaId} AND tenant_id = ${tid}
  `);

  res.json({ success: true });
});

// ─── GET /relatorios/pcp ──────────────────────────────────────────────────
// PCP — onde está cada cartão no Kanban, com detalhes da fase e OP
router.get("/relatorios/pcp", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tid = req.tenantId!;

  const FASES_ORDEM = [
    "inicio","espera","modelagem","tecido","risco","corte",
    "beneficiamento","costura","lavanderia","acabamento",
    "passadoria","expedicao","faturamento","concluido",
  ];
  const FASE_LABEL: Record<string, string> = {
    inicio:"Início", espera:"Espera", modelagem:"Modelagem", tecido:"Tecido",
    risco:"Risco", corte:"Corte", beneficiamento:"Beneficiamento", costura:"Costura",
    lavanderia:"Lavanderia", acabamento:"Acabamento", passadoria:"Passadoria",
    expedicao:"Expedição", faturamento:"Faturamento", concluido:"Concluído",
  };

  const cards = await db.execute(sql`
    SELECT
      r.id, r.numero_op, r.codigo AS referencia, r.descricao,
      r.nome_cliente, r.numero_pedido, r.fase_atual,
       r.quantidade, r.quantidade_inicial, r.quantidade_cortada,
      r.cmp, r.cmo,
      r.data_entrada, r.data_prevista_entrega,
      r.fornecedor
    FROM referencias r
    WHERE r.tenant_id = ${tid}
      AND r.fase_atual != 'concluido'
    ORDER BY
      ARRAY_POSITION(ARRAY['inicio','espera','modelagem','tecido','risco','corte',
        'beneficiamento','costura','lavanderia','acabamento','passadoria',
        'expedicao','faturamento']::text[], r.fase_atual),
      r.data_entrada ASC
  `);

  // Agrupa por fase
  const porFase: Record<string, any[]> = {};
  for (const fase of FASES_ORDEM.filter(f => f !== "concluido")) {
    porFase[fase] = [];
  }

  for (const r of cards.rows as any[]) {
    const fase = r.fase_atual ?? "inicio";
    if (!porFase[fase]) porFase[fase] = [];
    porFase[fase].push({
      id: r.id,
      numeroOp: r.numero_op,
      referencia: r.referencia,
      descricao: r.descricao,
      nomeCliente: r.nome_cliente,
      numeroPedido: r.numero_pedido,
      fase: fase,
      faseLabel: FASE_LABEL[fase] ?? fase,
      quantidade: Number(r.quantidade ?? 0),
      quantidadeInicial: Number(r.quantidade_inicial),
       quantidadeCortada: Number(r.quantidade_cortada ?? 0),
      cmp: Number(r.cmp ?? 0),
      cmo: Number(r.cmo ?? 0),
      dataEntrada: r.data_entrada,
      dataPrevista: r.data_prevista_entrega,
      fornecedor: r.fornecedor,
    });
  }

  const fases = FASES_ORDEM
    .filter(f => f !== "concluido")
    .map(fase => ({
      fase,
      label: FASE_LABEL[fase],
      cards: porFase[fase] ?? [],
      totalPecas: (porFase[fase] ?? []).reduce((s: number, c: any) => s + c.quantidade, 0),
    }))
    .filter(f => f.cards.length > 0);

  const totalCards = cards.rows.length;
  const totalPecas = Object.values(porFase).flat().reduce((s: number, r: any) => s + Number(r.quantidade ?? 0), 0);

  res.json({ fases, totalCards, totalPecas });
});

export default router;
