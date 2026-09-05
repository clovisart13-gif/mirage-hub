import { Router, type IRouter } from "express";
import {
  db,
  clientes,
  fornecedores,
  produtos,
  entidade_integracoes,
} from "@workspace/db";
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { requireAuth, requireTenantAccess, type AuthenticatedRequest } from "../../middlewares/auth";

const router: IRouter = Router();

function queryValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function optionalText(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return typeof value === "string" ? value.trim() || null : undefined;
}

function requiredText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function optionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined) return undefined;
  return typeof value === "boolean" ? value : undefined;
}

function pathId(value: string | string[] | undefined): string | null {
  const id = Array.isArray(value) ? value[0] : value;
  return id?.trim() || null;
}

function ativoFilter(value: unknown): boolean | null | undefined {
  const ativo = queryValue(value);
  if (ativo === undefined) return true;
  if (ativo === "true") return true;
  if (ativo === "false") return false;
  return null;
}

async function clienteDoTenantExiste(clienteId: string, tenantId: string): Promise<boolean> {
  const [cliente] = await db.select({ id: clientes.id }).from(clientes)
    .where(and(eq(clientes.id, clienteId), eq(clientes.tenant_id, tenantId)))
    .limit(1);
  return Boolean(cliente);
}

// ─── CLIENTES CENTRAIS ───────────────────────────────────────────────────────
router.get("/cadastros/clientes", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res): Promise<void> => {
  const ativo = ativoFilter(req.query.ativo);
  if (ativo === null) {
    res.status(400).json({ error: "ativo deve ser true ou false" });
    return;
  }
  const conditions = [eq(clientes.tenant_id, req.tenantId!)];
  if (ativo !== undefined) conditions.push(eq(clientes.ativo, ativo));
  const data = await db.select().from(clientes).where(and(...conditions)).orderBy(asc(clientes.nome));
  res.json(data);
});

router.post("/cadastros/clientes", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res): Promise<void> => {
  const nome = requiredText(req.body.nome);
  if (!nome) {
    res.status(400).json({ error: "nome é obrigatório" });
    return;
  }
  const [data] = await db.insert(clientes).values({
    tenant_id: req.tenantId!,
    nome,
    cnpj: optionalText(req.body.cnpj),
    email: optionalText(req.body.email),
    telefone: optionalText(req.body.telefone),
    endereco: optionalText(req.body.endereco),
    cidade: optionalText(req.body.cidade),
    estado: optionalText(req.body.estado),
    ativo: optionalBoolean(req.body.ativo) ?? true,
  }).returning();
  res.status(201).json(data);
});

router.patch("/cadastros/clientes/:id", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = pathId(req.params.id);
  const nome = req.body.nome === undefined ? undefined : requiredText(req.body.nome);
  if (!id || nome === null) {
    res.status(400).json({ error: !id ? "id inválido" : "nome não pode ser vazio" });
    return;
  }
  const [data] = await db.update(clientes).set({
    nome,
    cnpj: optionalText(req.body.cnpj),
    email: optionalText(req.body.email),
    telefone: optionalText(req.body.telefone),
    endereco: optionalText(req.body.endereco),
    cidade: optionalText(req.body.cidade),
    estado: optionalText(req.body.estado),
    ativo: optionalBoolean(req.body.ativo),
    updated_at: new Date(),
  }).where(and(eq(clientes.id, id), eq(clientes.tenant_id, req.tenantId!))).returning();
  if (!data) {
    res.status(404).json({ error: "Cliente não encontrado" });
    return;
  }
  res.json(data);
});

// ─── FORNECEDORES CENTRAIS ───────────────────────────────────────────────────
router.get("/cadastros/fornecedores", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res): Promise<void> => {
  const ativo = ativoFilter(req.query.ativo);
  if (ativo === null) {
    res.status(400).json({ error: "ativo deve ser true ou false" });
    return;
  }
  const conditions = [eq(fornecedores.tenant_id, req.tenantId!)];
  if (ativo !== undefined) conditions.push(eq(fornecedores.ativo, ativo));
  const data = await db.select().from(fornecedores).where(and(...conditions)).orderBy(asc(fornecedores.nome));
  res.json(data);
});

router.post("/cadastros/fornecedores", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res): Promise<void> => {
  const nome = requiredText(req.body.nome);
  if (!nome) {
    res.status(400).json({ error: "nome é obrigatório" });
    return;
  }
  const [data] = await db.insert(fornecedores).values({
    tenant_id: req.tenantId!,
    nome,
    cnpj: optionalText(req.body.cnpj),
    pix: optionalText(req.body.pix),
    telefone: optionalText(req.body.telefone),
    email: optionalText(req.body.email),
    endereco: optionalText(req.body.endereco),
    ativo: optionalBoolean(req.body.ativo) ?? true,
  }).returning();
  res.status(201).json(data);
});

router.patch("/cadastros/fornecedores/:id", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = pathId(req.params.id);
  const nome = req.body.nome === undefined ? undefined : requiredText(req.body.nome);
  if (!id || nome === null) {
    res.status(400).json({ error: !id ? "id inválido" : "nome não pode ser vazio" });
    return;
  }
  const [data] = await db.update(fornecedores).set({
    nome,
    cnpj: optionalText(req.body.cnpj),
    pix: optionalText(req.body.pix),
    telefone: optionalText(req.body.telefone),
    email: optionalText(req.body.email),
    endereco: optionalText(req.body.endereco),
    ativo: optionalBoolean(req.body.ativo),
    updated_at: new Date(),
  }).where(and(eq(fornecedores.id, id), eq(fornecedores.tenant_id, req.tenantId!))).returning();
  if (!data) {
    res.status(404).json({ error: "Fornecedor não encontrado" });
    return;
  }
  res.json(data);
});

// ─── PRODUTOS CENTRAIS ───────────────────────────────────────────────────────
router.get("/cadastros/produtos", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res): Promise<void> => {
  const ativo = ativoFilter(req.query.ativo);
  if (ativo === null) {
    res.status(400).json({ error: "ativo deve ser true ou false" });
    return;
  }
  const tenantId = req.tenantId!;
  const conditions = [eq(produtos.tenant_id, tenantId)];
  const clienteId = queryValue(req.query.cliente_id);
  const busca = queryValue(req.query.busca);
  if (clienteId) conditions.push(eq(produtos.cliente_id, clienteId));
  if (busca) conditions.push(or(
    ilike(produtos.codigo, `%${busca}%`),
    ilike(produtos.nome, `%${busca}%`),
  ));
  if (ativo !== undefined) conditions.push(eq(produtos.ativo, ativo));

  const data = await db.select({ produto: produtos, cliente: clientes })
    .from(produtos)
    .leftJoin(clientes, and(eq(clientes.id, produtos.cliente_id), eq(clientes.tenant_id, tenantId)))
    .where(and(...conditions))
    .orderBy(desc(produtos.updated_at));
  res.json(data);
});

router.post("/cadastros/produtos", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res): Promise<void> => {
  const codigo = requiredText(req.body.codigo);
  const nome = requiredText(req.body.nome);
  if (!codigo || !nome) {
    res.status(400).json({ error: "codigo e nome são obrigatórios" });
    return;
  }
  const clienteId = optionalText(req.body.cliente_id);
  if (clienteId && !await clienteDoTenantExiste(clienteId, req.tenantId!)) {
    res.status(400).json({ error: "cliente_id não pertence a este tenant" });
    return;
  }
  try {
    const [data] = await db.insert(produtos).values({
      tenant_id: req.tenantId!,
      cliente_id: clienteId,
      codigo,
      nome,
      referencia_cliente: optionalText(req.body.referencia_cliente),
      categoria: optionalText(req.body.categoria),
      descricao: optionalText(req.body.descricao),
      ativo: optionalBoolean(req.body.ativo) ?? true,
    }).returning();
    res.status(201).json(data);
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      req.log.warn({ tenantId: req.tenantId!, codigo }, "Tentativa de criar produto com código duplicado");
      res.status(409).json({ error: "Já existe um produto com este codigo neste tenant" });
      return;
    }
    throw error;
  }
});

router.patch("/cadastros/produtos/:id", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = pathId(req.params.id);
  const codigo = req.body.codigo === undefined ? undefined : requiredText(req.body.codigo);
  const nome = req.body.nome === undefined ? undefined : requiredText(req.body.nome);
  if (!id || codigo === null || nome === null) {
    res.status(400).json({ error: !id ? "id inválido" : "codigo e nome não podem ser vazios" });
    return;
  }
  const clienteId = optionalText(req.body.cliente_id);
  if (clienteId && !await clienteDoTenantExiste(clienteId, req.tenantId!)) {
    res.status(400).json({ error: "cliente_id não pertence a este tenant" });
    return;
  }
  try {
    const [data] = await db.update(produtos).set({
      codigo,
      nome,
      cliente_id: clienteId,
      referencia_cliente: optionalText(req.body.referencia_cliente),
      categoria: optionalText(req.body.categoria),
      descricao: optionalText(req.body.descricao),
      ativo: optionalBoolean(req.body.ativo),
      updated_at: new Date(),
    }).where(and(eq(produtos.id, id), eq(produtos.tenant_id, req.tenantId!))).returning();
    if (!data) {
      res.status(404).json({ error: "Produto não encontrado" });
      return;
    }
    res.json(data);
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      req.log.warn({ tenantId: req.tenantId!, codigo }, "Tentativa de duplicar código de produto");
      res.status(409).json({ error: "Já existe um produto com este codigo neste tenant" });
      return;
    }
    throw error;
  }
});

// ─── IDENTIFICADORES EXTERNOS (somente leitura nesta fase) ───────────────────
router.get("/cadastros/entidade-integracoes", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res): Promise<void> => {
  const tipoEntidade = queryValue(req.query.entidade_tipo);
  const entidadeId = queryValue(req.query.entidade_id);
  const provedor = queryValue(req.query.provedor);
  if (tipoEntidade && !["cliente", "fornecedor", "produto"].includes(tipoEntidade)) {
    res.status(400).json({ error: "entidade_tipo deve ser cliente, fornecedor ou produto" });
    return;
  }
  const conditions = [eq(entidade_integracoes.tenant_id, req.tenantId!)];
  if (tipoEntidade) conditions.push(eq(entidade_integracoes.tipo_entidade, tipoEntidade));
  if (entidadeId) conditions.push(eq(entidade_integracoes.entidade_id, entidadeId));
  if (provedor) conditions.push(eq(entidade_integracoes.provider, provedor));
  const data = await db.select().from(entidade_integracoes)
    .where(and(...conditions))
    .orderBy(desc(entidade_integracoes.updated_at));
  res.json(data);
});

export default router;