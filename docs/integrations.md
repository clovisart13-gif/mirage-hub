# Integrações Externas — Mirage Hub

> Atualizado em: Julho 2026  
> Antes de criar qualquer nova integração, verificar se já existe cliente/lib para o serviço.

---

## Mapa de integrações por criticidade

| Serviço | Criticidade | Propósito | Arquivo |
|---|---|---|---|
| **Neon PostgreSQL** | 🔴 Crítica | Banco de dados de produção | `DATABASE_URL` secret |
| **Replit Object Storage** | 🔴 Crítica | Assets de imagem e arquivos | `lib/object-storage-web` |
| **Google Gemini** | 🔴 Crítica | Geração de imagem e texto (marketing) | `lib/integrations-gemini-ai` |
| **OpenAI** | 🔴 Crítica | LLM para ATHOS e agentes | `lib/integrations-openai-ai-server` |
| **Helena CRM** | 🟠 Alta | CRM white-label + bot WhatsApp | `jobs/helenaWebhookMonitor.ts` |
| **VhSys ERP** | 🟠 Alta | ERP white-label + notas fiscais | `lib/vhsys.ts` |
| **ASAAS** | 🟠 Alta | Cobranças e assinaturas | `ASAAS_API_KEY` secret |
| **Z-API** | 🟠 Alta | Gateway WhatsApp | `routes/internal/zapi-*.ts` |
| **Meta / Instagram** | 🟠 Alta | Publicação de conteúdo | `routes/meta.ts` |
| **n8n** | 🟡 Média | Automações e webhooks | `jobs/n8nHealthMonitor.ts` |
| **GPTMaker** | 🟡 Média | Proxy do agente ATHOS | `gptmaker_api_token` secret |
| **HeyGen** | 🟡 Média | Geração de vídeos com avatar | `HEYGEN_API_KEY` secret |
| **FAL.ai** | 🟡 Média | Geração de imagens (Flux) | `FAL_KEY` secret |
| **Stripe** | 🟡 Média | Pagamentos internacionais | Configurado, não ativo |
| **Supabase** | 🟡 Média | Somente autenticação | `lib/supabase.ts` |

---

## Detalhamento por integração

---

### VhSys (ERP)
**Tipo:** White-label Mirage  
**Arquivo:** `artifacts/api-server/src/lib/vhsys.ts`  
**Webhook:** `routes/webhooks-vhsys.ts`  
**Secrets:** `VHSYS_ACCESS_TOKEN`, `VHSYS_SECRET_ACCESS_TOKEN`, `VHSYS_PARCEIROS_USER`, `VHSYS_PARCEIROS_PASS`

**O que está integrado:**
- Exportação de pedidos Kanban → VhSys (botão manual)
- Exportação de estoque Kanban → VhSys (botão manual)

**Regra crítica — SKU:**
- No Hub: referência = produto (variações são atributos)
- No VhSys: cada SKU é individual (cor/tamanho diferente = código diferente)
- Nunca aplicar lógica de SKU individual dentro do Hub

**Status:** Funcional mas precisa melhorar campos integrados.

---

### Helena (CRM WhatsApp)
**Tipo:** White-label Mirage  
**Arquivo:** `artifacts/api-server/src/jobs/helenaWebhookMonitor.ts`  
**Schema:** `lib/db/src/schema/helena.ts`  
**Secret:** `HELENA_API_TOKEN`

**O que faz:**
- CRM externo com robô + IA para WhatsApp
- Todos os leads WhatsApp passam pela Helena primeiro
- Nutre e classifica leads antes de enviá-los ao pipeline do Hub

**Regra:** Nunca criar fluxo de captura de leads que bypasse a Helena.

---

### Z-API (WhatsApp Gateway)
**Arquivos:** `routes/internal/zapi-webhook.ts`, `zapi-capture.ts`, `zapi-poll-state.ts`  
**Callback:** `routes/zapi-callback.ts`

**Números ativos:**
| Número | Status | Fluxo |
|---|---|---|
| API oficial | 🟢 Ativo | Robô de boas-vindas via n8n |
| Número alternativo | 🔴 Sem fluxo | Atendimento humano apenas |

**Status do bloqueio Meta:** Z-API bloqueado temporariamente pela Meta. Máquina de Vendas pausada.

**Regra:** Não criar novos fluxos dependentes do número alternativo até resolução.

> ⚠️ Z-API não aceita botões interativos em números não-oficiais. Usar apenas texto ou respostas manuais.

---

### n8n (Orquestração)
**Arquivo:** `jobs/n8nHealthMonitor.ts`  
**Secret:** via endpoint interno

**Fluxos ativos:**
- Boas-vindas (API oficial) — ativo

**Regra:** PUT em workflow do n8n exige sanitização de campos read-only antes da chamada. Ver `.agents/memory/n8n-workflow-update-sanitization.md`.

---

### Meta / Instagram
**Arquivo:** `routes/meta.ts`, `routes/internal/meta-send.ts`

**O que funciona:**
- Publicação direta no Instagram e Facebook
- Integrado ao módulo de Marketing

**Acesso:** Somente admin Mirage.

---

### Google Gemini
**Lib:** `lib/integrations-gemini-ai`  
**Secrets:** `AI_INTEGRATIONS_GEMINI_API_KEY`, `AI_INTEGRATIONS_GEMINI_BASE_URL`  
**Uso:** Geração de imagem e texto para marketing/growth

> ⚠️ `@google/genai` requer configuração de `external` no esbuild. Ver `.agents/memory/banana-provider.md`.

---

### OpenAI
**Lib:** `lib/integrations-openai-ai-server` (backend), `lib/integrations-openai-ai-react` (frontend)  
**Secrets:** `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`  
**Uso:** LLM para ATHOS, agentes e automações

---

### ASAAS (Cobranças)
**Secret:** `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`  
**Uso:** Cobranças de assinaturas dos tenants  
**Webhook:** configurado para receber eventos de pagamento

---

### Supabase (Autenticação)
**Arquivo:** `artifacts/api-server/src/lib/supabase.ts`  
**Secrets:** `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`

**Uso:** Somente autenticação (login, sessão, token)  
**NÃO armazena:** dados de negócio (pedidos, clientes, leads)  
**Dados de negócio ficam em:** PostgreSQL local (dev) e Neon (produção)

---

### HeyGen (Vídeos com Avatar)
**Secret:** `HEYGEN_API_KEY`

**Regra crítica:** A conta usa avatares do tipo **talking-photo** (não avatars padrão do catálogo). O payload da API difere entre os tipos. Ver `.agents/memory/heygen-provider.md`.

---

### GPTMaker (ATHOS)
**Secret:** `gptmaker_api_token`, `GPTMARKERZAPI`  
**Webhook:** `routes/internal/gptmaker-webhook.ts`

**Uso:** Proxy do agente ATHOS — recebe mensagens e as despacha para o bridge  
**Risco:** Ponto único de falha fora do controle da Mirage

---

### Replit Object Storage
**Lib:** `lib/object-storage-web`  
**Secrets:** `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS`

**Uso:** Assets de marketing gerados por IA, imagens de produtos, logos de tenants  
**Risco:** Sem CDN — assets servidos diretamente. Latência alta com volume.

---

## Variáveis de ambiente por integração

| Variável | Serviço | Obrigatória em prod |
|---|---|---|
| `DATABASE_URL` | Neon PostgreSQL | ✅ |
| `SESSION_SECRET` | Auth / Sessão | ✅ |
| `SUPABASE_URL` | Supabase | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | ✅ |
| `SUPABASE_ANON_KEY` | Supabase | ✅ |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | OpenAI | ✅ |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | OpenAI | ✅ |
| `AI_INTEGRATIONS_GEMINI_API_KEY` | Gemini | ✅ |
| `AI_INTEGRATIONS_GEMINI_BASE_URL` | Gemini | ✅ |
| `ASAAS_API_KEY` | ASAAS | ✅ |
| `ASAAS_WEBHOOK_TOKEN` | ASAAS | ✅ |
| `HELENA_API_TOKEN` | Helena | ✅ |
| `VHSYS_ACCESS_TOKEN` | VhSys | ✅ |
| `VHSYS_SECRET_ACCESS_TOKEN` | VhSys | ✅ |
| `HEYGEN_API_KEY` | HeyGen | ✅ |
| `FAL_KEY` | FAL.ai | ✅ |
| `gptmaker_api_token` | GPTMaker | ✅ |
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | Object Storage | ✅ |
