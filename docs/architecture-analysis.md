# Mirage Hub — Architecture Analysis

> Gerado em: 28 de julho de 2026  
> Finalidade: diagnóstico técnico independente da stack, complexidade e riscos antes do lançamento (agosto/2026)

---

## 1. Visão Geral

O Mirage Hub é um **ecossistema SaaS multi-tenant** para confecções brasileiras. Agrupa gestão operacional (ERP/PLM), CRM, marketing com IA, comunidade, banco de parceiros e um agente conversacional (ATHOS) em uma plataforma unificada.

### Artefatos registrados

| Artefato | Tipo | Tecnologia | Finalidade |
|---|---|---|---|
| `api-server` | Backend API | Express 5 + Node 24 | Servidor central de negócio |
| `hub` | Web App | React 19 + Vite 7 | Dashboard principal (super-admin + tenant) |
| `athos-mobile` | Web App | React 19 + Vite 7 | Interface mobile do agente ATHOS |
| `onboarding-portal` | Web App | React + Vite | Portal de onboarding de novos clientes |
| `onboarding` | Slides | — | Apresentação de onboarding |
| `closer` | Slides | — | Material de fechamento comercial |
| `mockup-sandbox` | Design | Vite | Sandbox de componentes UI |

---

## 2. Stack Técnica

### Backend (`artifacts/api-server`)

```
Runtime:        Node.js 24 (ESM)
Framework:      Express 5
ORM:            Drizzle ORM
Banco:          PostgreSQL 16 via Supabase (Neon em produção)
Build:          esbuild (bundle ESM único)
Logs:           Pino + pino-http
Validação:      Zod
Auth:           Session via cookie (SESSION_SECRET)
Storage:        Replit Object Storage
```

**Dependências externas críticas:**
- `@google/genai` — Gemini (geração de imagens e texto)
- `@supabase/supabase-js` — cliente Supabase
- `stripe` — pagamentos
- `sharp` — processamento de imagens
- `multer` — upload de arquivos

### Frontend (`artifacts/hub`)

```
Framework:      React 19
Build:          Vite 7
Estilos:        Tailwind CSS 4
Componentes:    Radix UI (primitivos acessíveis)
Estado server:  TanStack Query 5
Roteamento:     Wouter (não React Router)
Gráficos:       Recharts
Animações:      Framer Motion
Forms:          react-hook-form + Zod
```

### Bibliotecas internas (`lib/`)

| Pacote | Função |
|---|---|
| `@workspace/db` | Pool de conexão PostgreSQL compartilhado |
| `@workspace/api-zod` | Schemas Zod de request/response |
| `@workspace/api-spec` | Tipos TypeScript da API |
| `@workspace/api-client-react` | Hooks React para consumo da API |
| `@workspace/integrations-gemini-ai` | Wrapper Gemini AI |
| `@workspace/integrations-openai-ai-server` | Wrapper OpenAI (server) |
| `@workspace/integrations-openai-ai-react` | Wrapper OpenAI (client) |
| `@workspace/object-storage-web` | Utilitários de storage no browser |

---

## 3. Integrações Externas

| Serviço | Função | Criticidade |
|---|---|---|
| **Supabase / Neon** | Banco de dados PostgreSQL em produção | 🔴 Crítica |
| **Replit Object Storage** | Imagens geradas, assets de marca | 🔴 Crítica |
| **Google Gemini** | Geração de imagens e prompts de marketing | 🔴 Crítica |
| **OpenAI** | LLM para ATHOS e outros agentes | 🔴 Crítica |
| **Helena (CRM)** | CRM white-label da Mirage | 🟠 Alta |
| **VhSys (ERP)** | ERP white-label da Mirage | 🟠 Alta |
| **ASAAS** | Cobranças, assinaturas, webhook de pagamento | 🟠 Alta |
| **Z-API** | Envio de WhatsApp (notificações, agente) | 🟠 Alta |
| **HeyGen** | Geração de vídeos com avatar (talking photo) | 🟡 Média |
| **FAL.ai** | Geração de imagens alternativa (Flux) | 🟡 Média |
| **n8n** | Automações e webhooks (ex: confirmação de reunião) | 🟡 Média |
| **GPTMaker** | Webhook do agente ATHOS | 🟡 Média |
| **Stripe** | Pagamentos internacionais (configurado, não ativo) | 🟡 Média |

---

## 4. Modelo de Dados

### Tabelas identificadas (migrate.ts)

**Marketing & Growth**
- `growth_campaigns` — campanhas de marketing
- `growth_campaign_slots` — slots de criativo por campanha
- `growth_assets` — assets gerados (imagens, vídeos)
- `campaign_metrics` / `campaign_publications` / `campaign_assets` — métricas e publicações
- `content_pack_items` — itens de content pack
- `brand_blueprints` — identidade visual por tenant
- `marketing_prompt_settings` — configuração de prompts IA por tenant

**Comercial & CRM**
- `comercial_leads` — leads qualificados
- `lead_ai_events` / `lead_journey` — histórico de eventos de IA
- `sales_automation_config` — configuração de automação comercial
- `agent_handoffs` — transferências humano/IA

**Operacional**
- `pedidos` — pedidos de produção
- `estoque` — controle de estoque
- `movimentacoes` — movimentações financeiras
- `orcamentos_custos` — orçamentos e fichas de custo
- `referencias` — referências de produto
- `plm_produtos` — produtos PLM

**Parceiros & Comunidade**
- `parceiros` — cadastro de parceiros (Banco de Parceiros)
- `candidatos` — candidatos RH
- `leads_espelho` — espelho de leads Helena

**Infraestrutura**
- `helena_card_migrations` — controle de migração de cards Helena

---

## 5. Arquitetura de Rotas (API)

O backend expõe ~40 módulos de rota:

```
/auth              — autenticação e sessão
/admin             — super-admin
/tenants           — gestão multi-tenant
/users             — gestão de usuários
/marketing/        — campanhas, growth, pilotos, content-pack
/crm               — pipeline CRM
/custos-fichas     — fichas de custo
/custos-orcamentos — orçamentos
/plm/              — PLM (produto, kanban, referências)
/kanban            — kanban geral
/financeiro/       — contas, movimentações
/parceiros         — banco de parceiros
/cotacoes          — cotações
/moda-conecta/     — comunidade de moda
/comunidade/       — fórum, fornecedores, vagas
/billing           — assinaturas e planos
/automation/       — automação comercial
/mentor            — agente mentor
/chat              — chat multiagente
/athos-memory      — memória do ATHOS
/helena            — integração Helena CRM
/integracoes/      — integrações externas
/relatorios        — relatórios
/storage           — object storage
/webhooks-vhsys    — webhook VhSys
/zapi-callback     — webhook Z-API
/mcp               — Model Context Protocol
/internal          — endpoints internos
/health            — healthcheck
/public            — rotas públicas
```

### Schedulers em produção (iniciam no startup)

- `startBankImportScheduler` — importação bancária
- `startBackupScheduler` — backup periódico
- `startHelenaWebhookMonitor` — monitor Helena
- `startAgentExecutor` — executor de agentes IA
- `startN8nHealthMonitor` — monitor n8n

---

## 6. Arquitetura de Rotas (Frontend)

Roteamento via **Wouter** (não React Router DOM).

```
/                           — Landing page pública
/login, /register           — Autenticação
/comecar, /planos           — Funil de aquisição
/checkout, /checkout-sucesso — Pagamento
/onboarding                 — Onboarding wizard
/hub                        — Dashboard principal
/hub/kanban/*               — Kanban (pedidos, estoque, fornecedores...)
/hub/custos/*               — Fichas e orçamentos
/hub/plm/*                  — PLM
/hub/crm                    — CRM
/hub/erp                    — ERP / VhSys
/hub/financeiro/*           — Financeiro
/hub/relatorios             — Relatórios
/hub/marketing/*            — Marketing (maquina, growth, pilotos...)
/hub/growth                 — Growth (super-admin)
/hub/helena-pipeline        — Pipeline Helena (super-admin)
/hub/maquina-vendas         — Máquina de Vendas (super-admin)
/hub/agent-handoffs         — Handoffs de agente (super-admin)
/admin                      — Painel admin
/operacoes                  — Operações internas
```

---

## 7. Modelo Multi-Tenant

- Tenant identificado por `tenant_id` (UUID) e `company_slug` (string)
- Super-admin pode operar em qualquer tenant via seletor no header
- Dados isolados por `tenant_id` em cada tabela
- Sem Row Level Security (RLS) no Supabase — isolamento feito no nível da aplicação
- Seed de dados por tenant no startup (`seed...IfNeeded`)

---

## 8. Fluxo de IA (ATHOS + Growth)

```
Usuário
  └─► GPTMaker (agente ATHOS, webhook)
        └─► /api/zapi-callback (recebe mensagem)
              └─► startAgentExecutor (processa em fila)
                    ├─► Helena API (dados do lead)
                    ├─► OpenAI / Gemini (geração de resposta)
                    └─► Z-API (envia WhatsApp)

Mirage (Growth)
  └─► /hub/growth (interface)
        └─► POST /marketing/growth/campaigns-v2/:id/slots/generate
              └─► enrichR2PBPrompt() + marketing_prompt_settings (overlay)
                    └─► Gemini / FAL (geração de imagem)
                          └─► Object Storage (armazena asset)
```

---

## 9. Infraestrutura de Deploy

```
Plataforma:     Replit Autoscale
Runtime:        NixOS + nodejs-24 + postgresql-16
Build frontend: Vite (estático, servido via proxy Replit)
Build backend:  esbuild (bundle ESM único em dist/index.mjs)
Banco prod:     Supabase / Neon PostgreSQL (externo ao Replit)
Storage:        Replit Object Storage (bucket próprio)
Migrations:     migrate.ts executado no startup (idempotente com IF NOT EXISTS)
Secrets:        Replit Secrets (22 variáveis)
```

**Routing de portas:**
| Porta local | Porta externa | Serviço |
|---|---|---|
| 8080 | 8080 | API Server |
| 8081 | 80 | Hub (frontend principal) |
| 19201 | 4200 | — |
| 22016 | 3001 | — |
| 22117 | 3003 | — |
| 22824 | 3002 | — |
| 23165 | 3000 | — |

---

## 10. Pontos Fortes

1. **Stack moderna e bem escolhida** — React 19, Vite 7, Express 5, Drizzle ORM, Tailwind 4. Tudo com suporte ativo e documentação abundante.
2. **Monorepo bem estruturado** — pnpm workspaces com bibliotecas internas separadas (`lib/`). Favorece reuso e isolamento.
3. **Migrations idempotentes** — `migrate.ts` usa `IF NOT EXISTS` em todas as tabelas. Seguro para restart em produção.
4. **TypeScript end-to-end** — tipos compartilhados entre backend e frontend via `@workspace/api-zod` e `@workspace/api-spec`.
5. **Schedulers internos** — sem dependência de cron externo; executam no mesmo processo.

---

## 11. Riscos e Débitos Técnicos

### 🔴 Críticos (resolver antes do lançamento)

| # | Risco | Impacto |
|---|---|---|
| R1 | **ATHOS sem guardrails** — system prompt não delimita claramente o que o agente pode afirmar. Causa alucinação de informações sobre planos, preços e funcionalidades. | Usuário recebe informação errada e perde confiança |
| R2 | **Sem RLS no Supabase** — isolamento multi-tenant feito só na aplicação. Um bug de lógica expõe dados de outro tenant. | Vazamento de dados entre clientes |
| R3 | **Sem retry/fila robusta no AgentExecutor** — mensagens de WhatsApp podem ser perdidas silenciosamente em falha de Z-API ou OpenAI. | Lead não respondido sem aviso |
| R4 | **Migrations sem rollback** — `migrate.ts` só avança. Uma coluna adicionada errada exige SQL manual em produção. | Indisponibilidade em deploy com erro |

### 🟠 Altos (resolver no primeiro mês)

| # | Risco | Impacto |
|---|---|---|
| R5 | **`growth-home.tsx` com +2600 linhas** — arquivo monolítico dificulta manutenção, aumenta chance de regressão e esgota contexto do agente. | Bugs difíceis de isolar |
| R6 | **Sem testes automatizados** — nenhum teste unitário ou e2e identificado. Qualquer mudança pode quebrar fluxos críticos sem sinal. | Regressões silenciosas |
| R7 | **Schedulers sem health check exposto** — `startHelenaWebhookMonitor`, `startAgentExecutor` etc. falham silenciosamente sem alerta operacional. | Automação parada sem aviso |
| R8 | **Secrets em `userenv.shared` no .replit** — `SUPABASE_URL`, `SUPABASE_ANON_KEY` e outras configs não-secretas estão expostas no arquivo de configuração do repositório. | Exposição de endpoints e chaves públicas no GitHub |

### 🟡 Médios (backlog)

| # | Risco | Impacto |
|---|---|---|
| R9 | **Sem paginação em listagens grandes** — rotas como `/marketing/growth/campaigns-v2` e `/comercial_leads` retornam todos os registros. | Performance degrada com volume |
| R10 | **Dependência de GPTMaker como proxy** — ATHOS depende de um serviço terceiro para orquestrar o agente. Ponto único de falha fora do controle. | ATHOS fora do ar sem aviso |
| R11 | **Object Storage sem CDN** — assets de imagem servidos diretamente pelo backend. Latência alta e custo de egress. | Lentidão na galeria de criativos |

---

## 12. Avaliação de Migração de Plataforma

### Replit → Vercel + Railway (hipótese levantada)

| Componente | Situação atual | Na migração |
|---|---|---|
| `hub` (frontend) | Vite puro, sem SSR | ✅ Deploy direto na Vercel sem alteração |
| `api-server` (backend) | Express 5 ESM, stateful (schedulers) | ⚠️ Precisa de Railway ou Render — Vercel Serverless não suporta processos long-running |
| Banco de dados | Supabase/Neon externo | ✅ Sem alteração, já é externo |
| Object Storage | Replit Object Storage | 🔴 Precisa migrar para S3, R2 ou Supabase Storage |
| Secrets | Replit Secrets | ⚠️ Reconfigurar em Vercel env vars + Railway env vars |
| Schedulers | Embutidos no processo | ⚠️ Precisa de solução separada (Railway cron, ou serviço externo) |

**Conclusão sobre migração:** tecnicamente viável, mas requer 2–3 semanas de trabalho focado só em infraestrutura, sem entregar nenhuma feature. O risco de regressão é alto no momento pré-lançamento. **Não recomendado antes de agosto.** Avaliar após estabilização com usuários reais.

---

## 13. Recomendações por Prioridade

### Sprint de estabilização (antes de agosto)

1. **Revisar system prompt do ATHOS** — adicionar seção de "limites do agente": o que ele não sabe, não responde; redireciona para humano.
2. **Adicionar RLS básico no Supabase** — ao menos para as tabelas com dados de tenant (`growth_campaigns`, `comercial_leads`, `parceiros`).
3. **Implementar dead-letter no AgentExecutor** — mensagens que falham 3x vão para fila de revisão manual (tabela `agent_errors`).
4. **Monitoramento de schedulers** — endpoint `/health` deve incluir status de cada scheduler (último heartbeat).

### Primeiro mês pós-lançamento

5. **Quebrar `growth-home.tsx`** em componentes isolados por sub-tab.
6. **Paginação nas listagens** — limitar a 50 registros por página nas rotas de marketing e leads.
7. **Testes de smoke** — ao menos 5 fluxos críticos cobertos com Playwright (login, geração de slot, resposta ATHOS, checkout, emissão de orçamento).

---

## 14. Sumário Executivo

A stack do Mirage Hub é **sólida, moderna e adequada para a complexidade do produto**. Não há motivo técnico para trocar de plataforma ou framework. Os problemas observados são de **maturidade operacional**, não de escolha tecnológica:

- O ATHOS precisa de guardrails antes de falar com clientes reais.
- O isolamento multi-tenant precisa de uma segunda camada (RLS).
- O monitoramento de processos background precisa ser visível.
- Os arquivos maiores precisam ser refatorados para manutenção segura.

Esses são problemas normais de um produto em fase de pré-lançamento com alta velocidade de desenvolvimento. Todos são resolvíveis sem troca de stack.

---

*Documento gerado com base na inspeção direta do código-fonte em 28/07/2026.*
