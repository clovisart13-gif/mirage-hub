# Módulo 7 — Integrações Externas

---

## VhSys (ERP)

**Tipo:** White-label Mirage (produto revendido)  
**Arquivos:** `artifacts/api-server/src/lib/vhsys.ts`, `routes/webhooks-vhsys.ts`

### O que está integrado hoje
- **Exportação de pedidos:** Kanban → VhSys (botão manual)
- **Exportação de estoque:** Kanban → VhSys (botão manual)

### Status
- A funcionalidade existe mas os campos integrados precisam de melhorias
- A direção é Kanban → VhSys para a R2PB
- Para outros tenants pode ser VhSys → Kanban (parametrizável no futuro)

### Lógica de SKU — regra crítica
- No Hub (Kanban/PLM): **referência = produto** (com variações de cor/tamanho)
- No VhSys: **cada SKU é individual** (cor diferente = código diferente)
- Nunca aplicar a lógica de SKU do VhSys dentro do Hub

---

## Helena (CRM WhatsApp)

**Tipo:** White-label Mirage (produto revendido)  
**Arquivos:** `artifacts/api-server/src/jobs/helenaWebhookMonitor.ts`, `lib/db/src/schema/helena.ts`

### O que faz
- CRM externo com robô + IA para atendimento no WhatsApp
- Ponto de entrada de todos os leads que chegam via WhatsApp
- Realiza nutrição e campanhas
- Leads aprovados são enviados para o pipeline do Hub

### Regra
- Todos os leads WhatsApp devem passar pela Helena primeiro
- Não criar fluxo que bypasse a Helena para captura de leads

---

## Z-API (WhatsApp Gateway)

**Arquivos:** `routes/internal/zapi-webhook.ts`, `zapi-capture.ts`

### Fluxos ativos hoje
- **Número API oficial:** robô de boas-vindas com blocos de qualificação (via n8n)
- **Número Z-API:** ⚠️ SEM fluxo — depende de atendimento humano

### Problema crítico
- Leads que entram pelo número Z-API ficam sem atendimento quando não há resposta humana
- Meta bloqueou temporariamente o Z-API — Máquina de Vendas pausada por isso
- Novos fluxos via Z-API estão suspensos até resolução do bloqueio

---

## n8n (Orquestração de Fluxos)

**Arquivo:** `artifacts/api-server/src/jobs/n8nHealthMonitor.ts`

### Fluxos ativos
- **Boas-vindas (API oficial):** ativo e funcionando

### Situação
- Número Z-API não tem fluxo n8n — atendimento manual apenas
- ATHOS tem acesso ao n8n via tools no bridge

---

## Supabase (Auth e Storage)

**Arquivo:** `artifacts/api-server/src/lib/supabase.ts`

### Uso atual
- Autenticação (login/sessão)
- Possível armazenamento de dados de tenants (a confirmar — Clóvis não tem certeza)

> ⚠️ Investigar código para confirmar se dados de tenants estão no Supabase ou apenas no PostgreSQL local.

---

## Meta / Instagram

### Status
- ✅ Publicação direta no Instagram e Meta funcionando
- Integrada ao módulo de Marketing

---

## Resumo de status das integrações

| Integração | Status | Direção |
|---|---|---|
| VhSys | 🟡 Funcional, precisa melhorias | Kanban → VhSys |
| Helena | 🟢 Funcionando | WhatsApp → Helena → Hub |
| Z-API (API oficial) | 🟢 Funcionando | n8n → WhatsApp |
| Z-API (número alternativo) | 🔴 Sem fluxo | Manual apenas |
| n8n | 🟢 Fluxo boas-vindas ativo | n8n → Z-API → WhatsApp |
| Supabase | 🟢 Auth funcionando | — |
| Meta / Instagram | 🟢 Publicação funcionando | Hub → Meta |
