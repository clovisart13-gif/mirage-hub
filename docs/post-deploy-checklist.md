# Checklist Mínimo Pós-Deploy — Mirage Hub

> Usar após cada deploy em produção. Marcar cada item antes de considerar o deploy aprovado.

---

## 1. Infraestrutura

- [ ] API Server respondendo: `GET /api/healthz` retorna `{ status: "ok" }`
- [ ] Banco local acessível (resposta rápida no health)
- [ ] Supabase acessível (sem erro no log de startup do servidor)
- [ ] Logs do servidor sem erros críticos nos primeiros 2 minutos

---

## 2. Autenticação

- [ ] Login funciona: `POST /api/auth/login` com credenciais válidas retorna sessão
- [ ] Sessão persiste: rota protegida retorna 200 (não 401) após login
- [ ] Logout funciona e invalida sessão

---

## 3. Dashboard / Kanban

- [ ] `/kanban/dashboard` retorna `{ referencias, financeiro }` sem erro
- [ ] Board carrega referências agrupadas por `fase_atual`
- [ ] Filtros de fase funcionam (ex: `?fase=corte`)

---

## 4. Tenants / Admin

- [ ] `GET /billing/admin/assinaturas` retorna lista de empresas com `email` preenchido
- [ ] Admin frontend (`/hub/admin`) exibe empresas sem lista vazia
- [ ] `GET /billing/admin/lembretes` retorna grupos de vencimento

---

## 5. Relatórios

- [ ] `GET /relatorios/resumo` retorna KPIs sem erro
- [ ] `GET /relatorios/kanban-fases` retorna distribuição de fases
- [ ] Exportação Excel funciona (aba de BI de vendas)

---

## 6. Billing

- [ ] `GET /billing/assinatura` retorna plano e status para um tenant ativo
- [ ] Webhook Asaas responde com 200 para token válido (não 401)

---

## 7. PLM

- [ ] `GET /plm/dashboard/kanban` retorna dados do PLM
- [ ] Listagem de produtos (`GET /plm/produtos`) retorna sem erro

---

## 8. Integrações

- [ ] VhSys: logs de startup sem erro de token
- [ ] CRM Helena: fila de provisionamento acessível (`GET /billing/admin/provisioning`)
- [ ] ATHOS_MENTOR: `GET /api/mentor/history` retorna 200 para super admin

---

## 9. Eventos Operacionais (novo)

- [ ] `GET /admin/operational-events` retorna lista (pode estar vazia — ok)
- [ ] Nenhum evento com `severity = "critical"` não resolvido

---

## Procedimento em caso de falha

1. Verificar logs do servidor (`artifacts/api-server` workflow)
2. Verificar `GET /admin/operational-events?severity=critical`
3. Se banco: verificar conexão `DATABASE_URL`
4. Se Supabase: verificar `SUPABASE_SERVICE_ROLE_KEY`
5. Rollback se mais de 2 itens críticos falharem
