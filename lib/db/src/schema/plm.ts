import {
  pgTable,
  serial,
  text,
  varchar,
  boolean,
  timestamp,
  date,
  jsonb,
  numeric,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── SEQUÊNCIAS (geração de códigos automáticos) ───────────────────────────────
export const plm_sequencias = pgTable("plm_sequencias", {
  id: serial("id").primaryKey(),
  tenant_id: varchar("tenant_id", { length: 100 }).notNull(),
  prefixo: varchar("prefixo", { length: 20 }).notNull(),
  ultimo_numero: integer("ultimo_numero").notNull().default(0),
}, t => [
  uniqueIndex("plm_sequencias_tenant_prefixo_uidx").on(t.tenant_id, t.prefixo),
]);

// ─── COLEÇÕES ──────────────────────────────────────────────────────────────────
export const plm_colecoes = pgTable("plm_colecoes", {
  id: serial("id").primaryKey(),
  tenant_id: varchar("tenant_id", { length: 100 }).notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  temporada: text("temporada").notNull(), // verao|inverno|primavera|outono|ano_todo
  ano: integer("ano").notNull(),
  descricao: text("descricao"),
  ativa: boolean("ativa").default(true).notNull(),
  created_by: text("created_by"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, t => [index("plm_colecoes_tenant_idx").on(t.tenant_id)]);

export type PlmColecao = typeof plm_colecoes.$inferSelect;
export type InsertPlmColecao = typeof plm_colecoes.$inferInsert;

// ─── CLIENTES PLM ──────────────────────────────────────────────────────────────
export const plm_clientes = pgTable("plm_clientes", {
  id: serial("id").primaryKey(),
  tenant_id: varchar("tenant_id", { length: 100 }).notNull(),
  codigo: varchar("codigo", { length: 20 }),
  nome: varchar("nome", { length: 255 }).notNull(),
  cnpj: varchar("cnpj", { length: 20 }),
  contato: varchar("contato", { length: 255 }),
  email: varchar("email", { length: 320 }),
  telefone: varchar("telefone", { length: 30 }),
  observacoes: text("observacoes"),
  ativo: boolean("ativo").default(true).notNull(),
  created_by: text("created_by"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, t => [index("plm_clientes_tenant_idx").on(t.tenant_id)]);

export type PlmCliente = typeof plm_clientes.$inferSelect;

// ─── FORNECEDORES PLM ─────────────────────────────────────────────────────────
export const plm_fornecedores = pgTable("plm_fornecedores", {
  id: serial("id").primaryKey(),
  tenant_id: varchar("tenant_id", { length: 100 }).notNull(),
  codigo: varchar("codigo", { length: 20 }),
  nome: varchar("nome", { length: 255 }).notNull(),
  cnpj: varchar("cnpj", { length: 20 }),
  contato: varchar("contato", { length: 255 }),
  email: varchar("email", { length: 320 }),
  telefone: varchar("telefone", { length: 30 }),
  cidade: varchar("cidade", { length: 100 }),
  estado: varchar("estado", { length: 2 }),
  observacoes: text("observacoes"),
  ativo: boolean("ativo").default(true).notNull(),
  created_by: text("created_by"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, t => [index("plm_fornecedores_tenant_idx").on(t.tenant_id)]);

export type PlmFornecedor = typeof plm_fornecedores.$inferSelect;

// ─── PRODUTOS PLM ─────────────────────────────────────────────────────────────
export const plm_produtos = pgTable("plm_produtos", {
  id: serial("id").primaryKey(),
  tenant_id: varchar("tenant_id", { length: 100 }).notNull(),
  codigo: varchar("codigo", { length: 20 }),
  colecao_id: integer("colecao_id"),
  cliente_id: integer("cliente_id"),
  nome: varchar("nome", { length: 255 }).notNull(),
  referencia: varchar("referencia", { length: 50 }),
  referencia_cliente: varchar("referencia_cliente", { length: 100 }),
  link_modelagem: text("link_modelagem"),
  categoria: text("categoria").notNull(), // camiseta|camisa|calca|short|vestido|saia|jaqueta|casaco|blusa|moletom|macacao|outro
  descricao: text("descricao"),
  status: text("status").default("rascunho").notNull(), // rascunho|desenvolvimento|pilotagem|aprovado
  imagem_url: text("imagem_url"),
  observacoes: text("observacoes"),
  created_by: text("created_by"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, t => [
  index("plm_produtos_tenant_idx").on(t.tenant_id),
  index("plm_produtos_status_idx").on(t.status),
]);

export type PlmProduto = typeof plm_produtos.$inferSelect;

// ─── FAMÍLIAS E MODELOS DE MEDIDAS ───────────────────────────────────────────
// Uma família define os pontos de medição e o mockup técnico; a grade vem do pedido.
export const plm_familias_medidas = pgTable("plm_familias_medidas", {
  id: serial("id").primaryKey(),
  tenant_id: varchar("tenant_id", { length: 100 }).notNull(),
  nome: varchar("nome", { length: 100 }).notNull(),
  campos: jsonb("campos").$type<Array<{ chave: string; nome: string; unidade?: string; ordem?: number }>>().default([]).notNull(),
  mockup_url: text("mockup_url"),
  ativo: boolean("ativo").default(true).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, t => [
  uniqueIndex("plm_familias_medidas_tenant_nome_uidx").on(t.tenant_id, t.nome),
  index("plm_familias_medidas_tenant_idx").on(t.tenant_id),
]);

export type PlmFamiliaMedidas = typeof plm_familias_medidas.$inferSelect;

// ─── FICHAS TÉCNICAS PLM ──────────────────────────────────────────────────────
export const plm_fichas_tecnicas = pgTable("plm_fichas_tecnicas", {
  id: serial("id").primaryKey(),
  tenant_id: varchar("tenant_id", { length: 100 }).notNull(),
  codigo: varchar("codigo", { length: 20 }),
  produto_id: integer("produto_id").notNull(),
  versao: integer("versao").default(1).notNull(),
  status: text("status").default("rascunho").notNull(), // rascunho|em_revisao|aprovada
  titulo: varchar("titulo", { length: 255 }),
  referencia: varchar("referencia", { length: 100 }),
  referencia_cliente: varchar("referencia_cliente", { length: 100 }),
  cliente_id: integer("cliente_id"),
  familia: varchar("familia", { length: 100 }),
  familia_medidas_id: integer("familia_medidas_id"),
  pedido_item_id: varchar("pedido_item_id"),
  grade_id: varchar("grade_id"),
  medidas: jsonb("medidas"),
  componentes: jsonb("componentes"),
  tipo_costura: varchar("tipo_costura", { length: 100 }),
  instrucao_lavagem: varchar("instrucao_lavagem", { length: 255 }),
  etiqueta_composicao_url: text("etiqueta_composicao_url"),
  bordado_estampa: text("bordado_estampa"),
  aviamentos: text("aviamentos"),
  foto_principal_url: text("foto_principal_url"),
  galeria_urls: jsonb("galeria_urls"),
  mao_de_obra: jsonb("mao_de_obra"),
  observacoes: text("observacoes").notNull().default(""),
  created_by: text("created_by"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, t => [index("plm_fichas_tecnicas_produto_idx").on(t.produto_id)]);

export type PlmFichaTecnica = typeof plm_fichas_tecnicas.$inferSelect;

// ─── MOLDES (Modelagem) ───────────────────────────────────────────────────────
export const plm_moldes = pgTable("plm_moldes", {
  id: serial("id").primaryKey(),
  tenant_id: varchar("tenant_id", { length: 100 }).notNull(),
  produto_id: integer("produto_id").notNull(),
  versao: integer("versao").default(1).notNull(),
  tamanho_base: varchar("tamanho_base", { length: 10 }),
  arquivo_url: text("arquivo_url"),
  arquivo_nome: varchar("arquivo_nome", { length: 255 }),
  descricao_alteracoes: text("descricao_alteracoes"),
  observacoes: text("observacoes"),
  created_by: text("created_by"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, t => [index("plm_moldes_produto_idx").on(t.produto_id)]);

export type PlmMolde = typeof plm_moldes.$inferSelect;

// ─── MATERIAIS PLM ────────────────────────────────────────────────────────────
export const plm_materiais = pgTable("plm_materiais", {
  id: serial("id").primaryKey(),
  tenant_id: varchar("tenant_id", { length: 100 }).notNull(),
  fornecedor_id: integer("fornecedor_id"),
  tipo: text("tipo").notNull(), // tecido|aviamento|insumo|embalagem
  codigo: varchar("codigo", { length: 50 }),
  descricao: varchar("descricao", { length: 255 }).notNull(),
  unidade: text("unidade").notNull(), // metro|kg|unidade|duzia|rolo|par
  preco_unitario: numeric("preco_unitario", { precision: 10, scale: 2 }).notNull(),
  cor: varchar("cor", { length: 100 }),
  composicao: varchar("composicao", { length: 255 }),
  observacoes: text("observacoes"),
  ativo: boolean("ativo").default(true).notNull(),
  created_by: text("created_by"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, t => [index("plm_materiais_tenant_idx").on(t.tenant_id)]);

export type PlmMaterial = typeof plm_materiais.$inferSelect;

// ─── BOM ──────────────────────────────────────────────────────────────────────
export const plm_boms = pgTable("plm_boms", {
  id: serial("id").primaryKey(),
  tenant_id: varchar("tenant_id", { length: 100 }).notNull(),
  codigo: varchar("codigo", { length: 20 }),
  produto_id: integer("produto_id").notNull(),
  versao: integer("versao").default(1).notNull(),
  custo_mao_de_obra: numeric("custo_mao_de_obra", { precision: 10, scale: 2 }).default("0"),
  custos_indiretos: numeric("custos_indiretos", { precision: 10, scale: 2 }).default("0"),
  margem_lucro: numeric("margem_lucro", { precision: 5, scale: 2 }).default("0"),
  preco_venda: numeric("preco_venda", { precision: 10, scale: 2 }).default("0"),
  observacoes: text("observacoes"),
  created_by: text("created_by"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, t => [index("plm_boms_produto_idx").on(t.produto_id)]);

export type PlmBom = typeof plm_boms.$inferSelect;

export const plm_bom_linhas = pgTable("plm_bom_linhas", {
  id: serial("id").primaryKey(),
  bom_id: integer("bom_id").notNull(),
  material_id: integer("material_id").notNull(),
  quantidade: numeric("quantidade", { precision: 10, scale: 3 }).notNull(),
  preco_unitario: numeric("preco_unitario", { precision: 10, scale: 2 }).notNull(),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  observacoes: text("observacoes"),
});

export type PlmBomLinha = typeof plm_bom_linhas.$inferSelect;

// ─── PROCESSOS DE PILOTAGEM ───────────────────────────────────────────────────
export const plm_processos = pgTable("plm_processos", {
  id: serial("id").primaryKey(),
  tenant_id: varchar("tenant_id", { length: 100 }).notNull(),
  nome: varchar("nome", { length: 120 }).notNull(),
  sequencia: integer("sequencia").notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  created_by: text("created_by"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, t => [
  uniqueIndex("plm_processos_tenant_nome_uidx").on(t.tenant_id, t.nome),
  index("plm_processos_tenant_sequencia_idx").on(t.tenant_id, t.sequencia),
]);

export type PlmProcesso = typeof plm_processos.$inferSelect;

export const plm_processo_etapas = pgTable("plm_processo_etapas", {
  id: serial("id").primaryKey(),
  processo_id: integer("processo_id").notNull(),
  nome: varchar("nome", { length: 120 }).notNull(),
  sequencia: integer("sequencia").notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, t => [
  index("plm_processo_etapas_processo_idx").on(t.processo_id, t.sequencia),
  index("plm_processo_etapas_processo_nome_idx").on(t.processo_id, t.nome),
]);

export type PlmProcessoEtapa = typeof plm_processo_etapas.$inferSelect;

// ─── PILOTOS ──────────────────────────────────────────────────────────────────
export const plm_pilotos = pgTable("plm_pilotos", {
  id: serial("id").primaryKey(),
  tenant_id: varchar("tenant_id", { length: 100 }).notNull(),
  produto_id: integer("produto_id").notNull(),
  cliente_id: integer("cliente_id"),
  processo_id: integer("processo_id"),
  modelagem_id: integer("modelagem_id"),
  numero_piloto: integer("numero_piloto").notNull(),
  referencia: varchar("referencia", { length: 100 }),
  referencia_cliente: varchar("referencia_cliente", { length: 100 }),
  tamanho_piloto: varchar("tamanho_piloto", { length: 30 }),
  link_modelagem: text("link_modelagem"),
  data_inicio: date("data_inicio"),
  data_prevista: date("data_prevista"),
  data_termino_real: date("data_termino_real"),
  status: text("status").default("em_andamento").notNull(), // em_andamento|concluido|reprovado|aprovado
  motivo_reprovacao: text("motivo_reprovacao"),
  imagem_aprovacao_url: text("imagem_aprovacao_url"),
  observacoes: text("observacoes"),
  created_by: text("created_by"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, t => [index("plm_pilotos_produto_idx").on(t.produto_id)]);

export type PlmPiloto = typeof plm_pilotos.$inferSelect;

export const plm_piloto_etapas = pgTable("plm_piloto_etapas", {
  id: serial("id").primaryKey(),
  piloto_id: integer("piloto_id").notNull(),
  etapa: text("etapa").notNull(), // corte|costura|acabamento|controle_qualidade
  resultado: text("resultado").default("pendente").notNull(), // passou|falhou|ajuste_necessario|pendente
  problemas_encontrados: text("problemas_encontrados"),
  fotos_urls: jsonb("fotos_urls"),
  data_inicio: timestamp("data_inicio"),
  data_conclusao: timestamp("data_conclusao"),
  observacoes: text("observacoes"),
});

export type PlmPilotoEtapa = typeof plm_piloto_etapas.$inferSelect;

// ─── APROVAÇÕES ───────────────────────────────────────────────────────────────
export const plm_aprovacoes = pgTable("plm_aprovacoes", {
  id: serial("id").primaryKey(),
  tenant_id: varchar("tenant_id", { length: 100 }).notNull(),
  produto_id: integer("produto_id").notNull(),
  piloto_id: integer("piloto_id"),
  processo_etapa_id: integer("processo_etapa_id"),
  etapa: text("etapa").notNull(), // ficha_tecnica|modelagem|bom_custos|qualidade_piloto|aprovacao_gerencial
  status: text("status").default("pendente").notNull(), // pendente|aprovado|reprovado
  responsavel_id: text("responsavel_id"),
  responsavel_nome: varchar("responsavel_nome", { length: 255 }),
  data_decisao: timestamp("data_decisao"),
  observacoes: text("observacoes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, t => [
  index("plm_aprovacoes_produto_idx").on(t.produto_id),
  index("plm_aprovacoes_piloto_idx").on(t.piloto_id),
  index("plm_aprovacoes_piloto_etapa_idx").on(t.piloto_id, t.processo_etapa_id),
]);

export type PlmAprovacao = typeof plm_aprovacoes.$inferSelect;

// ─── AUDITORIA PLM ────────────────────────────────────────────────────────────
export const plm_auditoria = pgTable("plm_auditoria", {
  id: serial("id").primaryKey(),
  tenant_id: varchar("tenant_id", { length: 100 }).notNull(),
  produto_id: integer("produto_id"),
  modulo: text("modulo").notNull(),
  acao: text("acao").notNull(),
  entidade_id: integer("entidade_id"),
  descricao: text("descricao").notNull(),
  dados_anteriores: jsonb("dados_anteriores"),
  dados_novos: jsonb("dados_novos"),
  usuario_id: text("usuario_id"),
  usuario_nome: varchar("usuario_nome", { length: 255 }),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, t => [
  index("plm_auditoria_tenant_idx").on(t.tenant_id),
  index("plm_auditoria_produto_idx").on(t.produto_id),
]);

export type PlmAuditoria = typeof plm_auditoria.$inferSelect;
