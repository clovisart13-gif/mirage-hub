# Módulo 8 — Status Geral do Hub

**Última atualização:** Julho 2026 (auditoria com Clóvis)

---

## Status por módulo

| Módulo | Status | Observação |
|---|---|---|
| Kanban Operacional | 🟢 Funcionando | Dados reais em produção |
| PLM | 🟡 Implantação | Dados sendo inseridos agora |
| Financeiro (Hub) | 🔴 Em construção | OFX importado mas não usado para gestão |
| CRM / Funil | 🟢 Funcionando | Funil ativo, Helena integrada |
| Marketing / Growth | 🟡 Parcial | Publicação Meta/Instagram ativa; Growth em construção |
| Banco de Parceiros | 🟡 Parcial | Tem dados, sem trabalho sistemático |
| Cotações / Orçamento | 🟢 Funcionando | — |
| Comunidade | 🟡 Parcial | Em desenvolvimento |
| ATHOS | 🟢 Funcionando | Acesso somente admin Mirage |
| VhSys | 🟢 Funcionando | Exportação manual de pedidos/estoque |
| Financeiro VhSys | 🟢 Funcionando | Notas fiscais (externo ao Hub) |

---

## Top 3 problemas que travam o dia (R2PB)

1. **Atendimento** — número Z-API sem fluxo, leads sem resposta
2. **Marketing** — Growth e Máquina de Vendas em construção
3. **Vendas** — pipeline com gaps no fluxo automático

---

## Prioridade #1 para agosto

> 🎯 **Comunidade para o Hub Mirage**

A comunidade é o módulo que conecta todos os outros: usa leads de clientes, leads de parceiros, e serve de base para o produto que será vendido para tenants.

---

## Arquitetura multi-tenant — regras de acesso

| Módulo | Quem acessa |
|---|---|
| Kanban | Tenant individual (R2PB hoje) |
| PLM | Tenant individual (R2PB hoje) |
| Financeiro Hub | Tenant individual |
| CRM / Funil | Tenant individual |
| Marketing / Growth | **Somente admin Mirage** |
| Máquina de Vendas | **Somente admin Mirage** |
| Banco de Parceiros | Tenants com módulo CRM |
| ATHOS | **Somente admin Mirage (Clóvis)** |

---

## Módulo ATHOS — Rotas e Componentes

**Arquivos:** `routes/mentor/index.ts`, `routes/athos-memory/index.ts`, `routes/atos/index.ts`, `routes/internal/agent-handoffs.ts`

| Método | Endpoint | Função |
|---|---|---|
| GET | `/api/mentor/snapshot` | Snapshot do estado atual do Hub |
| POST | `/api/mentor/config` | Configurar mentor |
| POST | `/api/mentor/transcribe` | Transcrever áudio |
| GET | `/api/athos-memory/context/:slug` | Contexto de memória por domínio |
| POST | `/api/atos/dispatch` | Despachar tarefa para ATOS |
| GET | `/api/atos/tasks` | Listar tarefas ATOS |
| GET | `/api/atos/status` | Status do executor |
| POST | `/api/internal/agent-handoffs` | Criar handoff de agente |
| GET | `/api/internal/agent-handoffs/:id` | Detalhe do handoff |
| POST | `/api/internal/agent-handoffs/:id/claim` | Assumir handoff |

**Páginas:** `artifacts/hub/src/pages/`
- `mentor.tsx` — Interface do ATHOS
- `athos-memory.tsx` — Visualização de memória
- `agent-handoffs.tsx` — Gestão de handoffs
- `atos.tsx` — Painel ATOS

**Componentes:**
- `artifacts/hub/src/components/AthosChatWidget.tsx` — Widget de chat do ATHOS

**Dependências:**
- GPTMaker (proxy do agente)
- OpenAI (LLM)
- n8n (execução de automações)
- Supabase (queries diretas)
- Schema `athos_memory.ts`, `agent_handoffs.ts`, `atos.ts`, `mentor.ts`

---

## Problemas estruturais conhecidos

1. **`plm_clientes/fornecedores` duplicados** — devem ser unificados com os do Kanban
2. **`plm_produtos` e `referencias`** — mesma entidade, precisam de padronização
3. **`leadsEspelho`** — propósito desconhecido, precisa de investigação
4. **Automação Kanban → PLM** — produto aprovado não cria automaticamente entrada no PLM
5. **Número Z-API sem fluxo** — leads sem atendimento
6. **Supabase** — não está claro se dados de tenants estão lá ou só auth

---

## Fluxo central do produto (R2PB)

```
Lead entra (WhatsApp / Landing Page)
    └─► Helena (CRM) — nutrição e qualificação
          ├─► Potencial cliente → comercialLeads → Pipeline
          │         └─► Cotação/Orçamento → aprovado
          │                   └─► Kanban (gera pedido)
          │                         └─► PLM (produto criado)
          │                               └─► VhSys (exportado)
          └─► Potencial parceiro → parceiros_leads
                    └─► Banco de Parceiros → Comunidade
```
