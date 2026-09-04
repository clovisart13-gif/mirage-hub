/**
 * ============================================================
 *  SCHEMA FINANCEIRO MIRAGE
 * ============================================================
 *  Módulo de gestão financeira: caixa, contas bancárias,
 *  extrato, conciliação OFX e metas mensais.
 *
 *  TABELAS:
 *  fin_contas              → contas bancárias e caixa
 *  fin_transacoes          → lançamentos de entrada/saída
 *  fin_categorias          → categorias de despesa/receita
 *  fin_naturezas           → naturezas contábeis
 *  fin_centros_custo       → centros de custo
 *  fin_regras_class        → regras de classificação automática
 *  fin_historico_import    → log de importações OFX
 *  fin_metas_mensais       → metas de faturamento e custo
 * ============================================================
 */

import {
  pgTable,
  serial,
  varchar,
  boolean,
  integer,
  timestamp,
  numeric,
  text,
  primaryKey,
} from "drizzle-orm/pg-core";

// ── Contas bancárias e caixa ─────────────────────────────────────────────────
export const finContas = pgTable("fin_contas", {
  id:             serial("id").primaryKey(),
  tenantId:       varchar("tenant_id", { length: 255 }).notNull(),
  nome:           varchar("nome", { length: 100 }).notNull(),
  banco:          varchar("banco", { length: 100 }).notNull(),
  tipo:           varchar("tipo", { length: 50 }).notNull(),        // Corrente | Poupança | Cartão de Crédito | Caixa
  saldoInicial:   numeric("saldo_inicial", { precision: 12, scale: 2 }).default("0").notNull(),
  ativo:          boolean("ativo").default(true).notNull(),
  limite:         numeric("limite", { precision: 12, scale: 2 }),   // só para cartão
  diaVencimento:  integer("dia_vencimento"),                        // só para cartão
  criadoEm:       timestamp("criado_em").defaultNow().notNull(),
});

// ── Categorias de transação ──────────────────────────────────────────────────
export const finCategorias = pgTable("fin_categorias", {
  id:                varchar("id", { length: 100 }).notNull(),      // slug ex: "combustivel"
  tenantId:          varchar("tenant_id", { length: 255 }).notNull(),
  nome:              varchar("nome", { length: 100 }).notNull(),
  naturezaPadrao:    varchar("natureza_padrao", { length: 100 }).notNull(),
  centroCustoPadrao: varchar("centro_custo_padrao", { length: 100 }).notNull(),
  grupoGerencial:    varchar("grupo_gerencial", { length: 100 }),
  criadoEm:          timestamp("criado_em").defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.id, t.tenantId] })]);

// ── Naturezas contábeis ──────────────────────────────────────────────────────
export const finNaturezas = pgTable("fin_naturezas", {
  id:        serial("id").primaryKey(),
  tenantId:  varchar("tenant_id", { length: 255 }).notNull(),
  nome:      varchar("nome", { length: 100 }).notNull(),
  criadoEm:  timestamp("criado_em").defaultNow().notNull(),
});

// ── Centros de custo ─────────────────────────────────────────────────────────
export const finCentrosCusto = pgTable("fin_centros_custo", {
  id:        serial("id").primaryKey(),
  tenantId:  varchar("tenant_id", { length: 255 }).notNull(),
  nome:      varchar("nome", { length: 100 }).notNull(),
  criadoEm:  timestamp("criado_em").defaultNow().notNull(),
});

// ── Transações (extrato) ─────────────────────────────────────────────────────
export const finTransacoes = pgTable("fin_transacoes", {
  id:            serial("id").primaryKey(),
  tenantId:      varchar("tenant_id", { length: 255 }).notNull(),
  contaId:       integer("conta_id"),                               // FK → fin_contas.id
  data:          varchar("data", { length: 10 }).notNull(),         // dd/MM/yyyy
  descricao:     varchar("descricao", { length: 500 }).notNull(),
  valor:         numeric("valor", { precision: 12, scale: 2 }).notNull(), // sempre positivo
  tipo:          varchar("tipo", { length: 10 }).notNull(),         // CREDITO | DEBITO
  categoriaId:   varchar("categoria_id", { length: 100 }),
  natureza:      varchar("natureza", { length: 100 }),
  centroCusto:   varchar("centro_custo", { length: 100 }),
  status:        varchar("status", { length: 20 }).default("pendente").notNull(), // pendente | classificado
  origemTipo:    varchar("origem_tipo", { length: 50 }),            // kanban_pagamento | manual | ofx
  origemId:      varchar("origem_id", { length: 100 }),             // ID do cartão/pedido de origem
  criadoEm:      timestamp("criado_em").defaultNow().notNull(),
});

// ── Regras de classificação automática ──────────────────────────────────────
export const finRegrasClassificacao = pgTable("fin_regras_class", {
  id:           serial("id").primaryKey(),
  tenantId:     varchar("tenant_id", { length: 255 }).notNull(),
  termo:        varchar("termo", { length: 200 }).notNull(),
  categoriaId:  varchar("categoria_id", { length: 100 }).notNull(),
  natureza:     varchar("natureza", { length: 100 }).notNull(),
  centroCusto:  varchar("centro_custo", { length: 100 }).notNull(),
  criadoEm:     timestamp("criado_em").defaultNow().notNull(),
});

// ── Histórico de importações OFX ─────────────────────────────────────────────
export const finHistoricoImportacoes = pgTable("fin_historico_import", {
  id:                     serial("id").primaryKey(),
  tenantId:               varchar("tenant_id", { length: 255 }).notNull(),
  dataImportacao:         timestamp("data_importacao").defaultNow().notNull(),
  nomeArquivo:            varchar("nome_arquivo", { length: 255 }).notNull(),
  contaId:                integer("conta_id"),
  quantidadeTransacoes:   integer("quantidade_transacoes").notNull(),
});

// ── Metas mensais ────────────────────────────────────────────────────────────
export const finMetasMensais = pgTable("fin_metas_mensais", {
  id:                       serial("id").primaryKey(),
  tenantId:                 varchar("tenant_id", { length: 255 }).notNull(),
  mes:                      varchar("mes", { length: 7 }).notNull(), // YYYY-MM
  faturamentoPrevisto:      numeric("faturamento_previsto", { precision: 12, scale: 2 }).default("0"),
  custoFixoPrevisto:        numeric("custo_fixo_previsto", { precision: 12, scale: 2 }).default("0"),
  faturamentoCompetencia:   numeric("faturamento_competencia", { precision: 12, scale: 2 }),
});
