-- =====================================================
-- MIRAGE — Correção das Políticas RLS de Multitenancy
-- Executar no Supabase SQL Editor
-- =====================================================

-- Remove políticas antigas conflitantes e recria corretamente

-- Função robusta para buscar tenants do usuário atual
create or replace function public.user_tenant_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select tenant_id
  from public.tenant_users
  where user_id = auth.uid()
$$;

-- =====================================================
-- Dropar e recriar todas as políticas das tabelas do hub
-- =====================================================

-- TENANTS
drop policy if exists "tenants_user_read" on public.tenants;
create policy "tenants_user_read" on public.tenants
  for select using (
    id in (select public.user_tenant_ids())
    or auth.uid() = owner_id
  );

drop policy if exists "tenants_owner_update" on public.tenants;
create policy "tenants_owner_update" on public.tenants
  for update using (
    id in (select public.user_tenant_ids())
  );

-- APPS (leitura pública)
drop policy if exists "apps_public_read" on public.apps;
create policy "apps_public_read" on public.apps
  for select using (true);

-- TENANT_APPS
drop policy if exists "tenant_apps_user_read" on public.tenant_apps;
create policy "tenant_apps_user_read" on public.tenant_apps
  for select using (
    tenant_id in (select public.user_tenant_ids())
  );

-- TENANT_USERS
drop policy if exists "tenant_users_read" on public.tenant_users;
create policy "tenant_users_read" on public.tenant_users
  for select using (
    tenant_id in (select public.user_tenant_ids())
  );

-- =====================================================
-- Recriar políticas das tabelas do Kanban
-- (remover duplicatas e padronizar)
-- =====================================================

do $$ declare t text; begin
  foreach t in array array[
    'cores','grades','familias_produto','fornecedores','clientes',
    'referencias','imagens_referencia','movimentacoes','corte_detalhes',
    'contas_a_pagar','pedidos','itens_pedido','itens_pedido_cores',
    'estoque','estoque_detalhes','contas_a_receber',
    'listas_customizadas','auditoria_quantidade_cortada'
  ] loop
    -- Remove políticas antigas
    execute format('drop policy if exists %I on public.%I', t||'_tenant_read', t);
    execute format('drop policy if exists %I on public.%I', t||'_tenant_write', t);

    -- Política de leitura: só vê dados do próprio tenant
    execute format(
      'create policy %I on public.%I for select using (tenant_id in (select public.user_tenant_ids()))',
      t||'_read', t
    );

    -- Política de escrita: só insere/atualiza/deleta no próprio tenant
    execute format(
      'create policy %I on public.%I for insert with check (tenant_id in (select public.user_tenant_ids()))',
      t||'_insert', t
    );
    execute format(
      'create policy %I on public.%I for update using (tenant_id in (select public.user_tenant_ids()))',
      t||'_update', t
    );
    execute format(
      'create policy %I on public.%I for delete using (tenant_id in (select public.user_tenant_ids()))',
      t||'_delete', t
    );
  end loop;
end $$;

-- =====================================================
-- Recriar políticas das tabelas do Orçamento
-- =====================================================

do $$ declare t text; begin
  foreach t in array array[
    'fichas_custo','observacoes_predefinidas','orcamentos','itens_orcamento'
  ] loop
    execute format('drop policy if exists %I on public.%I', t||'_tenant_read', t);
    execute format('drop policy if exists %I on public.%I', t||'_tenant_write', t);

    execute format(
      'create policy %I on public.%I for select using (tenant_id in (select public.user_tenant_ids()))',
      t||'_read', t
    );
    execute format(
      'create policy %I on public.%I for insert with check (tenant_id in (select public.user_tenant_ids()))',
      t||'_insert', t
    );
    execute format(
      'create policy %I on public.%I for update using (tenant_id in (select public.user_tenant_ids()))',
      t||'_update', t
    );
    execute format(
      'create policy %I on public.%I for delete using (tenant_id in (select public.user_tenant_ids()))',
      t||'_delete', t
    );
  end loop;
end $$;
