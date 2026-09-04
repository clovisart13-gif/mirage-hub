# Checklist de Confiabilidade — Mirage Hub

> Última revisão: 2026-05-14
> Legenda: ✅ OK | ⚠️ Atenção | ❌ Quebrado | — Não verificado

---

## 1. Kanban de Produção

| Item | Status | Observação |
|---|---|---|
| Tela carrega | ✅ OK | Board agrupa por `referencias.fase_atual` (14 fases) |
| Consulta principal (`/kanban/referencias`) | ✅ OK | Query Drizzle ORM via tabela `referencias` |
| Dashboard (`/kanban/dashboard`) | ✅ OK | Usa `referencias.fase_atual` + `contas_a_pagar` |
| Filtros por fase | ✅ OK | Parâmetro `fase` na query |
| Permissões (`requireAuth + requireTenantAccess`) | ✅ OK | Aplicado em todas as rotas |
| Erro tem fallback visual | ✅ OK | try/catch adicionado no dashboard |
| Integração externa | — | VhSys integrado em pedidos; não bloqueia o board |
| Sem campo inexistente | ✅ OK | `kanban_orders.fase` corrigido → `referencias.fase_atual` |

---

## 2. PLM (Product Lifecycle Management)

| Item | Status | Observação |
|---|---|---|
| Tela carrega | ✅ OK | 11 módulos no sidebar |
| Consulta principal | ✅ OK | 13 tabelas `plm_*` no banco local |
| Filtros | ✅ OK | Por tenant_id em todos os endpoints |
| Permissões | ✅ OK | `requireAuth + requireTenantAccess` |
| Erro com fallback | ⚠️ Atenção | Alguns endpoints PLM sem try/catch explícito — dependem do global error handler |
| Campo inexistente | ✅ OK | Schema PLM usa Drizzle — tipagem garante consistência |

---

## 3. Relatórios

| Item | Status | Observação |
|---|---|---|
| Tela carrega | ✅ OK | 6 abas |
| `/relatorios/resumo` | ✅ OK | try/catch adicionado |
| `/relatorios/kanban-fases` | ✅ OK | Usa `referencias.fase_atual` corretamente |
| `/relatorios/faturamento-mensal` | — | Sem try/catch explícito |
| Exportação Excel | ✅ OK | Biblioteca `xlsx` configurada |
| Filtros por período | ✅ OK | |
| Permissões | ✅ OK | `requireAuth + requireTenantAccess` |

---

## 4. Billing / Assinatura

| Item | Status | Observação |
|---|---|---|
| Tela carrega | ✅ OK | |
| `/billing/assinatura` | ✅ OK | Retorna plano + apps ativos |
| `/billing/admin/assinaturas` | ✅ OK | **CORRIGIDO** — `tenants.email` → `owner_id + auth API` |
| `/billing/admin/lembretes` | ✅ OK | **CORRIGIDO** — mesmo fix |
| Ativação de plano | ✅ OK | **CORRIGIDO** — `ativarPlano` usa `owner_id` agora |
| Webhook Asaas | ✅ OK | Verificação de token implementada |
| Permissões admin | ✅ OK | `requireSuperAdmin` em todas as rotas admin |

---

## 5. Tenants / Empresas

| Item | Status | Observação |
|---|---|---|
| Listagem admin carrega | ✅ OK | **CORRIGIDO** — erro `tenants.email` resolvido |
| Schema real confirmado | ✅ OK | Colunas: `id, name, slug, owner_id, plan, assinatura_status, assinatura_expira_em, ...` |
| Email do dono | ✅ OK | Resolvido via `supabaseAdmin.auth.admin.getUserById(owner_id)` |
| Retry automático no frontend | ✅ OK | admin.tsx re-tenta em 1.5s se lista vazia |
| Criação de tenant (trial) | ✅ OK | Gera slug único + ativa trial de 14 dias |

---

## 6. CRM Helena

| Item | Status | Observação |
|---|---|---|
| Status | ✅ Ativo (produção) | API mirage.wts.chat |
| Provisionamento | ⚠️ Manual | API interna não exposta — entra na fila `provisioning_queue` |
| Fila de provisionamento | ✅ OK | **CORRIGIDO** — `tenant_email` agora usa owner_id lookup |

---

## 7. ERP VhSys

| Item | Status | Observação |
|---|---|---|
| Status | ✅ Ativo (produção) | Token configurado via `VHSYS_ACCESS_TOKEN` |
| Criação de cliente | ✅ OK | **CORRIGIDO** — email do owner via auth API |
| Sincronização de pedidos | ✅ OK | Rota `POST /kanban/referencias/:id/faturar` |
| Token ausente | ⚠️ Atenção | Loga aviso, não falha — comportamento correto |

---

## Pontos de Atenção Gerais

| Área | Risco | Ação Recomendada |
|---|---|---|
| `catch {}` silencioso | ⚠️ | 14 ocorrências no billing — integrations externas isoladas; aceitável para fire-and-forget |
| Endpoints relatorios sem try/catch | ⚠️ | Global error handler captura — mas sem contexto de tenantId no log |
| PLM sem try/catch explícito | ⚠️ | Coberto pelo global handler — considerar adicionar na próxima sprint |
| Monitoramento ativo | ❌ | Sem alertas automáticos — base `operational_events` criada para rastrear |
| n8n | ⚠️ | Configurado; nenhum workflow validado de ponta a ponta |
