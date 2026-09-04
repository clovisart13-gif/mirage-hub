-- =====================================================
-- MIRAGE ECOSYSTEM — Schema de Multitenancy
-- Executar no Supabase SQL Editor
-- =====================================================

-- TENANTS (empresas clientes da Mirage)
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan text not null default 'free' check (plan in ('free', 'starter', 'pro', 'enterprise')),
  owner_id uuid references auth.users(id) on delete set null,
  logo_url text,
  primary_color text default '#7C3AED',
  secondary_color text default '#4F46E5',
  domain text unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- APPS (os 5 apps do ecossistema Mirage)
create table if not exists public.apps (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  icon text,
  category text,
  subdomain text,
  plans text[] default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- TENANT_APPS (quais apps cada tenant tem acesso)
create table if not exists public.tenant_apps (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  app_key text not null references public.apps(key) on delete cascade,
  active boolean not null default true,
  activated_at timestamptz default now(),
  settings jsonb default '{}',
  unique(tenant_id, app_key)
);

-- TENANT_USERS (usuários por tenant com papéis)
create table if not exists public.tenant_users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'viewer')),
  joined_at timestamptz not null default now(),
  unique(tenant_id, user_id)
);

-- =====================================================
-- SEED: Inserir os 5 apps do ecossistema Mirage
-- =====================================================

insert into public.apps (key, name, description, icon, category, subdomain, plans) values
  ('helena_crm',  'Helena CRM',          'Gestão de clientes e relacionamentos',               'users',            'crm',         'crm',       array['starter','pro','enterprise']),
  ('vhsys_erp',   'ERP Contábil',        'Emissão de notas, financeiro e contabilidade',       'file-text',        'erp',         'erp',       array['pro','enterprise']),
  ('comunidade',  'Comunidade Vestuário', 'Rede da indústria do vestuário',                    'users-round',      'community',   'comunidade',array['starter','pro','enterprise']),
  ('orcamento',   'Gerador de Orçamento', 'Criação e gestão de orçamentos para confecções',    'calculator',       'productivity','orcamento', array['starter','pro','enterprise']),
  ('kanban',      'Kanban',              'Gestão visual de projetos e produção',               'layout-dashboard', 'productivity','kanban',    array['starter','pro','enterprise'])
on conflict (key) do nothing;

-- =====================================================
-- SEED: Criar tenant da R2PB (cliente piloto)
-- =====================================================

-- ATENÇÃO: Substitua 'SEU_USER_ID_AQUI' pelo ID do seu usuário no Supabase Auth
-- insert into public.tenants (name, slug, plan, owner_id, primary_color, secondary_color)
-- values ('R2PB', 'r2pb', 'enterprise', 'SEU_USER_ID_AQUI', '#7C3AED', '#4F46E5');

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

alter table public.tenants enable row level security;
alter table public.apps enable row level security;
alter table public.tenant_apps enable row level security;
alter table public.tenant_users enable row level security;

-- Apps são públicos (leitura)
create policy "apps_public_read" on public.apps
  for select using (true);

-- Tenants: owner e admins podem ler
create policy "tenants_user_read" on public.tenants
  for select using (
    auth.uid() = owner_id
    or exists (
      select 1 from public.tenant_users
      where tenant_id = tenants.id and user_id = auth.uid()
    )
  );

-- Service role bypassa RLS automaticamente
-- Tenant_apps: usuários do tenant podem ler
create policy "tenant_apps_user_read" on public.tenant_apps
  for select using (
    exists (
      select 1 from public.tenant_users
      where tenant_id = tenant_apps.tenant_id and user_id = auth.uid()
    )
  );

-- Tenant_users: membros podem ver outros membros do mesmo tenant
create policy "tenant_users_read" on public.tenant_users
  for select using (
    exists (
      select 1 from public.tenant_users tu2
      where tu2.tenant_id = tenant_users.tenant_id and tu2.user_id = auth.uid()
    )
  );

-- =====================================================
-- FUNÇÃO: updated_at automático
-- =====================================================

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tenants_updated_at
  before update on public.tenants
  for each row execute function public.handle_updated_at();
