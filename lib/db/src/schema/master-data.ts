import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const uuidDefault = sql`gen_random_uuid()`;
const nowDefault = sql`now()`;

// ─── PRODUTOS CENTRAIS ────────────────────────────────────────────────────────
// Identidade comercial central do produto. Referências/OPs e o PLM mantêm seus
// próprios dados legados e se vinculam a esta identidade durante a transição.
export const produtos = pgTable(
  "produtos",
  {
    id: varchar("id").primaryKey().default(uuidDefault),
    tenant_id: varchar("tenant_id").notNull(),
    cliente_id: varchar("cliente_id"),
    codigo: varchar("codigo", { length: 100 }).notNull(),
    nome: varchar("nome", { length: 255 }).notNull(),
    referencia_cliente: varchar("referencia_cliente", { length: 100 }),
    categoria: varchar("categoria", { length: 100 }),
    descricao: text("descricao"),
    ativo: boolean("ativo").default(true).notNull(),
    created_at: timestamp("created_at").default(nowDefault).notNull(),
    updated_at: timestamp("updated_at").default(nowDefault).notNull(),
  },
  (t) => [
    uniqueIndex("produtos_tenant_codigo_uidx").on(t.tenant_id, t.codigo),
    index("produtos_tenant_idx").on(t.tenant_id),
    index("produtos_tenant_cliente_idx").on(t.tenant_id, t.cliente_id),
  ],
);

export type Produto = typeof produtos.$inferSelect;
export type InsertProduto = typeof produtos.$inferInsert;

// ─── IDENTIFICADORES EXTERNOS ─────────────────────────────────────────────────
// Mapeia cliente, fornecedor ou produto para identificadores de cada provedor.
// O tipo da entidade faz parte da unicidade para evitar colisões entre domínios.
export const entidade_integracoes = pgTable(
  "entidade_integracoes",
  {
    id: varchar("id").primaryKey().default(uuidDefault),
    tenant_id: varchar("tenant_id").notNull(),
    tipo_entidade: varchar("tipo_entidade", { length: 50 }).notNull(), // cliente|fornecedor|produto
    entidade_id: varchar("entidade_id").notNull(),
    provider: varchar("provider", { length: 100 }).notNull(),
    external_id: varchar("external_id", { length: 255 }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    created_at: timestamp("created_at").default(nowDefault).notNull(),
    updated_at: timestamp("updated_at").default(nowDefault).notNull(),
  },
  (t) => [
    uniqueIndex("entidade_integracoes_tenant_tipo_provider_external_uidx").on(
      t.tenant_id,
      t.tipo_entidade,
      t.provider,
      t.external_id,
    ),
    index("entidade_integracoes_tenant_idx").on(t.tenant_id),
    index("entidade_integracoes_tenant_entidade_idx").on(
      t.tenant_id,
      t.tipo_entidade,
      t.entidade_id,
    ),
  ],
);

export type EntidadeIntegracao = typeof entidade_integracoes.$inferSelect;
export type InsertEntidadeIntegracao = typeof entidade_integracoes.$inferInsert;
