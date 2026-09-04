-- Development-only MVP DDL: pré-agendamentos Kanban
CREATE TABLE IF NOT EXISTS pre_agendamentos (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id varchar NOT NULL,
  pedido_id varchar NOT NULL, numero varchar(30) NOT NULL, status varchar(20) NOT NULL DEFAULT 'active',
  cliente_nome varchar(255), cliente_email varchar(320), cliente_telefone varchar(50),
  endereco_cliente text, cep_cliente varchar(10), cidade_cliente varchar(100), uf_cliente varchar(2),
  subtotal_cents integer NOT NULL DEFAULT 0, sinais_cents integer NOT NULL DEFAULT 0,
  descontos_cents integer NOT NULL DEFAULT 0, acrescimos_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0, reverted_at timestamp, reverted_by varchar,
  reverted_reason text, created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pre_agendamentos_tenant_idx ON pre_agendamentos (tenant_id);
CREATE INDEX IF NOT EXISTS pre_agendamentos_pedido_idx ON pre_agendamentos (pedido_id);
CREATE INDEX IF NOT EXISTS pre_agendamentos_status_idx ON pre_agendamentos (tenant_id, status);
CREATE TABLE IF NOT EXISTS pre_agendamento_itens (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id varchar NOT NULL,
  pre_agendamento_id varchar NOT NULL, pedido_item_id varchar NOT NULL, referencia_id varchar NOT NULL,
  referencia varchar(100) NOT NULL, descricao text, quantidade_cortada integer NOT NULL DEFAULT 0,
  valor_unitario_cents integer NOT NULL DEFAULT 0, valor_total_cents integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pre_agendamento_itens_pre_idx ON pre_agendamento_itens (pre_agendamento_id);
CREATE INDEX IF NOT EXISTS pre_agendamento_itens_ref_idx ON pre_agendamento_itens (tenant_id, referencia_id);
CREATE TABLE IF NOT EXISTS pre_agendamento_ajustes (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id varchar NOT NULL,
  pre_agendamento_id varchar NOT NULL, tipo varchar(20) NOT NULL, descricao varchar(255) NOT NULL,
  valor_cents integer NOT NULL, origem varchar(20) NOT NULL DEFAULT 'manual',
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pre_agendamento_ajustes_pre_idx ON pre_agendamento_ajustes (pre_agendamento_id);
CREATE INDEX IF NOT EXISTS pre_agendamento_ajustes_tenant_idx ON pre_agendamento_ajustes (tenant_id);