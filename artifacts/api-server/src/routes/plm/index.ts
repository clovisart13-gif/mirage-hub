import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  plm_colecoes, plm_clientes, plm_fornecedores, plm_produtos,
  plm_familias_medidas, plm_fichas_tecnicas, plm_moldes, plm_materiais,
  plm_boms, plm_bom_linhas, plm_processos, plm_processo_etapas, plm_pilotos, plm_piloto_etapas,
  plm_aprovacoes, plm_auditoria, plm_sequencias,
  plm_familias_produto, clientes, fichas_custo, itens_orcamento_custos, orcamentos_custos, itens_pedido, pedidos, grades, referencias,
} from "@workspace/db";
import { eq, and, asc, desc, sql, inArray } from "drizzle-orm";
import { requireAuth, requireTenantAccess, type AuthenticatedRequest } from "../../middlewares/auth";
import { resetPlmFromApprovedBudgets } from "./reset";

const router: IRouter = Router();

// ─── Helper: log auditoria ────────────────────────────────────────────────────
async function logAuditoria(params: {
  tenantId: string; produtoId?: number; modulo: string; acao: string;
  entidadeId?: number; descricao: string; dadosAnteriores?: unknown; dadosNovos?: unknown;
  usuarioId?: string; usuarioNome?: string;
}) {
  await db.insert(plm_auditoria).values({
    tenant_id: params.tenantId,
    produto_id: params.produtoId ?? null,
    modulo: params.modulo,
    acao: params.acao,
    entidade_id: params.entidadeId ?? null,
    descricao: params.descricao,
    dados_anteriores: params.dadosAnteriores as any ?? null,
    dados_novos: params.dadosNovos as any ?? null,
    usuario_id: params.usuarioId ?? null,
    usuario_nome: params.usuarioNome ?? null,
  });
}

// ─── Helper: prefixo e código automático ─────────────────────────────────────
function extrairPrefixo(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .substring(0, 3)
    .toUpperCase()
    .padEnd(3, 'X');
}

async function gerarCodigo(executor: any, tenantId: string, prefixo: string): Promise<string> {
  const result = await executor.execute(sql`
    INSERT INTO plm_sequencias (tenant_id, prefixo, ultimo_numero)
    VALUES (${tenantId}, ${prefixo}, 1)
    ON CONFLICT (tenant_id, prefixo)
    DO UPDATE SET ultimo_numero = plm_sequencias.ultimo_numero + 1
    RETURNING ultimo_numero
  `);
  const num = Number((result.rows[0] as any).ultimo_numero);
  return `${prefixo}-${String(num).padStart(4, '0')}`;
}

function prefixoTenant(tenantId: string): string {
  const prefixo = tenantId.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "").substring(0, 4).toUpperCase();
  return prefixo.padEnd(4, "X");
}

// Uma única sequência por tenant para referências técnicas (não por família,
// cliente ou slug). A restrição no banco é a última barreira contra colisões.
async function gerarReferenciaTecnica(executor: any, tenantId: string): Promise<string> {
  const result = await executor.execute(sql`
    INSERT INTO plm_sequencias (tenant_id, prefixo, ultimo_numero)
    VALUES (${tenantId}, 'TECH', 1)
    ON CONFLICT (tenant_id, prefixo)
    DO UPDATE SET ultimo_numero = plm_sequencias.ultimo_numero + 1
    RETURNING ultimo_numero
  `);
  const numero = Number((result.rows[0] as any).ultimo_numero);
  return `${prefixoTenant(tenantId)}-${String(numero).padStart(4, "0")}`;
}

async function clienteCentralValido(tenantId: string, clienteId: string | null | undefined) {
  if (!clienteId?.trim()) return null;
  const [cliente] = await db.select({ id: clientes.id, nome: clientes.nome })
    .from(clientes)
    .where(and(eq(clientes.id, clienteId.trim()), eq(clientes.tenant_id, tenantId), eq(clientes.ativo, true)));
  return cliente ?? null;
}

async function reconciliarClientesLegadosDoPlm(tenantId: string) {
  await db.transaction(async tx => {
    await tx.execute(sql`
      SELECT pg_advisory_xact_lock(hashtextextended(
        ${`mirage:plm-clientes:${tenantId}`}, 0
      ))
    `);

    await tx.execute(sql`
      INSERT INTO clientes (tenant_id, nome, cnpj, email, telefone)
      SELECT DISTINCT ON (old.tenant_id, LOWER(BTRIM(old.nome)))
        old.tenant_id, old.nome, old.cnpj, old.email, old.telefone
      FROM plm_produtos produto
      INNER JOIN plm_clientes old
        ON old.id = produto.cliente_id
       AND old.tenant_id = produto.tenant_id
      WHERE produto.tenant_id = ${tenantId}
        AND produto.cliente_central_id IS NULL
        AND NOT EXISTS (
          SELECT 1
          FROM clientes central
          WHERE central.tenant_id = old.tenant_id
            AND LOWER(BTRIM(central.nome)) = LOWER(BTRIM(old.nome))
        )
      ORDER BY old.tenant_id, LOWER(BTRIM(old.nome)), old.id
    `);

    await tx.execute(sql`
      WITH correspondencias AS (
        SELECT
          old.id AS cliente_legado_id,
          (
            SELECT central.id
            FROM clientes central
            WHERE central.tenant_id = old.tenant_id
              AND LOWER(BTRIM(central.nome)) = LOWER(BTRIM(old.nome))
            ORDER BY central.ativo DESC, central.created_at ASC, central.id ASC
            LIMIT 1
          ) AS cliente_central_id
        FROM plm_clientes old
        WHERE old.tenant_id = ${tenantId}
      )
      UPDATE plm_produtos produto
      SET cliente_central_id = correspondencias.cliente_central_id,
          updated_at = NOW()
      FROM correspondencias
      WHERE produto.tenant_id = ${tenantId}
        AND produto.cliente_id = correspondencias.cliente_legado_id
        AND produto.cliente_central_id IS NULL
        AND correspondencias.cliente_central_id IS NOT NULL
    `);

    await tx.execute(sql`
      UPDATE plm_fichas_tecnicas ficha
      SET cliente_central_id = produto.cliente_central_id,
          updated_at = NOW()
      FROM plm_produtos produto
      WHERE ficha.tenant_id = ${tenantId}
        AND produto.tenant_id = ficha.tenant_id
        AND produto.id = ficha.produto_id
        AND ficha.cliente_central_id IS NULL
        AND produto.cliente_central_id IS NOT NULL
    `);

    await tx.execute(sql`
      UPDATE plm_pilotos piloto
      SET cliente_central_id = produto.cliente_central_id,
          updated_at = NOW()
      FROM plm_produtos produto
      WHERE piloto.tenant_id = ${tenantId}
        AND produto.tenant_id = piloto.tenant_id
        AND produto.id = piloto.produto_id
        AND piloto.cliente_central_id IS NULL
        AND produto.cliente_central_id IS NOT NULL
    `);
  });
}

async function assegurarFamiliaProduto(executor: any, tenantId: string, nome: string) {
  const familia = nome.trim().toUpperCase();
  if (!familia) throw new Error("família é obrigatória");
  const [row] = await executor.insert(plm_familias_produto).values({
    tenant_id: tenantId, nome: familia,
  }).onConflictDoNothing().returning();
  if (row) return row;
  const [existing] = await executor.select().from(plm_familias_produto).where(and(
    eq(plm_familias_produto.tenant_id, tenantId), eq(plm_familias_produto.nome, familia),
  ));
  return existing;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/plm/dashboard/kpis", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tid = req.tenantId!;
  const [produtos, fichas, pilotos, aprovacoes] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(plm_produtos).where(eq(plm_produtos.tenant_id, tid)),
    db.select({ count: sql<number>`count(*)` }).from(plm_fichas_tecnicas).where(eq(plm_fichas_tecnicas.tenant_id, tid)),
    db.select({ count: sql<number>`count(*)` }).from(plm_pilotos).where(and(eq(plm_pilotos.tenant_id, tid), eq(plm_pilotos.status, "em_andamento"))),
    db.select({ count: sql<number>`count(*)` }).from(plm_aprovacoes).where(and(eq(plm_aprovacoes.tenant_id, tid), eq(plm_aprovacoes.status, "pendente"))),
  ]);
  res.json({
    totalProdutos: Number(produtos[0]?.count ?? 0),
    totalFichas: Number(fichas[0]?.count ?? 0),
    pilotosAtivos: Number(pilotos[0]?.count ?? 0),
    aprovacoesPendentes: Number(aprovacoes[0]?.count ?? 0),
  });
});

router.get("/plm/dashboard/kanban", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const prods = await db.select().from(plm_produtos)
    .where(eq(plm_produtos.tenant_id, req.tenantId!))
    .orderBy(desc(plm_produtos.updated_at));
  res.json({
    rascunho: prods.filter(p => p.status === "rascunho"),
    desenvolvimento: prods.filter(p => p.status === "desenvolvimento"),
    pilotagem: prods.filter(p => p.status === "pilotagem"),
    aprovado: prods.filter(p => p.status === "aprovado"),
  });
});

router.get("/plm/dashboard/atividades", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const limit = Number(req.query.limit ?? 20);
  const data = await db.select().from(plm_auditoria)
    .where(eq(plm_auditoria.tenant_id, req.tenantId!))
    .orderBy(desc(plm_auditoria.created_at))
    .limit(limit);
  res.json(data);
});

router.post("/plm/admin/reset-from-approved-budgets", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  if (!req.user?.isSuperAdmin) {
    res.status(403).json({ error: "Ação restrita ao administrador master" });
    return;
  }
  if (req.tenantId !== "r2pb") {
    res.status(403).json({ error: "Esta reconstrução está autorizada somente para o tenant R2PB" });
    return;
  }
  if (req.body.confirmacao !== "REINICIAR PLM" || req.body.tenant_id !== req.tenantId) {
    res.status(400).json({ error: "Confirmação ou tenant inválido" });
    return;
  }
  const result = await resetPlmFromApprovedBudgets(req.tenantId!);
  req.log.warn({ tenantId: req.tenantId, result }, "PLM reset and rebuilt from approved budgets");
  res.json(result);
});

// ═══════════════════════════════════════════════════════════════════════════════
// COLEÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/plm/colecoes", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const data = await db.select().from(plm_colecoes)
    .where(and(eq(plm_colecoes.tenant_id, req.tenantId!), eq(plm_colecoes.ativa, true)))
    .orderBy(desc(plm_colecoes.ano), asc(plm_colecoes.nome));
  res.json(data);
});

router.post("/plm/colecoes", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { nome, temporada, ano, descricao } = req.body;
  if (!nome || !temporada || !ano) { res.status(400).json({ error: "nome, temporada e ano são obrigatórios" }); return; }
  const [data] = await db.insert(plm_colecoes).values({
    tenant_id: req.tenantId!, nome, temporada, ano: Number(ano), descricao,
    created_by: req.user?.email,
  }).returning();
  res.status(201).json(data);
});

router.patch("/plm/colecoes/:id", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { nome, temporada, ano, descricao, ativa } = req.body;
  const [data] = await db.update(plm_colecoes)
    .set({ nome, temporada, ano: ano ? Number(ano) : undefined, descricao, ativa, updated_at: new Date() })
    .where(and(eq(plm_colecoes.id, Number(req.params.id)), eq(plm_colecoes.tenant_id, req.tenantId!)))
    .returning();
  if (!data) { res.status(404).json({ error: "Coleção não encontrada" }); return; }
  res.json(data);
});

// ═══════════════════════════════════════════════════════════════════════════════
// FAMÍLIAS DE PRODUTO (fonte compartilhada PLM + custos)
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/plm/familias-produto", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const data = await db.select().from(plm_familias_produto)
    .where(and(eq(plm_familias_produto.tenant_id, req.tenantId!), eq(plm_familias_produto.ativo, true)))
    .orderBy(asc(plm_familias_produto.nome));
  res.json(data);
});

router.post("/plm/familias-produto", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const nome = String(req.body.nome ?? "").trim().toUpperCase();
  if (!nome) { res.status(400).json({ error: "nome é obrigatório" }); return; }
  const [data] = await db.insert(plm_familias_produto).values({
    tenant_id: req.tenantId!, nome, created_by: req.user?.email,
  }).onConflictDoNothing().returning();
  if (!data) { res.status(409).json({ error: "Família já cadastrada" }); return; }
  res.status(201).json(data);
});

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENTES PLM
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/plm/clientes", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  await reconciliarClientesLegadosDoPlm(req.tenantId!);
  const data = await db.select().from(clientes)
    .where(and(
      eq(clientes.tenant_id, req.tenantId!),
      sql`(
        ${clientes.ativo} = true
        OR EXISTS (
          SELECT 1
          FROM plm_produtos produto
          WHERE produto.tenant_id = ${req.tenantId!}
            AND produto.cliente_central_id = ${clientes.id}
        )
      )`,
    ))
    .orderBy(asc(clientes.nome));
  res.json(data);
});

router.post("/plm/clientes", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { nome, cnpj, email, telefone, endereco, cidade, estado } = req.body;
  if (!nome) { res.status(400).json({ error: "nome é obrigatório" }); return; }
  const [data] = await db.insert(clientes).values({
    tenant_id: req.tenantId!, nome, cnpj, email, telefone, endereco, cidade, estado,
  }).returning();
  res.status(201).json(data);
});

router.patch("/plm/clientes/:id", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { nome, cnpj, email, telefone, endereco, cidade, estado, ativo } = req.body;
  const [data] = await db.update(clientes)
    .set({ nome, cnpj, email, telefone, endereco, cidade, estado, ativo, updated_at: new Date() })
    .where(and(eq(clientes.id, req.params.id), eq(clientes.tenant_id, req.tenantId!)))
    .returning();
  if (!data) { res.status(404).json({ error: "Cliente não encontrado" }); return; }
  res.json(data);
});

// ═══════════════════════════════════════════════════════════════════════════════
// FORNECEDORES PLM
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/plm/fornecedores", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const data = await db.select().from(plm_fornecedores)
    .where(and(eq(plm_fornecedores.tenant_id, req.tenantId!), eq(plm_fornecedores.ativo, true)))
    .orderBy(asc(plm_fornecedores.nome));
  res.json(data);
});

router.post("/plm/fornecedores", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { nome, cnpj, contato, email, telefone, cidade, estado, observacoes } = req.body;
  if (!nome) { res.status(400).json({ error: "nome é obrigatório" }); return; }
  const codigoFor = await gerarCodigo(db, req.tenantId!, 'FOR');
  const [data] = await db.insert(plm_fornecedores).values({
    tenant_id: req.tenantId!, codigo: codigoFor, nome, cnpj, contato, email, telefone, cidade, estado, observacoes,
    created_by: req.user?.email,
  }).returning();
  res.status(201).json(data);
});

router.patch("/plm/fornecedores/:id", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { nome, cnpj, contato, email, telefone, cidade, estado, observacoes, ativo } = req.body;
  const [data] = await db.update(plm_fornecedores)
    .set({ nome, cnpj, contato, email, telefone, cidade, estado, observacoes, ativo, updated_at: new Date() })
    .where(and(eq(plm_fornecedores.id, Number(req.params.id)), eq(plm_fornecedores.tenant_id, req.tenantId!)))
    .returning();
  if (!data) { res.status(404).json({ error: "Fornecedor não encontrado" }); return; }
  res.json(data);
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUTOS PLM
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/plm/produtos", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { status } = req.query;
  await reconciliarClientesLegadosDoPlm(req.tenantId!);
  const prods = await db.select().from(plm_produtos)
    .where(eq(plm_produtos.tenant_id, req.tenantId!))
    .orderBy(desc(plm_produtos.updated_at));
  const colecoes = await db.select().from(plm_colecoes).where(eq(plm_colecoes.tenant_id, req.tenantId!));
  const clientesLegados = await db.select().from(plm_clientes).where(eq(plm_clientes.tenant_id, req.tenantId!));
  const clientesCentrais = await db.select().from(clientes).where(eq(clientes.tenant_id, req.tenantId!));
  const colMap = Object.fromEntries(colecoes.map(c => [c.id, c]));
  const cliMap = Object.fromEntries(clientesLegados.map(c => [c.id, c]));
  const cliCentralMap = Object.fromEntries(clientesCentrais.map(c => [c.id, c]));
  let result = prods.map(p => ({
    produto: p,
    colecao: p.colecao_id ? colMap[p.colecao_id] ?? null : null,
     cliente: p.cliente_central_id
       ? cliCentralMap[p.cliente_central_id] ?? null
       : (p.cliente_id ? cliMap[p.cliente_id] ?? null : null),
  }));
  if (status) result = result.filter(r => r.produto.status === status);
  res.json(result);
});

router.get("/plm/produtos/:id", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const [prod] = await db.select().from(plm_produtos)
    .where(and(eq(plm_produtos.id, Number(req.params.id)), eq(plm_produtos.tenant_id, req.tenantId!)));
  if (!prod) { res.status(404).json({ error: "Produto não encontrado" }); return; }
  let colecao = null;
  let cliente = null;
  if (prod.colecao_id) {
    const [c] = await db.select().from(plm_colecoes).where(eq(plm_colecoes.id, prod.colecao_id));
    colecao = c ?? null;
  }
  if (prod.cliente_id) {
    const [c] = await db.select().from(plm_clientes)
      .where(and(eq(plm_clientes.id, prod.cliente_id), eq(plm_clientes.tenant_id, req.tenantId!)));
    cliente = c ?? null;
  }
  if (prod.cliente_central_id) {
    const [c] = await db.select().from(clientes)
      .where(and(eq(clientes.id, prod.cliente_central_id), eq(clientes.tenant_id, req.tenantId!)));
    cliente = c ?? null;
  }
  const [fichasCusto, itensOrcamento, itensPedido] = await Promise.all([
    db.select().from(fichas_custo)
      .where(and(eq(fichas_custo.tenant_id, req.tenantId!), eq(fichas_custo.plm_produto_id, prod.id))),
    db.select({
      itemId: itens_orcamento_custos.id,
      orcamentoId: orcamentos_custos.id,
      numero: orcamentos_custos.numero,
      status: orcamentos_custos.status,
    }).from(itens_orcamento_custos)
      .innerJoin(orcamentos_custos, eq(orcamentos_custos.id, itens_orcamento_custos.orcamento_id))
      .where(and(eq(itens_orcamento_custos.tenant_id, req.tenantId!), eq(itens_orcamento_custos.plm_produto_id, prod.id))),
    db.select({
      itemId: itens_pedido.id,
      pedidoId: pedidos.id,
      numero: pedidos.numero_pedido,
      status: pedidos.status,
      referenciaId: itens_pedido.referencia_id,
      referencia: itens_pedido.referencia,
      referenciaCliente: itens_pedido.referencia_cliente,
      nomeCliente: pedidos.nome_cliente,
    }).from(itens_pedido)
      .innerJoin(pedidos, eq(pedidos.id, itens_pedido.pedido_id))
      .where(and(eq(itens_pedido.tenant_id, req.tenantId!), eq(itens_pedido.plm_produto_id, prod.id))),
  ]);
  res.json({ produto: prod, colecao, cliente, rastreabilidade: { fichasCusto, orcamentos: itensOrcamento, pedidos: itensPedido } });
});

router.post("/plm/produtos", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { nome, colecao_id, cliente_id, cliente_central_id, referencia, referencia_cliente, link_modelagem, categoria, descricao, observacoes } = req.body;
  if (!nome || !categoria) { res.status(400).json({ error: "nome e categoria são obrigatórios" }); return; }
  const clienteCentralId = cliente_central_id?.trim() || null;
  if (!clienteCentralId) { res.status(400).json({ error: "cliente_central_id é obrigatório" }); return; }
  const clienteCentral = await clienteCentralValido(req.tenantId!, clienteCentralId);
  if (!clienteCentral) { res.status(400).json({ error: "Cliente central inválido" }); return; }
  const data = await db.transaction(async tx => {
    const categoriaMestre = String(categoria).trim().toUpperCase();
    await assegurarFamiliaProduto(tx, req.tenantId!, categoriaMestre);
    const referenciaTecnica = await gerarReferenciaTecnica(tx, req.tenantId!);
    const [created] = await tx.insert(plm_produtos).values({
      tenant_id: req.tenantId!, codigo: referenciaTecnica, nome,
      cliente_central_id: clienteCentral.id,
      referencia_tecnica: referenciaTecnica,
      colecao_id: colecao_id ? Number(colecao_id) : null,
      cliente_id: cliente_id ? Number(cliente_id) : null,
      referencia: referencia?.trim() || referenciaTecnica,
      referencia_cliente: referencia_cliente?.trim() || null,
      link_modelagem: link_modelagem?.trim() || null,
      categoria: categoriaMestre, descricao, observacoes, created_by: req.user?.email,
    }).returning();
    return created;
  });
  await logAuditoria({ tenantId: req.tenantId!, produtoId: data.id, modulo: "produto", acao: "criacao", entidadeId: data.id, descricao: `Produto "${nome}" criado`, dadosNovos: data, usuarioId: req.user?.id, usuarioNome: req.user?.email });
  res.status(201).json(data);
});

router.patch("/plm/produtos/:id", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { nome, colecao_id, cliente_id, cliente_central_id, referencia, referencia_cliente, link_modelagem, categoria, descricao, observacoes, status, imagem_url } = req.body;
  const before = await db.select().from(plm_produtos).where(and(eq(plm_produtos.id, Number(req.params.id)), eq(plm_produtos.tenant_id, req.tenantId!)));
  if (!before[0]) { res.status(404).json({ error: "Produto não encontrado" }); return; }
  if (cliente_central_id !== undefined && String(cliente_central_id ?? "") !== String(before[0].cliente_central_id ?? "")) {
    res.status(409).json({ error: "O cliente central do produto é imutável; duplique a ficha para outro cliente" });
    return;
  }
  let clienteCentralId: string | null | undefined;
  if (cliente_central_id !== undefined) {
    const clienteCentral = await clienteCentralValido(req.tenantId!, cliente_central_id);
    if (!clienteCentral) { res.status(400).json({ error: "Cliente central inválido" }); return; }
    clienteCentralId = clienteCentral.id;
  }
  const referenciaClienteNormalizada = referencia_cliente === undefined ? undefined : referencia_cliente?.trim() || null;
  if (referenciaClienteNormalizada) {
    const [pedidoConflitante] = await db.select({ id: itens_pedido.id, referenciaCliente: itens_pedido.referencia_cliente })
      .from(itens_pedido)
      .where(and(
        eq(itens_pedido.tenant_id, req.tenantId!),
        eq(itens_pedido.plm_produto_id, before[0].id),
        sql`${itens_pedido.referencia_cliente} IS NOT NULL`,
        sql`${itens_pedido.referencia_cliente} <> ${referenciaClienteNormalizada}`,
      ))
      .limit(1);
    if (pedidoConflitante) {
      res.status(409).json({ error: `O pedido vinculado já possui a referência do cliente "${pedidoConflitante.referenciaCliente}".` });
      return;
    }
  }
  const data = await db.transaction(async tx => {
    const categoriaMestre = String(categoria ?? before[0].categoria).trim().toUpperCase();
    await assegurarFamiliaProduto(tx, req.tenantId!, categoriaMestre);
    const [updated] = await tx.update(plm_produtos)
      .set({
        nome,
        colecao_id: colecao_id !== undefined ? (colecao_id ? Number(colecao_id) : null) : undefined,
        cliente_id: cliente_id !== undefined ? (cliente_id ? Number(cliente_id) : null) : undefined,
        cliente_central_id: clienteCentralId,
        referencia,
        referencia_cliente: referenciaClienteNormalizada,
        link_modelagem: link_modelagem === undefined ? undefined : link_modelagem?.trim() || null,
        categoria: categoria === undefined ? undefined : categoriaMestre, descricao, observacoes, status, imagem_url, updated_at: new Date(),
      })
      .where(and(eq(plm_produtos.id, Number(req.params.id)), eq(plm_produtos.tenant_id, req.tenantId!)))
      .returning();
    return updated;
  });
  if (referenciaClienteNormalizada) {
    await db.update(itens_pedido)
      .set({ referencia_cliente: referenciaClienteNormalizada })
      .where(and(
        eq(itens_pedido.tenant_id, req.tenantId!),
        eq(itens_pedido.plm_produto_id, data.id),
        sql`(${itens_pedido.referencia_cliente} IS NULL OR ${itens_pedido.referencia_cliente} = ${referenciaClienteNormalizada})`,
      ));
    await db.update(referencias)
      .set({ referencia_cliente: referenciaClienteNormalizada, updated_at: new Date() })
      .where(and(
        eq(referencias.tenant_id, req.tenantId!),
        eq(referencias.plm_produto_id, data.id),
        sql`(${referencias.referencia_cliente} IS NULL OR ${referencias.referencia_cliente} = ${referenciaClienteNormalizada})`,
      ));
  }
  await logAuditoria({ tenantId: req.tenantId!, produtoId: data.id, modulo: "produto", acao: "atualizacao", entidadeId: data.id, descricao: `Produto "${data.nome}" atualizado`, dadosAnteriores: before[0], dadosNovos: data, usuarioId: req.user?.id, usuarioNome: req.user?.email });
  res.json(data);
});

router.delete("/plm/produtos/:id", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  await db.delete(plm_produtos).where(and(eq(plm_produtos.id, Number(req.params.id)), eq(plm_produtos.tenant_id, req.tenantId!)));
  res.status(204).send();
});

// ═══════════════════════════════════════════════════════════════════════════════
// FICHAS TÉCNICAS
// ═══════════════════════════════════════════════════════════════════════════════

const CAMISETA_CAMPOS = [
  { chave: "torax", nome: "Tórax", unidade: "cm", ordem: 1 },
  { chave: "ombro", nome: "Ombro", unidade: "cm", ordem: 2 },
  { chave: "comprimento", nome: "Comprimento", unidade: "cm", ordem: 3 },
  { chave: "manga", nome: "Manga", unidade: "cm", ordem: 4 },
  { chave: "boca_manga", nome: "Boca da manga", unidade: "cm", ordem: 5 },
  { chave: "punho", nome: "Punho", unidade: "cm", ordem: 6 },
];

async function ensureFamiliasMedidas(tenantId: string) {
  const nomes = await db.selectDistinct({ nome: fichas_custo.familia })
    .from(fichas_custo)
    .where(and(eq(fichas_custo.tenant_id, tenantId), sql`${fichas_custo.familia} IS NOT NULL`));
  const existentes = await db.select().from(plm_familias_medidas)
    .where(eq(plm_familias_medidas.tenant_id, tenantId));
  const existentesNormalizados = new Set(existentes.map(f => f.nome.trim().toLocaleLowerCase("pt-BR")));
  const novos = nomes
    .map(n => n.nome?.trim())
    .filter((nome): nome is string => !!nome && !existentesNormalizados.has(nome.toLocaleLowerCase("pt-BR")))
    .map(nome => ({
      tenant_id: tenantId,
      nome,
      campos: nome.toLocaleLowerCase("pt-BR").includes("camiseta") ? CAMISETA_CAMPOS : [],
    }));
  if (novos.length > 0) await db.insert(plm_familias_medidas).values(novos).onConflictDoNothing();
}

router.get("/plm/familias-medidas", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  await ensureFamiliasMedidas(req.tenantId!);
  const data = await db.select().from(plm_familias_medidas)
    .where(and(eq(plm_familias_medidas.tenant_id, req.tenantId!), eq(plm_familias_medidas.ativo, true)))
    .orderBy(asc(plm_familias_medidas.nome));
  res.json(data);
});

router.post("/plm/familias-medidas", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const nome = String(req.body.nome ?? "").trim();
  if (!nome) { res.status(400).json({ error: "nome é obrigatório" }); return; }
  const [data] = await db.insert(plm_familias_medidas).values({
    tenant_id: req.tenantId!,
    nome,
    campos: Array.isArray(req.body.campos) ? req.body.campos : [],
    mockup_url: req.body.mockup_url || null,
  }).onConflictDoNothing().returning();
  if (!data) { res.status(409).json({ error: "Família já cadastrada" }); return; }
  res.status(201).json(data);
});

router.patch("/plm/familias-medidas/:id", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { nome, campos, mockup_url, ativo } = req.body;
  const [data] = await db.update(plm_familias_medidas).set({
    nome: nome === undefined ? undefined : String(nome).trim(),
    campos: campos === undefined ? undefined : campos,
    mockup_url: mockup_url === undefined ? undefined : (mockup_url || null),
    ativo,
    updated_at: new Date(),
  }).where(and(eq(plm_familias_medidas.id, Number(req.params.id)), eq(plm_familias_medidas.tenant_id, req.tenantId!))).returning();
  if (!data) { res.status(404).json({ error: "Família não encontrada" }); return; }
  res.json(data);
});

router.get("/plm/medidas-contexto", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const produtoId = Number(req.query.produto_id);
  const fichaId = Number(req.query.ficha_id);
  const pedidoItemId = req.query.pedido_item_id ? String(req.query.pedido_item_id) : null;
  if (!produtoId && !fichaId) { res.status(400).json({ error: "produto_id ou ficha_id é obrigatório" }); return; }

  const [ficha] = fichaId
    ? await db.select().from(plm_fichas_tecnicas).where(and(eq(plm_fichas_tecnicas.id, fichaId), eq(plm_fichas_tecnicas.tenant_id, req.tenantId!)))
    : [];
  const produtoFinalId = produtoId || ficha?.produto_id;
  const [produto] = await db.select().from(plm_produtos)
    .where(and(eq(plm_produtos.id, produtoFinalId), eq(plm_produtos.tenant_id, req.tenantId!)));
  if (!produto) { res.status(404).json({ error: "Produto não encontrado" }); return; }

  await ensureFamiliasMedidas(req.tenantId!);
  const familias = await db.select().from(plm_familias_medidas)
    .where(and(eq(plm_familias_medidas.tenant_id, req.tenantId!), eq(plm_familias_medidas.ativo, true)));
  const nomeFamilia = ficha?.familia || produto.categoria || "";
  const familia = familias.find(f => f.id === ficha?.familia_medidas_id)
    ?? familias.find(f => f.nome.trim().toLocaleLowerCase("pt-BR") === nomeFamilia.trim().toLocaleLowerCase("pt-BR"))
    ?? null;

  const itens = await db.select({
    id: itens_pedido.id,
    pedidoId: itens_pedido.pedido_id,
    gradeId: itens_pedido.grade_id,
    referencia: itens_pedido.referencia,
    referenciaCliente: itens_pedido.referencia_cliente,
    quantidadePorTamanho: itens_pedido.quantidade_por_tamanho,
    numeroPedido: pedidos.numero_pedido,
  }).from(itens_pedido)
    .innerJoin(pedidos, eq(pedidos.id, itens_pedido.pedido_id))
    .where(and(eq(itens_pedido.tenant_id, req.tenantId!), eq(itens_pedido.plm_produto_id, produtoFinalId)))
    .orderBy(desc(itens_pedido.created_at));

  const itemSelecionado = itens.find(i => i.id === pedidoItemId)
    ?? itens.find(i => i.id === ficha?.pedido_item_id)
    ?? itens.find(i => !!i.gradeId)
    ?? null;
  const gradeIds = [...new Set([
    ...itens.map(i => i.gradeId).filter(Boolean),
    ficha?.grade_id,
  ])] as string[];
  const gradesData = gradeIds.length
    ? await db.select().from(grades).where(and(eq(grades.tenant_id, req.tenantId!), inArray(grades.id, gradeIds)))
    : [];
  const gradeDaFicha = ficha?.grade_id
    ? gradesData.find(g => g.id === ficha.grade_id) ?? null
    : null;

  res.json({
    familia,
    familias,
    itens: itens.map(item => ({
      ...item,
      grade: gradesData.find(g => g.id === item.gradeId) ?? null,
    })),
    grade: gradeDaFicha,
    itemSelecionado: itemSelecionado ? {
      ...itemSelecionado,
      grade: gradesData.find(g => g.id === itemSelecionado.gradeId) ?? null,
    } : null,
  });
});

router.get("/plm/fichas", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { produto_id } = req.query;
  let q = db.select().from(plm_fichas_tecnicas).where(eq(plm_fichas_tecnicas.tenant_id, req.tenantId!));
  const data = await q.orderBy(desc(plm_fichas_tecnicas.versao));
  res.json(produto_id ? data.filter(f => f.produto_id === Number(produto_id)) : data);
});

router.get("/plm/fichas/:id", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const [ficha] = await db.select().from(plm_fichas_tecnicas)
    .where(and(eq(plm_fichas_tecnicas.id, Number(req.params.id)), eq(plm_fichas_tecnicas.tenant_id, req.tenantId!)));
  if (!ficha) { res.status(404).json({ error: "Ficha não encontrada" }); return; }
  res.json(ficha);
});

router.post("/plm/fichas/:id/duplicar", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const targetClientId = String(req.body.cliente_central_id ?? "").trim();
  if (!targetClientId) { res.status(400).json({ error: "cliente_central_id é obrigatório" }); return; }
  const targetClient = await clienteCentralValido(req.tenantId!, targetClientId);
  if (!targetClient) { res.status(400).json({ error: "Cliente central inválido" }); return; }
  const sourceId = Number(req.params.id);
  const result = await db.transaction(async tx => {
    const [sourceFicha] = await tx.select().from(plm_fichas_tecnicas)
      .where(and(eq(plm_fichas_tecnicas.id, sourceId), eq(plm_fichas_tecnicas.tenant_id, req.tenantId!)));
    if (!sourceFicha) return null;
    const [sourceProduct] = await tx.select().from(plm_produtos)
      .where(and(eq(plm_produtos.id, sourceFicha.produto_id), eq(plm_produtos.tenant_id, req.tenantId!)));
    if (!sourceProduct) return null;
    await assegurarFamiliaProduto(tx, req.tenantId!, sourceProduct.categoria);
    const referenciaTecnica = await gerarReferenciaTecnica(tx, req.tenantId!);
    const [newProduct] = await tx.insert(plm_produtos).values({
      tenant_id: req.tenantId!, codigo: referenciaTecnica,
      nome: sourceProduct.nome, cliente_central_id: targetClient.id,
      referencia_tecnica: referenciaTecnica, referencia: referenciaTecnica,
      categoria: sourceProduct.categoria, descricao: sourceProduct.descricao,
      link_modelagem: sourceProduct.link_modelagem, status: "rascunho",
      observacoes: sourceProduct.observacoes, origem_produto_id: sourceProduct.id,
      created_by: req.user?.email,
    }).returning();
    const [newFicha] = await tx.insert(plm_fichas_tecnicas).values({
      tenant_id: req.tenantId!, produto_id: newProduct.id, versao: 1,
      codigo: await gerarCodigo(tx, req.tenantId!, "FT"),
      cliente_central_id: targetClient.id, referencia_tecnica: referenciaTecnica,
      referencia: referenciaTecnica, titulo: sourceFicha.titulo,
      familia: sourceFicha.familia, familia_medidas_id: sourceFicha.familia_medidas_id,
      medidas: sourceFicha.medidas, componentes: sourceFicha.componentes,
      tipo_costura: sourceFicha.tipo_costura, instrucao_lavagem: sourceFicha.instrucao_lavagem,
      etiqueta_composicao_url: sourceFicha.etiqueta_composicao_url,
      bordado_estampa: sourceFicha.bordado_estampa, aviamentos: sourceFicha.aviamentos,
      foto_principal_url: sourceFicha.foto_principal_url, galeria_urls: sourceFicha.galeria_urls,
      mao_de_obra: sourceFicha.mao_de_obra, observacoes: sourceFicha.observacoes,
      status: "rascunho", origem_ficha_id: sourceFicha.id, created_by: req.user?.email,
    }).returning();
    return { produto: newProduct, ficha: newFicha };
  });
  if (!result) { res.status(404).json({ error: "Ficha ou produto não encontrado" }); return; }
  res.status(201).json(result);
});

router.post("/plm/fichas", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { produto_id, titulo, referencia, referencia_cliente, link_modelagem, cliente_id, cliente_central_id, familia, familia_medidas_id, pedido_item_id, grade_id, medidas, componentes, tipo_costura, instrucao_lavagem, etiqueta_composicao_url, bordado_estampa, aviamentos, foto_principal_url, galeria_urls, mao_de_obra, observacoes } = req.body;
  if (!produto_id) { res.status(400).json({ error: "produto_id é obrigatório" }); return; }
  const [produto] = await db.select({
    referencia: plm_produtos.referencia,
    referenciaTecnica: plm_produtos.referencia_tecnica,
    referenciaCliente: plm_produtos.referencia_cliente,
    clienteCentralId: plm_produtos.cliente_central_id,
    clienteId: plm_produtos.cliente_id,
    familia: plm_produtos.categoria,
  })
    .from(plm_produtos)
    .where(and(eq(plm_produtos.id, Number(produto_id)), eq(plm_produtos.tenant_id, req.tenantId!)));
  if (!produto) { res.status(404).json({ error: "Produto não encontrado" }); return; }
  if (!produto.clienteCentralId || !produto.referenciaTecnica) {
    res.status(400).json({ error: "O produto precisa de cliente central e referência técnica antes da ficha" });
    return;
  }
  if (cliente_central_id && String(cliente_central_id) !== produto.clienteCentralId) {
    res.status(400).json({ error: "O cliente informado não pertence ao produto selecionado" });
    return;
  }
  if (cliente_id && !cliente_central_id && Number(cliente_id) !== produto.clienteId) {
    res.status(400).json({ error: "O cliente informado não pertence ao produto selecionado" });
    return;
  }
  const { data, versao } = await db.transaction(async tx => {
    await assegurarFamiliaProduto(tx, req.tenantId!, familia || produto.familia || "OUTRO");
    const existentes = await tx.select({ versao: plm_fichas_tecnicas.versao }).from(plm_fichas_tecnicas)
      .where(and(eq(plm_fichas_tecnicas.produto_id, Number(produto_id)), eq(plm_fichas_tecnicas.tenant_id, req.tenantId!)))
      .orderBy(desc(plm_fichas_tecnicas.versao)).limit(1);
    const versao = (existentes[0]?.versao ?? 0) + 1;
    const codigoFt = await gerarCodigo(tx, req.tenantId!, 'FT');
    const [data] = await tx.insert(plm_fichas_tecnicas).values({
      tenant_id: req.tenantId!, codigo: codigoFt, produto_id: Number(produto_id), versao,
      cliente_central_id: produto.clienteCentralId,
      referencia_tecnica: produto.referenciaTecnica,
      titulo: titulo || referencia || produto.referencia || null,
      referencia: referencia || produto.referencia || produto.referenciaTecnica || null,
      referencia_cliente: referencia_cliente || produto.referenciaCliente || null,
      cliente_id: produto.clienteId ?? null,
      familia: (familia || produto.familia || "OUTRO").trim().toUpperCase(),
      familia_medidas_id: familia_medidas_id ? Number(familia_medidas_id) : null,
      pedido_item_id: pedido_item_id || null,
      grade_id: grade_id || null,
      medidas, componentes, tipo_costura, instrucao_lavagem, etiqueta_composicao_url, bordado_estampa, aviamentos,
      foto_principal_url, galeria_urls, mao_de_obra, observacoes: observacoes ?? "",
      created_by: req.user?.email,
    }).returning();
    if (link_modelagem !== undefined) {
      await tx.update(plm_produtos)
        .set({ link_modelagem: link_modelagem?.trim() || null, updated_at: new Date() })
        .where(and(eq(plm_produtos.id, Number(produto_id)), eq(plm_produtos.tenant_id, req.tenantId!)));
    }
    if (pedido_item_id) {
      await tx.update(itens_pedido).set({ plm_ficha_tecnica_id: data.id })
        .where(and(eq(itens_pedido.id, String(pedido_item_id)), eq(itens_pedido.tenant_id, req.tenantId!), eq(itens_pedido.plm_produto_id, Number(produto_id))));
    }
    return { data, versao };
  });
  await logAuditoria({ tenantId: req.tenantId!, produtoId: Number(produto_id), modulo: "ficha_tecnica", acao: "criacao", entidadeId: data.id, descricao: `Ficha Técnica v${versao} criada`, dadosNovos: data, usuarioId: req.user?.id, usuarioNome: req.user?.email });
  res.status(201).json(data);
});

router.patch("/plm/fichas/:id", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { titulo, referencia, referencia_cliente, link_modelagem, cliente_id, familia, familia_medidas_id, pedido_item_id, grade_id, medidas, componentes, tipo_costura, instrucao_lavagem, etiqueta_composicao_url, bordado_estampa, aviamentos, foto_principal_url, galeria_urls, mao_de_obra, observacoes, status } = req.body;
  const [fichaAtual] = await db.select({
    referencia: plm_fichas_tecnicas.referencia,
    referenciaCliente: plm_fichas_tecnicas.referencia_cliente,
    familia: plm_fichas_tecnicas.familia,
  }).from(plm_fichas_tecnicas).where(and(
    eq(plm_fichas_tecnicas.id, Number(req.params.id)),
    eq(plm_fichas_tecnicas.tenant_id, req.tenantId!),
  ));
  if (!fichaAtual) { res.status(404).json({ error: "Ficha não encontrada" }); return; }
  if (referencia !== undefined && String(referencia ?? "").trim() !== String(fichaAtual.referencia ?? "").trim()) {
    res.status(409).json({ error: "A referência técnica da ficha é imutável" }); return;
  }
  if (referencia_cliente !== undefined && String(referencia_cliente ?? "").trim() !== String(fichaAtual.referenciaCliente ?? "").trim()) {
    res.status(409).json({ error: "A referência do cliente da ficha é imutável" }); return;
  }
  const data = await db.transaction(async tx => {
    await assegurarFamiliaProduto(tx, req.tenantId!, String(familia ?? fichaAtual.familia ?? "OUTRO"));
    const [updated] = await tx.update(plm_fichas_tecnicas)
      .set({
        titulo: titulo ?? (referencia || undefined),
        referencia, referencia_cliente,
        cliente_id: cliente_id !== undefined ? (cliente_id ? Number(cliente_id) : null) : undefined,
        familia: familia === undefined ? undefined : String(familia).trim().toUpperCase(),
        familia_medidas_id: familia_medidas_id === undefined ? undefined : (familia_medidas_id ? Number(familia_medidas_id) : null),
        pedido_item_id: pedido_item_id === undefined ? undefined : (pedido_item_id || null),
        grade_id: grade_id === undefined ? undefined : (grade_id || null),
        medidas, componentes, tipo_costura, instrucao_lavagem, etiqueta_composicao_url,
        bordado_estampa, aviamentos, foto_principal_url, galeria_urls, mao_de_obra, observacoes, status,
        updated_at: new Date(),
      })
      .where(and(eq(plm_fichas_tecnicas.id, Number(req.params.id)), eq(plm_fichas_tecnicas.tenant_id, req.tenantId!)))
      .returning();
    return updated;
  });
  if (!data) { res.status(404).json({ error: "Ficha não encontrada" }); return; }
  if (link_modelagem !== undefined) {
    await db.update(plm_produtos)
      .set({ link_modelagem: link_modelagem?.trim() || null, updated_at: new Date() })
      .where(and(eq(plm_produtos.id, data.produto_id), eq(plm_produtos.tenant_id, req.tenantId!)));
  }
  if (pedido_item_id) {
    await db.update(itens_pedido).set({ plm_ficha_tecnica_id: data.id })
      .where(and(
        eq(itens_pedido.id, String(pedido_item_id)),
        eq(itens_pedido.tenant_id, req.tenantId!),
        eq(itens_pedido.plm_produto_id, data.produto_id),
      ));
  }
  await logAuditoria({ tenantId: req.tenantId!, produtoId: data.produto_id, modulo: "ficha_tecnica", acao: "atualizacao", entidadeId: data.id, descricao: `Ficha Técnica v${data.versao} atualizada`, usuarioId: req.user?.id, usuarioNome: req.user?.email });
  res.json(data);
});

// ═══════════════════════════════════════════════════════════════════════════════
// MODELAGEM (MOLDES)
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/plm/modelagem", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { produto_id } = req.query;
  const data = await db.select().from(plm_moldes)
    .where(eq(plm_moldes.tenant_id, req.tenantId!))
    .orderBy(desc(plm_moldes.versao));
  res.json(produto_id ? data.filter(m => m.produto_id === Number(produto_id)) : data);
});

router.post("/plm/modelagem", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { produto_id, tamanho_base, arquivo_url, arquivo_nome, descricao_alteracoes, observacoes } = req.body;
  if (!produto_id) { res.status(400).json({ error: "produto_id é obrigatório" }); return; }
  const existentes = await db.select({ versao: plm_moldes.versao }).from(plm_moldes)
    .where(and(eq(plm_moldes.produto_id, Number(produto_id)), eq(plm_moldes.tenant_id, req.tenantId!)))
    .orderBy(desc(plm_moldes.versao)).limit(1);
  const versao = (existentes[0]?.versao ?? 0) + 1;
  const [data] = await db.insert(plm_moldes).values({
    tenant_id: req.tenantId!, produto_id: Number(produto_id), versao, tamanho_base, arquivo_url, arquivo_nome, descricao_alteracoes, observacoes, created_by: req.user?.email,
  }).returning();
  await logAuditoria({ tenantId: req.tenantId!, produtoId: Number(produto_id), modulo: "modelagem", acao: "criacao", entidadeId: data.id, descricao: `Modelagem v${versao} enviada`, usuarioId: req.user?.id, usuarioNome: req.user?.email });
  res.status(201).json(data);
});

// ═══════════════════════════════════════════════════════════════════════════════
// MATERIAIS
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/plm/materiais", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { tipo } = req.query;
  const data = await db.select({ material: plm_materiais, fornecedor: plm_fornecedores })
    .from(plm_materiais)
    .leftJoin(plm_fornecedores, eq(plm_materiais.fornecedor_id, plm_fornecedores.id))
    .where(and(eq(plm_materiais.tenant_id, req.tenantId!), eq(plm_materiais.ativo, true)))
    .orderBy(asc(plm_materiais.descricao));
  res.json(tipo ? data.filter(d => d.material.tipo === tipo) : data);
});

router.post("/plm/materiais", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { fornecedor_id, tipo, codigo, descricao, unidade, preco_unitario, cor, composicao, observacoes } = req.body;
  if (!tipo || !descricao || !unidade || !preco_unitario) { res.status(400).json({ error: "tipo, descricao, unidade e preco_unitario são obrigatórios" }); return; }
  const codigoMat = codigo || await gerarCodigo(db, req.tenantId!, extrairPrefixo(descricao));
  const [data] = await db.insert(plm_materiais).values({
    tenant_id: req.tenantId!, fornecedor_id: fornecedor_id ? Number(fornecedor_id) : null,
    tipo, codigo: codigoMat, descricao, unidade, preco_unitario: String(preco_unitario), cor, composicao, observacoes, created_by: req.user?.email,
  }).returning();
  await logAuditoria({ tenantId: req.tenantId!, modulo: "material", acao: "criacao", entidadeId: data.id, descricao: `Material "${descricao}" (${tipo}) cadastrado`, usuarioId: req.user?.id, usuarioNome: req.user?.email });
  res.status(201).json(data);
});

router.patch("/plm/materiais/:id", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { fornecedor_id, tipo, codigo, descricao, unidade, preco_unitario, cor, composicao, observacoes, ativo } = req.body;
  const [data] = await db.update(plm_materiais)
    .set({ fornecedor_id: fornecedor_id !== undefined ? (fornecedor_id ? Number(fornecedor_id) : null) : undefined, tipo, codigo, descricao, unidade, preco_unitario: preco_unitario ? String(preco_unitario) : undefined, cor, composicao, observacoes, ativo, updated_at: new Date() })
    .where(and(eq(plm_materiais.id, Number(req.params.id)), eq(plm_materiais.tenant_id, req.tenantId!)))
    .returning();
  if (!data) { res.status(404).json({ error: "Material não encontrado" }); return; }
  res.json(data);
});

// ═══════════════════════════════════════════════════════════════════════════════
// BOM
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/plm/bom", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { produto_id } = req.query;
  const boms = await db.select().from(plm_boms)
    .where(eq(plm_boms.tenant_id, req.tenantId!))
    .orderBy(desc(plm_boms.versao));
  res.json(produto_id ? boms.filter(b => b.produto_id === Number(produto_id)) : boms);
});

// Endpoint especial: materiais sugeridos pela família (fichas → produtos → boms → linhas)
// DEVE ficar ANTES de /plm/bom/:id para não ser capturado pelo parâmetro dinâmico
router.get("/plm/bom/materiais-por-familia", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { familia } = req.query;
  if (!familia || typeof familia !== "string" || !familia.trim()) {
    res.status(400).json({ error: "familia é obrigatório" }); return;
  }
  const tid = req.tenantId!;
  const termo = `%${familia.trim().toLowerCase()}%`;

  // 1. Fichas com a família buscada
  const fichas = await db.select({ produto_id: plm_fichas_tecnicas.produto_id })
    .from(plm_fichas_tecnicas)
    .where(and(eq(plm_fichas_tecnicas.tenant_id, tid), sql`lower(${plm_fichas_tecnicas.familia}) like ${termo}`));

  if (fichas.length === 0) {
    res.json({ materiais: [], fichasEncontradas: 0 }); return;
  }

  const produtoIds = [...new Set(fichas.map(f => f.produto_id))];

  // 2. BOMs desses produtos
  const boms = await db.select({ id: plm_boms.id })
    .from(plm_boms)
    .where(and(eq(plm_boms.tenant_id, tid), sql`${plm_boms.produto_id} = ANY(${sql.raw(`ARRAY[${produtoIds.join(",")}]`)})` ));

  if (boms.length === 0) {
    res.json({ materiais: [], fichasEncontradas: fichas.length }); return;
  }

  const bomIds = boms.map(b => b.id);

  // 3. Linhas desses BOMs com dados do material
  const linhas = await db.select({
    material_id: plm_bom_linhas.material_id,
    quantidade: plm_bom_linhas.quantidade,
    preco_unitario: plm_bom_linhas.preco_unitario,
    descricao: plm_materiais.descricao,
    unidade: plm_materiais.unidade,
    tipo: plm_materiais.tipo,
    codigo: plm_materiais.codigo,
  })
    .from(plm_bom_linhas)
    .leftJoin(plm_materiais, eq(plm_bom_linhas.material_id, plm_materiais.id))
    .where(sql`${plm_bom_linhas.bom_id} = ANY(${sql.raw(`ARRAY[${bomIds.join(",")}]`)})`);

  // Deduplicar por material_id — mantém a primeira ocorrência (ou poderia fazer média)
  const seen = new Set<number>();
  const unicos = linhas.filter(l => {
    if (!l.material_id || seen.has(l.material_id)) return false;
    seen.add(l.material_id);
    return true;
  });

  res.json({ materiais: unicos, fichasEncontradas: fichas.length });
});

router.get("/plm/bom/:id", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const [bom] = await db.select().from(plm_boms)
    .where(and(eq(plm_boms.id, Number(req.params.id)), eq(plm_boms.tenant_id, req.tenantId!)));
  if (!bom) { res.status(404).json({ error: "BOM não encontrado" }); return; }
  const linhas = await db.select({ linha: plm_bom_linhas, material: plm_materiais })
    .from(plm_bom_linhas)
    .leftJoin(plm_materiais, eq(plm_bom_linhas.material_id, plm_materiais.id))
    .where(eq(plm_bom_linhas.bom_id, bom.id));
  res.json({ bom, linhas });
});

router.post("/plm/bom", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { produto_id, custo_mao_de_obra, custos_indiretos, margem_lucro, preco_venda, observacoes } = req.body;
  if (!produto_id) { res.status(400).json({ error: "produto_id é obrigatório" }); return; }
  const existentes = await db.select({ versao: plm_boms.versao }).from(plm_boms)
    .where(and(eq(plm_boms.produto_id, Number(produto_id)), eq(plm_boms.tenant_id, req.tenantId!)))
    .orderBy(desc(plm_boms.versao)).limit(1);
  const versao = (existentes[0]?.versao ?? 0) + 1;
  const codigoBom = await gerarCodigo(db, req.tenantId!, 'FC');
  const [data] = await db.insert(plm_boms).values({
    tenant_id: req.tenantId!, codigo: codigoBom, produto_id: Number(produto_id), versao,
    custo_mao_de_obra: custo_mao_de_obra ? String(custo_mao_de_obra) : "0",
    custos_indiretos: custos_indiretos ? String(custos_indiretos) : "0",
    margem_lucro: margem_lucro ? String(margem_lucro) : "0",
    preco_venda: preco_venda ? String(preco_venda) : "0",
    observacoes, created_by: req.user?.email,
  }).returning();
  await logAuditoria({ tenantId: req.tenantId!, produtoId: Number(produto_id), modulo: "bom", acao: "criacao", entidadeId: data.id, descricao: `BOM v${versao} criado`, usuarioId: req.user?.id, usuarioNome: req.user?.email });
  res.status(201).json(data);
});

router.patch("/plm/bom/:id", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { custo_mao_de_obra, custos_indiretos, margem_lucro, preco_venda, observacoes } = req.body;
  const [data] = await db.update(plm_boms)
    .set({ custo_mao_de_obra: custo_mao_de_obra ? String(custo_mao_de_obra) : undefined, custos_indiretos: custos_indiretos ? String(custos_indiretos) : undefined, margem_lucro: margem_lucro ? String(margem_lucro) : undefined, preco_venda: preco_venda ? String(preco_venda) : undefined, observacoes, updated_at: new Date() })
    .where(and(eq(plm_boms.id, Number(req.params.id)), eq(plm_boms.tenant_id, req.tenantId!)))
    .returning();
  if (!data) { res.status(404).json({ error: "BOM não encontrado" }); return; }
  res.json(data);
});

router.post("/plm/bom/:id/linhas", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { material_id, quantidade, preco_unitario, observacoes } = req.body;
  const subtotal = (parseFloat(quantidade) * parseFloat(preco_unitario)).toFixed(2);
  const [data] = await db.insert(plm_bom_linhas).values({
    bom_id: Number(req.params.id), material_id: Number(material_id),
    quantidade: String(quantidade), preco_unitario: String(preco_unitario), subtotal, observacoes,
  }).returning();
  res.status(201).json(data);
});

router.patch("/plm/bom/linhas/:id", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { quantidade, preco_unitario, observacoes } = req.body;
  const subtotal = (parseFloat(quantidade) * parseFloat(preco_unitario)).toFixed(2);
  const [data] = await db.update(plm_bom_linhas)
    .set({ quantidade: String(quantidade), preco_unitario: String(preco_unitario), subtotal, observacoes })
    .where(eq(plm_bom_linhas.id, Number(req.params.id)))
    .returning();
  res.json(data);
});

router.delete("/plm/bom/linhas/:id", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  await db.delete(plm_bom_linhas).where(eq(plm_bom_linhas.id, Number(req.params.id)));
  res.status(204).send();
});

// ═══════════════════════════════════════════════════════════════════════════════
// PILOTAGEM
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/plm/processos", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const processos = await db.select().from(plm_processos)
    .where(eq(plm_processos.tenant_id, req.tenantId!))
    .orderBy(asc(plm_processos.sequencia), asc(plm_processos.nome));
  const etapas = processos.length
    ? await db.select().from(plm_processo_etapas)
      .where(inArray(plm_processo_etapas.processo_id, processos.map(p => p.id)))
      .orderBy(asc(plm_processo_etapas.sequencia), asc(plm_processo_etapas.nome))
    : [];
  res.json(processos.map(processo => ({
    ...processo,
    etapas: etapas.filter(etapa => etapa.processo_id === processo.id),
  })));
});

router.post("/plm/processos", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const nome = String(req.body.nome ?? "").trim();
  const sequencia = Number(req.body.sequencia);
  if (!nome || !Number.isInteger(sequencia) || sequencia < 1) {
    res.status(400).json({ error: "nome e sequência válida são obrigatórios" }); return;
  }
  const [data] = await db.insert(plm_processos).values({
    tenant_id: req.tenantId!, nome, sequencia, created_by: req.user?.email,
  }).returning();
  res.status(201).json(data);
});

router.patch("/plm/processos/:id", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { nome, sequencia, ativo } = req.body;
  const [data] = await db.update(plm_processos).set({
    nome: nome === undefined ? undefined : String(nome).trim(),
    sequencia: sequencia === undefined ? undefined : Number(sequencia),
    ativo,
    updated_at: new Date(),
  }).where(and(eq(plm_processos.id, Number(req.params.id)), eq(plm_processos.tenant_id, req.tenantId!))).returning();
  if (!data) { res.status(404).json({ error: "Processo não encontrado" }); return; }
  res.json(data);
});

router.post("/plm/processos/:id/etapas", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const nome = String(req.body.nome ?? "").trim();
  const sequencia = Number(req.body.sequencia);
  const processoId = Number(req.params.id);
  if (!nome || !Number.isInteger(sequencia) || sequencia < 1) {
    res.status(400).json({ error: "nome e sequência válida são obrigatórios" }); return;
  }
  const [processo] = await db.select({ id: plm_processos.id }).from(plm_processos)
    .where(and(eq(plm_processos.id, processoId), eq(plm_processos.tenant_id, req.tenantId!)));
  if (!processo) { res.status(404).json({ error: "Processo não encontrado" }); return; }
  const [data] = await db.insert(plm_processo_etapas).values({ processo_id: processoId, nome, sequencia }).returning();
  res.status(201).json(data);
});

router.patch("/plm/processos/etapas/:id", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const [data] = await db.update(plm_processo_etapas).set({
    nome: req.body.nome === undefined ? undefined : String(req.body.nome).trim(),
    sequencia: req.body.sequencia === undefined ? undefined : Number(req.body.sequencia),
    ativo: req.body.ativo,
    updated_at: new Date(),
  }).from(plm_processos)
    .where(and(
      eq(plm_processo_etapas.id, Number(req.params.id)),
      eq(plm_processos.id, plm_processo_etapas.processo_id),
      eq(plm_processos.tenant_id, req.tenantId!),
    )).returning();
  if (!data) { res.status(404).json({ error: "Etapa não encontrada" }); return; }
  res.json(data);
});

router.get("/plm/pilotos", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { produto_id } = req.query;
  const data = await db.select().from(plm_pilotos)
    .where(eq(plm_pilotos.tenant_id, req.tenantId!))
    .orderBy(desc(plm_pilotos.created_at));
  res.json(produto_id ? data.filter(p => p.produto_id === Number(produto_id)) : data);
});

router.get("/plm/pilotos/:id", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const [piloto] = await db.select().from(plm_pilotos)
    .where(and(eq(plm_pilotos.id, Number(req.params.id)), eq(plm_pilotos.tenant_id, req.tenantId!)));
  if (!piloto) { res.status(404).json({ error: "Piloto não encontrado" }); return; }
  const etapas = await db.select().from(plm_piloto_etapas).where(eq(plm_piloto_etapas.piloto_id, piloto.id));
  res.json({ piloto, etapas });
});

// Cria o mínimo necessário para iniciar a pilotagem sem quebrar a identidade:
// cliente central + produto + ficha v1 + piloto, tudo na mesma transação.
router.post("/plm/pilotos/primeiro", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const {
    cliente_central_id, nome, categoria, referencia_cliente, tamanho_piloto,
    processo_id, data_inicio, data_prevista, observacoes,
  } = req.body;
  if (!cliente_central_id || !String(nome ?? "").trim()) {
    res.status(400).json({ error: "cliente_central_id e nome são obrigatórios" }); return;
  }
  const clienteCentral = await clienteCentralValido(req.tenantId!, String(cliente_central_id));
  if (!clienteCentral) { res.status(400).json({ error: "Cliente central inválido" }); return; }
  const result = await db.transaction(async tx => {
    const categoriaMestre = String(categoria || "outro").trim().toUpperCase();
    await assegurarFamiliaProduto(tx, req.tenantId!, categoriaMestre);
    const referenciaTecnica = await gerarReferenciaTecnica(tx, req.tenantId!);
    const [produto] = await tx.insert(plm_produtos).values({
      tenant_id: req.tenantId!, codigo: referenciaTecnica, nome: String(nome).trim(),
      categoria: categoriaMestre,
      cliente_central_id: clienteCentral.id, referencia_tecnica: referenciaTecnica,
      referencia: referenciaTecnica, referencia_cliente: referencia_cliente?.trim() || null,
      status: "pilotagem", created_by: req.user?.email,
    }).returning();
    const [ficha] = await tx.insert(plm_fichas_tecnicas).values({
      tenant_id: req.tenantId!, produto_id: produto.id, versao: 1,
      codigo: await gerarCodigo(tx, req.tenantId!, "FT"),
      cliente_central_id: clienteCentral.id, referencia_tecnica: referenciaTecnica,
      referencia: referenciaTecnica, referencia_cliente: referencia_cliente?.trim() || null,
      titulo: `Ficha técnica — ${produto.nome}`, status: "rascunho",
      observacoes: "Ficha mínima criada pelo início da pilotagem.",
      created_by: req.user?.email,
    }).returning();
    const [piloto] = await tx.insert(plm_pilotos).values({
      tenant_id: req.tenantId!, produto_id: produto.id,
      cliente_central_id: clienteCentral.id,
      processo_id: processo_id ? Number(processo_id) : null,
      numero_piloto: 1, referencia_tecnica: referenciaTecnica,
      referencia: referenciaTecnica, referencia_cliente: referencia_cliente?.trim() || null,
      tamanho_piloto: tamanho_piloto?.trim() || null,
      data_inicio: data_inicio || null, data_prevista: data_prevista || null,
      observacoes: observacoes?.trim() || null, created_by: req.user?.email,
    }).returning();
    return { produto, ficha, piloto };
  });
  res.status(201).json(result);
});

router.post("/plm/pilotos", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const {
    produto_id, cliente_central_id, processo_id, modelagem_id, referencia, referencia_cliente,
    tamanho_piloto, link_modelagem, data_inicio, data_prevista, data_termino_real,
    observacoes, criar_modelagem,
  } = req.body;
  if (!produto_id || !cliente_central_id || !referencia || !String(referencia_cliente ?? "").trim() || !tamanho_piloto || !processo_id || !data_inicio || !data_prevista) {
    res.status(400).json({ error: "cliente, referência do cliente, referência, produto, tamanho, processo, data de início e data prevista são obrigatórios" }); return;
  }
  const [produto] = await db.select().from(plm_produtos)
    .where(and(
      eq(plm_produtos.id, Number(produto_id)),
      eq(plm_produtos.tenant_id, req.tenantId!),
      eq(plm_produtos.cliente_central_id, String(cliente_central_id)),
    ));
  if (!produto) { res.status(400).json({ error: "Produto não pertence ao cliente selecionado" }); return; }
  if (!produto.referencia_tecnica) { res.status(400).json({ error: "Produto sem referência técnica" }); return; }
  const [processo] = await db.select().from(plm_processos)
    .where(and(eq(plm_processos.id, Number(processo_id)), eq(plm_processos.tenant_id, req.tenantId!), eq(plm_processos.ativo, true)));
  if (!processo) { res.status(400).json({ error: "Processo inválido" }); return; }
  const { data, numeroPiloto } = await db.transaction(async tx => {
    // Serializa apenas a série deste tenant/cliente/produto técnico.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(
      ${`${req.tenantId!}:${String(cliente_central_id)}:${produto.id}:${produto.referencia_tecnica ?? ""}`}, 0
    ))`);
    let modelagemFinalId = modelagem_id ? Number(modelagem_id) : null;
    if (modelagemFinalId) {
      const [modelagem] = await tx.select().from(plm_moldes)
        .where(and(eq(plm_moldes.id, modelagemFinalId), eq(plm_moldes.tenant_id, req.tenantId!), eq(plm_moldes.produto_id, Number(produto_id))));
      if (!modelagem) throw new Error("Modelagem inválida para o produto selecionado");
    } else if (criar_modelagem) {
      const existentesModelagem = await tx.select({ versao: plm_moldes.versao }).from(plm_moldes)
        .where(and(eq(plm_moldes.produto_id, Number(produto_id)), eq(plm_moldes.tenant_id, req.tenantId!)))
        .orderBy(desc(plm_moldes.versao)).limit(1);
      const [novaModelagem] = await tx.insert(plm_moldes).values({
        tenant_id: req.tenantId!, produto_id: Number(produto_id),
        versao: (existentesModelagem[0]?.versao ?? 0) + 1,
        tamanho_base: tamanho_piloto, arquivo_url: link_modelagem?.trim() || null,
        arquivo_nome: `Modelagem ${referencia}`, created_by: req.user?.email,
      }).returning();
      modelagemFinalId = novaModelagem.id;
    }
    const existentes = await tx.select({ n: plm_pilotos.numero_piloto }).from(plm_pilotos)
      .where(and(
        eq(plm_pilotos.tenant_id, req.tenantId!),
        eq(plm_pilotos.cliente_central_id, String(cliente_central_id)),
        eq(plm_pilotos.produto_id, Number(produto_id)),
      ))
      .orderBy(desc(plm_pilotos.numero_piloto)).limit(1);
    const numeroPiloto = (existentes[0]?.n ?? 0) + 1;
    const [data] = await tx.insert(plm_pilotos).values({
      tenant_id: req.tenantId!, produto_id: Number(produto_id), cliente_id: null,
      cliente_central_id: String(cliente_central_id),
      processo_id: Number(processo_id), modelagem_id: modelagemFinalId,
      numero_piloto: numeroPiloto, referencia: String(referencia).trim(),
      referencia_tecnica: produto.referencia_tecnica,
      referencia_cliente: referencia_cliente?.trim() || null,
      tamanho_piloto: String(tamanho_piloto).trim(), link_modelagem: link_modelagem?.trim() || null,
      data_inicio, data_prevista, data_termino_real: data_termino_real || null,
      observacoes, created_by: req.user?.email,
    }).returning();
    return { data, numeroPiloto };
  });
  await logAuditoria({ tenantId: req.tenantId!, produtoId: Number(produto_id), modulo: "pilotagem", acao: "criacao", entidadeId: data.id, descricao: `Piloto #${numeroPiloto} iniciado`, usuarioId: req.user?.id, usuarioNome: req.user?.email });
  res.status(201).json(data);
});

router.patch("/plm/pilotos/:id", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const {
    status, observacoes, processo_id, tamanho_piloto, link_modelagem, data_inicio, data_prevista,
    data_termino_real, motivo_reprovacao, imagem_aprovacao_url,
  } = req.body;
  const [pilotoAtual] = await db.select().from(plm_pilotos)
    .where(and(eq(plm_pilotos.id, Number(req.params.id)), eq(plm_pilotos.tenant_id, req.tenantId!)));
  if (!pilotoAtual) { res.status(404).json({ error: "Piloto não encontrado" }); return; }
  const proximoStatus = status ?? pilotoAtual.status;
  const proximoMotivo = motivo_reprovacao === undefined ? pilotoAtual.motivo_reprovacao : motivo_reprovacao?.trim() || null;
  const proximaImagem = imagem_aprovacao_url === undefined ? pilotoAtual.imagem_aprovacao_url : imagem_aprovacao_url?.trim() || null;
  if (proximoStatus === "reprovado" && !proximoMotivo) {
    res.status(400).json({ error: "O motivo da reprovação é obrigatório" }); return;
  }
  if (proximoStatus === "aprovado" && !proximaImagem) {
    res.status(400).json({ error: "A imagem da aprovação é obrigatória" }); return;
  }
  if (link_modelagem !== undefined && pilotoAtual.modelagem_id) {
    await db.update(plm_moldes).set({
      arquivo_url: link_modelagem?.trim() || null,
      updated_at: new Date(),
    }).where(and(eq(plm_moldes.id, pilotoAtual.modelagem_id), eq(plm_moldes.tenant_id, req.tenantId!)));
  }
  const [data] = await db.update(plm_pilotos)
    .set({
      status, observacoes,
      processo_id: processo_id === undefined ? undefined : Number(processo_id),
      tamanho_piloto,
      link_modelagem: link_modelagem === undefined ? undefined : link_modelagem?.trim() || null,
      data_inicio,
      data_prevista,
      data_termino_real: data_termino_real === undefined ? undefined : data_termino_real || null,
      motivo_reprovacao: proximoStatus === "reprovado" ? proximoMotivo : null,
      imagem_aprovacao_url: proximoStatus === "aprovado" ? proximaImagem : null,
      updated_at: new Date(),
    })
    .where(and(eq(plm_pilotos.id, Number(req.params.id)), eq(plm_pilotos.tenant_id, req.tenantId!)))
    .returning();
  if (!data) { res.status(404).json({ error: "Piloto não encontrado" }); return; }
  res.json(data);
});

router.post("/plm/pilotos/:id/etapas", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { etapa, resultado, problemas_encontrados, fotos_urls, observacoes } = req.body;
  const existing = await db.select().from(plm_piloto_etapas)
    .where(and(eq(plm_piloto_etapas.piloto_id, Number(req.params.id)), eq(plm_piloto_etapas.etapa, etapa)));
  let data;
  if (existing[0]) {
    [data] = await db.update(plm_piloto_etapas)
      .set({ resultado, problemas_encontrados, fotos_urls, observacoes })
      .where(eq(plm_piloto_etapas.id, existing[0].id))
      .returning();
  } else {
    [data] = await db.insert(plm_piloto_etapas).values({
      piloto_id: Number(req.params.id), etapa, resultado: resultado ?? "pendente", problemas_encontrados, fotos_urls, observacoes,
    }).returning();
  }
  res.json(data);
});

// ═══════════════════════════════════════════════════════════════════════════════
// APROVAÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/plm/aprovacoes", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { produto_id, piloto_id } = req.query;
  const data = await db.select().from(plm_aprovacoes)
    .where(eq(plm_aprovacoes.tenant_id, req.tenantId!))
    .orderBy(desc(plm_aprovacoes.updated_at));
  res.json(data.filter(a =>
    (!produto_id || a.produto_id === Number(produto_id))
    && (!piloto_id || a.piloto_id === Number(piloto_id))
  ));
});

router.post("/plm/aprovacoes", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { piloto_id, processo_etapa_id, status, observacoes } = req.body;
  if (!piloto_id || !processo_etapa_id || !["aprovado", "reprovado"].includes(status)) {
    res.status(400).json({ error: "piloto, etapa do processo e status válido são obrigatórios" }); return;
  }
  const [piloto] = await db.select().from(plm_pilotos)
    .where(and(eq(plm_pilotos.id, Number(piloto_id)), eq(plm_pilotos.tenant_id, req.tenantId!)));
  if (!piloto) { res.status(404).json({ error: "Piloto não encontrado" }); return; }
  if (status === "reprovado" && !String(observacoes ?? "").trim()) {
    res.status(400).json({ error: "O motivo da reprovação da etapa é obrigatório" }); return;
  }
  const [etapaProcesso] = await db.select().from(plm_processo_etapas)
    .where(and(
      eq(plm_processo_etapas.id, Number(processo_etapa_id)),
      eq(plm_processo_etapas.processo_id, Number(piloto.processo_id)),
      eq(plm_processo_etapas.ativo, true),
    ));
  if (!etapaProcesso) { res.status(400).json({ error: "Etapa não pertence ao processo deste piloto" }); return; }
  const existing = await db.select().from(plm_aprovacoes)
    .where(and(
      eq(plm_aprovacoes.piloto_id, piloto.id),
      eq(plm_aprovacoes.processo_etapa_id, etapaProcesso.id),
      eq(plm_aprovacoes.tenant_id, req.tenantId!),
    ));
  let data;
  if (existing[0]) {
    [data] = await db.update(plm_aprovacoes)
      .set({ status, observacoes, responsavel_id: req.user?.id, responsavel_nome: req.user?.email, data_decisao: new Date(), updated_at: new Date() })
      .where(eq(plm_aprovacoes.id, existing[0].id))
      .returning();
  } else {
    [data] = await db.insert(plm_aprovacoes).values({
      tenant_id: req.tenantId!, produto_id: piloto.produto_id, piloto_id: piloto.id,
      processo_etapa_id: etapaProcesso.id, etapa: etapaProcesso.nome, status, observacoes,
      responsavel_id: req.user?.id, responsavel_nome: req.user?.email, data_decisao: new Date(),
    }).returning();
  }
  await logAuditoria({
    tenantId: req.tenantId!, produtoId: piloto.produto_id, modulo: "aprovacao",
    acao: status === "aprovado" ? "aprovacao" : "reprovacao",
    descricao: `Piloto #${piloto.numero_piloto} · ${etapaProcesso.sequencia}. ${etapaProcesso.nome} ${status === "aprovado" ? "aprovada" : "reprovada"}`,
    dadosNovos: { piloto_id: piloto.id, processo_etapa_id: etapaProcesso.id, etapa: etapaProcesso.nome, sequencia: etapaProcesso.sequencia, status, observacoes },
    usuarioId: req.user?.id, usuarioNome: req.user?.email,
  });
  res.json(data);
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUDITORIA / HISTÓRICO
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/plm/auditoria", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { produto_id, limit } = req.query;
  const data = await db.select().from(plm_auditoria)
    .where(produto_id
      ? and(eq(plm_auditoria.tenant_id, req.tenantId!), eq(plm_auditoria.produto_id, Number(produto_id)))
      : eq(plm_auditoria.tenant_id, req.tenantId!))
    .orderBy(desc(plm_auditoria.created_at))
    .limit(Number(limit ?? 50));
  res.json(data);
});

export default router;
