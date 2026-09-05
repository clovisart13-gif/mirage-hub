/**
 * ============================================================
 *  SCHEMA KANBAN — Ecossistema Mirage
 * ============================================================
 *
 *  BANCO DE DADOS: PostgreSQL local (helium)
 *  ORM: Drizzle ORM — lib/db/src/schema/kanban.ts
 *  Sincronizar schema: pnpm --filter @workspace/db run push-force
 *
 *  REGRAS IMPORTANTES:
 *  - Todos os IDs são UUIDs (varchar) gerados por gen_random_uuid()
 *  - Toda tabela tem tenant_id (varchar) — isolamento por empresa
 *  - Valores monetários (cmp, cmo) são em CENTAVOS (integer)
 *    Ex.: R$ 25,00 = 2500 no banco
 *  - Soft delete: campo `ativo` boolean (nunca deletar fisicamente)
 *
 *  MAPA DE TABELAS:
 *  ┌─────────────────────┬──────────────────────────────────────────┐
 *  │ Variável JS         │ Tabela PostgreSQL                        │
 *  ├─────────────────────┼──────────────────────────────────────────┤
 *  │ clientes            │ clientes                                 │
 *  │ fornecedores        │ fornecedores                             │
 *  │ cores               │ cores                                    │
 *  │ grades              │ grades                                   │
 *  │ referencias         │ referencias          ← tabela central    │
 *  │ imagens_referencia  │ imagens_referencia                       │
 *  │ movimentacoes       │ movimentacoes        ← histórico de fases│
 *  │ listas_customizadas │ listas_customizadas                      │
 *  │ contas_a_pagar      │ contas_a_pagar       ← gerada pelo CMO   │
 *  │ pedidos             │ pedidos                                  │
 *  │ estoque             │ estoque                                  │
 *  └─────────────────────┴──────────────────────────────────────────┘
 *
 *  FLUXO DE FASES (ordem obrigatória no board):
 *  inicio → espera → modelagem → tecido → risco → corte →
 *  beneficiamento → costura → lavanderia → acabamento →
 *  passadoria → expedicao → faturamento → concluido
 *
 *  FASES PRODUTIVAS (geram conta a pagar via CMO):
 *  corte, beneficiamento, costura, lavanderia, acabamento, passadoria
 *
 *  FLUXOS ESPECIAIS:
 *  - Tecido: IniciarTecidoDialog → ConcluirTecidoDialog (sem CMO)
 *  - Expedição: IniciarExpedicaoDialog → ExpedicaoDialog (move para faturamento)
 * ============================================================
 */

import {
  pgTable,
  varchar,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  json,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

const uuidDefault = sql`gen_random_uuid()`;
const nowDefault = sql`now()`;

// ─── CLIENTES ────────────────────────────────────────────────────────────────
// Clientes da confecção (quem encomendou a produção).
// Relacionado com referencias.cliente_id e pedidos.cliente_id.
export const clientes = pgTable(
  "clientes",
  {
    id: varchar("id").primaryKey().default(uuidDefault),
    tenant_id: varchar("tenant_id").notNull(),        // empresa dona do registro
    nome: varchar("nome", { length: 255 }).notNull(),
    cnpj: varchar("cnpj", { length: 20 }),
    email: varchar("email", { length: 320 }),
    telefone: varchar("telefone", { length: 50 }),
    endereco: text("endereco"),
    cidade: varchar("cidade", { length: 100 }),
    estado: varchar("estado", { length: 2 }),
    ativo: boolean("ativo").default(true).notNull(),  // soft delete
    created_at: timestamp("created_at").default(nowDefault).notNull(),
    updated_at: timestamp("updated_at").default(nowDefault).notNull(),
  },
  (t) => [index("clientes_tenant_idx").on(t.tenant_id)],
);

export const insertClienteSchema = createInsertSchema(clientes).omit({ id: true, created_at: true, updated_at: true });
export type InsertCliente = z.infer<typeof insertClienteSchema>;
export type Cliente = typeof clientes.$inferSelect;

// ─── FORNECEDORES ─────────────────────────────────────────────────────────────
// Terceiros que prestam serviços de produção (costureiras, lavanderias, etc).
// O fornecedor é associado na movimentação e gera conta a pagar pelo CMO.
// Campo pix é usado para pagamento das contas geradas.
export const fornecedores = pgTable(
  "fornecedores",
  {
    id: varchar("id").primaryKey().default(uuidDefault),
    tenant_id: varchar("tenant_id").notNull(),
    nome: varchar("nome", { length: 255 }).notNull(),
    cnpj: varchar("cnpj", { length: 20 }),
    pix: varchar("pix", { length: 255 }),             // chave PIX para pagamento
    telefone: varchar("telefone", { length: 50 }),
    email: varchar("email", { length: 320 }),
    endereco: text("endereco"),
    ativo: boolean("ativo").default(true).notNull(),  // soft delete
    created_at: timestamp("created_at").default(nowDefault).notNull(),
    updated_at: timestamp("updated_at").default(nowDefault).notNull(),
  },
  (t) => [index("fornecedores_tenant_idx").on(t.tenant_id)],
);

export const insertFornecedorSchema = createInsertSchema(fornecedores).omit({ id: true, created_at: true, updated_at: true });
export type InsertFornecedor = z.infer<typeof insertFornecedorSchema>;
export type Fornecedor = typeof fornecedores.$inferSelect;

// ─── CORES ────────────────────────────────────────────────────────────────────
// Paleta de cores do tenant para selecionar nos cartões.
// Referenciada em referencias.cores (texto livre) ou aqui como lookup.
export const cores = pgTable(
  "cores",
  {
    id: varchar("id").primaryKey().default(uuidDefault),
    tenant_id: varchar("tenant_id").notNull(),
    nome: varchar("nome", { length: 100 }).notNull(),
    hex: varchar("hex", { length: 7 }),               // ex: #3b82f6
    created_at: timestamp("created_at").default(nowDefault).notNull(),
  },
  (t) => [index("cores_tenant_idx").on(t.tenant_id)],
);

export type Cor = typeof cores.$inferSelect;

// ─── GRADES ───────────────────────────────────────────────────────────────────
// Grades de tamanhos usadas na produção (ex: P/M/G/GG, 36/38/40).
// O campo tamanhos é um array JSON de strings.
export const grades = pgTable(
  "grades",
  {
    id: varchar("id").primaryKey().default(uuidDefault),
    tenant_id: varchar("tenant_id").notNull(),
    nome: varchar("nome", { length: 100 }).notNull(),
    tamanhos: json("tamanhos").$type<string[]>().default([]).notNull(),
    created_at: timestamp("created_at").default(nowDefault).notNull(),
  },
  (t) => [index("grades_tenant_idx").on(t.tenant_id)],
);

export type Grade = typeof grades.$inferSelect;

// ─── REFERENCIAS ──────────────────────────────────────────────────────────────
// Referências são a camada operacional do Kanban: cada linha é um cartão/OP.
// A identidade central do produto fica em produtos; a referência preserva os
// dados operacionais e legados necessários para executar a produção.
//
// CAMPOS MONETÁRIOS (em centavos):
//   cmp = Custo Matéria-Prima     ex: R$ 10,50 → 1050
//   cmo = Custo Mão-de-Obra total ex: R$ 25,00 → 2500
//   valor_venda = numeric (reais) ex: "89.90"
//
// DATAS:
//   data_entrada          → quando o cartão foi criado/entrou
//   data_prevista_entrega → prazo de entrega para o cliente
//   previsao_conclusao    → alias de data_prevista_entrega (usado no front)
//   data_inicio           → quando entrou na fase atual
//   data_termino_prevista → quando deve sair da fase atual
//   data_termino_real     → quando saiu de fato da fase atual
//
// FASE:
//   fase_atual → slug da fase atual (ver FASES em referencias.ts)
//   Ao mover o cartão, uma linha é inserida em movimentacoes.
export const referencias = pgTable(
  "referencias",
  {
    id: varchar("id").primaryKey().default(uuidDefault),
    tenant_id: varchar("tenant_id").notNull(),

    // Identificação
    codigo: varchar("codigo", { length: 100 }).notNull(),        // código da referência (ex: REF-001)
    referencia_cliente: varchar("referencia_cliente", { length: 100 }),
    descricao: text("descricao"),                                // descrição geral
    descricao_modelo: text("descricao_modelo"),                  // nome do modelo (ex: Camiseta Oversized)

    // Vínculo com cliente
    cliente_id: varchar("cliente_id"),                           // FK → clientes.id (opcional)
    produto_id: varchar("produto_id"),                           // FK lógica → produtos.id (transição)
    nome_cliente: varchar("nome_cliente", { length: 255 }),      // nome desnormalizado para exibição rápida

    // Pedido/OP
    numero_op: varchar("numero_op", { length: 100 }),            // número da Ordem de Produção
    numero_pedido: varchar("numero_pedido", { length: 100 }),    // número do pedido do cliente
    pedido_id: varchar("pedido_id"),                             // FK → pedidos.id (se gerado via pedido)

    // Fase atual no kanban
    fase_atual: varchar("fase_atual", { length: 255 }).notNull().default("inicio"),

    // Quantidades
    quantidade: integer("quantidade").notNull().default(0),         // quantidade atual em produção
    quantidade_inicial: integer("quantidade_inicial").notNull().default(0), // qtd no início da OP
    quantidade_total: integer("quantidade_total").default(0),        // qtd total pedida
    quantidade_cortada: integer("quantidade_cortada").default(0),    // qtd que passou pelo corte

    // Vínculo com ficha de custo
    ficha_id: varchar("ficha_id"),                               // FK → fichas_custo.id (opcional)
    plm_produto_id: integer("plm_produto_id"),                    // FK lógica → plm_produtos.id
    plm_ficha_tecnica_id: integer("plm_ficha_tecnica_id"),        // FK lógica → plm_fichas_tecnicas.id

    // Custos (em centavos)
    cmp: integer("cmp").default(0),                              // Custo Matéria-Prima acumulado
    cmo: integer("cmo").default(0),                              // Custo Mão-de-Obra acumulado (soma das fases)
    valor_venda: numeric("valor_venda", { precision: 12, scale: 2 }), // preço de venda (reais)

    // Fornecedor da fase atual
    fornecedor_id: varchar("fornecedor_id"),                     // FK → fornecedores.id
    fornecedor: varchar("fornecedor", { length: 255 }),          // nome desnormalizado

    // Datas
    data_entrada: timestamp("data_entrada").default(nowDefault),
    data_prevista_entrega: timestamp("data_prevista_entrega"),   // prazo cliente
    previsao_conclusao: timestamp("previsao_conclusao"),          // alias de data_prevista_entrega
    data_inicio: timestamp("data_inicio"),                       // início da fase atual
    data_termino_prevista: timestamp("data_termino_prevista"),   // término previsto da fase atual
    data_termino_real: timestamp("data_termino_real"),           // término real da fase atual

    // Mídia e atributos
    foto_url: text("foto_url"),                                  // URL da foto principal
    cores: text("cores"),                                        // texto livre (ex: "Azul, Vermelho")
    grade: varchar("grade", { length: 100 }),                    // texto livre (ex: "P/M/G/GG")
    familia_id: varchar("familia_id"),                           // agrupamento de referências (futuro)
    observacoes: text("observacoes"),

    ativo: boolean("ativo").default(true).notNull(),             // soft delete
    created_at: timestamp("created_at").default(nowDefault).notNull(),
    updated_at: timestamp("updated_at").default(nowDefault).notNull(),
  },
  (t) => [
    index("referencias_tenant_idx").on(t.tenant_id),
    index("referencias_fase_idx").on(t.fase_atual),              // filtro por fase (board)
    index("referencias_cliente_idx").on(t.cliente_id),
    index("referencias_tenant_produto_idx").on(t.tenant_id, t.produto_id),
  ],
);

export const insertReferenciaSchema = createInsertSchema(referencias).omit({
  id: true, created_at: true, updated_at: true,
});
export type InsertReferencia = z.infer<typeof insertReferenciaSchema>;
export type Referencia = typeof referencias.$inferSelect;

// ─── IMAGENS REFERENCIA ───────────────────────────────────────────────────────
// Galeria de imagens de cada referência.
// principal=true = foto de capa do cartão no kanban.
// ordem define a sequência de exibição.
export const imagens_referencia = pgTable(
  "imagens_referencia",
  {
    id: varchar("id").primaryKey().default(uuidDefault),
    tenant_id: varchar("tenant_id").notNull(),
    referencia_id: varchar("referencia_id").notNull(),           // FK → referencias.id
    url: text("url").notNull(),
    nome: varchar("nome", { length: 255 }),
    descricao: varchar("descricao", { length: 255 }),
    principal: boolean("principal").default(false).notNull(),    // foto de capa do cartão
    ordem: integer("ordem").default(0).notNull(),
    created_at: timestamp("created_at").default(nowDefault).notNull(),
  },
  (t) => [
    index("imagens_ref_idx").on(t.referencia_id),
    index("imagens_tenant_idx").on(t.tenant_id),
  ],
);

export type ImagemReferencia = typeof imagens_referencia.$inferSelect;

// ─── MOVIMENTACOES ────────────────────────────────────────────────────────────
// Histórico completo de todas as movimentações de fase de uma referência.
// Inserida automaticamente toda vez que um cartão muda de fase no Kanban.
//
// CAMPOS MONETÁRIOS (em centavos):
//   cmp = CMP informado na movimentação (pode diferir do acumulado)
//   cmo = CMO pago ao fornecedor nessa fase específica
//
// GERAÇÃO DE CONTA A PAGAR:
//   Quando cmo > 0 e fornecedor_id está preenchido em fases produtivas,
//   a rota /iniciar-proxima e /mover criam automaticamente uma linha
//   em contas_a_pagar com esse valor.
export const movimentacoes = pgTable(
  "movimentacoes",
  {
    id: varchar("id").primaryKey().default(uuidDefault),
    tenant_id: varchar("tenant_id").notNull(),
    referencia_id: varchar("referencia_id").notNull(),           // FK → referencias.id
    fase_origem: varchar("fase_origem", { length: 255 }).notNull(),
    fase_destino: varchar("fase_destino", { length: 255 }).notNull(),
    user_id: varchar("user_id"),                                 // quem fez a movimentação
    fornecedor_id: varchar("fornecedor_id"),                     // FK → fornecedores.id
    cmp: integer("cmp").default(0),
    cmo: integer("cmo").default(0),
    cmo_previsto: integer("cmo_previsto").default(0),            // CMO previsto pela ficha (unitário, centavos)
    quantidade: integer("quantidade").notNull().default(0),
    quantidade_conferida: integer("quantidade_conferida"),       // qtd contada na conferência
    perda_quantidade: integer("perda_quantidade").default(0),    // peças perdidas na fase
    data_prevista: timestamp("data_prevista"),                   // término previsto da nova fase
    data_real: timestamp("data_real"),                           // data real de conclusão
    detalhes_corte: json("detalhes_corte").$type<Array<{        // breakdown por cor/tamanho (corte)
      cor: string; tamanho: string; quantidade: number;
    }>>(),
    observacoes: text("observacoes"),
    created_at: timestamp("created_at").default(nowDefault).notNull(),
  },
  (t) => [
    index("movimentacoes_ref_idx").on(t.referencia_id),
    index("movimentacoes_tenant_idx").on(t.tenant_id),
  ],
);

export const insertMovimentacaoSchema = createInsertSchema(movimentacoes).omit({ id: true, created_at: true });
export type InsertMovimentacao = z.infer<typeof insertMovimentacaoSchema>;
export type Movimentacao = typeof movimentacoes.$inferSelect;

// ─── LISTAS CUSTOMIZADAS ──────────────────────────────────────────────────────
// Filtros salvos pelo usuário (ex: "Meus cartões atrasados").
// O campo filtros é um JSON livre para guardar os parâmetros do filtro.
export const listas_customizadas = pgTable(
  "listas_customizadas",
  {
    id: varchar("id").primaryKey().default(uuidDefault),
    tenant_id: varchar("tenant_id").notNull(),
    user_id: varchar("user_id"),                                 // dono do filtro (opcional)
    nome: varchar("nome", { length: 100 }).notNull(),
    filtros: json("filtros").$type<Record<string, unknown>>(),
    created_at: timestamp("created_at").default(nowDefault).notNull(),
  },
  (t) => [index("listas_tenant_idx").on(t.tenant_id)],
);

export type ListaCustomizada = typeof listas_customizadas.$inferSelect;

// ─── CONTAS A PAGAR ───────────────────────────────────────────────────────────
// Gerada automaticamente quando um cartão entra em fase produtiva com CMO > 0.
// O valor é o CMO em reais (numeric), não centavos.
//
// CICLO DE VIDA:
//   status: "pendente" → "pago" | "cancelado"
//   Pagar: PATCH /kanban/contas-a-pagar/:id/pagar
//   Cancelar (soft delete): DELETE /kanban/contas-a-pagar/:id
//
// RELAÇÕES:
//   referencia_id → qual OP gerou a conta
//   fornecedor_id → quem vai receber
//   cnpj/pix_fornecedor → desnormalizados para facilitar pagamento
export const contas_a_pagar = pgTable(
  "contas_a_pagar",
  {
    id: varchar("id").primaryKey().default(uuidDefault),
    tenant_id: varchar("tenant_id").notNull(),
    referencia_id: varchar("referencia_id"),                     // FK → referencias.id
    fornecedor_id: varchar("fornecedor_id"),                     // FK → fornecedores.id
    fornecedor_nome: varchar("fornecedor_nome", { length: 255 }), // nome desnormalizado (texto livre)
    fase: varchar("fase", { length: 100 }),                      // qual fase gerou a conta
    descricao: text("descricao"),                                // ex: "CMO — costura / REF-001"
    valor: numeric("valor", { precision: 12, scale: 2 }).notNull(), // em REAIS (não centavos)
    data_vencimento: timestamp("data_vencimento"),
    data_pagamento: timestamp("data_pagamento"),
    status: varchar("status", { length: 50 }).default("pendente").notNull(), // pendente|pago|cancelado
    cnpj_fornecedor: varchar("cnpj_fornecedor", { length: 20 }), // desnormalizado
    pix_fornecedor: varchar("pix_fornecedor", { length: 255 }),  // desnormalizado
    exportado_bling: boolean("exportado_bling").default(false),  // integração Bling (futuro)
    exportado_vhsys: boolean("exportado_vhsys").default(false),  // enviado ao VHSys ERP
    id_vhsys: varchar("id_vhsys", { length: 50 }),               // ID da conta no VHSys
    created_at: timestamp("created_at").default(nowDefault).notNull(),
    updated_at: timestamp("updated_at").default(nowDefault).notNull(),
  },
  (t) => [index("contas_tenant_idx").on(t.tenant_id)],
);

export const insertContaAPagarSchema = createInsertSchema(contas_a_pagar).omit({ id: true, created_at: true, updated_at: true });
export type InsertContaAPagar = z.infer<typeof insertContaAPagarSchema>;
export type ContaAPagar = typeof contas_a_pagar.$inferSelect;

// ─── PEDIDOS ──────────────────────────────────────────────────────────────────
// Pedidos de clientes. Uma referência pode estar vinculada a um pedido.
// Integração com Bling via campo bling_id (futuro).
//
// CAMPOS MANUS:
//   numero_pedido = PED-YYYY-NNNN (gerado automaticamente)
//   nome_cliente  = nome em texto livre (não FK — igual ao Manus)
//   email_cliente, telefone_cliente = contato direto
//   prazo_entrega = data limite de entrega
//   acrescimo_tipo/desconto_tipo = "valor" | "percentual"
//   valor_total, valor_sinal, acrescimo, desconto = em CENTAVOS (integer)
export const pedidos = pgTable(
  "pedidos",
  {
    id: varchar("id").primaryKey().default(uuidDefault),
    tenant_id: varchar("tenant_id").notNull(),
    numero: varchar("numero", { length: 100 }),
    numero_pedido: varchar("numero_pedido", { length: 100 }),    // PED-YYYY-NNNN (automático)
    cliente_id: varchar("cliente_id"),                           // FK → clientes.id (legado)
    nome_cliente: varchar("nome_cliente", { length: 255 }),      // nome direto (Manus style)
    email_cliente: varchar("email_cliente", { length: 320 }),
    telefone_cliente: varchar("telefone_cliente", { length: 50 }),
    data_pedido: timestamp("data_pedido"),
    data_entrega_prevista: timestamp("data_entrega_prevista"),
    prazo_entrega: timestamp("prazo_entrega"),                    // alias de data_entrega_prevista
    status: varchar("status", { length: 50 }).default("pendente").notNull(), // pendente|em_producao|concluido|cancelado
    valor_total: numeric("valor_total", { precision: 12, scale: 2 }), // em REAIS (legado)
    valor_total_cents: integer("valor_total_cents").default(0),  // em CENTAVOS (novo — Manus style)
    origem: varchar("origem", { length: 50 }),                   // manual|orcamento|bling|leads2b
    orcamento_id: varchar("orcamento_id"),                       // ID do orçamento no Supabase (origem=orcamento)
    orcamento_numero: varchar("orcamento_numero", { length: 50 }), // ex: ORC-0001 (display)
    bling_id: varchar("bling_id", { length: 100 }),              // ID no Bling (integração futura)
    cnpj_cliente: varchar("cnpj_cliente", { length: 20 }),       // CNPJ/CPF para ERP
    endereco_cliente: text("endereco_cliente"),                   // Logradouro + número
    cep_cliente: varchar("cep_cliente", { length: 10 }),
    cidade_cliente: varchar("cidade_cliente", { length: 100 }),
    uf_cliente: varchar("uf_cliente", { length: 2 }),
    id_vhsys_cliente: varchar("id_vhsys_cliente", { length: 50 }), // ID do cliente no VhSys (evita duplicatas)
    id_vhsys_pedido: varchar("id_vhsys_pedido", { length: 50 }),  // ID do pedido de venda no VHSys
    valor_sinal: numeric("valor_sinal", { precision: 12, scale: 2 }).default("0"), // em REAIS (legado)
    valor_sinal_cents: integer("valor_sinal_cents").default(0),  // em CENTAVOS (novo)
    acrescimo_tipo: varchar("acrescimo_tipo", { length: 20 }).default("valor"), // valor|percentual
    acrescimo_valor: integer("acrescimo_valor").default(0),      // centavos ou percentual inteiro
    desconto_tipo: varchar("desconto_tipo", { length: 20 }).default("valor"),   // valor|percentual
    desconto_valor: integer("desconto_valor").default(0),        // centavos ou percentual inteiro
    observacoes: text("observacoes"),
    // ── Campos de faturamento (Contas a Receber) ──────────────────────────────
    // Replicados do Manus: statusFaturamento, valorFaturado, dataFaturamento
    status_faturamento: varchar("status_faturamento", { length: 20 }).default("faturar").notNull(), // "faturar" | "faturado"
    valor_faturado: integer("valor_faturado").default(0),        // valor efetivamente faturado em centavos
    data_faturamento: timestamp("data_faturamento"),             // data em que foi faturado
    created_at: timestamp("created_at").default(nowDefault).notNull(),
    updated_at: timestamp("updated_at").default(nowDefault).notNull(),
  },
  (t) => [index("pedidos_tenant_idx").on(t.tenant_id)],
);

export type Pedido = typeof pedidos.$inferSelect;

// ─── ITENS PEDIDO ─────────────────────────────────────────────────────────────
// Itens de um pedido (manus-style): cada linha é uma combinação referência+cor+grade.
// Quando "Gerar Cartão" é acionado para uma referência, um cartão Kanban é criado
// e referencia_id passa a apontar para ele (indicando que o cartão existe).
//
// CAMPOS MONETÁRIOS (centavos):
//   valor_unitario = preço de venda unitário
//   cmp            = custo matéria-prima unitário
//   valor_total    = valor_unitario * quantidade_total
export const itens_pedido = pgTable(
  "itens_pedido",
  {
    id: varchar("id").primaryKey().default(uuidDefault),
    tenant_id: varchar("tenant_id").notNull(),
    pedido_id: varchar("pedido_id").notNull(),                   // FK → pedidos.id
    referencia: varchar("referencia", { length: 100 }).notNull(), // código da peça (ex: REF-001)
    referencia_cliente: varchar("referencia_cliente", { length: 100 }),
    descricao: text("descricao"),
    cor_nome: varchar("cor_nome", { length: 100 }),              // nome da cor em texto livre
    grade_id: varchar("grade_id"),                               // FK → grades.id
    quantidade_total: integer("quantidade_total").default(0),
    quantidade_por_tamanho: json("quantidade_por_tamanho").$type<Record<string, number>>(), // {P:5, M:10}
    valor_unitario: integer("valor_unitario").default(0),        // centavos
    cmp: integer("cmp").default(0),                              // custo matéria-prima em centavos
    is_aviamento: boolean("is_aviamento").default(false).notNull(),
    is_desenvolvimento: boolean("is_desenvolvimento").default(false).notNull(),
    referencia_id: varchar("referencia_id"),                     // FK → referencias.id (null até cartão gerado)
    produto_id: varchar("produto_id"),                           // FK lógica → produtos.id (transição)
    ficha_custo_id: varchar("ficha_custo_id"),                    // FK lógica → fichas_custo.id
    plm_produto_id: integer("plm_produto_id"),                    // FK lógica → plm_produtos.id
    plm_ficha_tecnica_id: integer("plm_ficha_tecnica_id"),        // FK lógica → plm_fichas_tecnicas.id
    created_at: timestamp("created_at").default(nowDefault).notNull(),
  },
  (t) => [
    index("itens_pedido_pedido_idx").on(t.pedido_id),
    index("itens_pedido_tenant_idx").on(t.tenant_id),
    index("itens_pedido_tenant_produto_idx").on(t.tenant_id, t.produto_id),
  ],
);

export type ItemPedido = typeof itens_pedido.$inferSelect;

// ─── CONTAS A RECEBER ─────────────────────────────────────────────────────────
// Valores a receber dos clientes pelas OPs expedidas.
// Gerada manualmente ou quando uma referência chega em "faturamento".
//
// CICLO DE VIDA:
//   status: "pendente" → "recebido" | "cancelado"
//
// RELAÇÕES:
//   referencia_id → qual OP gerou o recebível
//   cliente_id → quem vai pagar
export const contas_a_receber = pgTable(
  "contas_a_receber",
  {
    id: varchar("id").primaryKey().default(uuidDefault),
    tenant_id: varchar("tenant_id").notNull(),
    referencia_id: varchar("referencia_id"),                     // FK → referencias.id
    cliente_id: varchar("cliente_id"),                           // FK → clientes.id
    descricao: text("descricao"),                                // ex: "Faturamento OP REF-001"
    valor: numeric("valor", { precision: 12, scale: 2 }).notNull(), // em REAIS
    data_vencimento: timestamp("data_vencimento"),
    data_recebimento: timestamp("data_recebimento"),
    status: varchar("status", { length: 50 }).default("pendente").notNull(), // pendente|recebido|cancelado
    nf_numero: varchar("nf_numero", { length: 100 }),            // número da nota fiscal
    observacoes: text("observacoes"),
    exportado_vhsys: boolean("exportado_vhsys").default(false),  // enviado ao VHSys ERP
    id_vhsys: varchar("id_vhsys", { length: 50 }),               // ID da conta no VHSys
    created_at: timestamp("created_at").default(nowDefault).notNull(),
    updated_at: timestamp("updated_at").default(nowDefault).notNull(),
  },
  (t) => [index("receber_tenant_idx").on(t.tenant_id)],
);

export const insertContaAReceberSchema = createInsertSchema(contas_a_receber).omit({ id: true, created_at: true, updated_at: true });
export type InsertContaAReceber = z.infer<typeof insertContaAReceberSchema>;
export type ContaAReceber = typeof contas_a_receber.$inferSelect;

// ─── ESTOQUE ──────────────────────────────────────────────────────────────────
// Gerado automaticamente quando uma OP entra na fase "expedicao".
// O usuário edita as quantidades por cor/tamanho (1ª e 2ª qualidade) e envia ao ERP.
export const estoque = pgTable(
  "estoque",
  {
    id: varchar("id").primaryKey().default(uuidDefault),
    tenant_id: varchar("tenant_id").notNull(),
    referencia_id: varchar("referencia_id").notNull(),           // FK → referencias.id
    quantidade_total: integer("quantidade_total").default(0).notNull(),
    // Campos expandidos
    qtd_inicial: integer("qtd_inicial").default(0).notNull(),    // quantidade quando entrou na expedição
    qtd_cortada: integer("qtd_cortada").default(0).notNull(),    // quantidade_cortada da referência
    qtd_primeira: integer("qtd_primeira").default(0).notNull(),  // soma de 1ª qualidade (calculado)
    qtd_segunda: integer("qtd_segunda").default(0).notNull(),    // soma de 2ª qualidade (calculado)
    nome_cliente: varchar("nome_cliente", { length: 255 }),      // desnormalizado para filtro rápido
    numero_pedido: varchar("numero_pedido", { length: 50 }),
    numero_op: varchar("numero_op", { length: 50 }),
    valor_unitario_cents: integer("valor_unitario_cents").default(0), // em centavos
    status_erp: varchar("status_erp", { length: 20 }).default("pendente").notNull(), // pendente|enviado
    faturado: boolean("faturado").default(false).notNull(),
    nf_numero: varchar("nf_numero", { length: 100 }),              // número da NF emitida
    atualizado_em: timestamp("atualizado_em").default(nowDefault).notNull(),
  },
  (t) => [index("estoque_tenant_idx").on(t.tenant_id)],
);

export type Estoque = typeof estoque.$inferSelect;

// ─── ESTOQUE GRADES ───────────────────────────────────────────────────────────
// Detalhamento por cor × tamanho de cada item do estoque.
// Preenchido pelo usuário no modal "Editar Estoque".
export const estoque_grades = pgTable(
  "estoque_grades",
  {
    id: varchar("id").primaryKey().default(uuidDefault),
    tenant_id: varchar("tenant_id").notNull(),
    estoque_id: varchar("estoque_id").notNull(),                 // FK → estoque.id
    cor_nome: varchar("cor_nome", { length: 100 }).notNull(),
    tamanho: varchar("tamanho", { length: 20 }).notNull(),
    qtd_primeira: integer("qtd_primeira").default(0).notNull(),
    qtd_segunda: integer("qtd_segunda").default(0).notNull(),
  },
  (t) => [index("estoque_grades_estoque_idx").on(t.estoque_id)],
);

export type EstoqueGrade = typeof estoque_grades.$inferSelect;

// ─── PEDIDO SINAIS ────────────────────────────────────────────────────────────
// Registros de pagamentos parciais (sinais/adiantamentos) recebidos por pedido.
// O 1º sinal é criado automaticamente ao enviar o orçamento para o Kanban.
// Os demais são inseridos manualmente pelo usuário conforme o cliente paga.
export const pedido_sinais = pgTable(
  "pedido_sinais",
  {
    id: varchar("id").primaryKey().default(uuidDefault),
    tenant_id: varchar("tenant_id").notNull(),
    pedido_id: varchar("pedido_id").notNull(),                     // FK → pedidos.id
    descricao: varchar("descricao", { length: 255 }).notNull(),    // ex: "1º Sinal", "Sinal pós-piloto"
    valor_cents: integer("valor_cents").notNull().default(0),      // valor em centavos
    data_recebido: timestamp("data_recebido"),                     // data do recebimento
    created_at: timestamp("created_at").default(nowDefault).notNull(),
  },
  (t) => [
    index("pedido_sinais_pedido_idx").on(t.pedido_id),
    index("pedido_sinais_tenant_idx").on(t.tenant_id),
  ],
);

export type PedidoSinal = typeof pedido_sinais.$inferSelect;

// ─── PRÉ-AGENDAMENTOS ─────────────────────────────────────────────────────────
// Reserva comercial de peças que já passaram pelo corte. Não movimenta estoque
// nem fatura o pedido; preserva um retrato auditável do pedido naquele momento.
export const pre_agendamentos = pgTable(
  "pre_agendamentos",
  {
    id: varchar("id").primaryKey().default(uuidDefault),
    tenant_id: varchar("tenant_id").notNull(),
    pedido_id: varchar("pedido_id").notNull(),
    numero: varchar("numero", { length: 30 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("active"), // active|reverted|finalized
    cliente_nome: varchar("cliente_nome", { length: 255 }),
    cliente_email: varchar("cliente_email", { length: 320 }),
    cliente_telefone: varchar("cliente_telefone", { length: 50 }),
    endereco_cliente: text("endereco_cliente"),
    cep_cliente: varchar("cep_cliente", { length: 10 }),
    cidade_cliente: varchar("cidade_cliente", { length: 100 }),
    uf_cliente: varchar("uf_cliente", { length: 2 }),
    subtotal_cents: integer("subtotal_cents").notNull().default(0),
    sinais_cents: integer("sinais_cents").notNull().default(0),
    descontos_cents: integer("descontos_cents").notNull().default(0),
    acrescimos_cents: integer("acrescimos_cents").notNull().default(0),
    total_cents: integer("total_cents").notNull().default(0),
    reverted_at: timestamp("reverted_at"),
    reverted_by: varchar("reverted_by"),
    reverted_reason: text("reverted_reason"),
    created_at: timestamp("created_at").default(nowDefault).notNull(),
    updated_at: timestamp("updated_at").default(nowDefault).notNull(),
  },
  (t) => [
    index("pre_agendamentos_tenant_idx").on(t.tenant_id),
    index("pre_agendamentos_pedido_idx").on(t.pedido_id),
    index("pre_agendamentos_status_idx").on(t.tenant_id, t.status),
  ],
);
export type PreAgendamento = typeof pre_agendamentos.$inferSelect;
export type InsertPreAgendamento = typeof pre_agendamentos.$inferInsert;

export const pre_agendamento_itens = pgTable(
  "pre_agendamento_itens",
  {
    id: varchar("id").primaryKey().default(uuidDefault),
    tenant_id: varchar("tenant_id").notNull(),
    pre_agendamento_id: varchar("pre_agendamento_id").notNull(),
    pedido_item_id: varchar("pedido_item_id").notNull(),
    referencia_id: varchar("referencia_id").notNull(),
    referencia: varchar("referencia", { length: 100 }).notNull(),
    descricao: text("descricao"),
    quantidade_cortada: integer("quantidade_cortada").notNull().default(0),
    valor_unitario_cents: integer("valor_unitario_cents").notNull().default(0),
    valor_total_cents: integer("valor_total_cents").notNull().default(0),
    created_at: timestamp("created_at").default(nowDefault).notNull(),
  },
  (t) => [
    index("pre_agendamento_itens_pre_idx").on(t.pre_agendamento_id),
    index("pre_agendamento_itens_ref_idx").on(t.tenant_id, t.referencia_id),
  ],
);
export type PreAgendamentoItem = typeof pre_agendamento_itens.$inferSelect;
export type InsertPreAgendamentoItem = typeof pre_agendamento_itens.$inferInsert;

export const pre_agendamento_ajustes = pgTable(
  "pre_agendamento_ajustes",
  {
    id: varchar("id").primaryKey().default(uuidDefault),
    tenant_id: varchar("tenant_id").notNull(),
    pre_agendamento_id: varchar("pre_agendamento_id").notNull(),
    tipo: varchar("tipo", { length: 20 }).notNull(), // signal|discount|addition
    descricao: varchar("descricao", { length: 255 }).notNull(),
    valor_cents: integer("valor_cents").notNull(),
    origem: varchar("origem", { length: 20 }).notNull().default("manual"), // order|manual
    created_at: timestamp("created_at").default(nowDefault).notNull(),
  },
  (t) => [
    index("pre_agendamento_ajustes_pre_idx").on(t.pre_agendamento_id),
    index("pre_agendamento_ajustes_tenant_idx").on(t.tenant_id),
  ],
);
export type PreAgendamentoAjuste = typeof pre_agendamento_ajustes.$inferSelect;
export type InsertPreAgendamentoAjuste = typeof pre_agendamento_ajustes.$inferInsert;

// ─── KANBAN FASE CONFIG ───────────────────────────────────────────────────────
// Configuração de fases do Kanban por tenant — sobrescreve os defaults do sistema.
// Padrão de fábrica = configuração r2pb. Somente o admin Mirage pode alterar.
export const kanban_fase_config = pgTable(
  "kanban_fase_config",
  {
    id:           varchar("id").primaryKey().default(uuidDefault),
    tenant_id:    varchar("tenant_id").notNull(),
    fase_id:      varchar("fase_id", { length: 50 }).notNull(),
    nomeExibicao: varchar("nome_exibicao", { length: 100 }),
    cor:          varchar("cor", { length: 50 }),
    oculta:       boolean("oculta").default(false),
    ordem:        integer("ordem"),
    abreModal:    boolean("abre_modal"),   // null = usar padrão do sistema
    tipoModal:    varchar("tipo_modal", { length: 50 }), // 'produtiva'|'tecido'|'expedicao'|null
    created_at:   timestamp("created_at").default(nowDefault).notNull(),
    updated_at:   timestamp("updated_at").default(nowDefault).notNull(),
  },
  (t) => [
    index("kanban_fase_config_tenant_idx").on(t.tenant_id),
  ],
);
export type KanbanFaseConfig = typeof kanban_fase_config.$inferSelect;

// ─── MIRA LEADS ───────────────────────────────────────────────────────────────
// Leads capturados pelo chatbot Mira no site/hub público.
// tenant_id: sempre 'mirage' para leads da Mira pública. Obrigatório — sem fallback.
export const mira_leads = pgTable(
  "mira_leads",
  {
    id:         varchar("id").primaryKey().default(uuidDefault),
    tenantId:   varchar("tenant_id", { length: 100 }).notNull().default("mirage"),
    nome:       varchar("nome", { length: 200 }).notNull(),
    whatsapp:   varchar("whatsapp", { length: 30 }),
    email:      varchar("email", { length: 200 }),
    origem:     varchar("origem", { length: 100 }).default("chat-mira"),
    appContext: varchar("app_context", { length: 100 }),
    created_at: timestamp("created_at").default(nowDefault).notNull(),
  },
  (t) => [
    index("mira_leads_created_idx").on(t.created_at),
    index("mira_leads_tenant_idx").on(t.tenantId),
  ],
);
export type MiraLead = typeof mira_leads.$inferSelect;

// ─── PARCEIROS LEADS ──────────────────────────────────────────────────────────
// Rastreio de cliques nos links de parceiros: quem clicou, para qual parceiro, quando
export const parceiros_leads = pgTable(
  "parceiros_leads",
  {
    id: varchar("id").primaryKey().default(uuidDefault),
    tenant_id: varchar("tenant_id").notNull(),
    user_id: varchar("user_id"),
    user_email: varchar("user_email", { length: 255 }),
    tenant_name: varchar("tenant_name", { length: 255 }),
    partner_id: varchar("partner_id", { length: 100 }).notNull(),
    partner_name: varchar("partner_name", { length: 255 }),
    cupom: varchar("cupom", { length: 100 }),
    created_at: timestamp("created_at").default(nowDefault).notNull(),
  },
  (t) => [
    index("parceiros_leads_tenant_idx").on(t.tenant_id),
    index("parceiros_leads_partner_idx").on(t.partner_id),
  ],
);

export type ParceiroLead = typeof parceiros_leads.$inferSelect;
