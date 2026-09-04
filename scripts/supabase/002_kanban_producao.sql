-- =====================================================
-- MIRAGE — Kanban de Produção R2PB
-- Executar no Supabase SQL Editor APÓS o script 001
-- =====================================================

-- FASES DO KANBAN (referência)
-- Início → Espera → Modelagem → Tecido → Risco → Corte →
-- Beneficiamento → Costura → Lavanderia → Acabamento →
-- Passadoria → Expedição → Faturamento → Concluído

-- CORES
create table if not exists public.cores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nome text not null,
  hex text,
  created_at timestamptz not null default now(),
  unique(tenant_id, nome)
);

-- GRADES DE TAMANHO
create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nome text not null,        -- ex: "PP/P/M/G/GG", "36/38/40/42"
  tamanhos text[] not null,  -- ex: ['PP','P','M','G','GG']
  created_at timestamptz not null default now(),
  unique(tenant_id, nome)
);

-- FAMÍLIAS DE PRODUTO
create table if not exists public.familias_produto (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nome text not null,
  descricao text,
  created_at timestamptz not null default now()
);

-- FORNECEDORES
create table if not exists public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nome text not null,
  cnpj text,
  pix text,
  telefone text,
  email text,
  endereco text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- CLIENTES
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nome text not null,
  cnpj text,
  email text,
  telefone text,
  endereco text,
  cidade text,
  estado text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- REFERÊNCIAS (OPs — Cards do Kanban)
create table if not exists public.referencias (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  codigo text not null,                -- código da referência/OP
  descricao text,
  cliente_id uuid references public.clientes(id) on delete set null,
  familia_id uuid references public.familias_produto(id) on delete set null,
  fase_atual text not null default 'inicio' check (fase_atual in (
    'inicio','espera','modelagem','tecido','risco','corte',
    'beneficiamento','costura','lavanderia','acabamento',
    'passadoria','expedicao','faturamento','concluido'
  )),
  quantidade_total integer not null default 0,
  quantidade_cortada integer default 0,
  valor_venda numeric(10,2),
  data_entrada date,
  data_prevista_entrega date,
  observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, codigo)
);

-- IMAGENS DE REFERÊNCIA
create table if not exists public.imagens_referencia (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  referencia_id uuid not null references public.referencias(id) on delete cascade,
  url text not null,
  nome text,
  principal boolean not null default false,
  created_at timestamptz not null default now()
);

-- MOVIMENTAÇÕES (histórico de transições entre fases)
create table if not exists public.movimentacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  referencia_id uuid not null references public.referencias(id) on delete cascade,
  fase_origem text not null,
  fase_destino text not null,
  user_id uuid references auth.users(id) on delete set null,
  fornecedor_id uuid references public.fornecedores(id) on delete set null,
  cmo numeric(10,2),                     -- custo de mão de obra
  data_prevista date,
  data_real date,
  quantidade integer,
  quantidade_conferida integer,
  observacao text,
  created_at timestamptz not null default now()
);

-- CORTE DETALHES (quantidades por fase de corte)
create table if not exists public.corte_detalhes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  referencia_id uuid not null references public.referencias(id) on delete cascade,
  cor_id uuid references public.cores(id) on delete set null,
  grade_id uuid references public.grades(id) on delete set null,
  quantidade_planejada integer not null default 0,
  quantidade_cortada integer not null default 0,
  created_at timestamptz not null default now()
);

-- CONTAS A PAGAR (geradas automaticamente por fase produtiva)
create table if not exists public.contas_a_pagar (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  referencia_id uuid references public.referencias(id) on delete set null,
  fornecedor_id uuid references public.fornecedores(id) on delete set null,
  fase text not null,
  descricao text,
  valor numeric(10,2) not null,
  data_vencimento date,
  data_pagamento date,
  status text not null default 'a_pagar' check (status in ('a_pagar','pago','cancelado')),
  cnpj_fornecedor text,
  pix_fornecedor text,
  exportado_bling boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- PEDIDOS DE VENDA
create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  numero text not null,
  cliente_id uuid references public.clientes(id) on delete set null,
  data_pedido date,
  data_entrega_prevista date,
  status text not null default 'aberto' check (status in ('aberto','em_producao','faturado','cancelado')),
  valor_total numeric(10,2),
  origem text default 'manual' check (origem in ('manual','bling','excel')),
  bling_id text,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, numero)
);

-- ITENS DO PEDIDO
create table if not exists public.itens_pedido (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  referencia_id uuid references public.referencias(id) on delete set null,
  codigo_referencia text not null,
  descricao text,
  quantidade integer not null default 0,
  valor_unitario numeric(10,2),
  valor_total numeric(10,2),
  created_at timestamptz not null default now()
);

-- CORES POR ITEM DO PEDIDO
create table if not exists public.itens_pedido_cores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  item_pedido_id uuid not null references public.itens_pedido(id) on delete cascade,
  cor_id uuid references public.cores(id) on delete set null,
  cor_nome text not null,
  grade_id uuid references public.grades(id) on delete set null,
  quantidade integer not null default 0
);

-- ESTOQUE
create table if not exists public.estoque (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  referencia_id uuid not null references public.referencias(id) on delete cascade,
  quantidade_total integer not null default 0,
  atualizado_em timestamptz not null default now(),
  unique(tenant_id, referencia_id)
);

-- ESTOQUE DETALHES (por cor e grade)
create table if not exists public.estoque_detalhes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  estoque_id uuid not null references public.estoque(id) on delete cascade,
  cor_id uuid references public.cores(id) on delete set null,
  cor_nome text not null,
  grade_id uuid references public.grades(id) on delete set null,
  tamanho text,
  quantidade integer not null default 0
);

-- CONTAS A RECEBER
create table if not exists public.contas_a_receber (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  pedido_id uuid references public.pedidos(id) on delete set null,
  cliente_id uuid references public.clientes(id) on delete set null,
  descricao text,
  valor numeric(10,2) not null,
  data_vencimento date,
  data_recebimento date,
  status text not null default 'pendente' check (status in ('pendente','recebido','parcial','cancelado')),
  valor_recebido numeric(10,2) default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- LISTAS CUSTOMIZADAS
create table if not exists public.listas_customizadas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  nome text not null,
  filtros jsonb default '{}',
  created_at timestamptz not null default now()
);

-- AUDITORIA DE QUANTIDADES CORTADAS
create table if not exists public.auditoria_quantidade_cortada (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  referencia_id uuid not null references public.referencias(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  quantidade_anterior integer,
  quantidade_nova integer,
  motivo text,
  created_at timestamptz not null default now()
);

-- =====================================================
-- TRIGGERS: updated_at automático
-- =====================================================

create trigger fornecedores_updated_at before update on public.fornecedores
  for each row execute function public.handle_updated_at();

create trigger clientes_updated_at before update on public.clientes
  for each row execute function public.handle_updated_at();

create trigger referencias_updated_at before update on public.referencias
  for each row execute function public.handle_updated_at();

create trigger contas_a_pagar_updated_at before update on public.contas_a_pagar
  for each row execute function public.handle_updated_at();

create trigger pedidos_updated_at before update on public.pedidos
  for each row execute function public.handle_updated_at();

create trigger contas_a_receber_updated_at before update on public.contas_a_receber
  for each row execute function public.handle_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

alter table public.cores enable row level security;
alter table public.grades enable row level security;
alter table public.familias_produto enable row level security;
alter table public.fornecedores enable row level security;
alter table public.clientes enable row level security;
alter table public.referencias enable row level security;
alter table public.imagens_referencia enable row level security;
alter table public.movimentacoes enable row level security;
alter table public.corte_detalhes enable row level security;
alter table public.contas_a_pagar enable row level security;
alter table public.pedidos enable row level security;
alter table public.itens_pedido enable row level security;
alter table public.itens_pedido_cores enable row level security;
alter table public.estoque enable row level security;
alter table public.estoque_detalhes enable row level security;
alter table public.contas_a_receber enable row level security;
alter table public.listas_customizadas enable row level security;
alter table public.auditoria_quantidade_cortada enable row level security;

-- Política base: usuário só vê dados do seu tenant
create or replace function public.user_tenant_ids()
returns setof uuid language sql security definer as $$
  select tenant_id from public.tenant_users where user_id = auth.uid()
$$;

-- Aplicar política em todas as tabelas do Kanban
do $$ declare t text; begin
  foreach t in array array[
    'cores','grades','familias_produto','fornecedores','clientes',
    'referencias','imagens_referencia','movimentacoes','corte_detalhes',
    'contas_a_pagar','pedidos','itens_pedido','itens_pedido_cores',
    'estoque','estoque_detalhes','contas_a_receber',
    'listas_customizadas','auditoria_quantidade_cortada'
  ] loop
    execute format(
      'create policy %I_tenant_read on public.%I for select using (tenant_id in (select public.user_tenant_ids()))',
      t, t
    );
    execute format(
      'create policy %I_tenant_write on public.%I for all using (tenant_id in (select public.user_tenant_ids()))',
      t, t
    );
  end loop;
end $$;

-- =====================================================
-- SEED: Fases do Kanban (referência)
-- =====================================================

-- As fases são definidas por enum no campo fase_atual da tabela referencias
-- Ordem: inicio → espera → modelagem → tecido → risco → corte →
--        beneficiamento → costura → lavanderia → acabamento →
--        passadoria → expedicao → faturamento → concluido
