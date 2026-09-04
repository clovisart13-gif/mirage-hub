# Módulo 3 — CRM / Funil Comercial

**Status:** 🟢 Funil ativo | Helena em produção  
**Arquivos de schema:** `lib/db/src/schema/comercial_pipeline.ts`, `leads_espelho.ts`, `lead_journey.ts`  
**Rotas:** `artifacts/api-server/src/routes/crm/`, `internal/leads.ts`, `internal/lead-classify.ts`  
**Páginas:** `crm.tsx`, `funil-leads.tsx`, `automacao-comercial.tsx`

---

## O que é

Gerencia a captação, classificação e progressão de leads. É o ponto de entrada de todos os contatos externos (clientes potenciais e parceiros de produção). Integrado com a Helena (CRM white-label externo) para atendimento via WhatsApp.

---

## A Helena

- **O que é:** CRM externo, produto **white-label** integrado ao Hub Mirage
- **Função:** Atendimento via robô + IA no WhatsApp; armazena e nutre leads
- **Todos os leads que entram por WhatsApp** (API oficial ou Z-API) ficam primariamente na Helena para nutrição e campanhas
- Os leads aprovados pela equipe comercial saem da Helena e entram no pipeline do Hub

---

## Tabelas de leads — mapa

| Tabela | O que é |
|---|---|
| `comercialLeads` | Potenciais clientes em pipeline de vendas (aprovados pela equipe comercial) |
| `mira_leads` | Leads que entram pela IA da Hub Mirage (chatbot/fluxo interno) |
| `parceiros_leads` | Fornecedores/parceiros de produção captados pelo robô CRM |
| `leadsEspelho` | **Desconhecido** — precisa de investigação de código para entender a origem |

> ⚠️ `leadsEspelho` precisa ser investigado — Clóvis não sabe o que é. Não usar esta tabela sem entender o propósito.

---

## Fluxo de um lead

```
Lead entra (landing page / site / WhatsApp)
    └─► Vai para Helena (CRM) — nutrição e campanhas
          └─► Robô/IA classifica:
                ├─► Potencial CLIENTE → vai para pipeline comercial (comercialLeads)
                │         └─► Aprovado → Orçamento → PLM → Kanban → VhSys
                └─► Potencial PARCEIRO (oficina, estamparia, etc)
                          └─► Formulário de classificação → parceiros_leads → Banco de Parceiros
```

---

## Classificação de leads — regra importante

Um lead que **não tem fit como cliente** não é descartado — pode ter fit para a **comunidade** ou para o **Banco de Parceiros**.

O CRM tem papel duplo:
1. Filtro comercial (cliente potencial ou não)
2. Alimentador da comunidade/rede de parceiros

---

## Integrações ativas

- **Helena:** todos os leads WhatsApp passam pela Helena primeiro
- **Z-API:** robô de boas-vindas no número de API oficial com blocos de perguntas para qualificação
- **n8n:** fluxo de boas-vindas ativo (API oficial)

> ⚠️ O número Z-API (não-API oficial) NÃO tem fluxo ativo — depende de atendimento humano. Leads que entram por esse número ficam sem atendimento se não houver resposta manual.

---

## Máquina de Vendas (`maquina-vendas.tsx`)

- **Status:** 🔴 Pausado
- **Motivo:** Meta bloqueou Z-API temporariamente
- **Propósito original:** multiagentes para atendimento, filtragem e nutrição — complementar ao CRM (não concorrente)
- **Regra:** a Máquina de Vendas deve fazer o que o CRM **não faz**, não duplicar funcionalidades

---

## Rotas de API

**Arquivos:** `routes/crm/index.ts`, `routes/internal/leads.ts`, `routes/internal/crm.ts`

| Método | Endpoint | Função |
|---|---|---|
| GET | `/api/crm/contatos` | Listar contatos comerciais |
| POST | `/api/crm/contatos` | Criar contato |
| POST | `/api/crm/agendamento` | Registrar agendamento |
| POST | `/api/crm/human-control` | Ativar controle humano |
| POST | `/api/crm/diagnostico/enviar` | Enviar diagnóstico |
| POST | `/api/internal/leads/mirror` | Espelhar lead da Helena |
| GET | `/api/internal/leads/by-email` | Buscar lead por e-mail |
| POST | `/api/internal/leads/mark-agendado` | Marcar lead como agendado |
| GET | `/api/internal/leads/pending-followup` | Leads aguardando follow-up |
| POST | `/api/internal/leads/mark-followup-sent` | Marcar follow-up enviado |
| GET | `/api/internal/lead-conversation-state` | Estado da conversa |
| POST | `/api/internal/leads/set-human-control` | Passar para atendimento humano |
| POST | `/api/internal/leads/clear-human-control` | Liberar de atendimento humano |
| POST | `/api/internal/crm/meeting-booked` | Confirmar reunião agendada |

---

## Componentes Frontend

**Páginas:** `artifacts/hub/src/pages/`
- `crm.tsx` — Dashboard CRM principal
- `funil-leads.tsx` — Funil de vendas
- `automacao-comercial.tsx` — Configuração de automação
- `contatos-comerciais.tsx` — Lista de contatos

---

## Dependências

**Este módulo usa:**
- Helena CRM (todos os leads WhatsApp passam por ela)
- Z-API (comunicação WhatsApp)
- n8n (fluxos de automação)
- Schema `comercial_pipeline.ts`, `lead_journey.ts`

**Outros módulos que dependem do CRM:**
- Cotações (leads aprovados viram orçamentos)
- Banco de Parceiros (leads não-clientes viram parceiros)
- Comunidade (leads de parceiros alimentam a comunidade)

---

## O que NÃO fazer neste módulo

- Não usar `leadsEspelho` sem investigar o que é
- Não criar novo fluxo de captura que bypasse a Helena — todos os leads WhatsApp devem passar por ela primeiro
- Não confundir leads clientes (`comercialLeads`) com leads parceiros (`parceiros_leads`)
