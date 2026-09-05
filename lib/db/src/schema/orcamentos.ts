import {
  pgTable,
  varchar,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

const uuidDefault = sql`gen_random_uuid()`;
const nowDefault = sql`now()`;

// ─── FICHAS DE CUSTO ──────────────────────────────────────────────────────────
export const fichas_custo = pgTable(
  "fichas_custo",
  {
    id: varchar("id").primaryKey().default(uuidDefault),
    tenant_id: varchar("tenant_id").notNull(),
    referencia: varchar("referencia", { length: 100 }).notNull(),
    tipo: varchar("tipo", { length: 50 }).notNull(),
    familia: varchar("familia", { length: 100 }).notNull(),
    cliente: varchar("cliente", { length: 100 }).notNull(),
    codigo_cliente: varchar("codigo_cliente", { length: 100 }),
    produto_id: varchar("produto_id"),                            // FK lógica → produtos.id (transição)
    cliente_id: varchar("cliente_id"),                            // FK lógica → clientes.id (transição)
    origem: varchar("origem", { length: 30 }).default("manual").notNull(),
    plm_produto_id: integer("plm_produto_id"),
    plm_ficha_tecnica_id: integer("plm_ficha_tecnica_id"),
    foto_url: text("foto_url"),
    modelagem: numeric("modelagem", { precision: 10, scale: 2 }).default("0").notNull(),
    piloto: numeric("piloto", { precision: 10, scale: 2 }).default("0").notNull(),
    corte: numeric("corte", { precision: 10, scale: 2 }).default("0").notNull(),
    beneficiamento: numeric("beneficiamento", { precision: 10, scale: 2 }).default("0").notNull(),
    costura: numeric("costura", { precision: 10, scale: 2 }).default("0").notNull(),
    lavanderia: numeric("lavanderia", { precision: 10, scale: 2 }).default("0").notNull(),
    acabamento: numeric("acabamento", { precision: 10, scale: 2 }).default("0").notNull(),
    passadoria: numeric("passadoria", { precision: 10, scale: 2 }).default("0").notNull(),
    tecido: numeric("tecido", { precision: 10, scale: 2 }).default("0").notNull(),
    aviamento: numeric("aviamento", { precision: 10, scale: 2 }).default("0").notNull(),
    observacoes: text("observacoes"),
    ativo: boolean("ativo").default(true).notNull(),
    created_at: timestamp("created_at").default(nowDefault).notNull(),
    updated_at: timestamp("updated_at").default(nowDefault).notNull(),
  },
  (t) => [
    index("fichas_custo_tenant_idx").on(t.tenant_id),
    index("fichas_custo_referencia_idx").on(t.referencia),
    index("fichas_custo_tenant_produto_idx").on(t.tenant_id, t.produto_id),
    index("fichas_custo_tenant_cliente_idx").on(t.tenant_id, t.cliente_id),
    uniqueIndex("fichas_custo_ref_tenant_uniq").on(t.tenant_id, t.referencia),
  ],
);

export const insertFichaCustoSchema = createInsertSchema(fichas_custo).omit({
  id: true, created_at: true, updated_at: true,
});
export type InsertFichaCusto = z.infer<typeof insertFichaCustoSchema>;
export type FichaCusto = typeof fichas_custo.$inferSelect;

// ─── ORÇAMENTOS (CustoPlus style) ─────────────────────────────────────────────
export const orcamentos_custos = pgTable(
  "orcamentos_custos",
  {
    id: varchar("id").primaryKey().default(uuidDefault),
    tenant_id: varchar("tenant_id").notNull(),
    numero: varchar("numero", { length: 30 }).notNull(),
    nome_cliente: varchar("nome_cliente", { length: 255 }).notNull(),
    cliente_id: varchar("cliente_id"),                            // FK lógica → clientes.id (transição)
    marca: varchar("marca", { length: 255 }),
    validade_dias: integer("validade_dias").default(30),
    prazo_entrega_texto: varchar("prazo_entrega_texto", { length: 100 }),
    data_entrega_prevista: timestamp("data_entrega_prevista"),
    observacoes: text("observacoes"),
    desconto_tipo: varchar("desconto_tipo", { length: 20 }).default("percentual"),
    desconto_valor: numeric("desconto_valor", { precision: 10, scale: 2 }).default("0"),
    percentual_sinal: numeric("percentual_sinal", { precision: 10, scale: 2 }).default("50"),
    tipo_sinal: varchar("tipo_sinal", { length: 20 }).default("percentual"),
    percentual_retirada: numeric("percentual_retirada", { precision: 10, scale: 2 }).default("50"),
    tipo_retirada: varchar("tipo_retirada", { length: 20 }).default("percentual"),
    percentual_prazo: numeric("percentual_prazo", { precision: 10, scale: 2 }).default("0"),
    tipo_prazo: varchar("tipo_prazo", { length: 20 }).default("percentual"),
    status: varchar("status", { length: 20 }).default("pendente"),
    enviado_para_kanban: boolean("enviado_para_kanban").default(false),
    pedido_id: varchar("pedido_id"),
    ativo: boolean("ativo").default(true).notNull(),
    created_at: timestamp("created_at").default(nowDefault).notNull(),
    updated_at: timestamp("updated_at").default(nowDefault).notNull(),
  },
  (t) => [
    index("orcamentos_custos_tenant_idx").on(t.tenant_id),
    index("orcamentos_custos_tenant_cliente_idx").on(t.tenant_id, t.cliente_id),
  ],
);

export const insertOrcamentoCustoSchema = createInsertSchema(orcamentos_custos).omit({
  id: true, created_at: true, updated_at: true,
});
export type InsertOrcamentoCusto = z.infer<typeof insertOrcamentoCustoSchema>;
export type OrcamentoCusto = typeof orcamentos_custos.$inferSelect;

// ─── ITENS DE ORÇAMENTO (CustoPlus style) ─────────────────────────────────────
export const itens_orcamento_custos = pgTable(
  "itens_orcamento_custos",
  {
    id: varchar("id").primaryKey().default(uuidDefault),
    tenant_id: varchar("tenant_id").notNull(),
    orcamento_id: varchar("orcamento_id").notNull(),
    ficha_id: varchar("ficha_id"),
    produto_id: varchar("produto_id"),                            // FK lógica → produtos.id (transição)
    plm_produto_id: integer("plm_produto_id"),
    plm_ficha_tecnica_id: integer("plm_ficha_tecnica_id"),
    referencia: varchar("referencia", { length: 100 }),
    descricao: varchar("descricao", { length: 255 }).notNull(),
    quantidade: numeric("quantidade", { precision: 10, scale: 2 }).notNull().default("1"),
    custo: numeric("custo", { precision: 10, scale: 2 }).default("0"),
    valor_unitario: numeric("valor_unitario", { precision: 10, scale: 2 }).notNull().default("0"),
    markup_divisor: numeric("markup_divisor", { precision: 6, scale: 4 }).default("0.5"),
    total: numeric("total", { precision: 10, scale: 2 }).default("0"),
    is_aviamento: boolean("is_aviamento").default(false).notNull(),
    is_desenvolvimento: boolean("is_desenvolvimento").default(false).notNull(),
    created_at: timestamp("created_at").default(nowDefault).notNull(),
    updated_at: timestamp("updated_at").default(nowDefault).notNull(),
  },
  (t) => [
    index("itens_orcamento_custos_orcamento_idx").on(t.orcamento_id),
    index("itens_orcamento_custos_tenant_idx").on(t.tenant_id),
    index("itens_orcamento_custos_tenant_produto_idx").on(t.tenant_id, t.produto_id),
  ],
);

export const insertItemOrcamentoCustoSchema = createInsertSchema(itens_orcamento_custos).omit({
  id: true, created_at: true, updated_at: true,
});
export type InsertItemOrcamentoCusto = z.infer<typeof insertItemOrcamentoCustoSchema>;
export type ItemOrcamentoCusto = typeof itens_orcamento_custos.$inferSelect;

// ─── CONFIGURAÇÕES DA EMPRESA (por tenant) ───────────────────────────────────
export const configuracoes_empresa = pgTable(
  "configuracoes_empresa",
  {
    id: varchar("id").primaryKey().default(uuidDefault),
    tenant_id: varchar("tenant_id").notNull().unique(),
    nome_empresa: varchar("nome_empresa", { length: 200 }),
    logo_url: text("logo_url"),
    endereco: varchar("endereco", { length: 300 }),
    cidade_estado_cep: varchar("cidade_estado_cep", { length: 200 }),
    cnpj: varchar("cnpj", { length: 30 }),
    pix: varchar("pix", { length: 100 }),
    email: varchar("email", { length: 150 }),
    site: varchar("site", { length: 150 }),
    telefone: varchar("telefone", { length: 50 }),
    whatsapp: varchar("whatsapp", { length: 20 }),
    created_at: timestamp("created_at").default(nowDefault).notNull(),
    updated_at: timestamp("updated_at").default(nowDefault).notNull(),
  },
  (t) => [
    index("configuracoes_empresa_tenant_idx").on(t.tenant_id),
  ],
);

// ─── PARCELAS DE ORÇAMENTO ────────────────────────────────────────────────────
export const orcamento_parcelas = pgTable(
  "orcamento_parcelas",
  {
    id: varchar("id").primaryKey().default(uuidDefault),
    tenant_id: varchar("tenant_id").notNull(),
    orcamento_id: varchar("orcamento_id").notNull(),
    ordem: integer("ordem").notNull().default(0),
    titulo: varchar("titulo", { length: 100 }).notNull(),
    tipo: varchar("tipo", { length: 20 }).notNull().default("percentual"),
    valor: numeric("valor", { precision: 10, scale: 2 }).notNull().default("0"),
    created_at: timestamp("created_at").default(nowDefault).notNull(),
  },
  (t) => [index("orcamento_parcelas_orc_idx").on(t.orcamento_id)],
);
export type OrcamentoParcela = typeof orcamento_parcelas.$inferSelect;

// ─── TEMPLATES DE OBSERVAÇÕES ──────────────────────────────────────────────────
export const observacoes_templates = pgTable(
  "observacoes_templates",
  {
    id: varchar("id").primaryKey().default(uuidDefault),
    tenant_id: varchar("tenant_id").notNull(),
    titulo: varchar("titulo", { length: 200 }).notNull(),
    texto: text("texto").notNull(),
    created_at: timestamp("created_at").default(nowDefault).notNull(),
  },
  (t) => [
    index("observacoes_templates_tenant_idx").on(t.tenant_id),
  ],
);
