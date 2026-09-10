import { Router, type IRouter } from "express";
import { db, pool } from "@workspace/db";
import {
  fornecedores, clientes, contas_a_pagar, contas_a_receber, pedidos,
  estoque, estoque_grades, estoque_erp_saldos, cores, grades, movimentacoes, referencias,
  listas_customizadas, itens_pedido, kanban_fase_config, pedido_sinais,
  plm_produtos, pre_agendamentos, pre_agendamento_itens, pre_agendamento_ajustes,
  romaneios_expedicao, configuracoes_empresa,
  tenantIntegracoes,
} from "@workspace/db";
import { eq, and, inArray, asc, desc, sql, like, max, count } from "drizzle-orm";
import { requireAuth, requireTenantAccess, requireSuperAdmin, requireTenantMembershipManager, type AuthenticatedRequest } from "../../middlewares/auth";
import { supabaseAdmin } from "../../lib/supabase";
import {
  vhsysBuscarProduto, vhsysCriarProduto,
  vhsysBuscarClientePorCnpj, vhsysBuscarClientePorId, vhsysCriarCliente, vhsysAtualizarCliente,
  vhsysCriarPedidoVenda, vhsysBuscarPedidoVenda, vhsysListarProdutosPedido,
  vhsysCadastrarProdutosPedido, vhsysCriarContaReceber, vhsysCriarContaPagar,
  vhsysConsultarEstoque, vhsysLancarEstoque,
} from "../../lib/vhsys";
import type { VhsysCredentials } from "../../lib/vhsys";
import referenciasRouter from "./referencias";

const router: IRouter = Router();
router.use(referenciasRouter);

const normalizarSku = (valor: string) =>
  valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();

const LEGACY_VHSYS_TENANT_ID = "093a253e-9c1c-43f5-b988-a50df952d0cd";

async function obterCredenciaisVhsysDoTenant(tenantId: string): Promise<VhsysCredentials | undefined> {
  if (tenantId === LEGACY_VHSYS_TENANT_ID) return undefined;
  const [integracao] = await db.select().from(tenantIntegracoes).where(and(
    eq(tenantIntegracoes.tenantId, tenantId),
    eq(tenantIntegracoes.chave, "vhsys"),
    eq(tenantIntegracoes.ativo, true),
  )).limit(1);
  if (!integracao?.apiKey) {
    throw new Error("Configure a integração VhSys deste tenant antes de enviar o estoque");
  }
  let config: Record<string, unknown> = {};
  try { config = JSON.parse(integracao.config ?? "{}"); } catch {}
  const secretAccessToken = String(config.secretAccessToken ?? config.secret_access_token ?? "");
  if (!secretAccessToken) {
    throw new Error("A integração VhSys deste tenant não possui o token secreto configurado");
  }
  return { accessToken: integracao.apiKey, secretAccessToken };
}

// ─── FORNECEDORES ──────────────────────────────────────────────────────────

router.get("/kanban/fornecedores", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const data = await db.select().from(fornecedores)
    .where(and(eq(fornecedores.tenant_id, req.tenantId!), eq(fornecedores.ativo, true)))
    .orderBy(asc(fornecedores.nome));
  res.json(data);
});

router.post("/kanban/fornecedores", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { nome, cnpj, pix, telefone, email, endereco } = req.body;
  if (!nome) { res.status(400).json({ error: "nome é obrigatório" }); return; }
  const [data] = await db.insert(fornecedores).values({
    tenant_id: req.tenantId!, nome, cnpj, pix, telefone, email, endereco,
  }).returning();
  res.status(201).json(data);
});

router.patch("/kanban/fornecedores/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { nome, cnpj, pix, telefone, email, endereco, ativo } = req.body;
  const [data] = await db.update(fornecedores)
    .set({ nome, cnpj, pix, telefone, email, endereco, ativo, updated_at: new Date() })
    .where(and(eq(fornecedores.id, req.params.id), inArray(fornecedores.tenant_id, req.userTenantIds ?? [])))
    .returning();
  if (!data) { res.status(404).json({ error: "Fornecedor não encontrado" }); return; }
  res.json(data);
});

router.delete("/kanban/fornecedores/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  await db.update(fornecedores)
    .set({ ativo: false, updated_at: new Date() })
    .where(and(eq(fornecedores.id, req.params.id), inArray(fornecedores.tenant_id, req.userTenantIds ?? [])));
  res.status(204).send();
});

// ─── CLIENTES ──────────────────────────────────────────────────────────────

router.get("/kanban/clientes", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const data = await db.select().from(clientes)
    .where(and(eq(clientes.tenant_id, req.tenantId!), eq(clientes.ativo, true)))
    .orderBy(asc(clientes.nome));
  res.json(data);
});

router.post("/kanban/clientes", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { nome, cnpj, email, telefone, endereco, cidade, estado } = req.body;
  if (!nome) { res.status(400).json({ error: "nome é obrigatório" }); return; }
  const [data] = await db.insert(clientes).values({
    tenant_id: req.tenantId!, nome, cnpj, email, telefone, endereco, cidade, estado,
  }).returning();
  res.status(201).json(data);
});

router.patch("/kanban/clientes/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { nome, cnpj, email, telefone, endereco, cidade, estado, ativo } = req.body;
  const [data] = await db.update(clientes)
    .set({ nome, cnpj, email, telefone, endereco, cidade, estado, ativo, updated_at: new Date() })
    .where(and(eq(clientes.id, req.params.id), inArray(clientes.tenant_id, req.userTenantIds ?? [])))
    .returning();
  if (!data) { res.status(404).json({ error: "Cliente não encontrado" }); return; }
  res.json(data);
});

router.delete("/kanban/clientes/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  await db.update(clientes)
    .set({ ativo: false, updated_at: new Date() })
    .where(and(eq(clientes.id, req.params.id), inArray(clientes.tenant_id, req.userTenantIds ?? [])));
  res.status(204).send();
});

// ─── CONTAS A PAGAR ────────────────────────────────────────────────────────

router.get("/kanban/contas-a-pagar", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { status, fornecedor_id } = req.query;
  const conditions = [eq(contas_a_pagar.tenant_id, req.tenantId!)];
  if (status) conditions.push(eq(contas_a_pagar.status, status as string));
  if (fornecedor_id) conditions.push(eq(contas_a_pagar.fornecedor_id, fornecedor_id as string));

  const data = await db.select({
    conta: contas_a_pagar,
    fornecedor: { id: fornecedores.id, nome: fornecedores.nome, cnpj: fornecedores.cnpj, pix: fornecedores.pix },
    referencia: { id: referencias.id, codigo: referencias.codigo },
  })
    .from(contas_a_pagar)
    .leftJoin(fornecedores, eq(contas_a_pagar.fornecedor_id, fornecedores.id))
    .leftJoin(referencias, eq(contas_a_pagar.referencia_id, referencias.id))
    .where(and(...conditions))
    .orderBy(asc(contas_a_pagar.data_vencimento));

  const result = data.map(r => ({
    ...r.conta,
    fornecedor: r.fornecedor?.id ? r.fornecedor : null,
    referencia: r.referencia?.id ? r.referencia : null,
  }));
  res.json(result);
});

router.post("/kanban/contas-a-pagar", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { referencia_id, fornecedor_id, fase, descricao, valor, data_vencimento, cnpj_fornecedor, pix_fornecedor } = req.body;
  if (!valor) { res.status(400).json({ error: "valor é obrigatório" }); return; }
  const [data] = await db.insert(contas_a_pagar).values({
    tenant_id: req.tenantId!,
    referencia_id: referencia_id ?? null,
    fornecedor_id: fornecedor_id ?? null,
    fase: fase ?? null,
    descricao: descricao ?? null,
    valor: String(valor),
    data_vencimento: data_vencimento ? new Date(data_vencimento) : null,
    cnpj_fornecedor: cnpj_fornecedor ?? null,
    pix_fornecedor: pix_fornecedor ?? null,
    status: "pendente",
  }).returning();
  res.status(201).json(data);
});

router.patch("/kanban/contas-a-pagar/:id/pagar", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { data_pagamento } = req.body;
  const [data] = await db.update(contas_a_pagar)
    .set({ status: "pago", data_pagamento: data_pagamento ? new Date(data_pagamento) : new Date(), updated_at: new Date() })
    .where(and(eq(contas_a_pagar.id, req.params.id), inArray(contas_a_pagar.tenant_id, req.userTenantIds ?? [])))
    .returning();
  if (!data) { res.status(404).json({ error: "Conta não encontrada" }); return; }
  res.json(data);
});

router.patch("/kanban/contas-a-pagar/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { valor, data_vencimento, fornecedor_id, fornecedor_nome, descricao, status } = req.body;
  const updateData: Record<string, unknown> = { updated_at: new Date() };
  if (valor !== undefined) updateData.valor = String(valor);
  if (data_vencimento !== undefined) updateData.data_vencimento = data_vencimento ? new Date(data_vencimento) : null;
  if (fornecedor_id !== undefined) updateData.fornecedor_id = fornecedor_id;
  if (fornecedor_nome !== undefined) updateData.fornecedor_nome = fornecedor_nome;
  if (descricao !== undefined) updateData.descricao = descricao;
  if (status !== undefined) updateData.status = status;
  const [data] = await db.update(contas_a_pagar)
    .set(updateData as any)
    .where(and(eq(contas_a_pagar.id, req.params.id), inArray(contas_a_pagar.tenant_id, req.userTenantIds ?? [])))
    .returning();
  if (!data) { res.status(404).json({ error: "Conta não encontrada" }); return; }
  res.json(data);
});

router.delete("/kanban/contas-a-pagar/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  await db.update(contas_a_pagar)
    .set({ status: "cancelado", updated_at: new Date() })
    .where(and(eq(contas_a_pagar.id, req.params.id), inArray(contas_a_pagar.tenant_id, req.userTenantIds ?? [])));
  res.status(204).send();
});

// ─── PEDIDOS (Manus-style) ──────────────────────────────────────────────────
// Helper: mapeia pedido do banco para o formato do frontend (camelCase)
function mapPedidoParaFrontend(p: any, itens: any[]) {
  return {
    id: p.id,
    tenant_id: p.tenant_id,
    numeroPedido: p.numero_pedido || p.numero || "",
    nomeCliente: p.nome_cliente || "",
    emailCliente: p.email_cliente || "",
    telefoneCliente: p.telefone_cliente || "",
    status: p.status || "pendente",
    prazoEntrega: p.prazo_entrega || p.data_entrega_prevista || null,
    valorTotal: p.valor_total_cents || 0,   // centavos
    valorSinal: p.valor_sinal_cents || 0,   // centavos
    acrescimoTipo: p.acrescimo_tipo || "valor",
    acrescimoValor: p.acrescimo_valor || 0,
    descontoTipo: p.desconto_tipo || "valor",
    descontoValor: p.desconto_valor || 0,
    observacoes: p.observacoes || "",
    origem: p.origem || "manual",
    orcamento_id: p.orcamento_id || null,
    orcamento_numero: p.orcamento_numero || null,
    cnpjCliente: p.cnpj_cliente || "",
    enderecoCliente: p.endereco_cliente || "",
    cepCliente: p.cep_cliente || "",
    cidadeCliente: p.cidade_cliente || "",
    ufCliente: p.uf_cliente || "",
    idVhsysCliente: p.id_vhsys_cliente || null,
    idVhsysPedido: p.id_vhsys_pedido || null,
    createdAt: p.created_at,
    itens: itens.map(item => ({
      id: item.id,
      pedidoId: item.pedido_id,
      referencia: item.referencia,
      referenciaCliente: item.referencia_cliente || "",
      descricao: item.descricao || "",
      corNome: item.cor_nome || "",
      gradeId: item.grade_id || null,
      quantidadeTotal: item.quantidade_total || 0,
      quantidadePorTamanho: item.quantidade_por_tamanho || {},
      valorUnitario: item.valor_unitario || 0,
      valorTotal: (item.valor_unitario || 0) * (item.quantidade_total || 0),
      cmp: item.cmp || 0,
      referenciaId: item.referencia_id || null,
      fichaCustoId: item.ficha_custo_id || null,
      plmProdutoId: item.plm_produto_id || null,
      plmFichaTecnicaId: item.plm_ficha_tecnica_id || null,
      isAviamento: item.is_aviamento ?? false,
      isDesenvolvimento: item.is_desenvolvimento ?? false,
    })),
  };
}

// Gerar número de OP: OP-YY-{pedSeq}-{totalRefs}
// Ex: OP-26-004-10 (pedido 4 de 2026, total de 10 referências nesse pedido)
// Todas as OPs de um mesmo pedido levam o mesmo número final (total de refs)
function gerarNumeroOP(numeroPedido: string | null | undefined, totalRefs: number): string {
  const ano = new Date().getFullYear().toString().slice(-2);
  if (numeroPedido) {
    const partesPed = numeroPedido.split("-");
    const pedSeq = partesPed[partesPed.length - 1] ?? "001";
    return `OP-${ano}-${pedSeq}-${totalRefs}`;
  }
  return `OP-${ano}-000-${totalRefs}`;
}

function inteiroCents(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : null;
}

async function obterElegiveisPreAgendamento(tenantId: string, pedidoId?: string) {
  const pedidoWhere = pedidoId
    ? and(eq(pedidos.tenant_id, tenantId), eq(pedidos.id, pedidoId))
    : eq(pedidos.tenant_id, tenantId);
  const pedidosTenant = await db.select().from(pedidos).where(pedidoWhere);
  if (!pedidosTenant.length) return [];
  const pedidoIds = pedidosTenant.map(p => p.id);
  const itens = await db.select().from(itens_pedido).where(and(
    eq(itens_pedido.tenant_id, tenantId), inArray(itens_pedido.pedido_id, pedidoIds),
    sql`${itens_pedido.referencia_id} IS NOT NULL`,
  ));
  const refIds = [...new Set(itens.map(i => i.referencia_id!).filter(Boolean))];
  if (!refIds.length) return [];
  const refs = await db.select().from(referencias).where(and(
    eq(referencias.tenant_id, tenantId), inArray(referencias.id, refIds),
    sql`${referencias.fase_atual} <> 'corte'`,
  ));
  const refsMap = new Map(refs.map(r => [r.id, r]));
  const movs = await db.select().from(movimentacoes).where(and(
    eq(movimentacoes.tenant_id, tenantId), inArray(movimentacoes.referencia_id, refIds),
    eq(movimentacoes.fase_origem, "corte"),
  )).orderBy(desc(movimentacoes.created_at));
  const ultimoCorte = new Map<string, typeof movs[number]>();
  movs.forEach(m => { if (!ultimoCorte.has(m.referencia_id)) ultimoCorte.set(m.referencia_id, m); });
  const active = await db.select({ referencia_id: pre_agendamento_itens.referencia_id })
    .from(pre_agendamento_itens)
    .innerJoin(pre_agendamentos, eq(pre_agendamento_itens.pre_agendamento_id, pre_agendamentos.id))
    .where(and(eq(pre_agendamento_itens.tenant_id, tenantId), eq(pre_agendamentos.tenant_id, tenantId), eq(pre_agendamentos.status, "active")));
  const activeRefIds = new Set(active.map(x => x.referencia_id));
  const elegiveisPorReferencia = new Map<string, {
    item: typeof itens[number];
    referencia: typeof refs[number];
    quantidade_cortada: number;
  }>();
  itens.filter(item => {
    const ref = refsMap.get(item.referencia_id!);
    return !!ref
      && (ref.quantidade_cortada ?? 0) > 0
      && ultimoCorte.has(ref.id)
      && !activeRefIds.has(ref.id);
  }).forEach(item => {
    const ref = refsMap.get(item.referencia_id!)!;
    const quantidadeCortada = ref.quantidade_cortada ?? 0;
    if (!elegiveisPorReferencia.has(ref.id)) {
      elegiveisPorReferencia.set(ref.id, {
        item,
        referencia: ref,
        quantidade_cortada: Math.max(0, quantidadeCortada),
      });
    }
  });
  const elegiveis = [...elegiveisPorReferencia.values()];
  return pedidosTenant.map(pedido => ({
    pedido,
    produtos: elegiveis.filter(e => e.item.pedido_id === pedido.id),
  })).filter(group => group.produtos.length > 0);
}

const CORRECAO_MARCO_CORTE = "CORRECAO_ADMIN_MARCO_CORTE";
const FASES_KANBAN = [
  "inicio", "espera", "modelagem", "tecido", "risco", "corte",
  "beneficiamento", "costura", "lavanderia", "acabamento",
  "passadoria", "expedicao", "faturamento", "concluido",
] as const;

function fasePosteriorAoCorte(fase: string): boolean {
  return FASES_KANBAN.indexOf(fase as typeof FASES_KANBAN[number]) > FASES_KANBAN.indexOf("corte");
}

async function recalcularPreAgendamento(tenantId: string, preId: string, executor: any = db) {
  const ajustes = await executor.select().from(pre_agendamento_ajustes).where(and(
    eq(pre_agendamento_ajustes.tenant_id, tenantId), eq(pre_agendamento_ajustes.pre_agendamento_id, preId),
  ));
  const itens = await executor.select().from(pre_agendamento_itens).where(and(
    eq(pre_agendamento_itens.tenant_id, tenantId), eq(pre_agendamento_itens.pre_agendamento_id, preId),
  ));
  const subtotal = itens.reduce((sum, item) => sum + item.valor_total_cents, 0);
  const sinais = ajustes.filter(a => a.tipo === "signal").reduce((sum, a) => sum + a.valor_cents, 0);
  const descontos = ajustes.filter(a => a.tipo === "discount").reduce((sum, a) => sum + a.valor_cents, 0);
  const acrescimos = ajustes.filter(a => a.tipo === "addition").reduce((sum, a) => sum + a.valor_cents, 0);
  const total = Math.max(0, subtotal + acrescimos - descontos - sinais);
  const [pre] = await executor.update(pre_agendamentos).set({
    subtotal_cents: subtotal, sinais_cents: sinais, descontos_cents: descontos,
    acrescimos_cents: acrescimos, total_cents: total, updated_at: new Date(),
  }).where(and(eq(pre_agendamentos.id, preId), eq(pre_agendamentos.tenant_id, tenantId))).returning();
  return pre;
}

async function detalhePreAgendamento(tenantId: string, preId: string) {
  const [pre] = await db.select().from(pre_agendamentos).where(and(eq(pre_agendamentos.id, preId), eq(pre_agendamentos.tenant_id, tenantId)));
  if (!pre) return null;
  const [itens, ajustes, pedidoRows] = await Promise.all([
    db.select().from(pre_agendamento_itens).where(and(eq(pre_agendamento_itens.tenant_id, tenantId), eq(pre_agendamento_itens.pre_agendamento_id, preId))),
    db.select().from(pre_agendamento_ajustes).where(and(eq(pre_agendamento_ajustes.tenant_id, tenantId), eq(pre_agendamento_ajustes.pre_agendamento_id, preId))).orderBy(asc(pre_agendamento_ajustes.created_at)),
    db.select({ id: pedidos.id, numero: pedidos.numero, numero_pedido: pedidos.numero_pedido })
      .from(pedidos)
      .where(and(eq(pedidos.id, pre.pedido_id), eq(pedidos.tenant_id, tenantId))),
  ]);
  const pedido = pedidoRows[0] ?? { id: pre.pedido_id, numero: null, numero_pedido: null };
  return {
    ...pre,
    criado_em: pre.created_at,
    pedido,
    cliente: {
      nome: pre.cliente_nome,
      email: pre.cliente_email,
      telefone: pre.cliente_telefone,
      endereco: pre.endereco_cliente,
      cep: pre.cep_cliente,
      cidade: pre.cidade_cliente,
      uf: pre.uf_cliente,
    },
    produtos: itens.map(item => ({
      item_id: item.pedido_item_id,
      referencia_id: item.referencia_id,
      referencia: item.referencia,
      descricao: item.descricao,
      quantidade_corte: item.quantidade_cortada,
      valor_unitario_cents: item.valor_unitario_cents,
      total_cents: item.valor_total_cents,
    })),
    ajustes: ajustes.map(ajuste => ({
      ...ajuste,
      source: ajuste.origem,
    })),
  };
}

// ─── PRÉ-AGENDAMENTOS ───────────────────────────────────────────────────────
router.get("/kanban/pre-agendamentos/eligiveis", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const groups = await obterElegiveisPreAgendamento(req.tenantId!, req.query.pedido_id as string | undefined);
  const response = await Promise.all(groups.map(async ({ pedido, produtos }) => {
    const sinais = await db.select().from(pedido_sinais).where(and(eq(pedido_sinais.tenant_id, req.tenantId!), eq(pedido_sinais.pedido_id, pedido.id)));
    return {
      pedido: { id: pedido.id, numero: pedido.numero_pedido ?? pedido.numero, nome_cliente: pedido.nome_cliente },
      cliente: { nome: pedido.nome_cliente, email: pedido.email_cliente, telefone: pedido.telefone_cliente, endereco: pedido.endereco_cliente, cep: pedido.cep_cliente, cidade: pedido.cidade_cliente, uf: pedido.uf_cliente },
      ajustes_pedido: { sinais, desconto_tipo: pedido.desconto_tipo, desconto_valor: pedido.desconto_valor, acrescimo_tipo: pedido.acrescimo_tipo, acrescimo_valor: pedido.acrescimo_valor },
      produtos: produtos.map(({ item, referencia, quantidade_cortada }) => ({
        item_id: item.id,
        referencia_id: referencia.id,
        referencia: referencia.codigo,
        descricao: item.descricao ?? referencia.descricao,
        quantidade_corte: quantidade_cortada,
        valor_unitario_cents: item.valor_unitario ?? 0,
        total_cents: quantidade_cortada * (item.valor_unitario ?? 0),
      })),
    };
  }));
  res.json(response);
});

router.get("/kanban/pre-agendamentos/diagnostico", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  if (!await requireTenantMembershipManager(req, res, req.tenantId!)) return;
  const numeroPedido = String(req.query.pedido_numero ?? "").trim();
  if (!numeroPedido) {
    res.status(400).json({ error: "pedido_numero é obrigatório" });
    return;
  }

  const [pedido] = await db.select().from(pedidos).where(and(
    eq(pedidos.tenant_id, req.tenantId!),
    sql`(${pedidos.numero_pedido} = ${numeroPedido} OR ${pedidos.numero} = ${numeroPedido})`,
  )).limit(1);
  if (!pedido) {
    res.status(404).json({ error: "Pedido não encontrado neste tenant" });
    return;
  }

  const itens = await db.select().from(itens_pedido).where(and(
    eq(itens_pedido.tenant_id, req.tenantId!),
    eq(itens_pedido.pedido_id, pedido.id),
    sql`${itens_pedido.referencia_id} IS NOT NULL`,
  ));
  const refIds = [...new Set(itens.map(item => item.referencia_id!).filter(Boolean))];
  const refs = refIds.length
    ? await db.select().from(referencias).where(and(
        eq(referencias.tenant_id, req.tenantId!),
        inArray(referencias.id, refIds),
      ))
    : [];
  const movs = refIds.length
    ? await db.select().from(movimentacoes).where(and(
        eq(movimentacoes.tenant_id, req.tenantId!),
        inArray(movimentacoes.referencia_id, refIds),
      ))
    : [];
  const ativos = refIds.length
    ? await db.select({ referencia_id: pre_agendamento_itens.referencia_id })
        .from(pre_agendamento_itens)
        .innerJoin(pre_agendamentos, eq(pre_agendamento_itens.pre_agendamento_id, pre_agendamentos.id))
        .where(and(
          eq(pre_agendamento_itens.tenant_id, req.tenantId!),
          eq(pre_agendamentos.tenant_id, req.tenantId!),
          eq(pre_agendamentos.status, "active"),
          inArray(pre_agendamento_itens.referencia_id, refIds),
        ))
    : [];
  const ativosSet = new Set(ativos.map(item => item.referencia_id));

  res.json({
    pedido: {
      id: pedido.id,
      numero: pedido.numero_pedido ?? pedido.numero,
      cliente: pedido.nome_cliente,
    },
    produtos: refs.map(ref => {
      const temSaidaCorte = movs.some(mov => mov.referencia_id === ref.id && mov.fase_origem === "corte");
      const bloqueadoPreAtivo = ativosSet.has(ref.id);
      const posteriorAoCorte = fasePosteriorAoCorte(ref.fase_atual);
      const motivos: string[] = [];
      if (!posteriorAoCorte) motivos.push("A referência ainda não está em uma fase posterior ao Corte.");
      if (!temSaidaCorte) motivos.push("Não existe movimentação registrada de saída do Corte.");
      if ((ref.quantidade_cortada ?? 0) <= 0) motivos.push("A quantidade cortada não foi registrada.");
      if (bloqueadoPreAtivo) motivos.push("A referência já pertence a um pré-agendamento ativo.");
      return {
        referencia_id: ref.id,
        referencia: ref.codigo,
        descricao: ref.descricao,
        fase_atual: ref.fase_atual,
        quantidade_atual: ref.quantidade ?? 0,
        quantidade_cortada: ref.quantidade_cortada ?? 0,
        tem_saida_corte: temSaidaCorte,
        bloqueado_pre_ativo: bloqueadoPreAtivo,
        elegivel: posteriorAoCorte && temSaidaCorte && (ref.quantidade_cortada ?? 0) > 0 && !bloqueadoPreAtivo,
        pode_corrigir_marco_corte: posteriorAoCorte
          && (!temSaidaCorte || (ref.quantidade_cortada ?? 0) <= 0)
          && !bloqueadoPreAtivo,
        motivos,
      };
    }),
  });
});

router.post("/kanban/referencias/:id/corrigir-marco-corte", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  if (!await requireTenantMembershipManager(req, res, req.tenantId!)) return;
  const quantidadeCortada = Number(req.body?.quantidade_cortada);
  const motivo = String(req.body?.motivo ?? "").trim();
  if (!Number.isSafeInteger(quantidadeCortada) || quantidadeCortada <= 0) {
    res.status(400).json({ error: "quantidade_cortada deve ser um inteiro maior que zero" });
    return;
  }
  if (!motivo) {
    res.status(400).json({ error: "motivo é obrigatório" });
    return;
  }

  try {
    const resultado = await db.transaction(async tx => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`${req.tenantId!}:${req.params.id}:marco-corte`}))`);
      const [ref] = await tx.select().from(referencias).where(and(
        eq(referencias.id, req.params.id),
        eq(referencias.tenant_id, req.tenantId!),
      )).limit(1);
      if (!ref) return { error: "Referência não encontrada", status: 404 as const };
      if (!fasePosteriorAoCorte(ref.fase_atual)) {
        return { error: "A correção só é permitida para referências em fase posterior ao Corte", status: 409 as const };
      }
      const sincronizarEstoqueExistente = async () => {
        await tx.update(estoque).set({
          qtd_cortada: quantidadeCortada,
          atualizado_em: new Date(),
        }).where(and(
          eq(estoque.referencia_id, ref.id),
          eq(estoque.tenant_id, req.tenantId!),
        ));
      };

      const movs = await tx.select().from(movimentacoes).where(and(
        eq(movimentacoes.tenant_id, req.tenantId!),
        eq(movimentacoes.referencia_id, ref.id),
      )).orderBy(asc(movimentacoes.created_at));
      const saidaCorte = [...movs].reverse().find(mov => mov.fase_origem === "corte");
      if (saidaCorte && (ref.quantidade_cortada ?? 0) === quantidadeCortada) {
        await sincronizarEstoqueExistente();
        return { referencia: ref, movimentacao: saidaCorte, inserted: false };
      }
      const [preAgendamentoAtivo] = await tx.select({ id: pre_agendamentos.id })
        .from(pre_agendamento_itens)
        .innerJoin(pre_agendamentos, eq(pre_agendamento_itens.pre_agendamento_id, pre_agendamentos.id))
        .where(and(
          eq(pre_agendamento_itens.tenant_id, req.tenantId!),
          eq(pre_agendamento_itens.referencia_id, ref.id),
          eq(pre_agendamentos.tenant_id, req.tenantId!),
          eq(pre_agendamentos.status, "active"),
        ))
        .limit(1);
      if (preAgendamentoAtivo) {
        return { error: "A referência já pertence a um pré-agendamento ativo", status: 409 as const };
      }
      if (saidaCorte) {
        if ((ref.quantidade_cortada ?? 0) > 0) {
          return { error: "Já existe uma saída do Corte com dados diferentes; correção automática bloqueada", status: 409 as const };
        }
        const quantidadesHistoricas = [
          saidaCorte.quantidade ?? 0,
          saidaCorte.quantidade_conferida ?? 0,
        ].filter(valor => valor > 0);
        if (quantidadesHistoricas.some(valor => valor !== quantidadeCortada)) {
          return { error: "A saída do Corte já possui outra quantidade positiva; correção automática bloqueada", status: 409 as const };
        }
        const observacoesExistentes = String(saidaCorte.observacoes ?? "").trim();
        const [movimentacaoAtualizada] = await tx.update(movimentacoes).set({
          quantidade: quantidadeCortada,
          quantidade_conferida: quantidadeCortada,
          perda_quantidade: 0,
          variacao_quantidade: 0,
          observacoes: [observacoesExistentes, `${CORRECAO_MARCO_CORTE} | ${motivo}`].filter(Boolean).join("\n"),
        }).where(and(
          eq(movimentacoes.id, saidaCorte.id),
          eq(movimentacoes.tenant_id, req.tenantId!),
        )).returning();
        const [referenciaAtualizada] = await tx.update(referencias).set({
          quantidade_cortada: quantidadeCortada,
          updated_at: new Date(),
        }).where(and(
          eq(referencias.id, ref.id),
          eq(referencias.tenant_id, req.tenantId!),
        )).returning();
        await sincronizarEstoqueExistente();
        return { referencia: referenciaAtualizada, movimentacao: movimentacaoAtualizada, inserted: false };
      }
      if ((ref.quantidade_cortada ?? 0) > 0 && ref.quantidade_cortada !== quantidadeCortada) {
        return { error: "A referência já possui outra quantidade cortada; correção automática bloqueada", status: 409 as const };
      }

      const primeiroMovimentoPosCorte = movs.find(mov =>
        fasePosteriorAoCorte(mov.fase_origem) || fasePosteriorAoCorte(mov.fase_destino),
      );
      if (!primeiroMovimentoPosCorte) {
        return { error: "Não há histórico pós-Corte suficiente para reconstruir o marco", status: 409 as const };
      }
      const faseDestinoMarco = fasePosteriorAoCorte(primeiroMovimentoPosCorte.fase_origem)
        ? primeiroMovimentoPosCorte.fase_origem
        : primeiroMovimentoPosCorte.fase_destino;
      const criadoEm = new Date(Math.max(
        0,
        new Date(primeiroMovimentoPosCorte.created_at).getTime() - 1,
      ));
      const observacoes = `${CORRECAO_MARCO_CORTE} | ${motivo}`;

      const [movimentacao] = await tx.insert(movimentacoes).values({
        tenant_id: req.tenantId!,
        referencia_id: ref.id,
        fase_origem: "corte",
        fase_destino: faseDestinoMarco,
        user_id: req.user?.id ?? null,
        cmp: 0,
        cmo: 0,
        cmo_previsto: 0,
        quantidade: quantidadeCortada,
        quantidade_conferida: quantidadeCortada,
        perda_quantidade: 0,
        variacao_quantidade: 0,
        data_real: criadoEm,
        observacoes,
        created_at: criadoEm,
      }).returning();
      const [referenciaAtualizada] = await tx.update(referencias).set({
        quantidade_cortada: quantidadeCortada,
        updated_at: new Date(),
      }).where(and(
        eq(referencias.id, ref.id),
        eq(referencias.tenant_id, req.tenantId!),
      )).returning();
      await sincronizarEstoqueExistente();

      return { referencia: referenciaAtualizada, movimentacao, inserted: true };
    });

    if ("error" in resultado) {
      res.status(resultado.status).json({ error: resultado.error });
      return;
    }
    res.json({
      ok: true,
      referencia_id: resultado.referencia.id,
      referencia: resultado.referencia.codigo,
      fase_atual: resultado.referencia.fase_atual,
      quantidade_cortada: resultado.referencia.quantidade_cortada,
      movimentacao_id: resultado.movimentacao.id,
      inserted: resultado.inserted,
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? "Não foi possível corrigir o marco do Corte" });
  }
});

router.get("/kanban/pre-agendamentos", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const conditions = [eq(pre_agendamentos.tenant_id, req.tenantId!)];
  if (req.query.status) conditions.push(eq(pre_agendamentos.status, req.query.status as string));
  const rows = await db.select().from(pre_agendamentos).where(and(...conditions)).orderBy(desc(pre_agendamentos.created_at));
  const pedidoIds = [...new Set(rows.map(row => row.pedido_id))];
  const pedidoRows = pedidoIds.length
    ? await db.select({ id: pedidos.id, numero: pedidos.numero, numero_pedido: pedidos.numero_pedido })
      .from(pedidos)
      .where(and(eq(pedidos.tenant_id, req.tenantId!), inArray(pedidos.id, pedidoIds)))
    : [];
  const pedidoMap = new Map(pedidoRows.map(pedido => [pedido.id, pedido]));
  res.json(rows.map(row => ({
    ...row,
    criado_em: row.created_at,
    pedido: pedidoMap.get(row.pedido_id) ?? { id: row.pedido_id, numero: null, numero_pedido: null },
    cliente: {
      nome: row.cliente_nome,
      email: row.cliente_email,
      telefone: row.cliente_telefone,
      endereco: row.endereco_cliente,
      cep: row.cep_cliente,
      cidade: row.cidade_cliente,
      uf: row.uf_cliente,
    },
    produtos: [],
    ajustes: [],
  })));
});

router.get("/kanban/pre-agendamentos/:id", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const result = await detalhePreAgendamento(req.tenantId!, req.params.id);
  if (!result) { res.status(404).json({ error: "Pré-agendamento não encontrado" }); return; }
  res.json(result);
});

router.post("/kanban/pre-agendamentos", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const { pedido_id, referencia_ids, ajustes = [] } = req.body;
  if (!pedido_id || !Array.isArray(referencia_ids) || !referencia_ids.length || !Array.isArray(ajustes)) { res.status(400).json({ error: "pedido_id, referencia_ids e ajustes válidos são obrigatórios" }); return; }
  const uniqueRefIds = [...new Set(referencia_ids)] as string[];
  const [group] = await obterElegiveisPreAgendamento(tenantId, pedido_id);
  if (!group || uniqueRefIds.some(id => !group.produtos.some(p => p.referencia.id === id))) { res.status(400).json({ error: "Uma ou mais referências não pertencem ao pedido ou não estão elegíveis" }); return; }
  const invalid = ajustes.some((a: any) => {
    const valor = inteiroCents(a?.valor_cents);
    return !["signal", "discount", "addition"].includes(a?.tipo) || !a.descricao || valor === null || valor <= 0;
  });
  if (invalid) { res.status(400).json({ error: "Ajustes manuais devem ter tipo, descrição e valor_cents inteiro" }); return; }
  const year = new Date().getFullYear();
  const prefix = `PRE-${year}-`;
  const [{ maxNumero }] = await db.select({ maxNumero: max(pre_agendamentos.numero) }).from(pre_agendamentos).where(and(eq(pre_agendamentos.tenant_id, tenantId), like(pre_agendamentos.numero, `${prefix}%`)));
  const sequence = maxNumero ? Number(maxNumero.split("-").pop()) + 1 : 1;
  const [pre] = await db.insert(pre_agendamentos).values({
    tenant_id: tenantId, pedido_id, numero: `${prefix}${String(sequence).padStart(4, "0")}`, status: "active",
    cliente_nome: group.pedido.nome_cliente, cliente_email: group.pedido.email_cliente, cliente_telefone: group.pedido.telefone_cliente,
    endereco_cliente: group.pedido.endereco_cliente, cep_cliente: group.pedido.cep_cliente, cidade_cliente: group.pedido.cidade_cliente, uf_cliente: group.pedido.uf_cliente,
  }).returning();
  const selected = group.produtos.filter(p => uniqueRefIds.includes(p.referencia.id));
  await db.insert(pre_agendamento_itens).values(selected.map(({ item, referencia, quantidade_cortada }) => ({
    tenant_id: tenantId, pre_agendamento_id: pre.id, pedido_item_id: item.id, referencia_id: referencia.id, referencia: referencia.codigo,
    descricao: item.descricao ?? referencia.descricao, quantidade_cortada, valor_unitario_cents: item.valor_unitario ?? 0, valor_total_cents: quantidade_cortada * (item.valor_unitario ?? 0),
  })));
  const sinaisPedido = await db.select().from(pedido_sinais)
    .where(and(eq(pedido_sinais.tenant_id, tenantId), eq(pedido_sinais.pedido_id, pedido_id)));
  const sinalLegadoCents = group.pedido.valor_sinal_cents
    ?? Math.round(Number(group.pedido.valor_sinal ?? 0) * 100);
  const orderAdjustments = sinaisPedido.length
    ? sinaisPedido.map(s => ({ tipo: "signal", descricao: s.descricao, valor_cents: s.valor_cents, origem: "order" }))
    : sinalLegadoCents > 0
      ? [{ tipo: "signal", descricao: "Sinal registrado no pedido", valor_cents: sinalLegadoCents, origem: "order" }]
      : [];
  const subtotal = selected.reduce((sum, p) => sum + p.quantidade_cortada * (p.item.valor_unitario ?? 0), 0);
  const discount = group.pedido.desconto_tipo === "percentual" ? Math.round(subtotal * ((group.pedido.desconto_valor ?? 0) / 100)) : (group.pedido.desconto_valor ?? 0);
  const addition = group.pedido.acrescimo_tipo === "percentual" ? Math.round(subtotal * ((group.pedido.acrescimo_valor ?? 0) / 100)) : (group.pedido.acrescimo_valor ?? 0);
  if (discount) orderAdjustments.push({ tipo: "discount", descricao: "Desconto do pedido", valor_cents: discount, origem: "order" });
  if (addition) orderAdjustments.push({ tipo: "addition", descricao: "Acréscimo do pedido", valor_cents: addition, origem: "order" });
  const allAdjustments = [...orderAdjustments, ...ajustes.map((a: any) => ({ tipo: a.tipo, descricao: a.descricao, valor_cents: a.valor_cents, origem: "manual" }))];
  if (allAdjustments.length) await db.insert(pre_agendamento_ajustes).values(allAdjustments.map(a => ({ ...a, tenant_id: tenantId, pre_agendamento_id: pre.id })) as any);
  await recalcularPreAgendamento(tenantId, pre.id);
  res.status(201).json(await detalhePreAgendamento(tenantId, pre.id));
});

router.post("/kanban/pre-agendamentos/:id/ajustes", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { tipo, descricao, valor_cents } = req.body;
  const valorAjuste = inteiroCents(valor_cents);
  if (!["signal", "discount", "addition"].includes(tipo) || !descricao || valorAjuste === null || valorAjuste <= 0) { res.status(400).json({ error: "tipo, descrição e valor_cents inteiro positivo são obrigatórios" }); return; }
  const alterado = await db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`${req.tenantId!}:${req.params.id}:pre-finance`}))`);
    const [pre] = await tx.select().from(pre_agendamentos).where(and(eq(pre_agendamentos.id, req.params.id), eq(pre_agendamentos.tenant_id, req.tenantId!), eq(pre_agendamentos.status, "active")));
    if (!pre) return false;
    await tx.insert(pre_agendamento_ajustes).values({ tenant_id: req.tenantId!, pre_agendamento_id: pre.id, tipo, descricao, valor_cents, origem: "manual" });
    await recalcularPreAgendamento(req.tenantId!, pre.id, tx);
    return true;
  });
  if (!alterado) { res.status(404).json({ error: "Pré-agendamento ativo não encontrado" }); return; }
  res.json(await detalhePreAgendamento(req.tenantId!, req.params.id));
});

router.delete("/kanban/pre-agendamentos/:id/ajustes/:adjustmentId", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const resultado = await db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`${req.tenantId!}:${req.params.id}:pre-finance`}))`);
    const [pre] = await tx.select({ id: pre_agendamentos.id }).from(pre_agendamentos).where(and(
      eq(pre_agendamentos.id, req.params.id),
      eq(pre_agendamentos.tenant_id, req.tenantId!),
      eq(pre_agendamentos.status, "active"),
    ));
    if (!pre) return "frozen";
    const [removed] = await tx.delete(pre_agendamento_ajustes).where(and(eq(pre_agendamento_ajustes.id, req.params.adjustmentId), eq(pre_agendamento_ajustes.pre_agendamento_id, req.params.id), eq(pre_agendamento_ajustes.tenant_id, req.tenantId!), eq(pre_agendamento_ajustes.origem, "manual"))).returning();
    if (!removed) return "missing";
    await recalcularPreAgendamento(req.tenantId!, req.params.id, tx);
    return "ok";
  });
  if (resultado === "frozen") { res.status(409).json({ error: "Ajustes de pré-agendamento finalizado não podem ser alterados" }); return; }
  if (resultado === "missing") { res.status(404).json({ error: "Ajuste manual não encontrado" }); return; }
  res.json(await detalhePreAgendamento(req.tenantId!, req.params.id));
});

router.post("/kanban/pre-agendamentos/:id/reverter", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const resultado = await db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`${tenantId}:${req.params.id}:pre-finance`}))`);
    const [pre] = await tx.select().from(pre_agendamentos).where(and(eq(pre_agendamentos.id, req.params.id), eq(pre_agendamentos.tenant_id, tenantId), eq(pre_agendamentos.status, "active")));
    if (!pre) return "missing";
    const itens = await tx.select({ referencia_id: pre_agendamento_itens.referencia_id }).from(pre_agendamento_itens).where(and(eq(pre_agendamento_itens.tenant_id, tenantId), eq(pre_agendamento_itens.pre_agendamento_id, pre.id)));
    const refIds = itens.map(i => i.referencia_id);
    const faturado = refIds.length ? await tx.select({ id: estoque.id }).from(estoque).where(and(eq(estoque.tenant_id, tenantId), inArray(estoque.referencia_id, refIds), eq(estoque.faturado, true))).limit(1) : [];
    if (faturado.length) return "faturado";
    await tx.update(pre_agendamentos).set({ status: "reverted", reverted_at: new Date(), reverted_by: req.user?.id ?? null, reverted_reason: req.body?.motivo ?? null, updated_at: new Date() }).where(and(eq(pre_agendamentos.id, pre.id), eq(pre_agendamentos.tenant_id, tenantId)));
    return "ok";
  });
  if (resultado === "missing") { res.status(404).json({ error: "Pré-agendamento ativo não encontrado" }); return; }
  if (resultado === "faturado") { res.status(409).json({ error: "Reversão bloqueada: há estoque faturado vinculado" }); return; }
  res.json(await detalhePreAgendamento(tenantId, req.params.id));
});

// Gerar número de pedido: PED-YY-NNN
// Ex: PED-26-004 (pedido 4 de 2026)
async function gerarNumeroPedido(tenantId: string): Promise<string> {
  const ano = new Date().getFullYear().toString().slice(-2);
  const prefix = `PED-${ano}-`;
  const result = await db.select({ maxNum: max(pedidos.numero_pedido) })
    .from(pedidos)
    .where(and(eq(pedidos.tenant_id, tenantId), like(pedidos.numero_pedido, `${prefix}%`)));
  const maxNum = result[0]?.maxNum;
  let seq = 1;
  if (maxNum) {
    const parts = maxNum.split("-");
    const lastSeq = parseInt(parts[parts.length - 1] ?? "0", 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }
  return `${prefix}${String(seq).padStart(3, "0")}`;
}

// GET /kanban/pedidos — lista com itens incluídos
router.get("/kanban/pedidos", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const { status } = req.query;
  const conditions = [eq(pedidos.tenant_id, tenantId)];
  if (status) conditions.push(eq(pedidos.status, status as string));

  const pedidosList = await db.select().from(pedidos)
    .where(and(...conditions))
    .orderBy(desc(pedidos.created_at));

  if (pedidosList.length === 0) { res.json([]); return; }

  const pedidoIds = pedidosList.map(p => p.id);
  const todosItens = await db.select().from(itens_pedido)
    .where(and(inArray(itens_pedido.pedido_id, pedidoIds), eq(itens_pedido.tenant_id, tenantId)));

  const result = pedidosList.map(p => {
    const meus = todosItens.filter(i => i.pedido_id === p.id);
    return mapPedidoParaFrontend(p, meus);
  });

  res.json(result);
});

// POST /kanban/pedidos — cria pedido Manus-style com itens
router.post("/kanban/pedidos", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const {
    nomeCliente, emailCliente, telefoneCliente, prazoEntrega, observacoes,
    valorSinal, acrescimoTipo, acrescimoValor, descontoTipo, descontoValor,
    itens: itensSend = [],
    // legado (origem orcamento)
    numero, cliente_id, data_entrega_prevista, valor_total, origem,
    orcamento_id, orcamento_numero,
  } = req.body;

  if (!nomeCliente && !numero) {
    res.status(400).json({ error: "nomeCliente é obrigatório" }); return;
  }

  // Auto-gerar numero_pedido
  const numeroPedido = await gerarNumeroPedido(tenantId);

  // Calcular valorTotal a partir dos itens
  let valorTotal = 0;
  const itensList: any[] = Array.isArray(itensSend) ? itensSend : [];
  itensList.forEach((item: any) => {
    valorTotal += (item.valorUnitario || 0) * (item.quantidadeTotal || 0);
  });

  // Calcular acréscimo e desconto
  const acrTipo = acrescimoTipo || "valor";
  const acrVal = acrescimoValor || 0;
  const dscTipo = descontoTipo || "valor";
  const dscVal = descontoValor || 0;

  let valorAcrescimo = acrTipo === "valor" ? acrVal : Math.round(valorTotal * (acrVal / 100));
  let valorDesconto = dscTipo === "valor" ? dscVal : Math.round(valorTotal * (dscVal / 100));
  const valorFinal = valorTotal + valorAcrescimo - valorDesconto;

  const [novoPedido] = await db.insert(pedidos).values({
    tenant_id: tenantId,
    numero: numeroPedido,
    numero_pedido: numeroPedido,
    nome_cliente: nomeCliente || null,
    email_cliente: emailCliente || null,
    telefone_cliente: telefoneCliente || null,
    prazo_entrega: prazoEntrega ? new Date(prazoEntrega) : null,
    data_entrega_prevista: prazoEntrega ? new Date(prazoEntrega) : (data_entrega_prevista ? new Date(data_entrega_prevista) : null),
    data_pedido: new Date(),
    status: "pendente",
    valor_total: String(valorFinal / 100),
    valor_total_cents: valorFinal,
    valor_sinal: String((valorSinal || 0) / 100),
    valor_sinal_cents: valorSinal || 0,
    acrescimo_tipo: acrTipo,
    acrescimo_valor: acrVal,
    desconto_tipo: dscTipo,
    desconto_valor: dscVal,
    observacoes: observacoes || null,
    origem: origem || "manual",
    orcamento_id: orcamento_id || null,
    orcamento_numero: orcamento_numero || null,
    cliente_id: cliente_id || null,
  }).returning();

  // Criar itens do pedido
  if (itensList.length > 0) {
    await db.insert(itens_pedido).values(
      itensList.map((item: any) => ({
        tenant_id: tenantId,
        pedido_id: novoPedido.id,
        referencia: item.referencia,
        descricao: item.descricao || null,
        cor_nome: item.corNome || null,
        grade_id: item.gradeId || null,
        quantidade_total: item.quantidadeTotal || 0,
        quantidade_por_tamanho: item.quantidadePorTamanho || {},
        valor_unitario: item.valorUnitario || 0,
        cmp: item.cmp || 0,
      }))
    );
  }

  const todosItens = await db.select().from(itens_pedido)
    .where(eq(itens_pedido.pedido_id, novoPedido.id));

  // Gerar conta a receber automaticamente ao criar o pedido
  if (valorFinal > 0) {
    await db.insert(contas_a_receber).values({
      tenant_id: tenantId,
      cliente_id: cliente_id || null,
      referencia_id: null,
      descricao: `Pedido ${numeroPedido} — ${nomeCliente || 'Cliente'}`,
      valor: String(valorFinal / 100),
      data_vencimento: prazoEntrega ? new Date(prazoEntrega) : null,
      status: "pendente",
    });
  }

  res.status(201).json(mapPedidoParaFrontend(novoPedido, todosItens));
});

// GET /kanban/pedidos/:id/detail — detalhe completo (itens_pedido)
router.get("/kanban/pedidos/:id/detail", requireAuth, async (req: AuthenticatedRequest, res) => {
  const [pedido] = await db.select().from(pedidos)
    .where(and(eq(pedidos.id, req.params.id), inArray(pedidos.tenant_id, req.userTenantIds ?? [])));
  if (!pedido) { res.status(404).json({ error: "Pedido não encontrado" }); return; }

  const todosItens = await db.select().from(itens_pedido)
    .where(eq(itens_pedido.pedido_id, pedido.id));

  // Buscar nomes de grades
  const gradeIds = [...new Set(todosItens.map(i => i.grade_id).filter(Boolean))];
  const gradesData = gradeIds.length > 0
    ? await db.select().from(grades).where(inArray(grades.id, gradeIds as string[]))
    : [];

  const mapped = mapPedidoParaFrontend(pedido, todosItens);
  const itensComGrade = mapped.itens.map(item => {
    const grade = gradesData.find(g => g.id === item.gradeId);
    return { ...item, gradeNome: grade?.nome || "", gradeTamanhos: grade?.tamanhos || [] };
  });

  res.json({ ...mapped, itens: itensComGrade });
});

// POST /kanban/pedidos/:id/gerar-cartao-referencia
// Gera UM cartão Kanban consolidando todos os itens da mesma referência
router.post("/kanban/pedidos/:id/gerar-cartao-referencia", requireAuth, async (req: AuthenticatedRequest, res) => {
  const [pedido] = await db.select().from(pedidos)
    .where(and(eq(pedidos.id, req.params.id), inArray(pedidos.tenant_id, req.userTenantIds ?? [])));
  if (!pedido) { res.status(404).json({ error: "Pedido não encontrado" }); return; }

  const { referencia: codigoRef } = req.body;
  if (!codigoRef) { res.status(400).json({ error: "referencia é obrigatório" }); return; }

  // Buscar itens sem cartão desta referência
  const itensSemCartao = await db.select().from(itens_pedido)
    .where(and(
      eq(itens_pedido.pedido_id, pedido.id),
      eq(itens_pedido.referencia, codigoRef),
      sql`${itens_pedido.referencia_id} IS NULL`,
      sql`COALESCE(${itens_pedido.is_aviamento}, false) = false`,
      sql`COALESCE(${itens_pedido.is_desenvolvimento}, false) = false`,
    ));

  if (itensSemCartao.length === 0) {
    res.json({ cartoesGerados: 0, message: "Não há itens produtivos desta referência aguardando cartão" });
    return;
  }

  // Consolidar quantidades e dados de todos os itens
  const qtdTotal = itensSemCartao.reduce((s, i) => s + (i.quantidade_total || 0), 0);
  const primeiroItem = itensSemCartao[0];
  const descricao = primeiroItem?.descricao || codigoRef;
  const cmp = primeiroItem?.cmp || 0;

  // Cores: unir todas as cores distintas
  const coresUnicas = [...new Set(itensSemCartao.map(i => i.cor_nome).filter(Boolean))];
  const coresStr = coresUnicas.join(", ") || null;

  // Valor de venda: pegar do primeiro item (valor_unitario está em centavos → reais)
  const valorVenda = primeiroItem?.valor_unitario ? primeiroItem.valor_unitario / 100 : null;

  // Grade: buscar nome da grade do primeiro item
  let gradeNome: string | null = null;
  if (primeiroItem?.grade_id) {
    const [gradeRow] = await db.select({ nome: grades.nome })
      .from(grades)
      .where(eq(grades.id, primeiroItem.grade_id))
      .limit(1);
    gradeNome = gradeRow?.nome ?? null;
  }

  // Prazo de entrega do pedido
  const prazoEntrega = pedido.prazo_entrega ?? pedido.data_entrega_prevista ?? null;

  // Contar total de referências distintas do pedido para sufixo da OP
  const [{ totalRefs }] = await db.select({
    totalRefs: sql<number>`COUNT(DISTINCT ${itens_pedido.referencia})`,
  }).from(itens_pedido).where(and(
    eq(itens_pedido.pedido_id, pedido.id),
    sql`COALESCE(${itens_pedido.is_aviamento}, false) = false`,
    sql`COALESCE(${itens_pedido.is_desenvolvimento}, false) = false`,
  ));

  // Gerar número de OP: OP-YY-{pedSeq}-{totalRefs}
  const numeroOP = gerarNumeroOP(pedido.numero_pedido ?? pedido.numero ?? null, Number(totalRefs ?? 1));

  // Criar cartão consolidado na tabela referencias
  const [novaRef] = await db.insert(referencias).values({
    tenant_id: pedido.tenant_id,
    codigo: codigoRef,
    descricao: descricao,
    descricao_modelo: descricao,
    cliente_id: pedido.cliente_id ?? null,
    nome_cliente: pedido.nome_cliente ?? null,
    referencia_cliente: primeiroItem?.referencia_cliente ?? null,
    numero_pedido: pedido.numero_pedido ?? pedido.numero ?? null,
    numero_op: numeroOP,
    pedido_id: pedido.id,
    quantidade: qtdTotal,
    quantidade_total: qtdTotal,
    quantidade_inicial: qtdTotal,
    ficha_id: primeiroItem?.ficha_custo_id ?? null,
    plm_produto_id: primeiroItem?.plm_produto_id ?? null,
    plm_ficha_tecnica_id: primeiroItem?.plm_ficha_tecnica_id ?? null,
    cmp: cmp,
    valor_venda: valorVenda,
    cores: coresStr,
    grade: gradeNome,
    fase_atual: "inicio",
    data_prevista_entrega: prazoEntrega,
    previsao_conclusao: prazoEntrega,
    ativo: true,
  }).returning();

  // Atualizar itens com o ID do cartão gerado
  for (const item of itensSemCartao) {
    await db.update(itens_pedido)
      .set({ referencia_id: novaRef.id })
      .where(eq(itens_pedido.id, item.id));
  }

  res.status(201).json({ cartoesGerados: 1, cartao: novaRef });
});

// GET /kanban/pedidos/:id/cartoes — cartões gerados para o pedido
router.get("/kanban/pedidos/:id/cartoes", requireAuth, async (req: AuthenticatedRequest, res) => {
  const data = await db.select().from(referencias)
    .where(and(
      eq(referencias.pedido_id, req.params.id),
      inArray(referencias.tenant_id, req.userTenantIds ?? []),
    ));
  res.json(data);
});

// Helper: recalcula valor_total_cents aplicando desconto/acréscimo sobre a soma dos itens
async function recalcularTotalPedido(
  pedidoId: string,
  acrTipo: string, acrVal: number,
  dscTipo: string, dscVal: number,
): Promise<{ subtotal: number; valorFinal: number }> {
  const itens = await db.select().from(itens_pedido).where(eq(itens_pedido.pedido_id, pedidoId));
  const subtotal = itens.reduce((s, i) => s + (i.valor_unitario || 0) * (i.quantidade_total || 0), 0);
  const valorAcrescimo = acrTipo === "valor" ? acrVal : Math.round(subtotal * (acrVal / 100));
  const valorDesconto  = dscTipo === "valor" ? dscVal : Math.round(subtotal * (dscVal / 100));
  const valorFinal = Math.max(0, subtotal + valorAcrescimo - valorDesconto);
  return { subtotal, valorFinal };
}

// PATCH /kanban/pedidos/:id — atualizar pedido
router.patch("/kanban/pedidos/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const {
    nomeCliente, emailCliente, telefoneCliente, prazoEntrega, observacoes, status,
    valorSinal, acrescimoTipo, acrescimoValor, descontoTipo, descontoValor, valorTotal,
    cnpjCliente, enderecoCliente, cepCliente, cidadeCliente, ufCliente, idVhsysCliente,
    // legado
    numero, cliente_id, data_pedido, data_entrega_prevista,
  } = req.body;

  const updateData: Record<string, unknown> = { updated_at: new Date() };
  if (nomeCliente !== undefined) updateData.nome_cliente = nomeCliente;
  if (emailCliente !== undefined) updateData.email_cliente = emailCliente;
  if (telefoneCliente !== undefined) updateData.telefone_cliente = telefoneCliente;
  if (prazoEntrega !== undefined) updateData.prazo_entrega = prazoEntrega ? new Date(prazoEntrega) : null;
  if (observacoes !== undefined) updateData.observacoes = observacoes;
  if (status !== undefined) updateData.status = status;
  if (valorSinal !== undefined) { updateData.valor_sinal_cents = valorSinal; updateData.valor_sinal = String(valorSinal / 100); }
  if (acrescimoTipo !== undefined) updateData.acrescimo_tipo = acrescimoTipo;
  if (acrescimoValor !== undefined) updateData.acrescimo_valor = acrescimoValor;
  if (descontoTipo !== undefined) updateData.desconto_tipo = descontoTipo;
  if (descontoValor !== undefined) updateData.desconto_valor = descontoValor;
  if (valorTotal !== undefined) { updateData.valor_total_cents = valorTotal; updateData.valor_total = String(valorTotal / 100); }
  if (cnpjCliente !== undefined) updateData.cnpj_cliente = cnpjCliente;
  if (enderecoCliente !== undefined) updateData.endereco_cliente = enderecoCliente;
  if (cepCliente !== undefined) updateData.cep_cliente = cepCliente;
  if (cidadeCliente !== undefined) updateData.cidade_cliente = cidadeCliente;
  if (ufCliente !== undefined) updateData.uf_cliente = ufCliente;
  if (idVhsysCliente !== undefined) updateData.id_vhsys_cliente = idVhsysCliente;
  // legado
  if (numero !== undefined) { updateData.numero = numero; updateData.numero_pedido = numero; }
  if (cliente_id !== undefined) updateData.cliente_id = cliente_id;
  if (data_pedido !== undefined) updateData.data_pedido = data_pedido ? new Date(data_pedido) : null;
  if (data_entrega_prevista !== undefined) updateData.data_entrega_prevista = data_entrega_prevista ? new Date(data_entrega_prevista) : null;

  // Se desconto/acréscimo foi alterado (e valorTotal não foi passado explicitamente),
  // recalcular o valor total a partir dos itens + novo desconto/acréscimo
  const afetaTotal = (descontoTipo !== undefined || descontoValor !== undefined ||
                      acrescimoTipo !== undefined || acrescimoValor !== undefined);
  if (afetaTotal && valorTotal === undefined) {
    // Buscar o registro atual para obter valores que não foram alterados
    const [atual] = await db.select().from(pedidos)
      .where(and(eq(pedidos.id, req.params.id), inArray(pedidos.tenant_id, req.userTenantIds ?? [])));
    if (atual) {
      const acrTipo = acrescimoTipo ?? atual.acrescimo_tipo ?? "valor";
      const acrVal  = acrescimoValor ?? atual.acrescimo_valor ?? 0;
      const dscTipo = descontoTipo   ?? atual.desconto_tipo   ?? "valor";
      const dscVal  = descontoValor  ?? atual.desconto_valor  ?? 0;
      const { valorFinal } = await recalcularTotalPedido(req.params.id, acrTipo, acrVal, dscTipo, dscVal);
      updateData.valor_total_cents = valorFinal;
      updateData.valor_total = String(valorFinal / 100);
    }
  }

  const [data] = await db.update(pedidos)
    .set(updateData as any)
    .where(and(eq(pedidos.id, req.params.id), inArray(pedidos.tenant_id, req.userTenantIds ?? [])))
    .returning();
  if (!data) { res.status(404).json({ error: "Pedido não encontrado" }); return; }

  const todosItens = await db.select().from(itens_pedido)
    .where(eq(itens_pedido.pedido_id, data.id));
  res.json(mapPedidoParaFrontend(data, todosItens));
});

// POST /kanban/pedidos/:id/enviar-cliente-erp
// Sincroniza o cliente do pedido com o VhSys (busca por CNPJ ou id_vhsys salvo, cria se não existir)
router.post("/kanban/pedidos/:id/enviar-cliente-erp", requireAuth, async (req: AuthenticatedRequest, res) => {
  const [pedido] = await db.select().from(pedidos)
    .where(and(eq(pedidos.id, req.params.id), inArray(pedidos.tenant_id, req.userTenantIds ?? [])));
  if (!pedido) { res.status(404).json({ error: "Pedido não encontrado" }); return; }

  const nomeCliente = pedido.nome_cliente?.trim() || "";
  const cnpjCliente = pedido.cnpj_cliente?.trim() || "";
  const emailCliente = pedido.email_cliente?.trim() || "";
  const telefoneCliente = pedido.telefone_cliente?.trim() || "";
  const enderecoCliente = pedido.endereco_cliente?.trim() || "";
  const cepCliente = pedido.cep_cliente?.trim() || "";
  const cidadeCliente = pedido.cidade_cliente?.trim() || "";
  const ufCliente = pedido.uf_cliente?.trim() || "";
  const idVhsysSalvo = pedido.id_vhsys_cliente ? parseInt(pedido.id_vhsys_cliente) : null;

  if (!nomeCliente) { res.status(400).json({ error: "Nome do cliente é obrigatório" }); return; }

  const tipoPessoa = cnpjCliente.replace(/\D/g, "").length === 11 ? "PF" : "PJ";

  const payload = {
    tipo_pessoa: tipoPessoa,
    tipo_cadastro: "Cliente",
    razao_cliente: nomeCliente,
    fantasia_cliente: nomeCliente,
    ...(cnpjCliente ? { cnpj_cliente: cnpjCliente.replace(/\D/g, "") } : {}),
    ...(emailCliente ? { email_cliente: emailCliente } : {}),
    ...(telefoneCliente ? { fone_cliente: telefoneCliente } : {}),
    ...(enderecoCliente ? { endereco_cliente: enderecoCliente } : {}),
    ...(cepCliente ? { cep_cliente: cepCliente.replace(/\D/g, "") } : {}),
    ...(cidadeCliente ? { cidade_cliente: cidadeCliente } : {}),
    ...(ufCliente ? { uf_cliente: ufCliente.toUpperCase() } : {}),
  };
  const credenciaisVhsys = await obterCredenciaisVhsysDoTenant(pedido.tenant_id);

  let clienteVhsys = null;
  let idVhsysResolvido: number | null = null;
  let acao = "";

  // 1. Se já temos o ID VhSys salvo, tenta atualizar direto
  if (idVhsysSalvo) {
    const atualizado = await vhsysAtualizarCliente(idVhsysSalvo, payload, credenciaisVhsys);
    // VhSys PUT às vezes não devolve o objeto completo — usa o ID original como fallback
    clienteVhsys = atualizado;
    idVhsysResolvido = atualizado?.id_cliente ?? idVhsysSalvo;
    acao = "atualizado";
  }

  // 2. Se não tem ID salvo mas tem CNPJ, busca pelo CNPJ
  if (!idVhsysResolvido && cnpjCliente) {
    const encontrado = await vhsysBuscarClientePorCnpj(cnpjCliente, credenciaisVhsys);
    if (encontrado) {
      const atualizado = await vhsysAtualizarCliente(encontrado.id_cliente, payload, credenciaisVhsys);
      clienteVhsys = atualizado ?? encontrado;
      idVhsysResolvido = atualizado?.id_cliente ?? encontrado.id_cliente;
      acao = "encontrado e atualizado";
    }
  }

  // 3. Se ainda não encontrou, cria novo
  if (!idVhsysResolvido) {
    clienteVhsys = await vhsysCriarCliente(payload, credenciaisVhsys);
    idVhsysResolvido = clienteVhsys?.id_cliente ?? null;
    acao = "criado";
  }

  if (!idVhsysResolvido) {
    res.status(502).json({ error: "Falha ao sincronizar cliente no VhSys" });
    return;
  }

  // Salva o id_vhsys_cliente no pedido para uso futuro
  await db.update(pedidos)
    .set({ id_vhsys_cliente: String(idVhsysResolvido), updated_at: new Date() })
    .where(and(eq(pedidos.id, req.params.id), eq(pedidos.tenant_id, pedido.tenant_id)));

  // Upsert na tabela local de clientes (para aparecer na página Clientes)
  // Usa pedido.tenant_id pois esta rota não usa requireTenantAccess
  const tenantIdPedido = pedido.tenant_id;
  if (nomeCliente && tenantIdPedido) {
    const cnpjLimpo = cnpjCliente ? cnpjCliente.replace(/\D/g, "") : null;
    const [clienteExistente] = cnpjLimpo
      ? await db.select({ id: clientes.id }).from(clientes)
          .where(and(eq(clientes.tenant_id, tenantIdPedido), eq(clientes.cnpj, cnpjLimpo)))
      : [];
    if (clienteExistente) {
      await db.update(clientes)
        .set({
          nome: nomeCliente,
          ...(emailCliente ? { email: emailCliente } : {}),
          ...(telefoneCliente ? { telefone: telefoneCliente } : {}),
          ...(enderecoCliente ? { endereco: enderecoCliente } : {}),
          ...(cidadeCliente ? { cidade: cidadeCliente } : {}),
          ...(ufCliente ? { estado: ufCliente } : {}),
          updated_at: new Date(),
        })
        .where(eq(clientes.id, clienteExistente.id));
    } else {
      await db.insert(clientes).values({
        tenant_id: tenantIdPedido,
        nome: nomeCliente,
        cnpj: cnpjLimpo,
        email: emailCliente || null,
        telefone: telefoneCliente || null,
        endereco: enderecoCliente || null,
        cidade: cidadeCliente || null,
        estado: ufCliente || null,
      }).onConflictDoNothing();
    }
  }

  res.json({
    mensagem: `Cliente ${acao} no ERP Mirage com sucesso (ID VhSys: ${idVhsysResolvido})`,
    id_vhsys_cliente: idVhsysResolvido,
    razao_cliente: clienteVhsys?.razao_cliente ?? nomeCliente,
  });
});

// DELETE /kanban/pedidos/:id
router.delete("/kanban/pedidos/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  // Ler pedido antes de deletar para capturar orcamento_id
  const [pedido] = await db.select({ orcamento_id: pedidos.orcamento_id })
    .from(pedidos)
    .where(and(eq(pedidos.id, req.params.id), inArray(pedidos.tenant_id, req.userTenantIds ?? [])));

  await db.delete(itens_pedido)
    .where(and(eq(itens_pedido.pedido_id, req.params.id), inArray(itens_pedido.tenant_id, req.userTenantIds ?? [])));
  await db.delete(pedidos)
    .where(and(eq(pedidos.id, req.params.id), inArray(pedidos.tenant_id, req.userTenantIds ?? [])));

  // Se o pedido veio de um orçamento, reverter flag enviado_para_kanban
  if (pedido?.orcamento_id) {
    await supabaseAdmin.from("orcamentos_custos")
      .update({ enviado_para_kanban: false, pedido_id: null, updated_at: new Date().toISOString() })
      .eq("id", pedido.orcamento_id);
  }

  res.status(204).send();
});

// ─── SINAIS DE PEDIDO ──────────────────────────────────────────────────────

// GET /kanban/pedidos/:id/sinais
router.get("/kanban/pedidos/:id/sinais", requireAuth, async (req: AuthenticatedRequest, res) => {
  const sinais = await db.select().from(pedido_sinais)
    .where(and(eq(pedido_sinais.pedido_id, req.params.id), inArray(pedido_sinais.tenant_id, req.userTenantIds ?? [])))
    .orderBy(asc(pedido_sinais.created_at));
  res.json(sinais);
});

// POST /kanban/pedidos/:id/sinais
router.post("/kanban/pedidos/:id/sinais", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { descricao, valor_cents, data_recebido } = req.body;
  if (!descricao || valor_cents == null) { res.status(400).json({ error: "descricao e valor_cents são obrigatórios" }); return; }
  const [novo] = await db.insert(pedido_sinais).values({
    tenant_id: req.tenantId!,
    pedido_id: req.params.id,
    descricao,
    valor_cents: Number(valor_cents),
    data_recebido: data_recebido ? new Date(data_recebido) : null,
  }).returning();
  res.status(201).json(novo);
});

// DELETE /kanban/pedidos/:id/sinais/:sinalId
router.delete("/kanban/pedidos/:id/sinais/:sinalId", requireAuth, async (req: AuthenticatedRequest, res) => {
  await db.delete(pedido_sinais)
    .where(and(eq(pedido_sinais.id, req.params.sinalId), inArray(pedido_sinais.tenant_id, req.userTenantIds ?? [])));
  res.status(204).send();
});

// ─── ITENS PEDIDO ───────────────────────────────────────────────────────────

// POST /kanban/itens-pedido — adicionar item a pedido existente
router.post("/kanban/itens-pedido", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const { pedidoId, referencia, referenciaCliente, descricao, corNome, gradeId, quantidadeTotal, quantidadePorTamanho, valorUnitario, cmp } = req.body;
  if (!pedidoId || !referencia) { res.status(400).json({ error: "pedidoId e referencia são obrigatórios" }); return; }
  const referenciaClienteNormalizada = referenciaCliente?.trim() || null;

  const [item] = await db.insert(itens_pedido).values({
    tenant_id: tenantId,
    pedido_id: pedidoId,
    referencia,
    referencia_cliente: referenciaClienteNormalizada,
    descricao: descricao || null,
    cor_nome: corNome || null,
    grade_id: gradeId || null,
    quantidade_total: quantidadeTotal || 0,
    quantidade_por_tamanho: quantidadePorTamanho || {},
    valor_unitario: valorUnitario || 0,
    cmp: cmp || 0,
  }).returning();

  // Recalcular valor total do pedido respeitando desconto/acréscimo existentes
  const [pedidoAtual] = await db.select().from(pedidos).where(eq(pedidos.id, pedidoId));
  if (pedidoAtual) {
    const { valorFinal } = await recalcularTotalPedido(
      pedidoId,
      pedidoAtual.acrescimo_tipo ?? "valor", pedidoAtual.acrescimo_valor ?? 0,
      pedidoAtual.desconto_tipo  ?? "valor", pedidoAtual.desconto_valor  ?? 0,
    );
    await db.update(pedidos)
      .set({ valor_total_cents: valorFinal, valor_total: String(valorFinal / 100), updated_at: new Date() })
      .where(eq(pedidos.id, pedidoId));
  }

  res.status(201).json({
    ...item,
    referenciaCliente: item.referencia_cliente || "",
    corNome: item.cor_nome,
    gradeId: item.grade_id,
    quantidadeTotal: item.quantidade_total,
  });
});

// PATCH /kanban/itens-pedido/:id — editar item
router.patch("/kanban/itens-pedido/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { referencia, referenciaCliente, descricao, corNome, gradeId, quantidadeTotal, quantidadePorTamanho, valorUnitario, cmp, isAviamento, isDesenvolvimento } = req.body;
  const [itemAtual] = await db.select().from(itens_pedido)
    .where(and(eq(itens_pedido.id, req.params.id), inArray(itens_pedido.tenant_id, req.userTenantIds ?? [])));
  if (!itemAtual) { res.status(404).json({ error: "Item não encontrado" }); return; }
  const referenciaClienteNormalizada = referenciaCliente === undefined ? undefined : referenciaCliente?.trim() || null;
  if (referenciaClienteNormalizada && itemAtual.plm_produto_id) {
    const [produto] = await db.select().from(plm_produtos)
      .where(and(eq(plm_produtos.id, itemAtual.plm_produto_id), eq(plm_produtos.tenant_id, itemAtual.tenant_id)));
    if (produto?.referencia_cliente && produto.referencia_cliente !== referenciaClienteNormalizada) {
      res.status(409).json({ error: `O produto PLM já possui a referência do cliente "${produto.referencia_cliente}".` });
      return;
    }
    const [cartaoConflitante] = await db.select({ referenciaCliente: referencias.referencia_cliente }).from(referencias)
      .where(and(
        eq(referencias.tenant_id, itemAtual.tenant_id),
        eq(referencias.plm_produto_id, itemAtual.plm_produto_id),
        sql`${referencias.referencia_cliente} IS NOT NULL`,
        sql`${referencias.referencia_cliente} <> ${referenciaClienteNormalizada}`,
      ))
      .limit(1);
    if (cartaoConflitante) {
      res.status(409).json({ error: `O cartão Kanban já possui a referência do cliente "${cartaoConflitante.referenciaCliente}".` });
      return;
    }
  }
  const updateData: Record<string, unknown> = {};
  if (referencia !== undefined) updateData.referencia = referencia;
  if (referenciaCliente !== undefined) updateData.referencia_cliente = referenciaClienteNormalizada;
  if (descricao !== undefined) updateData.descricao = descricao;
  if (corNome !== undefined) updateData.cor_nome = corNome;
  if (gradeId !== undefined) updateData.grade_id = gradeId;
  if (quantidadeTotal !== undefined) updateData.quantidade_total = quantidadeTotal;
  if (quantidadePorTamanho !== undefined) updateData.quantidade_por_tamanho = quantidadePorTamanho;
  if (valorUnitario !== undefined) updateData.valor_unitario = valorUnitario;
  if (cmp !== undefined) updateData.cmp = cmp;
  if (isAviamento !== undefined) updateData.is_aviamento = isAviamento;
  if (isDesenvolvimento !== undefined) updateData.is_desenvolvimento = isDesenvolvimento;

  const [item] = await db.update(itens_pedido)
    .set(updateData as any)
    .where(and(eq(itens_pedido.id, req.params.id), inArray(itens_pedido.tenant_id, req.userTenantIds ?? [])))
    .returning();
  if (!item) { res.status(404).json({ error: "Item não encontrado" }); return; }
  if (referenciaClienteNormalizada && item.plm_produto_id) {
    await db.update(plm_produtos)
      .set({ referencia_cliente: referenciaClienteNormalizada, updated_at: new Date() })
      .where(and(eq(plm_produtos.id, item.plm_produto_id), eq(plm_produtos.tenant_id, item.tenant_id)));
    await db.update(itens_pedido)
      .set({ referencia_cliente: referenciaClienteNormalizada })
      .where(and(
        eq(itens_pedido.tenant_id, item.tenant_id),
        eq(itens_pedido.plm_produto_id, item.plm_produto_id),
        sql`(${itens_pedido.referencia_cliente} IS NULL OR ${itens_pedido.referencia_cliente} = ${referenciaClienteNormalizada})`,
      ));
    await db.update(referencias)
      .set({ referencia_cliente: referenciaClienteNormalizada, updated_at: new Date() })
      .where(and(
        eq(referencias.tenant_id, item.tenant_id),
        eq(referencias.plm_produto_id, item.plm_produto_id),
        sql`(${referencias.referencia_cliente} IS NULL OR ${referencias.referencia_cliente} = ${referenciaClienteNormalizada})`,
      ));
  }

  // Recalcular valor total do pedido respeitando desconto/acréscimo existentes
  const [pedidoDoItem] = await db.select().from(pedidos).where(eq(pedidos.id, item.pedido_id));
  if (pedidoDoItem) {
    const { valorFinal } = await recalcularTotalPedido(
      item.pedido_id,
      pedidoDoItem.acrescimo_tipo ?? "valor", pedidoDoItem.acrescimo_valor ?? 0,
      pedidoDoItem.desconto_tipo  ?? "valor", pedidoDoItem.desconto_valor  ?? 0,
    );
    await db.update(pedidos)
      .set({ valor_total_cents: valorFinal, valor_total: String(valorFinal / 100), updated_at: new Date() })
      .where(eq(pedidos.id, item.pedido_id));
  }

  res.json(item);
});

// GET /kanban/referencias/:id/itens — itens_pedido de uma referência (para impressão do cartão)
router.get("/kanban/referencias/:id/itens", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const itens = await db.select().from(itens_pedido)
    .where(and(
      eq(itens_pedido.referencia_id, req.params.id),
      inArray(itens_pedido.tenant_id, req.userTenantIds ?? [])
    ));

  const gradeIds = [...new Set(itens.map(i => i.grade_id).filter(Boolean))] as string[];
  const gradesData = gradeIds.length > 0
    ? await db.select().from(grades).where(inArray(grades.id, gradeIds))
    : [];

  const result = itens.map(i => {
    const grade = gradesData.find(g => g.id === i.grade_id);
    return {
      id: i.id,
      corNome: i.cor_nome || '',
      gradeId: i.grade_id || null,
      gradeNome: grade?.nome || '',
      gradeTamanhos: grade?.tamanhos || [],
      quantidadeTotal: i.quantidade_total || 0,
      quantidadePorTamanho: i.quantidade_por_tamanho || {},
    };
  });
  res.json(result);
});

// DELETE /kanban/itens-pedido/:id
router.delete("/kanban/itens-pedido/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const [item] = await db.select().from(itens_pedido)
    .where(and(eq(itens_pedido.id, req.params.id), inArray(itens_pedido.tenant_id, req.userTenantIds ?? [])));
  if (!item) { res.status(404).json({ error: "Item não encontrado" }); return; }

  await db.delete(itens_pedido).where(eq(itens_pedido.id, req.params.id));

  // Recalcular valor total do pedido respeitando desconto/acréscimo existentes
  const [pedidoItemDel] = await db.select().from(pedidos).where(eq(pedidos.id, item.pedido_id));
  if (pedidoItemDel) {
    const { valorFinal } = await recalcularTotalPedido(
      item.pedido_id,
      pedidoItemDel.acrescimo_tipo ?? "valor", pedidoItemDel.acrescimo_valor ?? 0,
      pedidoItemDel.desconto_tipo  ?? "valor", pedidoItemDel.desconto_valor  ?? 0,
    );
    await db.update(pedidos)
      .set({ valor_total_cents: valorFinal, valor_total: String(valorFinal / 100), updated_at: new Date() })
      .where(eq(pedidos.id, item.pedido_id));
  }

  res.status(204).send();
});

// ─── CONTAS A RECEBER ──────────────────────────────────────────────────────

router.get("/kanban/contas-a-receber", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { status } = req.query;
  const conditions = [eq(contas_a_receber.tenant_id, req.tenantId!)];
  if (status) conditions.push(eq(contas_a_receber.status, status as string));

  const data = await db.select({
    id: contas_a_receber.id,
    tenant_id: contas_a_receber.tenant_id,
    referencia_id: contas_a_receber.referencia_id,
    cliente_id: contas_a_receber.cliente_id,
    descricao: contas_a_receber.descricao,
    valor: contas_a_receber.valor,
    data_vencimento: contas_a_receber.data_vencimento,
    data_recebimento: contas_a_receber.data_recebimento,
    status: contas_a_receber.status,
    nf_numero: contas_a_receber.nf_numero,
    observacoes: contas_a_receber.observacoes,
    created_at: contas_a_receber.created_at,
    updated_at: contas_a_receber.updated_at,
    cliente: { id: clientes.id, nome: clientes.nome },
    referencia: { id: referencias.id, codigo: referencias.codigo },
  })
    .from(contas_a_receber)
    .leftJoin(clientes, eq(contas_a_receber.cliente_id, clientes.id))
    .leftJoin(referencias, eq(contas_a_receber.referencia_id, referencias.id))
    .where(and(...conditions))
    .orderBy(asc(contas_a_receber.data_vencimento));

  const result = data.map(r => ({
    ...r,
    cliente: r.cliente?.id ? r.cliente : null,
    referencia: r.referencia?.id ? r.referencia : null,
  }));
  res.json(result);
});

router.post("/kanban/contas-a-receber", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { cliente_id, referencia_id, descricao, valor, data_vencimento, nf_numero, observacoes } = req.body;
  if (!valor || Number(valor) <= 0) { res.status(400).json({ error: "valor é obrigatório" }); return; }
  const [data] = await db.insert(contas_a_receber).values({
    tenant_id: req.tenantId!,
    cliente_id: cliente_id ?? null,
    referencia_id: referencia_id ?? null,
    descricao: descricao ?? null,
    valor: String(valor),
    data_vencimento: data_vencimento ? new Date(data_vencimento) : null,
    nf_numero: nf_numero ?? null,
    observacoes: observacoes ?? null,
    status: "pendente",
  }).returning();
  res.status(201).json(data);
});

router.patch("/kanban/contas-a-receber/:id/receber", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { data_recebimento } = req.body;
  const [data] = await db.update(contas_a_receber)
    .set({ status: "recebido", data_recebimento: data_recebimento ? new Date(data_recebimento) : new Date(), updated_at: new Date() })
    .where(and(eq(contas_a_receber.id, req.params.id), inArray(contas_a_receber.tenant_id, req.userTenantIds ?? [])))
    .returning();
  if (!data) { res.status(404).json({ error: "Conta não encontrada" }); return; }
  res.json(data);
});

router.patch("/kanban/contas-a-receber/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { cliente_id, descricao, valor, data_vencimento, nf_numero, observacoes, status } = req.body;
  const updateData: Record<string, unknown> = { updated_at: new Date() };
  if (cliente_id !== undefined) updateData.cliente_id = cliente_id;
  if (descricao !== undefined) updateData.descricao = descricao;
  if (valor !== undefined) updateData.valor = String(valor);
  if (data_vencimento !== undefined) updateData.data_vencimento = data_vencimento ? new Date(data_vencimento) : null;
  if (nf_numero !== undefined) updateData.nf_numero = nf_numero;
  if (observacoes !== undefined) updateData.observacoes = observacoes;
  if (status !== undefined) updateData.status = status;
  const [data] = await db.update(contas_a_receber)
    .set(updateData as any)
    .where(and(eq(contas_a_receber.id, req.params.id), inArray(contas_a_receber.tenant_id, req.userTenantIds ?? [])))
    .returning();
  if (!data) { res.status(404).json({ error: "Conta não encontrada" }); return; }
  res.json(data);
});

router.delete("/kanban/contas-a-receber/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  await db.update(contas_a_receber)
    .set({ status: "cancelado", updated_at: new Date() })
    .where(and(eq(contas_a_receber.id, req.params.id), inArray(contas_a_receber.tenant_id, req.userTenantIds ?? [])));
  res.status(204).send();
});

// ─── MOVIMENTAÇÕES ─────────────────────────────────────────────────────────

router.get("/kanban/movimentacoes", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const data = await db.select().from(movimentacoes)
    .where(eq(movimentacoes.tenant_id, req.tenantId!))
    .orderBy(desc(movimentacoes.created_at));
  res.json(data);
});

// GET /kanban/movimentacoes/por-codigo?codigo=XXX — busca movimentações de uma referência pelo código
router.get("/kanban/movimentacoes/por-codigo", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tid = req.tenantId!;
  const { codigo } = req.query as { codigo?: string };
  if (!codigo) return res.status(400).json({ error: "codigo é obrigatório" });

  const ref = await db.execute(sql`
    SELECT id, codigo, nome_cliente, numero_pedido, fase_atual, quantidade, cmp, cmo, valor_venda
    FROM referencias WHERE tenant_id = ${tid} AND codigo = ${codigo} LIMIT 1
  `);
  if ((ref.rows as any[]).length === 0) return res.json({ referencia: null, movimentacoes: [] });

  const refRow = (ref.rows as any[])[0];
  const movs = await db.execute(sql`
    SELECT m.id, m.fase_origem, m.fase_destino, m.cmp, m.cmo, m.quantidade,
           m.quantidade_conferida, m.perda_quantidade, m.variacao_quantidade,
           m.observacoes, m.created_at, m.fornecedor_id,
           f.nome AS fornecedor_nome
    FROM movimentacoes m
    LEFT JOIN fornecedores f ON f.id = m.fornecedor_id
    WHERE m.referencia_id = ${refRow.id} AND m.tenant_id = ${tid}
    ORDER BY m.created_at ASC
  `);

  res.json({ referencia: refRow, movimentacoes: movs.rows });
});

// GET /kanban/movimentacoes/referencias — lista todas as referências para seleção de chips
router.get("/kanban/movimentacoes/referencias", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tid = req.tenantId!;
  const { cliente } = req.query as { cliente?: string };
  const whereClause = cliente && cliente !== "todos"
    ? sql`tenant_id = ${tid} AND nome_cliente = ${cliente}`
    : sql`tenant_id = ${tid}`;
  const rows = await db.execute(sql`
    SELECT id, codigo, nome_cliente, numero_pedido, fase_atual FROM referencias WHERE ${whereClause} ORDER BY nome_cliente, codigo
  `);
  res.json(rows.rows);
});

// PUT /kanban/movimentacoes/:id/cmo — editar CMO de uma movimentação e recalcular referencias.cmo
router.put("/kanban/movimentacoes/:id/cmo", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tid = req.tenantId!;
  const { id } = req.params;
  const { cmo } = req.body;
  if (typeof cmo !== "number" || cmo < 0) return res.status(400).json({ error: "cmo inválido (em centavos)" });

  // Atualiza a movimentação
  const upd = await db.execute(sql`
    UPDATE movimentacoes SET cmo = ${cmo} WHERE id = ${id} AND tenant_id = ${tid} RETURNING referencia_id
  `);
  if ((upd.rows as any[]).length === 0) return res.status(404).json({ error: "Movimentação não encontrada" });

  const referenciaId = (upd.rows as any[])[0].referencia_id;

  // Recalcula CMO total na referência
  await db.execute(sql`
    UPDATE referencias SET cmo = (
      SELECT COALESCE(SUM(cmo), 0) FROM movimentacoes WHERE referencia_id = ${referenciaId} AND tenant_id = ${tid}
    ) WHERE id = ${referenciaId} AND tenant_id = ${tid}
  `);

  res.json({ success: true });
});

// PUT /kanban/movimentacoes/:id/observacao — editar observação de uma movimentação
router.put("/kanban/movimentacoes/:id/observacao", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tid = req.tenantId!;
  const { id } = req.params;
  const { observacoes } = req.body;
  if (typeof observacoes !== "string") return res.status(400).json({ error: "observacoes inválido" });

  const upd = await db.execute(sql`
    UPDATE movimentacoes SET observacoes = ${observacoes} WHERE id = ${id} AND tenant_id = ${tid} RETURNING id
  `);
  if ((upd.rows as any[]).length === 0) return res.status(404).json({ error: "Movimentação não encontrada" });
  res.json({ success: true });
});

// DELETE /kanban/movimentacoes/:id — excluir movimentação, mover cartão para espera e excluir contas_a_pagar relacionadas
router.delete("/kanban/movimentacoes/:id", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tid = req.tenantId!;
  const { id } = req.params;

  // Busca a movimentação para pegar referencia_id
  const movRow = await db.execute(sql`
    SELECT id, referencia_id FROM movimentacoes WHERE id = ${id} AND tenant_id = ${tid}
  `);
  if ((movRow.rows as any[]).length === 0) return res.status(404).json({ error: "Movimentação não encontrada" });

  const referenciaId = (movRow.rows as any[])[0].referencia_id;

  // Exclui a movimentação
  await db.execute(sql`DELETE FROM movimentacoes WHERE id = ${id} AND tenant_id = ${tid}`);

  // Move o cartão para espera
  await db.execute(sql`
    UPDATE referencias SET fase_atual = 'espera' WHERE id = ${referenciaId} AND tenant_id = ${tid}
  `);

  // Exclui contas_a_pagar relacionadas à referência
  const contasExcluidas = await db.execute(sql`
    DELETE FROM contas_a_pagar WHERE referencia_id = ${referenciaId} AND tenant_id = ${tid} RETURNING id
  `);

  // Recalcula CMO total na referência
  await db.execute(sql`
    UPDATE referencias SET cmo = (
      SELECT COALESCE(SUM(cmo), 0) FROM movimentacoes WHERE referencia_id = ${referenciaId} AND tenant_id = ${tid}
    ) WHERE id = ${referenciaId} AND tenant_id = ${tid}
  `);

  res.json({ success: true, contasExcluidas: (contasExcluidas.rows as any[]).length, message: "Movimentação excluída. Cartão movido para Espera." });
});

// ─── ESTOQUE ───────────────────────────────────────────────────────────────

router.get("/kanban/estoque", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { status_erp, faturado, cliente, pedido } = req.query as Record<string, string>;

  const rows = await db.select({
    estoque,
    codigo: referencias.codigo,
    descricao: referencias.descricao,
    quantidade_cortada_referencia: referencias.quantidade_cortada,
  })
    .from(estoque)
    .leftJoin(referencias, and(
      eq(estoque.referencia_id, referencias.id),
      eq(estoque.tenant_id, referencias.tenant_id),
    ))
    .where(eq(estoque.tenant_id, req.tenantId!))
    .orderBy(desc(estoque.atualizado_em));

  // Buscar grades de todos os estoques de uma vez
  const ids = rows.map(r => r.estoque.id);
  const todasGrades = ids.length > 0
    ? await db.select().from(estoque_grades).where(and(
        eq(estoque_grades.tenant_id, req.tenantId!),
        inArray(estoque_grades.estoque_id, ids),
      ))
    : [];
  const refIds = [...new Set(rows.map(r => r.estoque.referencia_id))];
  const preAtivos = refIds.length > 0
    ? await db.select({
        referencia_id: pre_agendamento_itens.referencia_id,
        pre_agendamento_id: pre_agendamentos.id,
        pre_agendamento_numero: pre_agendamentos.numero,
        pre_agendamento_status: pre_agendamentos.status,
      }).from(pre_agendamento_itens)
        .innerJoin(pre_agendamentos, eq(pre_agendamento_itens.pre_agendamento_id, pre_agendamentos.id))
        .where(and(
          eq(pre_agendamento_itens.tenant_id, req.tenantId!),
          eq(pre_agendamentos.tenant_id, req.tenantId!),
          inArray(pre_agendamentos.status, ["active", "finalized"]),
          inArray(pre_agendamento_itens.referencia_id, refIds),
        ))
    : [];
  const prePorReferencia = new Map(preAtivos.map(pre => [pre.referencia_id, pre]));

  let result = rows.map(r => ({
    ...r.estoque,
    qtd_cortada: (r.quantidade_cortada_referencia ?? 0) > 0
      ? r.quantidade_cortada_referencia!
      : r.estoque.qtd_cortada,
    codigo: r.codigo ?? "",
    descricao: r.descricao ?? "",
    grades: todasGrades.filter(g => g.estoque_id === r.estoque.id),
    pre_agendamento: prePorReferencia.get(r.estoque.referencia_id) ?? null,
    pre_agendamento_id: prePorReferencia.get(r.estoque.referencia_id)?.pre_agendamento_id ?? null,
    pre_agendamento_numero: prePorReferencia.get(r.estoque.referencia_id)?.pre_agendamento_numero ?? null,
    pre_agendamento_status: prePorReferencia.get(r.estoque.referencia_id)?.pre_agendamento_status ?? null,
  }));

  // Filtros
  if (status_erp && status_erp !== "todos") result = result.filter(r => r.status_erp === status_erp);
  if (faturado === "sim") result = result.filter(r => r.faturado === true);
  if (faturado === "nao") result = result.filter(r => r.faturado === false);
  if (cliente) result = result.filter(r => r.nome_cliente?.toLowerCase().includes(cliente.toLowerCase()));
  if (pedido) result = result.filter(r => r.numero_pedido?.toLowerCase().includes(pedido.toLowerCase()));

  res.json(result);
});

// PATCH /kanban/estoque/:id/grades — salva todas as células da grade (cor × tamanho)
router.patch("/kanban/estoque/:id/grades", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { grades: gradesCells } = req.body as {
    grades: { cor_nome: string; tamanho: string; qtd_primeira: number; qtd_segunda: number }[];
    confirmar_acrescimo?: boolean;
  };
  const confirmarAcrescimo = req.body.confirmar_acrescimo === true;

  if (!Array.isArray(gradesCells) || gradesCells.some(g =>
    !g.cor_nome || !g.tamanho ||
    !Number.isInteger(g.qtd_primeira) || g.qtd_primeira < 0 ||
    !Number.isInteger(g.qtd_segunda) || g.qtd_segunda < 0
  )) {
    res.status(400).json({ error: "A grade deve conter quantidades inteiras não negativas" }); return;
  }

  const qtdPrimeira = gradesCells.reduce((s, g) => s + g.qtd_primeira, 0);
  const qtdSegunda = gradesCells.reduce((s, g) => s + g.qtd_segunda, 0);
  const totalDistribuido = qtdPrimeira + qtdSegunda;

  const resultado = await db.transaction(async tx => {
    const [identidadeEstoque] = await tx.select({
      referencia_id: estoque.referencia_id,
    }).from(estoque).where(and(
      eq(estoque.id, id),
      eq(estoque.tenant_id, req.tenantId!),
    )).limit(1);
    if (!identidadeEstoque) return { ok: false as const, error: "Estoque não encontrado", status: 404 as const };

    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`${req.tenantId!}:${identidadeEstoque.referencia_id}:marco-corte`}))`);
    const [estoqueComReferencia] = await tx.select({
      estoque,
      quantidade_cortada_referencia: referencias.quantidade_cortada,
    }).from(estoque)
      .leftJoin(referencias, and(
        eq(estoque.referencia_id, referencias.id),
        eq(estoque.tenant_id, referencias.tenant_id),
      ))
      .where(and(eq(estoque.id, id), eq(estoque.tenant_id, req.tenantId!)))
      .limit(1);
    if (!estoqueComReferencia) return { ok: false as const, error: "Estoque não encontrado", status: 404 as const };

    const quantidadeCortada = (estoqueComReferencia.quantidade_cortada_referencia ?? 0) > 0
      ? estoqueComReferencia.quantidade_cortada_referencia!
      : estoqueComReferencia.estoque.qtd_cortada;
    const diferenca = totalDistribuido - quantidadeCortada;
    if (diferenca > 0 && !confirmarAcrescimo) {
      return {
        ok: false as const,
        error: "A quantidade real está acima da quantidade cortada. Confirme a quantidade antes de continuar.",
        status: 409 as const,
        code: "ACRESCIMO_ESTOQUE_REQUER_CONFIRMACAO",
        quantidade_cortada: quantidadeCortada,
        total_grade: totalDistribuido,
        diferenca,
      };
    }

    await tx.delete(estoque_grades).where(and(
      eq(estoque_grades.estoque_id, id),
      eq(estoque_grades.tenant_id, req.tenantId!),
    ));

    if (gradesCells.length > 0) {
      await tx.insert(estoque_grades).values(
        gradesCells.map(g => ({
          tenant_id: req.tenantId!,
          estoque_id: id,
          cor_nome: g.cor_nome,
          tamanho: g.tamanho,
          qtd_primeira: g.qtd_primeira,
          qtd_segunda: g.qtd_segunda,
        }))
      );
    }

    const [estoqueAtualizado] = await tx.update(estoque).set({
      qtd_cortada: quantidadeCortada,
      qtd_primeira: qtdPrimeira,
      qtd_segunda: qtdSegunda,
      quantidade_total: totalDistribuido,
      conferencia_realizada_em: new Date(),
      status_erp: "pendente",
      atualizado_em: new Date(),
    }).where(and(eq(estoque.id, id), eq(estoque.tenant_id, req.tenantId!))).returning();
    return { ok: true as const, estoqueAtualizado, quantidadeCortada, diferenca };
  });

  if (!resultado.ok) {
    res.status(resultado.status).json(resultado);
    return;
  }
  res.json({
    ...resultado.estoqueAtualizado,
    quantidade_cortada: resultado.quantidadeCortada,
    quantidade_real: totalDistribuido,
    diferenca: resultado.diferenca,
    tipo_variacao: resultado.diferenca < 0 ? "perda" : resultado.diferenca > 0 ? "ganho" : "sem_variacao",
  });
});

router.post("/kanban/romaneios", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const estoqueIds = Array.isArray(req.body?.estoque_ids)
    ? [...new Set(req.body.estoque_ids.filter((id: unknown): id is string => typeof id === "string" && id.length > 0))]
    : [];
  const descontoSegundaPercent = Number(req.body?.desconto_segunda_percent ?? 0);
  if (estoqueIds.length === 0) {
    res.status(400).json({ error: "Selecione ao menos uma referência para gerar o romaneio" });
    return;
  }
  if (!Number.isFinite(descontoSegundaPercent) || descontoSegundaPercent < 0 || descontoSegundaPercent > 100) {
    res.status(400).json({ error: "O desconto de segunda qualidade deve estar entre 0% e 100%" });
    return;
  }

  const itensEstoque = await db.select({
    estoque,
    codigo: referencias.codigo,
    descricao: referencias.descricao,
  }).from(estoque)
    .innerJoin(referencias, and(
      eq(estoque.referencia_id, referencias.id),
      eq(estoque.tenant_id, referencias.tenant_id),
    ))
    .where(and(
      eq(estoque.tenant_id, req.tenantId!),
      inArray(estoque.id, estoqueIds),
    ));
  if (itensEstoque.length !== estoqueIds.length) {
    res.status(404).json({ error: "Uma ou mais referências não foram encontradas neste tenant" });
    return;
  }
  if (itensEstoque.some(item => !item.estoque.conferencia_realizada_em)) {
    res.status(409).json({ error: "Todas as referências precisam estar conferidas antes de gerar o romaneio" });
    return;
  }
  const pedidosDoLote = new Set(itensEstoque.map(item => item.estoque.numero_pedido ?? ""));
  if (pedidosDoLote.size !== 1) {
    res.status(409).json({ error: "O romaneio deve conter referências do mesmo pedido" });
    return;
  }
  const numeroPedidoLote = [...pedidosDoLote][0];
  const [pedidoLote] = await db.select({ id: pedidos.id }).from(pedidos).where(and(
    eq(pedidos.tenant_id, req.tenantId!),
    eq(pedidos.numero_pedido, numeroPedidoLote),
  )).limit(1);
  if (!pedidoLote) {
    res.status(409).json({ error: "O pedido vinculado ao estoque não foi encontrado" });
    return;
  }
  const referenciaIds = itensEstoque.map(item => item.estoque.referencia_id);
  const preRelacionados = await db.select({
    pre: pre_agendamentos,
    referencia_id: pre_agendamento_itens.referencia_id,
  }).from(pre_agendamento_itens)
    .innerJoin(pre_agendamentos, and(
      eq(pre_agendamento_itens.pre_agendamento_id, pre_agendamentos.id),
      eq(pre_agendamento_itens.tenant_id, pre_agendamentos.tenant_id),
    ))
    .where(and(
      eq(pre_agendamento_itens.tenant_id, req.tenantId!),
      eq(pre_agendamentos.pedido_id, pedidoLote.id),
      inArray(pre_agendamento_itens.referencia_id, referenciaIds),
      inArray(pre_agendamentos.status, ["active", "finalized"]),
    ));
  const preIds = [...new Set(preRelacionados.map(row => row.pre.id))];
  if (preIds.length > 1) {
    res.status(409).json({ error: "As referências selecionadas pertencem a pré-agendamentos diferentes" });
    return;
  }
  const preAgendamento = preRelacionados[0]?.pre ?? null;
  if (preAgendamento && new Set(preRelacionados.map(row => row.referencia_id)).size !== referenciaIds.length) {
    res.status(409).json({ error: "Todas as referências do romaneio devem pertencer ao mesmo pré-agendamento" });
    return;
  }
  if (preAgendamento) {
    const todosItensPre = await db.select({ referencia_id: pre_agendamento_itens.referencia_id })
      .from(pre_agendamento_itens)
      .where(and(
        eq(pre_agendamento_itens.tenant_id, req.tenantId!),
        eq(pre_agendamento_itens.pre_agendamento_id, preAgendamento.id),
      ));
    const selecionadas = new Set(referenciaIds);
    if (todosItensPre.some(item => !selecionadas.has(item.referencia_id))) {
      res.status(409).json({
        error: `Selecione todas as referências do pré-agendamento ${preAgendamento.numero} para conciliar os valores corretamente`,
      });
      return;
    }
  }
  const [empresaSnapshot] = await db.select({
    nome_empresa: configuracoes_empresa.nome_empresa,
    logo_url: configuracoes_empresa.logo_url,
  }).from(configuracoes_empresa).where(eq(configuracoes_empresa.tenant_id, req.tenantId!)).limit(1);

  const gradesDoLote = await db.select().from(estoque_grades).where(and(
    eq(estoque_grades.tenant_id, req.tenantId!),
    inArray(estoque_grades.estoque_id, estoqueIds),
  ));
  const snapshotItens = itensEstoque.map(({ estoque: item, codigo, descricao }) => {
    const grades = gradesDoLote.filter(grade => grade.estoque_id === item.id);
    const brutoPrimeiraCents = item.qtd_primeira * (item.valor_unitario_cents ?? 0);
    const brutoSegundaCents = item.qtd_segunda * (item.valor_unitario_cents ?? 0);
    const descontoSegundaCents = Math.round(brutoSegundaCents * descontoSegundaPercent / 100);
    return {
      id: item.id,
      referencia_id: item.referencia_id,
      codigo,
      descricao,
      nome_cliente: item.nome_cliente,
      numero_pedido: item.numero_pedido,
      numero_op: item.numero_op,
      valor_unitario_cents: item.valor_unitario_cents ?? 0,
      qtd_primeira: item.qtd_primeira,
      qtd_segunda: item.qtd_segunda,
      grades,
      bruto_primeira_cents: brutoPrimeiraCents,
      bruto_segunda_cents: brutoSegundaCents,
      desconto_segunda_cents: descontoSegundaCents,
      subtotal_cents: brutoPrimeiraCents + brutoSegundaCents - descontoSegundaCents,
    };
  });
  const totalBrutoCents = snapshotItens.reduce(
    (total, item) => total + item.bruto_primeira_cents + item.bruto_segunda_cents,
    0,
  );
  const descontoSegundaCents = snapshotItens.reduce((total, item) => total + item.desconto_segunda_cents, 0);

  const criado = await db.transaction(async tx => {
    if (preAgendamento) {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`${req.tenantId!}:${preAgendamento.id}:pre-finance`}))`);
    }
    const [preCongelado] = preAgendamento
      ? await tx.select().from(pre_agendamentos).where(and(
          eq(pre_agendamentos.id, preAgendamento.id),
          eq(pre_agendamentos.tenant_id, req.tenantId!),
          inArray(pre_agendamentos.status, ["active", "finalized"]),
        )).limit(1)
      : [];
    if (preAgendamento && !preCongelado) {
      throw new Error("O pré-agendamento mudou de status durante a geração do romaneio");
    }
    const ajustesPre = preCongelado
      ? await tx.select().from(pre_agendamento_ajustes).where(and(
          eq(pre_agendamento_ajustes.tenant_id, req.tenantId!),
          eq(pre_agendamento_ajustes.pre_agendamento_id, preCongelado.id),
        ))
      : [];
    const sinaisCents = ajustesPre
      .filter(ajuste => ajuste.tipo === "signal")
      .reduce((total, ajuste) => total + ajuste.valor_cents, 0);
    const descontosPreCents = ajustesPre
      .filter(ajuste => ajuste.tipo === "discount")
      .reduce((total, ajuste) => total + ajuste.valor_cents, 0);
    const acrescimosPreCents = ajustesPre
      .filter(ajuste => ajuste.tipo === "addition")
      .reduce((total, ajuste) => total + ajuste.valor_cents, 0);
    const totalFinalCents = totalBrutoCents - descontoSegundaCents - descontosPreCents + acrescimosPreCents;
    const saldoFinalCents = totalFinalCents - sinaisCents;
    const totalPrevistoCents = preCongelado
      ? preCongelado.subtotal_cents + preCongelado.acrescimos_cents - preCongelado.descontos_cents
      : totalBrutoCents;
    const ajusteEntregaCents = totalFinalCents - totalPrevistoCents;
    const ano = new Date().getFullYear();
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`${req.tenantId!}:romaneio:${ano}`}))`);
    const [{ total }] = await tx.select({ total: count() }).from(romaneios_expedicao).where(and(
      eq(romaneios_expedicao.tenant_id, req.tenantId!),
      like(romaneios_expedicao.numero, `ROM-${ano}-%`),
    ));
    const numero = `ROM-${ano}-${String(Number(total) + 1).padStart(4, "0")}`;
    const snapshot = {
      numero,
      gerado_em: new Date().toISOString(),
      empresa: empresaSnapshot ?? { nome_empresa: null, logo_url: null },
      pre_agendamento_id: preCongelado?.id ?? null,
      pre_agendamento_numero: preCongelado?.numero ?? null,
      numero_pedido: itensEstoque[0].estoque.numero_pedido,
      cliente_nome: itensEstoque[0].estoque.nome_cliente,
      desconto_segunda_percent: descontoSegundaPercent,
      total_bruto_cents: totalBrutoCents,
      desconto_segunda_cents: descontoSegundaCents,
      total_final_cents: totalFinalCents,
      sinais_cents: sinaisCents,
      descontos_pre_cents: descontosPreCents,
      acrescimos_pre_cents: acrescimosPreCents,
      total_previsto_cents: totalPrevistoCents,
      ajuste_entrega_cents: ajusteEntregaCents,
      saldo_final_cents: saldoFinalCents,
      ajustes_pre_agendamento: ajustesPre,
      itens: snapshotItens,
    };
    const [romaneio] = await tx.insert(romaneios_expedicao).values({
      tenant_id: req.tenantId!,
      numero,
      pre_agendamento_id: preCongelado?.id ?? null,
      numero_pedido: itensEstoque[0].estoque.numero_pedido,
      cliente_nome: itensEstoque[0].estoque.nome_cliente,
      desconto_segunda_percent: String(descontoSegundaPercent),
      total_bruto_cents: totalBrutoCents,
      desconto_segunda_cents: descontoSegundaCents,
      total_final_cents: totalFinalCents,
      saldo_final_cents: saldoFinalCents,
      ajuste_entrega_cents: ajusteEntregaCents,
      snapshot,
      created_by: req.user?.id ?? null,
    }).returning();
    return romaneio;
  });
  res.status(201).json(criado);
});

router.get("/kanban/romaneios", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const rows = await db.select().from(romaneios_expedicao)
    .where(eq(romaneios_expedicao.tenant_id, req.tenantId!))
    .orderBy(desc(romaneios_expedicao.created_at));
  res.json(rows);
});

router.get("/kanban/romaneios/:id", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const [row] = await db.select().from(romaneios_expedicao).where(and(
    eq(romaneios_expedicao.id, req.params.id),
    eq(romaneios_expedicao.tenant_id, req.tenantId!),
  ));
  if (!row) {
    res.status(404).json({ error: "Romaneio não encontrado" });
    return;
  }
  res.json(row);
});

// POST /kanban/estoque/:id/enviar-erp — sincroniza com ERP Mirage (VhSys)
router.post("/kanban/estoque/:id/enviar-erp", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  const [est] = await db.select().from(estoque)
    .where(and(eq(estoque.id, id), eq(estoque.tenant_id, req.tenantId!)));
  if (!est) { res.status(404).json({ error: "Estoque não encontrado" }); return; }
  if (est.faturado) { res.status(409).json({ error: "Estoque já faturado não pode ser alterado no ERP" }); return; }

  const gradeRows = await db.select().from(estoque_grades)
    .where(and(
      eq(estoque_grades.estoque_id, id),
      eq(estoque_grades.tenant_id, req.tenantId!),
    ));

  const total1a = gradeRows.reduce((s, g) => s + (g.qtd_primeira ?? 0), 0);
  const total2a = gradeRows.reduce((s, g) => s + (g.qtd_segunda ?? 0), 0);

  let ref: { codigo: string; descricao?: string | null; referencia_cliente?: string | null } | null = null;
  if (est.referencia_id) {
    const [r] = await db.select({
      codigo: referencias.codigo,
      descricao: referencias.descricao,
      referencia_cliente: referencias.referencia_cliente,
    }).from(referencias).where(and(
      eq(referencias.id, est.referencia_id),
      eq(referencias.tenant_id, req.tenantId!),
    ));
    ref = r ?? null;
  }

  if (!ref) { res.status(409).json({ error: "A referência vinculada ao estoque não foi encontrada" }); return; }
  const sincronizacaoLockKey = `${req.tenantId!}:${id}:erp-stock-all`;
  const sincronizacaoLockClient = await pool.connect();
  try {
    await sincronizacaoLockClient.query("SELECT pg_advisory_lock(hashtext($1))", [sincronizacaoLockKey]);
    const [estAtual] = await db.select().from(estoque).where(and(
      eq(estoque.id, id),
      eq(estoque.tenant_id, req.tenantId!),
    ));
    if (!estAtual || estAtual.faturado) {
      res.status(estAtual ? 409 : 404).json({ error: estAtual ? "Estoque já faturado não pode ser alterado no ERP" : "Estoque não encontrado" });
      return;
    }
    const gradeRowsAtuais = await db.select().from(estoque_grades).where(and(
      eq(estoque_grades.estoque_id, id),
      eq(estoque_grades.tenant_id, req.tenantId!),
    ));
    const [refAtual] = await db.select({
      codigo: referencias.codigo,
      referencia_cliente: referencias.referencia_cliente,
    }).from(referencias).where(and(
      eq(referencias.id, estAtual.referencia_id),
      eq(referencias.tenant_id, req.tenantId!),
    ));
    if (!refAtual) { res.status(409).json({ error: "A referência vinculada ao estoque não foi encontrada" }); return; }
    const credenciaisVhsys = await obterCredenciaisVhsysDoTenant(req.tenantId!);
    const prefixoSku = refAtual.referencia_cliente?.trim() || refAtual.codigo;
    const saldosAnteriores = await db.select().from(estoque_erp_saldos).where(and(
      eq(estoque_erp_saldos.tenant_id, req.tenantId!),
      eq(estoque_erp_saldos.estoque_id, id),
    ));
    const alvos = new Map<string, { quantidade: number; idProduto?: number }>();
    for (const grade of gradeRowsAtuais) {
      const sku = [prefixoSku, grade.cor_nome, grade.tamanho].map(normalizarSku).filter(Boolean).join("-");
      const quantidadeAtual = alvos.get(sku)?.quantidade ?? 0;
      alvos.set(sku, { quantidade: quantidadeAtual + (grade.qtd_primeira ?? 0) });
    }
    for (const saldo of saldosAnteriores) {
      if (!alvos.has(saldo.sku)) {
        alvos.set(saldo.sku, { quantidade: 0, idProduto: saldo.id_produto_erp });
      }
    }
    if (![...alvos.values()].some(alvo => alvo.quantidade > 0) && saldosAnteriores.length === 0) {
      res.status(409).json({ error: "Não há peças de primeira qualidade para enviar ao estoque do VhSys" });
      return;
    }

    const resultados = [];
    for (const [sku, alvo] of alvos) {
      const lockKey = `${req.tenantId!}:${id}:${sku}:erp-stock`;
      const lockClient = await pool.connect();
      try {
        await lockClient.query("SELECT pg_advisory_lock(hashtext($1))", [lockKey]);
      const operacao = await db.transaction(async tx => {
        const [saldoAtual] = await tx.select().from(estoque_erp_saldos).where(and(
          eq(estoque_erp_saldos.tenant_id, req.tenantId!),
          eq(estoque_erp_saldos.estoque_id, id),
          eq(estoque_erp_saldos.sku, sku),
        )).limit(1);
        if (saldoAtual?.operacao_pendente_id) {
          return {
            idProduto: saldoAtual.id_produto_erp,
            operacaoId: saldoAtual.operacao_pendente_id,
            diferenca: saldoAtual.operacao_pendente_delta ?? 0,
            destino: saldoAtual.operacao_pendente_destino ?? saldoAtual.quantidade_sincronizada,
            nova: false,
          };
        }
        let idProduto = saldoAtual?.id_produto_erp ?? alvo.idProduto;
        if (!idProduto) {
          const produto = await vhsysBuscarProduto(sku, credenciaisVhsys);
          if (!produto?.id_produto) {
            throw new Error(`SKU ${sku} não encontrado no VhSys. Envie primeiro o pedido para criar os SKUs.`);
          }
          idProduto = produto.id_produto;
        }
        const quantidadeAnterior = saldoAtual?.quantidade_sincronizada ?? 0;
        const diferenca = alvo.quantidade - quantidadeAnterior;
        const operacaoId = diferenca === 0
          ? null
          : `MirageEstoque:${req.tenantId!}:${estAtual.id}:${sku}:${crypto.randomUUID()}`;
        await tx.insert(estoque_erp_saldos).values({
          tenant_id: req.tenantId!,
          estoque_id: id,
          sku,
          id_produto_erp: idProduto,
          quantidade_sincronizada: quantidadeAnterior,
          operacao_pendente_id: operacaoId,
          operacao_pendente_delta: diferenca === 0 ? null : diferenca,
          operacao_pendente_destino: diferenca === 0 ? null : alvo.quantidade,
          operacao_pendente_em: diferenca === 0 ? null : new Date(),
          updated_at: new Date(),
        }).onConflictDoUpdate({
          target: [estoque_erp_saldos.tenant_id, estoque_erp_saldos.estoque_id, estoque_erp_saldos.sku],
          set: {
            id_produto_erp: idProduto,
            operacao_pendente_id: operacaoId,
            operacao_pendente_delta: diferenca === 0 ? null : diferenca,
            operacao_pendente_destino: diferenca === 0 ? null : alvo.quantidade,
            operacao_pendente_em: diferenca === 0 ? null : new Date(),
            updated_at: new Date(),
          },
        });
        return { idProduto, operacaoId, diferenca, destino: alvo.quantidade, nova: true };
      });
      if (operacao.operacaoId && operacao.diferenca !== 0) {
        const movimentos = await vhsysConsultarEstoque(operacao.idProduto, credenciaisVhsys);
        const jaConfirmada = movimentos.some(movimento => movimento.identificacao === operacao.operacaoId);
        if (!jaConfirmada && !operacao.nova) {
          throw new Error(`A operação pendente do SKU ${sku} ainda não foi confirmada pelo VhSys; nenhum novo lançamento foi feito`);
        }
        if (!jaConfirmada) {
          await vhsysLancarEstoque(operacao.idProduto, {
            tipo_estoque: operacao.diferenca > 0 ? "Entrada" : "Saida",
            qtde_estoque: Math.abs(operacao.diferenca),
            valor_estoque: (estAtual.valor_unitario_cents ?? 0) / 100,
            obs_estoque: `Estoque Mirage | Pedido ${estAtual.numero_pedido ?? "-"} | ${sku} | somente 1ª qualidade`,
            identificacao: operacao.operacaoId,
          }, credenciaisVhsys);
        }
        await db.transaction(async tx => {
          await tx.update(estoque_erp_saldos).set({
            quantidade_sincronizada: operacao.destino,
            operacao_pendente_id: null,
            operacao_pendente_delta: null,
            operacao_pendente_destino: null,
            operacao_pendente_em: null,
            updated_at: new Date(),
          }).where(and(
            eq(estoque_erp_saldos.tenant_id, req.tenantId!),
            eq(estoque_erp_saldos.estoque_id, id),
            eq(estoque_erp_saldos.sku, sku),
            eq(estoque_erp_saldos.operacao_pendente_id, operacao.operacaoId),
          ));
        });
      }
      resultados.push({ sku, quantidade: operacao.destino, ajuste: operacao.diferenca });
      } finally {
        await lockClient.query("SELECT pg_advisory_unlock(hashtext($1))", [lockKey]);
        lockClient.release();
      }
    }

    const [updated] = await db.update(estoque).set({
      status_erp: "enviado",
      atualizado_em: new Date(),
    }).where(and(eq(estoque.id, id), eq(estoque.tenant_id, req.tenantId!))).returning();
    const totalAjustado = resultados.reduce((total, item) => total + Math.abs(item.ajuste), 0);
    res.json({
      ...updated,
      skus: resultados,
      mensagem: `${resultados.length} SKU(s) conferidos no VhSys; ${gradeRowsAtuais.reduce((s, g) => s + g.qtd_primeira, 0)} peça(s) de 1ª qualidade em estoque${totalAjustado === 0 ? " (sem duplicar lançamentos)" : ""}.`,
    });
  } catch (err: any) {
    res.status(502).json({ error: err.message ?? "Erro ao lançar estoque no VhSys" });
  } finally {
    await sincronizacaoLockClient.query("SELECT pg_advisory_unlock(hashtext($1))", [sincronizacaoLockKey]);
    sincronizacaoLockClient.release();
  }
});

// PATCH /kanban/estoque/:id/faturar — marca como faturado e registra número da NF
router.patch("/kanban/estoque/:id/faturar", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { nf_numero } = req.body as { nf_numero?: string };
  const lockKey = `${req.tenantId!}:${id}:erp-stock-all`;
  const lockClient = await pool.connect();
  try {
    await lockClient.query("SELECT pg_advisory_lock(hashtext($1))", [lockKey]);
    const resultado = await db.transaction(async tx => {
      const [est] = await tx.select().from(estoque)
        .where(and(eq(estoque.id, id), eq(estoque.tenant_id, req.tenantId!)));
      if (!est) return null;
      if (est.status_erp !== "enviado") {
        throw new Error("Sincronize e confirme o estoque no ERP antes de faturar");
      }
      const [pendente] = await tx.select({ id: estoque_erp_saldos.id }).from(estoque_erp_saldos).where(and(
        eq(estoque_erp_saldos.tenant_id, req.tenantId!),
        eq(estoque_erp_saldos.estoque_id, id),
        sql`${estoque_erp_saldos.operacao_pendente_id} IS NOT NULL`,
      )).limit(1);
      if (pendente) throw new Error("Existe uma operação de estoque pendente no VhSys; resolva-a antes de faturar");
      const [pedidoEstoque] = est.numero_pedido
        ? await tx.select({ id: pedidos.id }).from(pedidos).where(and(
            eq(pedidos.tenant_id, req.tenantId!),
            eq(pedidos.numero_pedido, est.numero_pedido),
          )).limit(1)
        : [];
      const preRows = await tx.select({ id: pre_agendamentos.id, status: pre_agendamentos.status })
        .from(pre_agendamento_itens)
        .innerJoin(pre_agendamentos, and(
          eq(pre_agendamento_itens.pre_agendamento_id, pre_agendamentos.id),
          eq(pre_agendamento_itens.tenant_id, pre_agendamentos.tenant_id),
        ))
        .where(and(
          eq(pre_agendamento_itens.tenant_id, req.tenantId!),
          eq(pre_agendamento_itens.referencia_id, est.referencia_id),
          pedidoEstoque ? eq(pre_agendamentos.pedido_id, pedidoEstoque.id) : sql`FALSE`,
        ));
      for (const pre of preRows) {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`${req.tenantId!}:${pre.id}:pre-finance`}))`);
      }
      const preAtualizados = preRows.length
        ? await tx.select({ id: pre_agendamentos.id, status: pre_agendamentos.status })
            .from(pre_agendamentos)
            .where(and(
              eq(pre_agendamentos.tenant_id, req.tenantId!),
              inArray(pre_agendamentos.id, preRows.map(pre => pre.id)),
            ))
        : [];
      if (preAtualizados.some(pre => pre.status === "reverted")) {
        throw new Error("Não é possível faturar estoque vinculado a pré-agendamento revertido");
      }
      const [updated] = await tx.update(estoque).set({
        faturado: true,
        nf_numero: nf_numero ?? null,
        status_erp: "enviado",
        atualizado_em: new Date(),
      }).where(and(eq(estoque.id, id), eq(estoque.tenant_id, req.tenantId!))).returning();
      await tx.execute(sql`
        UPDATE pre_agendamentos pa
        SET status = 'finalized', updated_at = NOW()
        WHERE pa.tenant_id = ${req.tenantId!}
          AND pa.status = 'active'
          AND EXISTS (
            SELECT 1 FROM pre_agendamento_itens pai
            WHERE pai.pre_agendamento_id = pa.id
              AND pai.tenant_id = ${req.tenantId!}
              AND pai.referencia_id = ${est.referencia_id}
          )
          AND NOT EXISTS (
            SELECT 1 FROM pre_agendamento_itens pai
            LEFT JOIN estoque e ON e.referencia_id = pai.referencia_id AND e.tenant_id = pai.tenant_id
            WHERE pai.pre_agendamento_id = pa.id
              AND pai.tenant_id = ${req.tenantId!}
              AND (e.id IS NULL OR e.faturado = false)
          )
      `);
      return updated;
    });
    if (!resultado) { res.status(404).json({ error: "Estoque não encontrado" }); return; }
    res.json(resultado);
  } catch (err: any) {
    res.status(409).json({ error: err.message ?? "Não foi possível faturar o estoque" });
  } finally {
    await lockClient.query("SELECT pg_advisory_unlock(hashtext($1))", [lockKey]);
    lockClient.release();
  }
});

// GET /kanban/estoque/:id/sinais — busca sinais do pedido associado ao item de estoque
router.get("/kanban/estoque/:id/sinais", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const [est] = await db.select({ numero_pedido: estoque.numero_pedido })
    .from(estoque).where(and(eq(estoque.id, id), eq(estoque.tenant_id, req.tenantId!)));
  if (!est?.numero_pedido) { res.json([]); return; }
  const [ped] = await db.select({ id: pedidos.id })
    .from(pedidos)
    .where(and(eq(pedidos.numero_pedido, est.numero_pedido), eq(pedidos.tenant_id, req.tenantId!)));
  if (!ped) { res.json([]); return; }
  const sinais = await db.select().from(pedido_sinais)
    .where(eq(pedido_sinais.pedido_id, ped.id))
    .orderBy(asc(pedido_sinais.created_at));
  res.json(sinais);
});

// DELETE /kanban/estoque/:id
router.delete("/kanban/estoque/:id", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  await db.delete(estoque_grades).where(eq(estoque_grades.estoque_id, id));
  await db.delete(estoque).where(and(eq(estoque.id, id), eq(estoque.tenant_id, req.tenantId!)));
  res.status(204).send();
});

// ─── CORES ─────────────────────────────────────────────────────────────────

router.get("/kanban/cores", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const data = await db.select().from(cores)
    .where(eq(cores.tenant_id, req.tenantId!))
    .orderBy(asc(cores.nome));
  res.json(data);
});

router.post("/kanban/cores", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { nome, hex } = req.body;
  if (!nome) { res.status(400).json({ error: "nome é obrigatório" }); return; }
  const [data] = await db.insert(cores).values({ tenant_id: req.tenantId!, nome, hex }).returning();
  res.status(201).json(data);
});

router.delete("/kanban/cores/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  await db.delete(cores).where(and(eq(cores.id, req.params.id), inArray(cores.tenant_id, req.userTenantIds ?? [])));
  res.status(204).send();
});

// ─── GRADES ────────────────────────────────────────────────────────────────

router.get("/kanban/grades", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  let data = await db.select().from(grades)
    .where(eq(grades.tenant_id, req.tenantId!))
    .orderBy(asc(grades.nome));

  if (data.length === 0) {
    const defaults = [
      { tenant_id: req.tenantId!, nome: "Grade Padrão", tamanhos: ["P", "M", "G", "GG"] },
      { tenant_id: req.tenantId!, nome: "Grade Plus Size", tamanhos: ["G", "GG", "EG", "EEG"] },
      { tenant_id: req.tenantId!, nome: "Grade Infantil", tamanhos: ["2", "4", "6", "8", "10", "12"] },
      { tenant_id: req.tenantId!, nome: "Numérico", tamanhos: ["36", "38", "40", "42", "44", "46"] },
    ];
    data = await db.insert(grades).values(defaults).returning();
  }

  res.json(data);
});

router.post("/kanban/grades", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { nome, tamanhos } = req.body;
  if (!nome) { res.status(400).json({ error: "nome é obrigatório" }); return; }
  const [data] = await db.insert(grades).values({ tenant_id: req.tenantId!, nome, tamanhos: tamanhos ?? [] }).returning();
  res.status(201).json(data);
});

router.put("/kanban/grades/:id", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { nome, tamanhos } = req.body;
  if (!nome) { res.status(400).json({ error: "nome é obrigatório" }); return; }
  const [data] = await db.update(grades)
    .set({ nome, tamanhos: tamanhos ?? [] })
    .where(and(eq(grades.id, req.params.id), eq(grades.tenant_id, req.tenantId!)))
    .returning();
  if (!data) { res.status(404).json({ error: "Grade não encontrada" }); return; }
  res.json(data);
});

router.delete("/kanban/grades/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  await db.delete(grades).where(and(eq(grades.id, req.params.id), inArray(grades.tenant_id, req.userTenantIds ?? [])));
  res.status(204).send();
});

// ─── LISTAS CUSTOMIZADAS ───────────────────────────────────────────────────

router.get("/kanban/listas", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const data = await db.select().from(listas_customizadas)
    .where(eq(listas_customizadas.tenant_id, req.tenantId!))
    .orderBy(asc(listas_customizadas.nome));
  res.json(data);
});

router.post("/kanban/listas", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { nome, filtros } = req.body;
  if (!nome) { res.status(400).json({ error: "nome é obrigatório" }); return; }
  const [data] = await db.insert(listas_customizadas).values({
    tenant_id: req.tenantId!,
    user_id: (req as AuthenticatedRequest).user?.id ?? null,
    nome,
    filtros: filtros ?? {},
  }).returning();
  res.status(201).json(data);
});

router.patch("/kanban/listas/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { nome, filtros } = req.body;
  const [data] = await db.update(listas_customizadas)
    .set({ nome, filtros })
    .where(and(eq(listas_customizadas.id, req.params.id), inArray(listas_customizadas.tenant_id, req.userTenantIds ?? [])))
    .returning();
  if (!data) { res.status(404).json({ error: "Lista não encontrada" }); return; }
  res.json(data);
});

router.delete("/kanban/listas/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  await db.delete(listas_customizadas)
    .where(and(eq(listas_customizadas.id, req.params.id), inArray(listas_customizadas.tenant_id, req.userTenantIds ?? [])));
  res.status(204).send();
});

// ─── DASHBOARD ─────────────────────────────────────────────────────────────

router.get("/kanban/dashboard", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const hoje = new Date();

  try {
    const [refsData, contasData] = await Promise.all([
      db.select({ fase_atual: referencias.fase_atual }).from(referencias)
        .where(and(eq(referencias.tenant_id, tenantId), eq(referencias.ativo, true))),
      db.select().from(contas_a_pagar).where(eq(contas_a_pagar.tenant_id, tenantId)),
    ]);

    const por_fase: Record<string, number> = {};
    refsData.forEach(r => { por_fase[r.fase_atual] = (por_fase[r.fase_atual] ?? 0) + 1; });

    const total_a_pagar = contasData.filter(c => c.status === "pendente")
      .reduce((s, c) => s + Number(c.valor ?? 0), 0);
    const contas_vencidas = contasData.filter(c =>
      c.status === "pendente" && c.data_vencimento && c.data_vencimento < hoje
    ).length;

    res.json({
      referencias: { total: refsData.length, por_fase },
      financeiro: { total_a_pagar, contas_vencidas },
    });
  } catch (err: any) {
    req.log.error({ err: err.message, tenantId, op: "kanban.dashboard" }, "Erro ao carregar dashboard Kanban");
    res.status(500).json({ error: "Erro ao carregar dashboard" });
  }
});

// ─── CUSTOS PLUS INTEGRAÇÃO ─────────────────────────────────────────────────
// Mapeamento de API keys para tenants (sem auth Supabase — server-to-server)
const CUSTOS_PLUS_API_KEYS: Record<string, string> = {
  "r2pb-custos-plus-2026": "4a21771a-2f34-4506-8bb2-176b94731387", // R2PB
};

// POST /custos-plus/importar-orcamento
// Recebe orçamento aprovado do CustoPlus e cria pedido + itens no Kanban
router.post("/custos-plus/importar-orcamento", async (req, res) => {
  const {
    apiKey,
    numeroOrcamento, nomeCliente, marca, prazoDias,
    totalPecas, subtotal, total,
    percentualSinal, percentualRetirada, percentualPrazo,
    itens: itensSend = [],
  } = req.body;

  // Validar API key
  const tenantId = CUSTOS_PLUS_API_KEYS[apiKey];
  if (!tenantId) {
    res.status(401).json({ error: "API key inválida" });
    return;
  }

  // Validar campos obrigatórios
  if (!numeroOrcamento || !nomeCliente) {
    res.status(400).json({ error: "numeroOrcamento e nomeCliente são obrigatórios" });
    return;
  }

  // Verificar se já foi importado
  const [jaExiste] = await db.select({ id: pedidos.id }).from(pedidos)
    .where(and(eq(pedidos.tenant_id, tenantId), eq(pedidos.orcamento_numero, numeroOrcamento)));
  if (jaExiste) {
    res.status(409).json({
      error: "Orçamento já foi importado",
      pedidoId: jaExiste.id,
      message: `Orçamento ${numeroOrcamento} já existe como pedido`,
    });
    return;
  }

  // Calcular prazo de entrega
  const prazo = prazoDias || 30;
  const prazoEntrega = new Date(Date.now() + prazo * 24 * 60 * 60 * 1000);

  // Calcular valor do sinal
  const totalCents: number = total || subtotal || 0;
  const sinalCents = percentualSinal
    ? Math.round(totalCents * (percentualSinal / 100))
    : 0;

  // Número do pedido: sequencial único por tenant (não derivado do orçamento)
  const numeroPedido = await gerarNumeroPedido(tenantId);

  // Criar pedido
  const [novoPedido] = await db.insert(pedidos).values({
    tenant_id: tenantId,
    numero: numeroPedido,
    numero_pedido: numeroPedido,
    nome_cliente: nomeCliente,
    prazo_entrega: prazoEntrega,
    data_entrega_prevista: prazoEntrega,
    data_pedido: new Date(),
    status: "pendente",
    valor_total: String(totalCents / 100),
    valor_total_cents: totalCents,
    valor_sinal: String(sinalCents / 100),
    valor_sinal_cents: sinalCents,
    observacoes: marca ? `Coleção/Marca: ${marca}` : null,
    origem: "orcamento",
    orcamento_numero: numeroOrcamento,
  }).returning();

  // Criar itens do pedido (sem cor/grade — preenchimento posterior)
  const itensList = Array.isArray(itensSend) ? itensSend : [];
  if (itensList.length > 0) {
    await db.insert(itens_pedido).values(
      itensList.map((item: any) => ({
        tenant_id: tenantId,
        pedido_id: novoPedido.id,
        referencia: item.referencia || "",
        descricao: item.descricao || "",
        quantidade_total: item.quantidade || 0,
        quantidade_por_tamanho: {},
        valor_unitario: item.valorUnitario || 0,  // já em centavos
        cmp: 0,
      }))
    );
  }

  const todosItens = await db.select().from(itens_pedido)
    .where(eq(itens_pedido.pedido_id, novoPedido.id));

  console.log(`[CustoPlus] Orçamento ${numeroOrcamento} importado como pedido ${numeroPedido} (tenant ${tenantId})`);

  res.status(201).json({
    success: true,
    message: `Pedido ${numeroPedido} criado com sucesso!`,
    pedido: mapPedidoParaFrontend(novoPedido, todosItens),
  });
});

// ─── PEDIDO DE VENDA — ENVIAR PARA ERP (VHSYS) ───────────────────────────────
// POST /kanban/pedidos/:id/enviar-erp
router.post("/kanban/pedidos/:id/enviar-erp", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const [pedido] = await db.select().from(pedidos)
    .where(and(eq(pedidos.id, id), eq(pedidos.tenant_id, req.tenantId!)));
  if (!pedido) { res.status(404).json({ error: "Pedido não encontrado" }); return; }

  const itens = await db.select().from(itens_pedido)
    .where(and(
      eq(itens_pedido.pedido_id, id),
      eq(itens_pedido.tenant_id, req.tenantId!),
    ));

  const fmt = (d: Date | string | null) =>
    d ? new Date(d).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

  try {
    const credenciaisVhsys = await obterCredenciaisVhsysDoTenant(req.tenantId!);
    if (itens.length === 0) {
      res.status(400).json({ error: "O pedido não possui produtos para exportar" });
      return;
    }

    const linhasSkuBrutas = itens.flatMap(item => {
      const referenciaPrincipal = item.referencia_cliente?.trim() || item.referencia;
      const cor = item.cor_nome?.trim() || "SEM-COR";
      const grade = item.quantidade_por_tamanho ?? {};
      const tamanhosComQuantidade = Object.entries(grade)
        .filter(([, quantidade]) => Number(quantidade) > 0);
      const variacoes = tamanhosComQuantidade.length > 0
        ? tamanhosComQuantidade
        : [["UNICO", item.quantidade_total ?? 0] as [string, number]];

      return variacoes
        .filter(([, quantidade]) => Number(quantidade) > 0)
        .map(([tamanho, quantidade]) => {
          const codigo = [
            referenciaPrincipal,
            cor,
            tamanho,
          ].map(normalizarSku).filter(Boolean).join("-");
          const descricaoBase = item.descricao?.trim() || referenciaPrincipal;
          return {
            codigo,
            descricao: `${descricaoBase} - ${cor} - ${tamanho}`,
            quantidade: Number(quantidade),
            valorUnitario: (item.valor_unitario ?? 0) / 100,
            referenciaOrcamento: item.referencia,
          };
        });
    });

    const linhasPorSku = new Map<string, (typeof linhasSkuBrutas)[number]>();
    let colisaoPreco: string | null = null;
    for (const linha of linhasSkuBrutas) {
      const existente = linhasPorSku.get(linha.codigo);
      if (!existente) {
        linhasPorSku.set(linha.codigo, { ...linha });
      } else if (existente.valorUnitario !== linha.valorUnitario) {
        colisaoPreco = linha.codigo;
      } else {
        existente.quantidade += linha.quantidade;
      }
    }
    if (colisaoPreco) {
      res.status(409).json({ error: `O SKU ${colisaoPreco} aparece com valores unitários diferentes. Corrija o pedido antes de enviar.` });
      return;
    }
    const linhasSku = [...linhasPorSku.values()];

    if (linhasSku.length === 0) {
      res.status(400).json({ error: "O pedido não possui quantidades positivas na grade" });
      return;
    }

    const quantidadeItens = itens.reduce(
      (total, item) => total + Number(item.quantidade_total ?? 0),
      0
    );
    const quantidadeGrade = linhasSku.reduce(
      (total, linha) => total + linha.quantidade,
      0
    );
    if (quantidadeItens !== quantidadeGrade) {
      res.status(400).json({
        error:
          `A soma da grade (${quantidadeGrade}) diverge da quantidade total ` +
          `dos itens (${quantidadeItens}). Corrija o pedido antes de enviar ao VHSys.`,
      });
      return;
    }

    const produtosResolvidos = [];
    for (const linha of linhasSku) {
      let produto = await vhsysBuscarProduto(linha.codigo, credenciaisVhsys);
      if (!produto) {
        produto = await vhsysCriarProduto({
          cod_produto: linha.codigo,
          desc_produto: linha.descricao,
          unidade_produto: "PC",
          valor_produto: linha.valorUnitario,
          obs_produto:
            `Pedido Mirage ${pedido.numero_pedido ?? pedido.numero ?? id} | ` +
            `Referência do orçamento: ${linha.referenciaOrcamento}`,
        }, credenciaisVhsys);
      }
      if (!produto?.id_produto) {
        for (let tentativa = 1; tentativa <= 3 && !produto?.id_produto; tentativa++) {
          await new Promise(resolve => setTimeout(resolve, tentativa * 300));
          produto = await vhsysBuscarProduto(linha.codigo, credenciaisVhsys);
        }
      }
      if (!produto?.id_produto) {
        throw new Error(
          `VHSys cadastrou o SKU ${linha.codigo}, mas não disponibilizou o ID para vinculá-lo ao pedido`
        );
      }
      produtosResolvidos.push({
        id_produto: produto.id_produto,
        desc_produto: linha.descricao,
        qtde_produto: String(linha.quantidade),
        valor_unit_produto: linha.valorUnitario.toFixed(2),
      });
    }

    let idVhsysNumero = pedido.id_vhsys_pedido ? Number(pedido.id_vhsys_pedido) : null;
    let resultado = idVhsysNumero
      ? await vhsysBuscarPedidoVenda(idVhsysNumero, credenciaisVhsys)
      : null;
    if (resultado?.lixeira === "Sim") {
      resultado = null;
      idVhsysNumero = null;
    }

    if (!resultado) {
      const dataPedido = new Date(pedido.data_pedido ?? new Date());
      const prazoEntrega = pedido.prazo_entrega
        ? Math.max(0, Math.ceil((new Date(pedido.prazo_entrega).getTime() - dataPedido.getTime()) / 86400000))
        : undefined;
      resultado = await vhsysCriarPedidoVenda({
        id_cliente: pedido.id_vhsys_cliente ? Number(pedido.id_vhsys_cliente) : undefined,
        nome_cliente: pedido.nome_cliente ?? "Cliente",
        status_pedido: "Em Aberto",
        data_pedido: fmt(pedido.data_pedido),
        prazo_entrega: prazoEntrega !== undefined ? String(prazoEntrega) : undefined,
        referencia_pedido: pedido.numero_pedido ?? pedido.numero ?? undefined,
        obs_pedido: `Pedido Mirage ${pedido.numero_pedido ?? pedido.numero ?? id}`,
      }, credenciaisVhsys);
      idVhsysNumero = Number(resultado?.id_ped) || null;
    }

    if (!idVhsysNumero) {
      throw new Error("VHSys criou o cabeçalho, mas não retornou o id_ped interno do pedido");
    }

    await db.update(pedidos)
      .set({ id_vhsys_pedido: String(idVhsysNumero), updated_at: new Date() })
      .where(eq(pedidos.id, id));

    const produtosExistentes = await vhsysListarProdutosPedido(idVhsysNumero, credenciaisVhsys);
    const idsExistentes = new Set(produtosExistentes.map(produto => Number(produto.id_produto)));
    const produtosPendentes = produtosResolvidos.filter(
      produto => !idsExistentes.has(produto.id_produto)
    );
    if (produtosPendentes.length > 0) {
      await vhsysCadastrarProdutosPedido(idVhsysNumero, produtosPendentes, credenciaisVhsys);
    }

    const produtosConfirmados = await vhsysListarProdutosPedido(idVhsysNumero, credenciaisVhsys);
    const produtosFaltantes = produtosResolvidos.filter(
      produto => !produtosConfirmados.some(
        confirmado =>
          Number(confirmado.id_produto) === produto.id_produto &&
          Number(confirmado.qtde_produto) === Number(produto.qtde_produto) &&
          Number(confirmado.valor_unit_produto) === Number(produto.valor_unit_produto)
      )
    );
    if (produtosFaltantes.length > 0) {
      throw new Error(
        `VHSys não confirmou quantidade e valor de ${produtosFaltantes.length} produto(s) no pedido`
      );
    }

    const idVhsys = String(idVhsysNumero);

    res.json({
      sucesso: true,
      mensagem: `Pedido de venda sincronizado no VHSys (ID: ${idVhsys}) com ${produtosConfirmados.length} produto(s)`,
      id_vhsys_pedido: idVhsys,
      produtos_confirmados: produtosConfirmados.length,
      resposta_vhsys: resultado,
    });
  } catch (err: any) {
    res.status(502).json({ error: err.message ?? "Erro ao comunicar com VHSys" });
  }
});

// ─── CONTA A RECEBER — ENVIAR PARA ERP (VHSYS) ───────────────────────────────
// POST /kanban/contas-a-receber/:id/enviar-erp
router.post("/kanban/contas-a-receber/:id/enviar-erp", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const [conta] = await db.select().from(contas_a_receber)
    .where(and(eq(contas_a_receber.id, id), eq(contas_a_receber.tenant_id, req.tenantId!)));
  if (!conta) { res.status(404).json({ error: "Conta não encontrada" }); return; }

  const fmtBR = (d: Date | string | null) =>
    d ? new Date(d).toLocaleDateString("pt-BR") : "";

  let nomeCliente = "Cliente";
  if (conta.cliente_id) {
    const [cl] = await db.select({ nome: clientes.nome }).from(clientes)
      .where(eq(clientes.id, conta.cliente_id));
    if (cl) nomeCliente = cl.nome;
  }

  try {
    const resultado = await vhsysCriarContaReceber({
      descricao: conta.descricao ?? "Conta a Receber — Mirage",
      valor: Number(conta.valor).toFixed(2),
      data_vencimento: fmtBR(conta.data_vencimento),
      nome_cliente: nomeCliente,
      observacoes: conta.observacoes ?? undefined,
    });

    const idVhsys = resultado?.id ? String(resultado.id) : null;
    await db.update(contas_a_receber)
      .set({ exportado_vhsys: true, id_vhsys: idVhsys, updated_at: new Date() })
      .where(eq(contas_a_receber.id, id));

    res.json({
      sucesso: true,
      mensagem: `Conta a receber enviada ao VHSys${idVhsys ? ` (ID: ${idVhsys})` : ""}`,
      id_vhsys: idVhsys,
      resposta_vhsys: resultado,
    });
  } catch (err: any) {
    res.status(502).json({ error: err.message ?? "Erro ao comunicar com VHSys" });
  }
});

// ─── CONTA A PAGAR — ENVIAR PARA ERP (VHSYS) ─────────────────────────────────
// POST /kanban/contas-a-pagar/:id/enviar-erp
router.post("/kanban/contas-a-pagar/:id/enviar-erp", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const [conta] = await db.select().from(contas_a_pagar)
    .where(and(eq(contas_a_pagar.id, id), eq(contas_a_pagar.tenant_id, req.tenantId!)));
  if (!conta) { res.status(404).json({ error: "Conta não encontrada" }); return; }

  const fmtBR = (d: Date | string | null) =>
    d ? new Date(d).toLocaleDateString("pt-BR") : "";

  let nomeFornecedor = conta.fornecedor_nome ?? "Fornecedor";
  if (conta.fornecedor_id) {
    const [forn] = await db.select({ nome: fornecedores.nome }).from(fornecedores)
      .where(eq(fornecedores.id, conta.fornecedor_id));
    if (forn) nomeFornecedor = forn.nome;
  }

  try {
    const resultado = await vhsysCriarContaPagar({
      descricao: conta.descricao ?? "Conta a Pagar — Mirage",
      valor: Number(conta.valor).toFixed(2),
      data_vencimento: fmtBR(conta.data_vencimento),
      nome_fornecedor: nomeFornecedor,
      observacoes: conta.fase ? `Fase: ${conta.fase}` : undefined,
    });

    const idVhsys = resultado?.id ? String(resultado.id) : null;
    await db.update(contas_a_pagar)
      .set({ exportado_vhsys: true, id_vhsys: idVhsys, updated_at: new Date() })
      .where(eq(contas_a_pagar.id, id));

    res.json({
      sucesso: true,
      mensagem: `Conta a pagar enviada ao VHSys${idVhsys ? ` (ID: ${idVhsys})` : ""}`,
      id_vhsys: idVhsys,
      resposta_vhsys: resultado,
    });
  } catch (err: any) {
    res.status(502).json({ error: err.message ?? "Erro ao comunicar com VHSys" });
  }
});

// ─── FASE CONFIG ─────────────────────────────────────────────────────────────

// Padrão r2pb — base de toda configuração de fases
const R2PB_DEFAULTS = [
  { fase_id: 'inicio',         nomeExibicao: 'Início',         ordem: 1,  oculta: false, abreModal: false, tipoModal: null },
  { fase_id: 'espera',         nomeExibicao: 'Fila de Espera', ordem: 2,  oculta: false, abreModal: false, tipoModal: null },
  { fase_id: 'modelagem',      nomeExibicao: 'Modelagem',      ordem: 3,  oculta: false, abreModal: false, tipoModal: null },
  { fase_id: 'tecido',         nomeExibicao: 'Tecido',         ordem: 4,  oculta: false, abreModal: true,  tipoModal: 'tecido' },
  { fase_id: 'risco',          nomeExibicao: 'Risco',          ordem: 5,  oculta: false, abreModal: false, tipoModal: null },
  { fase_id: 'corte',          nomeExibicao: 'Corte',          ordem: 6,  oculta: false, abreModal: true,  tipoModal: 'produtiva' },
  { fase_id: 'beneficiamento', nomeExibicao: 'Beneficiamento', ordem: 7,  oculta: false, abreModal: true,  tipoModal: 'produtiva' },
  { fase_id: 'costura',        nomeExibicao: 'Costura',        ordem: 8,  oculta: false, abreModal: true,  tipoModal: 'produtiva' },
  { fase_id: 'lavanderia',     nomeExibicao: 'Lavanderia',     ordem: 9,  oculta: false, abreModal: true,  tipoModal: 'produtiva' },
  { fase_id: 'acabamento',     nomeExibicao: 'Acabamento',     ordem: 10, oculta: false, abreModal: true,  tipoModal: 'produtiva' },
  { fase_id: 'passadoria',     nomeExibicao: 'Passadoria',     ordem: 11, oculta: false, abreModal: true,  tipoModal: 'produtiva' },
  { fase_id: 'expedicao',      nomeExibicao: 'Expedição',      ordem: 12, oculta: false, abreModal: true,  tipoModal: 'expedicao' },
  { fase_id: 'faturamento',    nomeExibicao: 'Faturamento',    ordem: 13, oculta: false, abreModal: false, tipoModal: null },
  { fase_id: 'concluido',      nomeExibicao: 'Concluído',      ordem: 14, oculta: false, abreModal: false, tipoModal: null },
] as const;

type FaseConfigRow = { fase_id: string; nomeExibicao: string | null; cor: string | null; oculta: boolean | null; ordem: number | null; abreModal: boolean | null; tipoModal: string | null };

function mergeWithDefaults(rows: FaseConfigRow[]) {
  const dbMap = new Map(rows.map(r => [r.fase_id, r]));
  return R2PB_DEFAULTS.map(def => {
    const row = dbMap.get(def.fase_id);
    return {
      fase_id:      def.fase_id,
      nomeExibicao: row?.nomeExibicao ?? def.nomeExibicao,
      cor:          row?.cor ?? null,
      oculta:       row?.oculta ?? def.oculta,
      ordem:        row?.ordem ?? def.ordem,
      abreModal:    row?.abreModal ?? def.abreModal,
      tipoModal:    row?.tipoModal ?? def.tipoModal,
    };
  });
}

// GET /kanban/fase-config — configuração de fases do tenant atual
router.get("/kanban/fase-config", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const rows = await db.select().from(kanban_fase_config).where(eq(kanban_fase_config.tenant_id, req.tenantId!));
  res.json({ config: mergeWithDefaults(rows) });
});

// PUT /kanban/fase-config — tenant salva nomes/cores/visibilidade das suas fases
router.put("/kanban/fase-config", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const { config } = req.body as { config: Array<{ fase_id: string; nomeExibicao?: string; cor?: string; oculta?: boolean }> };
  if (!Array.isArray(config)) return res.status(400).json({ error: "config deve ser array" });
  for (const fase of config) {
    await db.insert(kanban_fase_config)
      .values({ tenant_id: tenantId, fase_id: fase.fase_id, nomeExibicao: fase.nomeExibicao ?? null, cor: fase.cor ?? null, oculta: fase.oculta ?? false, updated_at: new Date() })
      .onConflictDoUpdate({
        target: [kanban_fase_config.tenant_id, kanban_fase_config.fase_id],
        set: { nomeExibicao: fase.nomeExibicao ?? null, cor: fase.cor ?? null, oculta: fase.oculta ?? false, updated_at: new Date() },
      });
  }
  res.json({ ok: true });
});

// GET /kanban/fase-config/admin/:tenantId — admin lê config de qualquer tenant
router.get("/kanban/fase-config/admin/:tenantId", requireSuperAdmin as any, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.params.tenantId!;
  const rows = await db.select().from(kanban_fase_config).where(eq(kanban_fase_config.tenant_id, tenantId));
  res.json({ config: mergeWithDefaults(rows) });
});

// GET /kanban/itens-pedido/todos — lista todos os itens_pedido do tenant (gestão de aviamentos)
router.get("/kanban/itens-pedido/todos", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;

  const pedidosList = await db.select({
    id: pedidos.id,
    numeroPedido: pedidos.numero_pedido,
    nomeCliente: pedidos.nome_cliente,
    status: pedidos.status,
    createdAt: pedidos.created_at,
  }).from(pedidos)
    .where(eq(pedidos.tenant_id, tenantId))
    .orderBy(desc(pedidos.created_at));

  if (pedidosList.length === 0) { res.json([]); return; }

  const pedidoIds = pedidosList.map(p => p.id);
  const todosItens = await db.select().from(itens_pedido)
    .where(and(inArray(itens_pedido.pedido_id, pedidoIds), eq(itens_pedido.tenant_id, tenantId)));

  const pedidoMap = new Map(pedidosList.map(p => [p.id, p]));

  const result = todosItens.map(item => {
    const ped = pedidoMap.get(item.pedido_id);
    return {
      id: item.id,
      pedidoId: item.pedido_id,
      numeroPedido: ped?.numeroPedido ?? "",
      nomeCliente: ped?.nomeCliente ?? "",
      statusPedido: ped?.status ?? "",
      referencia: item.referencia ?? "",
      descricao: item.descricao ?? "",
      corNome: item.cor_nome ?? "",
      quantidadeTotal: item.quantidade_total ?? 0,
      isAviamento: item.is_aviamento ?? false,
      isDesenvolvimento: item.is_desenvolvimento ?? false,
    };
  });

  res.json(result);
});

// GET /kanban/relatorio-fases — relatório mensal de peças iniciadas/concluídas por fase
router.get("/kanban/relatorio-fases", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const mesParam = parseInt(req.query.mes as string);
  const mes = (!isNaN(mesParam) && mesParam > 0) ? mesParam : 0; // 0 = todos os meses
  const ano  = parseInt(req.query.ano  as string) || new Date().getFullYear();

  const FASES = [
    { key: "inicio",         label: "Início" },
    { key: "espera",         label: "Fila de Espera" },
    { key: "modelagem",      label: "Modelagem" },
    { key: "tecido",         label: "Tecido" },
    { key: "risco",          label: "Risco" },
    { key: "corte",          label: "Corte" },
    { key: "beneficiamento", label: "Beneficiamento" },
    { key: "costura",        label: "Costura" },
    { key: "lavanderia",     label: "Lavanderia" },
    { key: "acabamento",     label: "Acabamento" },
    { key: "passadoria",     label: "Passadoria" },
    { key: "expedicao",      label: "Expedição" },
    { key: "faturamento",    label: "Faturamento" },
    { key: "concluido",      label: "Concluído" },
  ];

  try {
    const whereConditions = [
      eq(movimentacoes.tenant_id, tenantId),
      sql`EXTRACT(YEAR FROM ${movimentacoes.created_at}) = ${ano}`,
      sql`${movimentacoes.fase_origem} <> ${movimentacoes.fase_destino}`,
    ];
    if (mes > 0) {
      whereConditions.push(sql`EXTRACT(MONTH FROM ${movimentacoes.created_at}) = ${mes}`);
    }
    const movs = await db.select({
      fase_origem:  movimentacoes.fase_origem,
      fase_destino: movimentacoes.fase_destino,
      quantidade:   movimentacoes.quantidade,
    }).from(movimentacoes).where(and(...whereConditions));

    const fases = FASES.map(fase => {
      const iniciadas  = movs.filter(m => m.fase_destino === fase.key).reduce((s, m) => s + (m.quantidade ?? 0), 0);
      const concluidas = movs.filter(m => m.fase_origem  === fase.key).reduce((s, m) => s + (m.quantidade ?? 0), 0);
      return { fase: fase.key, label: fase.label, iniciadas, concluidas, saldo: concluidas - iniciadas };
    });

    res.json({ mes, ano, todos: mes === 0, fases });
  } catch (err: any) {
    req.log.error({ err: err.message, tenantId, op: "kanban.relatorio-fases" }, "Erro ao gerar relatório de fases");
    res.status(500).json({ error: "Erro ao gerar relatório de fases" });
  }
});

// PUT /kanban/fase-config/admin/:tenantId — admin configura fases completas de qualquer tenant
router.put("/kanban/fase-config/admin/:tenantId", requireSuperAdmin as any, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.params.tenantId!;
  const { config } = req.body as { config: Array<{ fase_id: string; nomeExibicao?: string; cor?: string; oculta?: boolean; ordem?: number; abreModal?: boolean; tipoModal?: string }> };
  if (!Array.isArray(config)) return res.status(400).json({ error: "config deve ser array" });
  for (const fase of config) {
    await db.insert(kanban_fase_config)
      .values({ tenant_id: tenantId, fase_id: fase.fase_id, nomeExibicao: fase.nomeExibicao ?? null, cor: fase.cor ?? null, oculta: fase.oculta ?? false, ordem: fase.ordem ?? null, abreModal: fase.abreModal ?? null, tipoModal: fase.tipoModal ?? null, updated_at: new Date() })
      .onConflictDoUpdate({
        target: [kanban_fase_config.tenant_id, kanban_fase_config.fase_id],
        set: { nomeExibicao: fase.nomeExibicao ?? null, cor: fase.cor ?? null, oculta: fase.oculta ?? false, ordem: fase.ordem ?? null, abreModal: fase.abreModal ?? null, tipoModal: fase.tipoModal ?? null, updated_at: new Date() },
      });
  }
  res.json({ ok: true });
});

export default router;
