/**
 * FINANCEIRO MIRAGE — API Routes
 *
 * GET  /api/financeiro/dashboard
 * GET/POST/PUT/DELETE /api/financeiro/contas
 * GET/POST/PUT/DELETE /api/financeiro/transacoes
 * POST /api/financeiro/transacoes/batch
 * POST /api/financeiro/transacoes/aplicar-regras
 * GET/POST/DELETE /api/financeiro/categorias
 * PUT /api/financeiro/categorias/:id
 * GET/POST/DELETE /api/financeiro/naturezas
 * GET/POST/DELETE /api/financeiro/centros-custo
 * GET/POST/DELETE /api/financeiro/regras
 * GET/POST /api/financeiro/historico-importacoes
 * GET/POST /api/financeiro/metas-mensais
 * POST /api/financeiro/parse-ofx
 */

import { Router } from "express";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import {
  db,
  finContas, finCategorias, finNaturezas, finCentrosCusto,
  finTransacoes, finRegrasClassificacao, finHistoricoImportacoes, finMetasMensais,
} from "@workspace/db";
import { requireAuth, requireTenantAccess, type AuthenticatedRequest } from "../../middlewares/auth";
import { z } from "zod";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const auth = [requireAuth, requireTenantAccess];

// ── Defaults de seed por tenant ───────────────────────────────────────────────

const NATUREZAS_PADRAO = [
  "Custo Direto","Custo Indireto","Despesa Direta","Despesa Indireta",
  "Impostos","Juros","Custo Fixo","Receita Operacional","Receita Financeira",
  "Outras Receitas","Transferência","Movimentação Financeira",
];

const CENTROS_CUSTO_PADRAO = [
  "Produção","Logística","Marketing","Administrativo","Comercial","Financeiro",
];

const CATEGORIAS_PADRAO = [
  { id:"combustivel",        nome:"Combustível",                naturezaPadrao:"Despesa Direta",        centroCustoPadrao:"Logística",      grupoGerencial:"Despesa Variável" },
  { id:"tecidos",            nome:"Tecidos",                    naturezaPadrao:"Custo Direto",          centroCustoPadrao:"Produção",        grupoGerencial:"Custo Direto (CMV)" },
  { id:"aviamentos",         nome:"Aviamentos",                 naturezaPadrao:"Custo Direto",          centroCustoPadrao:"Produção",        grupoGerencial:"Custo Direto (CMV)" },
  { id:"energia",            nome:"Energia",                    naturezaPadrao:"Custo Indireto",        centroCustoPadrao:"Produção",        grupoGerencial:"Despesa Fixa" },
  { id:"aluguel",            nome:"Aluguel",                    naturezaPadrao:"Custo Fixo",            centroCustoPadrao:"Administrativo", grupoGerencial:"Despesa Fixa" },
  { id:"trafego_pago",       nome:"Tráfego Pago",               naturezaPadrao:"Despesa Direta",        centroCustoPadrao:"Marketing",       grupoGerencial:"Despesa Variável" },
  { id:"mao_de_obra",        nome:"Mão de Obra",                naturezaPadrao:"Custo Direto",          centroCustoPadrao:"Produção",        grupoGerencial:"Custo Direto (CMV)" },
  { id:"manutencao",         nome:"Manutenção",                 naturezaPadrao:"Custo Indireto",        centroCustoPadrao:"Produção",        grupoGerencial:"Despesa Fixa" },
  { id:"frete",              nome:"Frete",                      naturezaPadrao:"Despesa Direta",        centroCustoPadrao:"Logística",      grupoGerencial:"Despesa Variável" },
  { id:"servicos_terceiros", nome:"Serviços Terceiros",         naturezaPadrao:"Despesa Indireta",      centroCustoPadrao:"Administrativo", grupoGerencial:"Despesa Fixa" },
  { id:"impostos_venda",     nome:"Impostos sobre Venda",       naturezaPadrao:"Impostos",              centroCustoPadrao:"Financeiro",      grupoGerencial:"Impostos" },
  { id:"comissoes",          nome:"Comissões",                  naturezaPadrao:"Despesa Direta",        centroCustoPadrao:"Comercial",       grupoGerencial:"Despesa Variável" },
  { id:"taxas_cartao",       nome:"Taxas de Cartão",            naturezaPadrao:"Despesa Direta",        centroCustoPadrao:"Financeiro",      grupoGerencial:"Despesa Variável" },
  { id:"venda_produtos",     nome:"Venda de Produtos",          naturezaPadrao:"Receita Operacional",   centroCustoPadrao:"Comercial",       grupoGerencial:"Receita" },
  { id:"servicos_prestados", nome:"Serviços Prestados",         naturezaPadrao:"Receita Operacional",   centroCustoPadrao:"Comercial",       grupoGerencial:"Receita" },
  { id:"rendimentos",        nome:"Rendimentos",                naturezaPadrao:"Receita Financeira",    centroCustoPadrao:"Financeiro",      grupoGerencial:"Receita" },
  { id:"outras_receitas",    nome:"Outras Receitas",            naturezaPadrao:"Outras Receitas",       centroCustoPadrao:"Financeiro",      grupoGerencial:"Receita" },
  { id:"pagamento_fatura",   nome:"Pagamento de Fatura",        naturezaPadrao:"Movimentação Financeira", centroCustoPadrao:"Financeiro",   grupoGerencial:"Não Operacional" },
  { id:"transferencia",      nome:"Transferência entre Contas", naturezaPadrao:"Movimentação Financeira", centroCustoPadrao:"Financeiro",   grupoGerencial:"Não Operacional" },
];

async function seedTenantDefaults(tenantId: string) {
  const [nat] = await db.select({ c: sql<number>`count(*)::int` })
    .from(finNaturezas).where(eq(finNaturezas.tenantId, tenantId));
  if ((nat?.c ?? 0) === 0) {
    await db.insert(finNaturezas).values(NATUREZAS_PADRAO.map(n => ({ tenantId, nome: n })));
  }
  const [cc] = await db.select({ c: sql<number>`count(*)::int` })
    .from(finCentrosCusto).where(eq(finCentrosCusto.tenantId, tenantId));
  if ((cc?.c ?? 0) === 0) {
    await db.insert(finCentrosCusto).values(CENTROS_CUSTO_PADRAO.map(n => ({ tenantId, nome: n })));
  }
  const [cat] = await db.select({ c: sql<number>`count(*)::int` })
    .from(finCategorias).where(eq(finCategorias.tenantId, tenantId));
  if ((cat?.c ?? 0) === 0) {
    await db.insert(finCategorias).values(CATEGORIAS_PADRAO.map(c => ({ ...c, tenantId })));
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function numStr(v: unknown): string {
  return String(v ?? "0");
}

// ── GET /api/financeiro/dashboard ─────────────────────────────────────────────
router.get("/financeiro/dashboard", ...auth, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  await seedTenantDefaults(tenantId);

  const hoje = new Date();
  const mesAtual = `${String(hoje.getMonth() + 1).padStart(2, "0")}/${hoje.getFullYear()}`;
  const mesAnterior = (() => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  })();

  // Filtro de mês via query param (MM/YYYY)
  const mesFiltro = (req.query.mes as string) || mesAtual;

  const transacoes = await db.select().from(finTransacoes)
    .where(eq(finTransacoes.tenantId, tenantId));
  const contas = await db.select().from(finContas)
    .where(and(eq(finContas.tenantId, tenantId), eq(finContas.ativo, true)));

  const isTransfer = (t: typeof transacoes[0]) =>
    t.natureza === "Movimentação Financeira" || t.natureza === "Transferência";

  // Apenas transações VALIDADAS entram em P&L e saldo
  const validadas = transacoes.filter(t => t.status === "validado");

  const calcPeriodo = (mesAno: string) => {
    const txs = validadas.filter(t => {
      const [, m, a] = t.data.split("/");
      return `${m}/${a}` === mesAno && !isTransfer(t);
    });
    const receita = txs.filter(t => t.tipo === "CREDITO").reduce((s, t) => s + parseFloat(numStr(t.valor)), 0);
    const despesa = txs.filter(t => t.tipo === "DEBITO").reduce((s, t) => s + parseFloat(numStr(t.valor)), 0);
    const margemLiquida = receita > 0 ? ((receita - despesa) / receita) * 100 : 0;
    return { receita, despesa, resultado: receita - despesa, margemLiquida };
  };

  const atual    = calcPeriodo(mesFiltro);
  const anterior = calcPeriodo(mesAnterior);

  // Saldo bancário: calculado apenas sobre transações VALIDADAS
  const saldosBancarios = contas.map(c => {
    const saldoInicial = parseFloat(numStr(c.saldoInicial));
    const movimentos = validadas
      .filter(t => t.contaId === c.id)
      .reduce((s, t) => t.tipo === "CREDITO" ? s + parseFloat(numStr(t.valor)) : s - parseFloat(numStr(t.valor)), 0);
    return {
      id: c.id, nome: c.nome, banco: c.banco, tipo: c.tipo,
      limite: c.limite ? parseFloat(numStr(c.limite)) : null,
      diaVencimento: c.diaVencimento,
      saldoAtual: saldoInicial + movimentos,
    };
  });

  const saldoConsolidado = saldosBancarios
    .filter(c => c.tipo !== "Cartão de Crédito")
    .reduce((s, c) => s + c.saldoAtual, 0);

  // Ranking de gastos (DEBITO, sem Transferência, mês filtrado, VALIDADO)
  const txMes = validadas.filter(t => {
    const [, m, a] = t.data.split("/");
    return `${m}/${a}` === mesFiltro && !isTransfer(t) && t.tipo === "DEBITO";
  });
  const gastoPorCategoria: Record<string, number> = {};
  for (const t of txMes) {
    const cat = t.categoriaId || "sem_categoria";
    gastoPorCategoria[cat] = (gastoPorCategoria[cat] || 0) + parseFloat(numStr(t.valor));
  }
  const rankingGastos = Object.entries(gastoPorCategoria)
    .map(([categoria, valor]) => ({ categoria, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10);

  // Gastos por Natureza (mês filtrado, DEBITO sem transferência, VALIDADO)
  const gastoPorNatureza: Record<string, number> = {};
  for (const t of txMes) {
    const nat = t.natureza || "Sem Natureza";
    gastoPorNatureza[nat] = (gastoPorNatureza[nat] || 0) + parseFloat(numStr(t.valor));
  }
  const gastosPorNatureza = Object.entries(gastoPorNatureza)
    .map(([natureza, valor]) => ({ natureza, valor }))
    .sort((a, b) => b.valor - a.valor);

  const pendentes          = transacoes.filter(t => t.status === "pendente").length;
  const aguardandoValidacao = transacoes.filter(t => t.status === "classificado").length;

  res.json({
    mes: mesFiltro,
    atual, anterior,
    saldosBancarios, saldoConsolidado,
    rankingGastos, gastosPorNatureza,
    pendentes, aguardandoValidacao, totalTransacoes: transacoes.length,
  });
});

// ── GET /api/financeiro/analises ──────────────────────────────────────────────
router.get("/financeiro/analises", ...auth, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const transacoes = await db.select().from(finTransacoes)
    .where(eq(finTransacoes.tenantId, tenantId));

  const isTransfer = (t: typeof transacoes[0]) =>
    t.natureza === "Movimentação Financeira" || t.natureza === "Transferência";

  // Apenas validadas entram em relatórios
  const validadas = transacoes.filter(t => t.status === "validado");

  // Evolução dos últimos 12 meses (VALIDADO)
  const hoje = new Date();
  const evolucaoMensal: { mes: string; receita: number; despesa: number; resultado: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const mesAno = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    const txs = validadas.filter(t => {
      const [, m, a] = t.data.split("/");
      return `${m}/${a}` === mesAno && !isTransfer(t);
    });
    const receita = txs.filter(t => t.tipo === "CREDITO").reduce((s, t) => s + parseFloat(numStr(t.valor)), 0);
    const despesa = txs.filter(t => t.tipo === "DEBITO").reduce((s, t) => s + parseFloat(numStr(t.valor)), 0);
    const label = d.toLocaleString("pt-BR", { month: "short" });
    evolucaoMensal.push({ mes: label, receita, despesa, resultado: receita - despesa });
  }

  // Top categorias (DEBITO, all time, sem transferência, VALIDADO)
  const debitos = validadas.filter(t => t.tipo === "DEBITO" && !isTransfer(t));
  const porCategoria: Record<string, number> = {};
  for (const t of debitos) {
    const cat = t.categoriaId || "sem_categoria";
    porCategoria[cat] = (porCategoria[cat] || 0) + parseFloat(numStr(t.valor));
  }
  const topCategorias = Object.entries(porCategoria)
    .map(([categoria, valor]) => ({ categoria, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 15);

  // Gastos por centro de custo (all time, DEBITO, sem transferência, VALIDADO)
  const porCentro: Record<string, number> = {};
  for (const t of debitos) {
    const cc = t.centroCusto || "Sem Centro";
    porCentro[cc] = (porCentro[cc] || 0) + parseFloat(numStr(t.valor));
  }
  const gastoPorCentro = Object.entries(porCentro)
    .map(([centro, valor]) => ({ centro, valor }))
    .sort((a, b) => b.valor - a.valor);

  // Receita por categoria (CREDITO, sem transferência, VALIDADO)
  const creditos = validadas.filter(t => t.tipo === "CREDITO" && !isTransfer(t));
  const porCatReceita: Record<string, number> = {};
  for (const t of creditos) {
    const cat = t.categoriaId || "sem_categoria";
    porCatReceita[cat] = (porCatReceita[cat] || 0) + parseFloat(numStr(t.valor));
  }
  const receitaPorCategoria = Object.entries(porCatReceita)
    .map(([categoria, valor]) => ({ categoria, valor }))
    .sort((a, b) => b.valor - a.valor);

  res.json({ evolucaoMensal, topCategorias, gastoPorCentro, receitaPorCategoria });
});

// ── GET /api/financeiro/evolucao-mensal ────────────────────────────────────────
// Query params: meses=3|6|12, natureza, centroCusto, categoriaId
router.get("/financeiro/evolucao-mensal", ...auth, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const mesesQty = Math.min(Math.max(parseInt(String(req.query.meses ?? "12")), 1), 24);
  const filNatureza  = req.query.natureza   as string | undefined;
  const filCentro    = req.query.centroCusto as string | undefined;
  const filCategoria = req.query.categoriaId as string | undefined;

  const [transacoes, categorias] = await Promise.all([
    db.select().from(finTransacoes).where(eq(finTransacoes.tenantId, tenantId)),
    db.select().from(finCategorias).where(eq(finCategorias.tenantId, tenantId)),
  ]);

  const isTransfer = (t: typeof transacoes[0]) =>
    t.natureza === "Movimentação Financeira" || t.natureza === "Transferência";

  // Build ordered month keys MM/YYYY oldest → newest
  const hoje = new Date();
  const colunas: string[] = [];
  for (let i = mesesQty - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    colunas.push(`${mm}/${d.getFullYear()}`);
  }
  const colSet = new Set(colunas);

  // Apply filters — apenas VALIDADAS entram nos relatórios
  let txs = transacoes.filter(t => t.status === "validado" && !isTransfer(t));
  if (filNatureza)  txs = txs.filter(t => t.natureza   === filNatureza);
  if (filCentro)    txs = txs.filter(t => t.centroCusto === filCentro);
  if (filCategoria) txs = txs.filter(t => t.categoriaId === filCategoria);

  // Accumulate: catId → mesKey → signed total (positive=receita, negative=despesa)
  const mapa: Record<string, Record<string, number>> = {};
  for (const t of txs) {
    const [, m, a] = t.data.split("/");
    const chave = `${m}/${a}`;
    if (!colSet.has(chave)) continue;
    const catId = t.categoriaId || "__sem__";
    if (!mapa[catId]) mapa[catId] = {};
    const val = parseFloat(numStr(t.valor));
    mapa[catId][chave] = (mapa[catId][chave] || 0) + (t.tipo === "CREDITO" ? val : -val);
  }

  const catNomeMap: Record<string, string> = {};
  for (const c of categorias) catNomeMap[c.id] = c.nome;

  const linhas = Object.entries(mapa)
    .map(([catId, totais]) => ({
      categoriaId: catId,
      categoria: catId === "__sem__" ? "Sem Categoria" : (catNomeMap[catId] || catId),
      totais,
    }))
    .sort((a, b) => {
      const s = (o: Record<string, number>) => Object.values(o).reduce((acc, v) => acc + Math.abs(v), 0);
      return s(b.totais) - s(a.totais);
    });

  res.json({ colunas, linhas });
});

// ── GET /api/financeiro/markup ────────────────────────────────────────────────
router.get("/financeiro/markup", ...auth, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const hoje = new Date();
  const mesAtual = `${String(hoje.getMonth() + 1).padStart(2, "0")}/${hoje.getFullYear()}`;
  const mesFiltro = (req.query.mes as string) || mesAtual;
  const modo = (req.query.modo as string) || "caixa"; // caixa | competencia

  const transacoes = await db.select().from(finTransacoes)
    .where(eq(finTransacoes.tenantId, tenantId));
  const metas = await db.select().from(finMetasMensais)
    .where(and(eq(finMetasMensais.tenantId, tenantId), eq(finMetasMensais.mes, mesFiltro.substring(3) + "-" + mesFiltro.substring(0, 2))));
  const meta = metas[0] || null;

  const txsMes = transacoes.filter(t => {
    const [, m, a] = t.data.split("/");
    const nat = t.natureza || "";
    return `${m}/${a}` === mesFiltro
      && nat !== "Movimentação Financeira"
      && nat !== "Transferência";
  });

  const sum = (ts: typeof txsMes) => ts.reduce((s, t) => s + parseFloat(numStr(t.valor)), 0);

  const faturamentoBruto = sum(txsMes.filter(t => t.tipo === "CREDITO"));
  const impostos = sum(txsMes.filter(t => t.tipo === "DEBITO" && t.natureza === "Impostos"));
  const despesasVariaveis = sum(txsMes.filter(t =>
    t.tipo === "DEBITO" && (t.natureza === "Despesa Direta" || t.natureza === "Despesa Indireta")
  ));
  const custoDireto = sum(txsMes.filter(t => t.tipo === "DEBITO" && t.natureza === "Custo Direto"));
  const margemContribuicao = faturamentoBruto - impostos - despesasVariaveis - custoDireto;
  const despesasFixas = sum(txsMes.filter(t =>
    t.tipo === "DEBITO" && (t.natureza === "Custo Fixo" || t.natureza === "Custo Indireto")
  ));
  const lucroOperacional = margemContribuicao - despesasFixas;
  const markupRealizado = custoDireto > 0 ? faturamentoBruto / custoDireto : 0;
  const margemPct = faturamentoBruto > 0 ? (margemContribuicao / faturamentoBruto) * 100 : 0;

  const pct = (v: number) => faturamentoBruto > 0 ? (v / faturamentoBruto) * 100 : 0;

  res.json({
    mes: mesFiltro,
    modo,
    faturamentoBruto,
    impostos,
    despesasVariaveis,
    custoDireto,
    margemContribuicao,
    margemContribuicaoPct: margemPct,
    despesasFixas,
    lucroOperacional,
    lucroOperacionalPct: pct(lucroOperacional),
    markupRealizado,
    metaFaturamento: meta ? parseFloat(numStr(meta.faturamentoPrevisto)) : null,
    metaCustoFixo: meta ? parseFloat(numStr(meta.custoFixoPrevisto)) : null,
    estrutura: [
      { label: "Faturamento Bruto",                  valor: faturamentoBruto,    pct: 100,             tipo: "receita"  },
      { label: "(-) Impostos",                       valor: impostos,            pct: pct(impostos),   tipo: "variavel" },
      { label: "(-) Despesas Variáveis",             valor: despesasVariaveis,   pct: pct(despesasVariaveis), tipo: "variavel" },
      { label: "(-) Custo Direto (CMV)",             valor: custoDireto,         pct: pct(custoDireto), tipo: "direto"  },
      { label: "= Margem de Contribuição",           valor: margemContribuicao,  pct: margemPct,       tipo: "margem"   },
      { label: "(-) Despesas Fixas",                 valor: despesasFixas,       pct: pct(despesasFixas), tipo: "fixo"  },
      { label: "= Lucro Operacional",                valor: lucroOperacional,    pct: pct(lucroOperacional), tipo: "lucro" },
    ],
  });
});

// ── CONTAS ────────────────────────────────────────────────────────────────────
router.get("/financeiro/contas", ...auth, async (req: AuthenticatedRequest, res) => {
  const rows = await db.select().from(finContas)
    .where(eq(finContas.tenantId, req.tenantId!))
    .orderBy(asc(finContas.nome));
  res.json(rows);
});

router.post("/financeiro/contas", ...auth, async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    nome: z.string().min(1),
    banco: z.string().min(1),
    tipo: z.enum(["Corrente", "Poupança", "Cartão de Crédito", "Caixa"]),
    saldoInicial: z.number().default(0),
    limite: z.number().optional(),
    diaVencimento: z.number().optional(),
  });
  const data = schema.parse(req.body);
  const [row] = await db.insert(finContas).values({ ...data, tenantId: req.tenantId!, saldoInicial: String(data.saldoInicial) }).returning();
  res.status(201).json(row);
});

router.put("/financeiro/contas/:id", ...auth, async (req: AuthenticatedRequest, res) => {
  const id = parseInt(req.params.id);
  const schema = z.object({
    nome: z.string().min(1).optional(),
    banco: z.string().optional(),
    tipo: z.enum(["Corrente", "Poupança", "Cartão de Crédito", "Caixa"]).optional(),
    saldoInicial: z.number().optional(),
    ativo: z.boolean().optional(),
    limite: z.number().optional(),
    diaVencimento: z.number().optional(),
  });
  const data = schema.parse(req.body);
  const [row] = await db.update(finContas)
    .set({ ...data, saldoInicial: data.saldoInicial !== undefined ? String(data.saldoInicial) : undefined })
    .where(and(eq(finContas.id, id), eq(finContas.tenantId, req.tenantId!)))
    .returning();
  if (!row) { res.status(404).json({ error: "Conta não encontrada" }); return; }
  res.json(row);
});

router.delete("/financeiro/contas/:id", ...auth, async (req: AuthenticatedRequest, res) => {
  await db.delete(finContas)
    .where(and(eq(finContas.id, parseInt(req.params.id)), eq(finContas.tenantId, req.tenantId!)));
  res.json({ ok: true });
});

// ── TRANSAÇÕES ────────────────────────────────────────────────────────────────
router.get("/financeiro/transacoes", ...auth, async (req: AuthenticatedRequest, res) => {
  const rows = await db.select().from(finTransacoes)
    .where(eq(finTransacoes.tenantId, req.tenantId!))
    .orderBy(desc(finTransacoes.criadoEm));
  res.json(rows);
});

router.post("/financeiro/transacoes", ...auth, async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    contaId: z.number().optional(),
    data: z.string(),
    descricao: z.string().min(1),
    valor: z.number().positive(),
    tipo: z.enum(["CREDITO", "DEBITO"]),
    categoriaId: z.string().optional(),
    natureza: z.string().optional(),
    centroCusto: z.string().optional(),
    origemTipo: z.string().optional(),
    origemId: z.string().optional(),
  });
  const data = schema.parse(req.body);
  const [row] = await db.insert(finTransacoes).values({
    ...data,
    tenantId: req.tenantId!,
    valor: String(data.valor),
    status: data.categoriaId ? "classificado" : "pendente",
  }).returning();
  res.status(201).json(row);
});

// Padrões brasileiros de transferência/movimentação financeira
const PADROES_MOVIMENTACAO = [
  "PAGAMENTO FATURA", "PGTO FATURA", "PAGTO FATURA", "PAG FATURA",
  "PAGAMENTO CARTAO", "PAGTO CARTAO", "PAG CARTAO", "PAGTO CARTAO CREDITO",
  "TRANSFERENCIA ENTRE CONTAS", "TRANSF ENTRE CONTAS", "TRANSF PROPRIA",
  "TED ENTRE CONTAS", "DOC ENTRE CONTAS", "TEV ENTRE CONTAS",
  "RESGATE AUTOMATICO", "APLICACAO AUTOMATICA", "APLICACAO AUTOM",
  "TARIFA TRANSF", "TARIFA TED", "TARIFA DOC",
];

function normStr(s: string) {
  return s.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function isMovimentacao(descricao: string): boolean {
  const norm = normStr(descricao);
  return PADROES_MOVIMENTACAO.some(p => norm.includes(normStr(p)));
}

router.post("/financeiro/transacoes/batch", ...auth, async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    contaId: z.number().optional(),
    transacoes: z.array(z.object({
      data: z.string(),
      descricao: z.string(),
      valor: z.number(),
      tipo: z.enum(["CREDITO", "DEBITO"]),
      fitId: z.string().optional(),
    })),
  });
  const { contaId, transacoes } = schema.parse(req.body);
  const tenantId = req.tenantId!;

  // ── Deduplicação por FITID ────────────────────────────────────────────────
  // Busca todos os origemId já gravados para este tenant (evita reimportar)
  const fitIdsInput = transacoes.map(t => t.fitId).filter(Boolean) as string[];
  const hasFitIds   = fitIdsInput.length > 0;
  const jaExistem   = new Set<string>();

  if (hasFitIds) {
    const existentes = await db.select({ origemId: finTransacoes.origemId })
      .from(finTransacoes)
      .where(and(eq(finTransacoes.tenantId, tenantId), eq(finTransacoes.origemTipo, "ofx")));
    existentes.forEach(r => { if (r.origemId) jaExistem.add(r.origemId); });
  }

  // Regras do tenant para auto-classificar
  const regras = await db.select().from(finRegrasClassificacao)
    .where(eq(finRegrasClassificacao.tenantId, tenantId));

  const novas = transacoes.filter(t => !t.fitId || !jaExistem.has(t.fitId));
  const duplicadas = transacoes.length - novas.length;

  if (novas.length === 0) {
    res.status(200).json({ count: 0, duplicadas, rows: [], aviso: "Todas as transações já existem (FITID duplicado)." });
    return;
  }

  const rows = await db.insert(finTransacoes).values(
    novas.map(t => {
      // 1. Padrões de movimentação financeira — prioridade máxima
      if (isMovimentacao(t.descricao)) {
        return {
          tenantId, contaId,
          data: t.data, descricao: t.descricao,
          valor: String(Math.abs(t.valor)), tipo: t.tipo,
          natureza: "Movimentação Financeira",
          status: "classificado" as const,
          origemTipo: "ofx",
          origemId: t.fitId,
        };
      }
      // 2. Regras do tenant
      const regra = regras.find(r => t.descricao.toUpperCase().includes(r.termo.toUpperCase()));
      return {
        tenantId, contaId,
        data: t.data, descricao: t.descricao,
        valor: String(Math.abs(t.valor)), tipo: t.tipo,
        categoriaId: regra?.categoriaId,
        natureza: regra?.natureza,
        centroCusto: regra?.centroCusto,
        status: regra ? "classificado" as const : "pendente" as const,
        origemTipo: "ofx",
        origemId: t.fitId,
      };
    })
  ).returning();

  res.status(201).json({ count: rows.length, duplicadas, rows });
});

router.put("/financeiro/transacoes/:id", ...auth, async (req: AuthenticatedRequest, res) => {
  const id = parseInt(req.params.id);
  const schema = z.object({
    categoriaId: z.string().optional(),
    natureza: z.string().optional(),
    centroCusto: z.string().optional(),
    status: z.enum(["pendente", "classificado"]).optional(),
    descricao: z.string().optional(),
  });
  const data = schema.parse(req.body);
  const update: Record<string, unknown> = { ...data };
  // Mudança de categoria ou natureza → volta para "classificado" (requer re-validação)
  if (data.categoriaId || data.natureza === "Movimentação Financeira") update.status = "classificado";
  const [row] = await db.update(finTransacoes).set(update)
    .where(and(eq(finTransacoes.id, id), eq(finTransacoes.tenantId, req.tenantId!)))
    .returning();
  if (!row) { res.status(404).json({ error: "Transação não encontrada" }); return; }
  res.json(row);
});

router.delete("/financeiro/transacoes/:id", ...auth, async (req: AuthenticatedRequest, res) => {
  await db.delete(finTransacoes)
    .where(and(eq(finTransacoes.id, parseInt(req.params.id)), eq(finTransacoes.tenantId, req.tenantId!)));
  res.json({ ok: true });
});

router.post("/financeiro/transacoes/aplicar-regras", ...auth, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const regras = await db.select().from(finRegrasClassificacao)
    .where(eq(finRegrasClassificacao.tenantId, tenantId));
  const pendentes = await db.select().from(finTransacoes)
    .where(and(eq(finTransacoes.tenantId, tenantId), eq(finTransacoes.status, "pendente")));

  let count = 0;
  for (const t of pendentes) {
    const regra = regras.find(r => t.descricao.toUpperCase().includes(r.termo.toUpperCase()));
    if (regra) {
      await db.update(finTransacoes)
        .set({ categoriaId: regra.categoriaId, natureza: regra.natureza, centroCusto: regra.centroCusto, status: "classificado" })
        .where(eq(finTransacoes.id, t.id));
      count++;
    }
  }
  res.json({ aplicadas: count });
});

// ── POST /api/financeiro/transacoes/detectar-transferencias ──────────────────
// DRY RUN — retorna sugestões sem alterar o banco.
// Apenas detecta por padrão de descrição (sem detecção de pares, que gera falsos positivos).
// O usuário revisa na UI e confirma via /confirmar-movimentacao.
router.post("/financeiro/transacoes/detectar-transferencias", ...auth, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const todas = await db.select().from(finTransacoes)
    .where(eq(finTransacoes.tenantId, tenantId));

  const sugestoes = todas
    .filter(t => t.natureza !== "Movimentação Financeira" && isMovimentacao(t.descricao))
    .map(t => {
      const norm = normStr(t.descricao);
      const padrao = PADROES_MOVIMENTACAO.find(p => norm.includes(normStr(p))) ?? "";
      return { id: t.id, data: t.data, descricao: t.descricao, valor: t.valor, tipo: t.tipo, padrao };
    });

  res.json({ sugestoes });
});

// ── POST /api/financeiro/transacoes/confirmar-movimentacao ───────────────────
// Recebe lista de IDs confirmados pelo usuário e marca como Movimentação Financeira.
router.post("/financeiro/transacoes/confirmar-movimentacao", ...auth, async (req: AuthenticatedRequest, res) => {
  const { ids } = z.object({ ids: z.array(z.number()) }).parse(req.body);
  const tenantId = req.tenantId!;
  let marcadas = 0;
  for (const id of ids) {
    const result = await db.update(finTransacoes)
      .set({ natureza: "Movimentação Financeira", status: "classificado" })
      .where(and(eq(finTransacoes.id, id), eq(finTransacoes.tenantId, tenantId)))
      .returning();
    if (result.length) marcadas++;
  }
  res.json({ marcadas });
});

// ── POST /api/financeiro/transacoes/:id/resetar ──────────────────────────────
// Limpa categoria, natureza e volta status para pendente — permite reclassificar.
router.post("/financeiro/transacoes/:id/resetar", ...auth, async (req: AuthenticatedRequest, res) => {
  const id = parseInt(req.params.id);
  const [row] = await db.update(finTransacoes)
    .set({ categoriaId: null, natureza: null, centroCusto: null, status: "pendente" })
    .where(and(eq(finTransacoes.id, id), eq(finTransacoes.tenantId, req.tenantId!)))
    .returning();
  if (!row) { res.status(404).json({ error: "Não encontrado" }); return; }
  res.json(row);
});

// ── POST /api/financeiro/transacoes/validar ──────────────────────────────────
// Marca IDs informados como "validado" — a partir daí entram em saldo e relatórios.
router.post("/financeiro/transacoes/validar", ...auth, async (req: AuthenticatedRequest, res) => {
  const { ids } = z.object({ ids: z.array(z.number()) }).parse(req.body);
  const tenantId = req.tenantId!;
  let validadas = 0;
  for (const id of ids) {
    const r = await db.update(finTransacoes)
      .set({ status: "validado" })
      .where(and(eq(finTransacoes.id, id), eq(finTransacoes.tenantId, tenantId)))
      .returning();
    if (r.length) validadas++;
  }
  res.json({ validadas });
});

// ── POST /api/financeiro/transacoes/:id/reverter-validacao ───────────────────
// Reverte uma transação validada de volta para "classificado" (aguardando validação).
router.post("/financeiro/transacoes/:id/reverter-validacao", ...auth, async (req: AuthenticatedRequest, res) => {
  const id = parseInt(req.params.id);
  const [row] = await db.update(finTransacoes)
    .set({ status: "classificado" })
    .where(and(eq(finTransacoes.id, id), eq(finTransacoes.tenantId, req.tenantId!)))
    .returning();
  if (!row) { res.status(404).json({ error: "Não encontrado" }); return; }
  res.json(row);
});

// ── POST /api/financeiro/ajuste-saldo ────────────────────────────────────────
// Cria um lançamento manual de ajuste de saldo — já entra como "validado".
router.post("/financeiro/ajuste-saldo", ...auth, async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    contaId: z.number(),
    data: z.string(),
    valor: z.number().positive(),
    tipo: z.enum(["CREDITO", "DEBITO"]),
    descricao: z.string().default("Ajuste de Saldo"),
  });
  const data = schema.parse(req.body);
  const tenantId = req.tenantId!;
  const [row] = await db.insert(finTransacoes).values({
    tenantId,
    contaId: data.contaId,
    data: data.data,
    descricao: data.descricao,
    valor: String(data.valor),
    tipo: data.tipo,
    natureza: "Ajuste",
    status: "validado",
    origemTipo: "manual",
  }).returning();
  res.status(201).json(row);
});

// ── CATEGORIAS ────────────────────────────────────────────────────────────────
router.get("/financeiro/categorias", ...auth, async (req: AuthenticatedRequest, res) => {
  await seedTenantDefaults(req.tenantId!);
  const rows = await db.select().from(finCategorias)
    .where(eq(finCategorias.tenantId, req.tenantId!))
    .orderBy(asc(finCategorias.nome));
  res.json(rows);
});

router.post("/financeiro/categorias", ...auth, async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    nome: z.string().min(1),
    naturezaPadrao: z.string(),
    centroCustoPadrao: z.string(),
    grupoGerencial: z.string().optional(),
  });
  const data = schema.parse(req.body);
  const id = data.nome.toLowerCase().replace(/\s+/g, "_").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const [row] = await db.insert(finCategorias).values({ ...data, id, tenantId: req.tenantId! }).returning();
  res.status(201).json(row);
});

router.put("/financeiro/categorias/:id", ...auth, async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    nome: z.string().optional(),
    naturezaPadrao: z.string().optional(),
    centroCustoPadrao: z.string().optional(),
    grupoGerencial: z.string().optional(),
  });
  const data = schema.parse(req.body);
  await db.update(finCategorias).set(data)
    .where(and(eq(finCategorias.id, req.params.id), eq(finCategorias.tenantId, req.tenantId!)));
  res.json({ ok: true });
});

router.delete("/financeiro/categorias/:id", ...auth, async (req: AuthenticatedRequest, res) => {
  await db.delete(finCategorias)
    .where(and(eq(finCategorias.id, req.params.id), eq(finCategorias.tenantId, req.tenantId!)));
  res.json({ ok: true });
});

// ── NATUREZAS ────────────────────────────────────────────────────────────────
router.get("/financeiro/naturezas", ...auth, async (req: AuthenticatedRequest, res) => {
  await seedTenantDefaults(req.tenantId!);
  const rows = await db.select().from(finNaturezas)
    .where(eq(finNaturezas.tenantId, req.tenantId!))
    .orderBy(asc(finNaturezas.nome));
  res.json(rows.map(r => r.nome));
});

router.post("/financeiro/naturezas", ...auth, async (req: AuthenticatedRequest, res) => {
  const { nome } = z.object({ nome: z.string().min(1) }).parse(req.body);
  await db.insert(finNaturezas).values({ tenantId: req.tenantId!, nome });
  res.status(201).json({ ok: true });
});

router.delete("/financeiro/naturezas/:nome", ...auth, async (req: AuthenticatedRequest, res) => {
  await db.delete(finNaturezas)
    .where(and(eq(finNaturezas.tenantId, req.tenantId!), eq(finNaturezas.nome, decodeURIComponent(req.params.nome))));
  res.json({ ok: true });
});

// ── CENTROS DE CUSTO ──────────────────────────────────────────────────────────
router.get("/financeiro/centros-custo", ...auth, async (req: AuthenticatedRequest, res) => {
  await seedTenantDefaults(req.tenantId!);
  const rows = await db.select().from(finCentrosCusto)
    .where(eq(finCentrosCusto.tenantId, req.tenantId!))
    .orderBy(asc(finCentrosCusto.nome));
  res.json(rows.map(r => r.nome));
});

router.post("/financeiro/centros-custo", ...auth, async (req: AuthenticatedRequest, res) => {
  const { nome } = z.object({ nome: z.string().min(1) }).parse(req.body);
  await db.insert(finCentrosCusto).values({ tenantId: req.tenantId!, nome });
  res.status(201).json({ ok: true });
});

router.delete("/financeiro/centros-custo/:nome", ...auth, async (req: AuthenticatedRequest, res) => {
  await db.delete(finCentrosCusto)
    .where(and(eq(finCentrosCusto.tenantId, req.tenantId!), eq(finCentrosCusto.nome, decodeURIComponent(req.params.nome))));
  res.json({ ok: true });
});

// ── REGRAS DE CLASSIFICAÇÃO ───────────────────────────────────────────────────
router.get("/financeiro/regras", ...auth, async (req: AuthenticatedRequest, res) => {
  const rows = await db.select().from(finRegrasClassificacao)
    .where(eq(finRegrasClassificacao.tenantId, req.tenantId!))
    .orderBy(asc(finRegrasClassificacao.termo));
  res.json(rows);
});

router.post("/financeiro/regras", ...auth, async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    termo: z.string().min(3),
    categoriaId: z.string(),
    natureza: z.string(),
    centroCusto: z.string(),
  });
  const data = schema.parse(req.body);
  const [row] = await db.insert(finRegrasClassificacao).values({ ...data, tenantId: req.tenantId! }).returning();
  res.status(201).json(row);
});

router.delete("/financeiro/regras/:id", ...auth, async (req: AuthenticatedRequest, res) => {
  await db.delete(finRegrasClassificacao)
    .where(and(eq(finRegrasClassificacao.id, parseInt(req.params.id)), eq(finRegrasClassificacao.tenantId, req.tenantId!)));
  res.json({ ok: true });
});

// ── HISTÓRICO DE IMPORTAÇÕES ──────────────────────────────────────────────────
router.get("/financeiro/historico-importacoes", ...auth, async (req: AuthenticatedRequest, res) => {
  const rows = await db.select().from(finHistoricoImportacoes)
    .where(eq(finHistoricoImportacoes.tenantId, req.tenantId!))
    .orderBy(desc(finHistoricoImportacoes.dataImportacao));
  res.json(rows);
});

router.post("/financeiro/historico-importacoes", ...auth, async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    nomeArquivo: z.string(),
    contaId: z.number().optional(),
    quantidadeTransacoes: z.number(),
  });
  const data = schema.parse(req.body);
  const [row] = await db.insert(finHistoricoImportacoes).values({ ...data, tenantId: req.tenantId! }).returning();
  res.status(201).json(row);
});

// ── METAS MENSAIS ────────────────────────────────────────────────────────────
router.get("/financeiro/metas-mensais", ...auth, async (req: AuthenticatedRequest, res) => {
  const rows = await db.select().from(finMetasMensais)
    .where(eq(finMetasMensais.tenantId, req.tenantId!))
    .orderBy(desc(finMetasMensais.mes));
  res.json(rows);
});

router.post("/financeiro/metas-mensais", ...auth, async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    mes: z.string(),
    faturamentoPrevisto: z.number().default(0),
    custoFixoPrevisto: z.number().default(0),
    faturamentoCompetencia: z.number().optional(),
  });
  const data = schema.parse(req.body);
  const tenantId = req.tenantId!;
  const existing = await db.select().from(finMetasMensais)
    .where(and(eq(finMetasMensais.tenantId, tenantId), eq(finMetasMensais.mes, data.mes)));
  if (existing.length > 0) {
    const [row] = await db.update(finMetasMensais)
      .set({ faturamentoPrevisto: String(data.faturamentoPrevisto), custoFixoPrevisto: String(data.custoFixoPrevisto), faturamentoCompetencia: data.faturamentoCompetencia !== undefined ? String(data.faturamentoCompetencia) : null })
      .where(and(eq(finMetasMensais.tenantId, tenantId), eq(finMetasMensais.mes, data.mes)))
      .returning();
    res.json(row);
  } else {
    const [row] = await db.insert(finMetasMensais).values({
      tenantId, mes: data.mes,
      faturamentoPrevisto: String(data.faturamentoPrevisto),
      custoFixoPrevisto: String(data.custoFixoPrevisto),
      faturamentoCompetencia: data.faturamentoCompetencia !== undefined ? String(data.faturamentoCompetencia) : undefined,
    }).returning();
    res.status(201).json(row);
  }
});

// ── RESTAURAR BACKUP (importar JSON exportado do app anterior) ───────────────
router.post("/financeiro/restaurar-backup", ...auth, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const { transacoes, regras, categorias, naturezas, centrosCusto, limpar } = req.body;

  if (!transacoes || !Array.isArray(transacoes)) {
    res.status(400).json({ error: "JSON inválido: campo 'transacoes' ausente" });
    return;
  }

  try {
    if (limpar) {
      await db.delete(finTransacoes).where(eq(finTransacoes.tenantId, tenantId));
      await db.delete(finRegrasClassificacao).where(eq(finRegrasClassificacao.tenantId, tenantId));
      await db.delete(finCategorias).where(eq(finCategorias.tenantId, tenantId));
      await db.delete(finNaturezas).where(eq(finNaturezas.tenantId, tenantId));
      await db.delete(finCentrosCusto).where(eq(finCentrosCusto.tenantId, tenantId));
      await db.delete(finContas).where(eq(finContas.tenantId, tenantId));
    }

    // Naturezas
    if (naturezas?.length) {
      for (const nome of naturezas) {
        await db.insert(finNaturezas).values({ tenantId, nome }).onConflictDoNothing();
      }
    }

    // Centros de custo
    if (centrosCusto?.length) {
      for (const nome of centrosCusto) {
        await db.insert(finCentrosCusto).values({ tenantId, nome }).onConflictDoNothing();
      }
    }

    // Categorias
    if (categorias?.length) {
      for (const cat of categorias) {
        await db.insert(finCategorias).values({
          id: cat.id,
          tenantId,
          nome: cat.nome,
          naturezaPadrao: cat.naturezaPadrao || '',
          centroCustoPadrao: cat.centroCustoPadrao || '',
          grupoGerencial: cat.grupoGerencial || null,
        }).onConflictDoNothing();
      }
    }

    // Contas bancárias (derivadas das transações)
    const contaNomes = [...new Set(transacoes.map((t: any) => t.conta).filter(Boolean))] as string[];
    const contaMap: Record<string, number> = {};
    const CONTA_DEFS: Record<string, { banco: string; tipo: string }> = {
      'Banco Inter': { banco: 'Banco Inter', tipo: 'Corrente' },
      'Nubank': { banco: 'Nubank', tipo: 'Corrente' },
      'nubank': { banco: 'Nubank', tipo: 'Corrente' },
      'Caixa Físico': { banco: 'Caixa', tipo: 'Caixa' },
    };
    for (const nome of contaNomes) {
      const def = CONTA_DEFS[nome] || { banco: nome, tipo: 'Corrente' };
      const tipo = nome.toLowerCase().includes('crédito') || nome.toLowerCase().includes('credito')
        ? 'Cartão de Crédito' : def.tipo;
      const [conta] = await db.insert(finContas).values({
        tenantId, nome, banco: def.banco, tipo, saldoInicial: '0',
      }).returning({ id: finContas.id });
      contaMap[nome] = conta.id;
    }

    // Regras
    if (regras?.length) {
      for (const r of regras) {
        await db.insert(finRegrasClassificacao).values({
          tenantId, termo: r.termo, categoriaId: r.categoriaId,
          natureza: r.natureza || '', centroCusto: r.centroCusto || '',
        }).onConflictDoNothing();
      }
    }

    // Transações
    let txOk = 0;
    for (const t of transacoes) {
      const valor = Math.abs(Number(t.valor)).toFixed(2);
      const tipo = Number(t.valor) >= 0 ? 'CREDITO' : 'DEBITO';
      const contaId = t.conta ? (contaMap[t.conta] ?? null) : null;
      await db.insert(finTransacoes).values({
        tenantId,
        contaId,
        data: t.data,
        descricao: t.descricao,
        valor,
        tipo,
        categoriaId: t.categoria || null,
        natureza: t.natureza || null,
        centroCusto: t.centroCusto || null,
        status: t.status || 'pendente',
        origemTipo: 'manus_migrated',
        origemId: String(t.id || ''),
      }).onConflictDoNothing();
      txOk++;
    }

    res.json({
      ok: true,
      importado: {
        transacoes: txOk,
        categorias: categorias?.length || 0,
        regras: regras?.length || 0,
        naturezas: naturezas?.length || 0,
        centrosCusto: centrosCusto?.length || 0,
        contas: Object.keys(contaMap).length,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── PARSE OFX ─────────────────────────────────────────────────────────────────
// Suporta XML (com </STMTTRN>) e SGML (sem closing tags — padrão Sicoob/Bradesco/Inter/BB)
router.post("/financeiro/parse-ofx", ...auth, upload.single("file"), async (req: AuthenticatedRequest, res) => {
  if (!req.file) { res.status(400).json({ error: "Arquivo não enviado" }); return; }
  // Tenta latin1 primeiro; se tiver BOM UTF-8, usa utf-8
  const rawBuf = req.file.buffer;
  const isUtf8Bom = rawBuf[0] === 0xEF && rawBuf[1] === 0xBB && rawBuf[2] === 0xBF;
  const text = rawBuf.toString(isUtf8Bom ? "utf-8" : "latin1");

  type OFXTx = { data: string; descricao: string; valor: number; tipo: "CREDITO" | "DEBITO"; fitId?: string };
  const transactions: OFXTx[] = [];

  const typeRegex   = /<TRNTYPE>\s*([^\r\n<]+)/i;
  const dateRegex   = /<DTPOSTED>\s*(\d{8})/i;
  const amountRegex = /<TRNAMT>\s*([^\r\n<\s]+)/i;
  const memoRegex   = /<MEMO>\s*([^\r\n<]+)/i;
  const nameRegex   = /<NAME>\s*([^\r\n<]+)/i;
  const fitIdRegex  = /<FITID>\s*([^\r\n<]+)/i;

  function parseBlock(block: string) {
    const dateM   = block.match(dateRegex);
    const amountM = block.match(amountRegex);
    if (!dateM || !amountM) return;

    const rawDate   = dateM[1];
    const formatted = `${rawDate.substring(6, 8)}/${rawDate.substring(4, 6)}/${rawDate.substring(0, 4)}`;

    // Normaliza separador decimal: "1.234,56" → "1234.56" | "1234,56" → "1234.56"
    const rawAmt  = amountM[1].replace(/[^\d.,-]/g, "");
    const normalized = rawAmt.includes(",")
      ? rawAmt.replace(/\./g, "").replace(",", ".")   // ponto é milhar, vírgula é decimal
      : rawAmt;                                        // padrão OFX: ponto é decimal
    const amount  = parseFloat(normalized);
    if (isNaN(amount)) return;

    const memoM  = block.match(memoRegex);
    const nameM  = block.match(nameRegex);
    const typeM  = block.match(typeRegex);
    const fitIdM = block.match(fitIdRegex);

    // Remove resíduos de tags XML do fim do texto capturado
    const cleanStr = (s: string) => s.replace(/<\/?\w+>?$/, "").trim();
    const desc    = cleanStr(memoM?.[1] ?? nameM?.[1] ?? "");
    const trnType = typeM?.[1]?.replace(/<.*/, "").trim().toUpperCase();

    let tipo: "CREDITO" | "DEBITO";
    if (trnType === "CREDIT" || trnType === "DEP" || trnType === "INT") tipo = "CREDITO";
    else if (trnType === "DEBIT" || trnType === "CHECK" || trnType === "PAYMENT" || trnType === "ATM") tipo = "DEBITO";
    else tipo = amount >= 0 ? "CREDITO" : "DEBITO";

    transactions.push({
      data: formatted,
      descricao: desc,
      valor: Math.abs(amount),
      tipo,
      fitId: fitIdM?.[1]?.replace(/<.*/, "").trim(),
    });
  }

  // ── Tentativa 1: formato XML (tags de fechamento </STMTTRN>) ──────────────
  const xmlRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let m: RegExpExecArray | null;
  while ((m = xmlRegex.exec(text)) !== null) parseBlock(m[1]);

  // ── Tentativa 2: formato SGML (sem closing tags — mais comum no Brasil) ───
  if (transactions.length === 0) {
    const sgmlBlocks = text.split(/<STMTTRN>/i);
    for (let i = 1; i < sgmlBlocks.length; i++) {
      // Bloco vai até o próximo <STMTTRN> ou fim de arquivo
      parseBlock(sgmlBlocks[i]);
    }
  }

  res.json({ count: transactions.length, transactions, formato: transactions.length > 0 ? (text.includes("</STMTTRN>") ? "XML" : "SGML") : "desconhecido" });
});

// ── PLUGGY — connect token + salvar item ─────────────────────────────────────

router.post("/financeiro/pluggy/connect-token", ...auth, async (req: AuthenticatedRequest, res) => {
  const { clientId, clientSecret, itemId } = z.object({
    clientId:     z.string(),
    clientSecret: z.string(),
    itemId:       z.string().optional(),
  }).parse(req.body);

  try {
    const { getConnectToken } = await import("../services/pluggyBank.js");
    const token = await getConnectToken(clientId, clientSecret, itemId);
    res.json({ connectToken: token });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/financeiro/pluggy/set-item", ...auth, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const { conexaoId, itemId } = z.object({
    conexaoId: z.number(),
    itemId:    z.string(),
  }).parse(req.body);

  // Busca credenciais da conexão
  const conn = await db.execute(
    sql`SELECT client_id, client_secret, banco FROM fin_conexoes_banco WHERE id = ${conexaoId} AND tenant_id = ${tenantId} LIMIT 1`
  );
  if (conn.rows.length === 0) { res.status(404).json({ error: "Conexão não encontrada" }); return; }
  const row = conn.rows[0] as any;

  try {
    const { getPluggyAccounts } = await import("../services/pluggyBank.js");
    const accounts = await getPluggyAccounts(row.client_id, row.client_secret, itemId);

    // Salva o itemId e as contas disponíveis
    await db.execute(
      sql`UPDATE fin_conexoes_banco SET pluggy_item_id = ${itemId}, metadata = ${JSON.stringify({ accounts })}::jsonb WHERE id = ${conexaoId} AND tenant_id = ${tenantId}`
    );

    res.json({ ok: true, accounts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/financeiro/pluggy/set-accounts", ...auth, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const { conexaoId, accountIds } = z.object({
    conexaoId:  z.number(),
    accountIds: z.array(z.string()),
  }).parse(req.body);

  await db.execute(
    sql`UPDATE fin_conexoes_banco SET pluggy_account_ids = ${accountIds.join(",")} WHERE id = ${conexaoId} AND tenant_id = ${tenantId}`
  );
  res.json({ ok: true });
});

// ── CONEXÕES BANCÁRIAS ────────────────────────────────────────────────────────

router.get("/financeiro/conexoes-banco", ...auth, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const rows = await db.execute(
    sql`SELECT id, nome, banco, tipo_auth, client_id, conta_id, ativo, ultimo_import, created_at
        FROM fin_conexoes_banco WHERE tenant_id = ${tenantId} ORDER BY id DESC`
  );
  res.json(rows.rows);
});

router.post("/financeiro/conexoes-banco", ...auth, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const schema = z.object({
    nome:         z.string().min(1),
    banco:        z.string().min(1),
    tipoAuth:     z.enum(["mtls", "oauth2"]).default("mtls"),
    clientId:     z.string().optional(),
    clientSecret: z.string().optional(),
    certCrt:      z.string().optional(),
    certKey:      z.string().optional(),
    contaId:      z.number().optional(),
    ativo:        z.boolean().default(true),
  });
  const data = schema.parse(req.body);
  const rows = await db.execute(
    sql`INSERT INTO fin_conexoes_banco
          (tenant_id, nome, banco, tipo_auth, client_id, client_secret, cert_crt, cert_key, conta_id, ativo)
        VALUES
          (${tenantId}, ${data.nome}, ${data.banco}, ${data.tipoAuth},
           ${data.clientId ?? null}, ${data.clientSecret ?? null},
           ${data.certCrt ?? null}, ${data.certKey ?? null},
           ${data.contaId ?? null}, ${data.ativo})
        RETURNING id, nome, banco, tipo_auth, client_id, conta_id, ativo, created_at`
  );
  res.status(201).json(rows.rows[0]);
});

router.put("/financeiro/conexoes-banco/:id", ...auth, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const id = parseInt(req.params.id);
  const schema = z.object({
    nome:         z.string().optional(),
    clientId:     z.string().optional(),
    clientSecret: z.string().optional(),
    certCrt:      z.string().optional(),
    certKey:      z.string().optional(),
    contaId:      z.number().optional(),
    ativo:        z.boolean().optional(),
  });
  const data = schema.parse(req.body);
  await db.execute(
    sql`UPDATE fin_conexoes_banco SET
          nome          = COALESCE(${data.nome ?? null},          nome),
          client_id     = COALESCE(${data.clientId ?? null},      client_id),
          client_secret = COALESCE(${data.clientSecret ?? null},  client_secret),
          cert_crt      = COALESCE(${data.certCrt ?? null},       cert_crt),
          cert_key      = COALESCE(${data.certKey ?? null},       cert_key),
          conta_id      = COALESCE(${data.contaId ?? null},       conta_id),
          ativo         = COALESCE(${data.ativo ?? null},         ativo)
        WHERE id = ${id} AND tenant_id = ${tenantId}`
  );
  res.json({ ok: true });
});

router.delete("/financeiro/conexoes-banco/:id", ...auth, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const id = parseInt(req.params.id);
  await db.execute(sql`DELETE FROM fin_conexoes_banco WHERE id = ${id} AND tenant_id = ${tenantId}`);
  res.json({ ok: true });
});

// ── IMPORTAR (Inter mTLS ou Pluggy) — manual ou agendado ─────────────────────

async function salvarTransacoes(
  tenantId: string,
  contaId: number | undefined,
  transacoes: { data: string; descricao: string; valor: number; tipo: "CREDITO" | "DEBITO"; fitId: string }[],
  regras: (typeof finRegrasClassificacao.$inferSelect)[],
): Promise<{ importadas: number; duplicadas: number }> {
  if (transacoes.length === 0) return { importadas: 0, duplicadas: 0 };

  const fitIds = transacoes.map(t => t.fitId);
  const existentes = await db.execute(
    sql`SELECT origem_id FROM fin_transacoes WHERE tenant_id = ${tenantId} AND origem_tipo = 'ofx' AND origem_id = ANY(${fitIds})`
  );
  const jaExistem = new Set(existentes.rows.map((r: any) => r.origem_id));
  const novas     = transacoes.filter(t => !jaExistem.has(t.fitId));
  const duplicadas = transacoes.length - novas.length;

  if (novas.length > 0) {
    await db.insert(finTransacoes).values(
      novas.map(t => {
        const regra = regras.find(r => t.descricao.toUpperCase().includes(r.termo.toUpperCase()));
        return {
          tenantId, contaId,
          data: t.data, descricao: t.descricao,
          valor: String(t.valor), tipo: t.tipo,
          categoriaId: regra?.categoriaId,
          natureza:    regra?.natureza,
          centroCusto: regra?.centroCusto,
          status:      regra ? "classificado" as const : "pendente" as const,
          origemTipo:  "ofx",
          origemId:    t.fitId,
        };
      })
    );
  }
  return { importadas: novas.length, duplicadas };
}

router.post("/financeiro/conexoes-banco/:id/importar", ...auth, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const id       = parseInt(req.params.id);

  const conn = await db.execute(
    sql`SELECT * FROM fin_conexoes_banco WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`
  );
  if (conn.rows.length === 0) { res.status(404).json({ error: "Conexão não encontrada" }); return; }
  const row = conn.rows[0] as Record<string, unknown>;

  const agora      = new Date();
  const inicio     = row.ultimo_import
    ? new Date(row.ultimo_import as string)
    : new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dataInicio = inicio.toISOString().split("T")[0];
  const dataFim    = agora.toISOString().split("T")[0];

  const regras  = await db.select().from(finRegrasClassificacao).where(eq(finRegrasClassificacao.tenantId, tenantId));
  const contaId = row.conta_id as number | undefined;

  try {
    let resultado: { importadas: number; duplicadas: number };

    // ── Pluggy ────────────────────────────────────────────────────────────────
    if (row.tipo_auth === "pluggy") {
      if (!row.client_id || !row.client_secret || !row.pluggy_item_id) {
        res.status(400).json({ error: "Conexão Pluggy incompleta. Configure as credenciais e autorize via Conectar conta." });
        return;
      }
      const accountIds = row.pluggy_account_ids
        ? (row.pluggy_account_ids as string).split(",").filter(Boolean)
        : [];
      if (accountIds.length === 0) {
        res.status(400).json({ error: "Nenhuma conta selecionada. Vá em Conexões e selecione as contas após conectar." });
        return;
      }

      const { getPluggyTransactions, pluggyToOFX } = await import("../services/pluggyBank.js");

      let todas: { data: string; descricao: string; valor: number; tipo: "CREDITO" | "DEBITO"; fitId: string }[] = [];
      for (const accId of accountIds) {
        const txs = await getPluggyTransactions(
          row.client_id as string, row.client_secret as string,
          accId, dataInicio, dataFim
        );
        todas = todas.concat(txs.map(t => pluggyToOFX(t, row.banco as string)));
      }
      resultado = await salvarTransacoes(tenantId, contaId, todas, regras);

    // ── Inter mTLS ────────────────────────────────────────────────────────────
    } else {
      if (!row.cert_crt || !row.cert_key || !row.client_id || !row.client_secret) {
        res.status(400).json({ error: "Credenciais Inter incompletas. Configure cert_crt, cert_key, client_id e client_secret." });
        return;
      }
      const { fetchInterExtrato, interToOFX } = await import("../services/interBank.js");
      const rawTxs = await fetchInterExtrato(
        { clientId: row.client_id as string, clientSecret: row.client_secret as string, certCrt: row.cert_crt as string, certKey: row.cert_key as string },
        dataInicio, dataFim,
      );
      resultado = await salvarTransacoes(tenantId, contaId, rawTxs.map(interToOFX), regras);
    }

    await db.execute(sql`UPDATE fin_conexoes_banco SET ultimo_import = NOW() WHERE id = ${id}`);
    res.json({ ...resultado, periodo: { dataInicio, dataFim } });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
