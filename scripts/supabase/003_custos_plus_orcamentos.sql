-- =====================================================
-- MIRAGE — Custos Plus (Gerador de Orçamento)
-- Executar no Supabase SQL Editor APÓS o script 002
-- =====================================================

-- FICHAS DE CUSTO (fichas técnicas por produto)
create table if not exists public.fichas_custo (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  referencia text not null,          -- código do produto
  tipo text,                         -- ex: camiseta, calça, vestido
  familia text,                      -- família do produto
  cliente_id uuid references public.clientes(id) on delete set null,
  foto_url text,                     -- URL S3 da foto do produto
  observacoes text,

  -- Custos de mão-de-obra (8 fases de dificuldade)
  mao_obra_fase1 numeric(10,2) default 0,  -- Corte
  mao_obra_fase2 numeric(10,2) default 0,  -- Costura simples
  mao_obra_fase3 numeric(10,2) default 0,  -- Costura média
  mao_obra_fase4 numeric(10,2) default 0,  -- Costura complexa
  mao_obra_fase5 numeric(10,2) default 0,  -- Acabamento
  mao_obra_fase6 numeric(10,2) default 0,  -- Bordado/estampa
  mao_obra_fase7 numeric(10,2) default 0,  -- Lavanderia
  mao_obra_fase8 numeric(10,2) default 0,  -- Outros

  -- Custos de matéria-prima
  custo_tecido numeric(10,2) default 0,
  custo_aviamento numeric(10,2) default 0,

  -- Custo total calculado
  custo_total numeric(10,2) generated always as (
    mao_obra_fase1 + mao_obra_fase2 + mao_obra_fase3 + mao_obra_fase4 +
    mao_obra_fase5 + mao_obra_fase6 + mao_obra_fase7 + mao_obra_fase8 +
    custo_tecido + custo_aviamento
  ) stored,

  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- OBSERVAÇÕES PRÉ-DEFINIDAS
create table if not exists public.observacoes_predefinidas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  titulo text not null,
  conteudo text not null,
  categoria text default 'geral' check (categoria in (
    'geral','prazo','frete','pagamento','garantia','outros'
  )),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ORÇAMENTOS
create table if not exists public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  numero text not null,
  cliente_id uuid references public.clientes(id) on delete set null,
  data_emissao date not null default current_date,
  validade date,
  observacoes text,

  -- Desconto
  desconto_tipo text default 'percentual' check (desconto_tipo in ('percentual','valor')),
  desconto_valor numeric(10,2) default 0,

  -- Totais (calculados)
  subtotal numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,

  -- Condições de pagamento
  condicao_sinal numeric(10,2) default 0,       -- 50% do total
  condicao_retira numeric(10,2) default 0,      -- 50% do total
  condicao_prazo_dias integer default 30,
  condicao_prazo_valor numeric(10,2) default 0, -- Total com juros (configurável)

  status text not null default 'rascunho' check (status in (
    'rascunho','enviado','aprovado','recusado','cancelado'
  )),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, numero)
);

-- ITENS DO ORÇAMENTO
create table if not exists public.itens_orcamento (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  orcamento_id uuid not null references public.orcamentos(id) on delete cascade,
  ficha_id uuid references public.fichas_custo(id) on delete set null,
  referencia text not null,
  descricao text,
  quantidade integer not null default 1,
  valor_unitario numeric(10,2) not null default 0,
  total numeric(10,2) generated always as (quantidade * valor_unitario) stored,
  created_at timestamptz not null default now()
);

-- =====================================================
-- TRIGGERS
-- =====================================================

create trigger fichas_custo_updated_at before update on public.fichas_custo
  for each row execute function public.handle_updated_at();

create trigger orcamentos_updated_at before update on public.orcamentos
  for each row execute function public.handle_updated_at();

create trigger observacoes_predefinidas_updated_at before update on public.observacoes_predefinidas
  for each row execute function public.handle_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

alter table public.fichas_custo enable row level security;
alter table public.observacoes_predefinidas enable row level security;
alter table public.orcamentos enable row level security;
alter table public.itens_orcamento enable row level security;

do $$ declare t text; begin
  foreach t in array array[
    'fichas_custo','observacoes_predefinidas','orcamentos','itens_orcamento'
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
-- SEED: Observações pré-definidas padrão
-- (serão inseridas na primeira vez que um tenant usar o app)
-- =====================================================

-- Exemplo para R2PB — adaptar conforme necessário
-- insert into public.observacoes_predefinidas (tenant_id, titulo, conteudo, categoria)
-- values
--   ('UUID_R2PB', 'Frete por conta do comprador', 'Frete e impostos por conta do comprador.', 'frete'),
--   ('UUID_R2PB', 'Validade 15 dias', 'Orçamento válido por 15 dias a partir da data de emissão.', 'prazo'),
--   ('UUID_R2PB', 'Pagamento 50/50', 'Sinal de 50% na aprovação. Restante na entrega.', 'pagamento');
