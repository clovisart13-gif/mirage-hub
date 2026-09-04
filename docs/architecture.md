# Arquitetura — Mirage Hub

> Documento permanente de referência arquitetural.  
> Atualizado em: Julho 2026.  
> Leia antes de criar novos artefatos, rotas ou bibliotecas.

---

## Visão Geral

O Mirage Hub é um **SaaS multi-tenant** para confecções brasileiras que combina:
- ERP operacional (Kanban + PLM)
- CRM com automação via WhatsApp
- Marketing com geração de conteúdo por IA
- Comunidade e banco de parceiros
- Agente conversacional estratégico (ATHOS)

**Tenant principal hoje:** R2PB  
**Modelo:** um backend central, múltiplos tenants isolados por `tenant_id`

---

## Artefatos do Monorepo

| Artefato | Tipo | Preview path | Propósito |
|---|---|---|---|
| `api-server` | Backend API | `/api` | Servidor central de toda lógica de negócio |
| `hub` | Web App | `/hub` | Dashboard principal (admin + tenant) |
| `athos-mobile` | Web App | `/athos-mobile` | Interface mobile do ATHOS |
| `onboarding-portal` | Web App | `/onboarding-portal` | Portal de onboarding de clientes |
| `onboarding` | Slides | `/onboarding` | Apresentação de onboarding |
| `closer` | Slides | `/closer` | Material de fechamento comercial |
| `mockup-sandbox` | Design | `/mockup-sandbox` | Sandbox de componentes UI |

---

## Stack Backend (`artifacts/api-server`)

```
Runtime:     Node.js 24 (ESM)
Framework:   Express 5
ORM:         Drizzle ORM
Banco:       PostgreSQL 16
Build:       esbuild (bundle ESM único → dist/index.mjs)
Logs:        Pino + pino-http
Validação:   Zod
Auth:        Session via cookie (SESSION_SECRET)
Storage:     Replit Object Storage
```

### Bibliotecas internas compartilhadas (`lib/`)

| Pacote | Caminho | Função |
|---|---|---|
| `@workspace/db` | `lib/db` | Pool de conexão PostgreSQL + todos os schemas Drizzle |
| `@workspace/api-zod` | `lib/api-zod` | Schemas Zod de request/response |
| `@workspace/api-spec` | `lib/api-spec` | Tipos TypeScript da API |
| `@workspace/api-client-react` | `lib/api-client-react` | Hooks React para consumo da API |
| `@workspace/integrations-gemini-ai` | `lib/integrations-gemini-ai` | Wrapper Gemini AI |
| `@workspace/integrations-openai-ai-server` | `lib/integrations-openai-ai-server` | Wrapper OpenAI (server) |
| `@workspace/integrations-openai-ai-react` | `lib/integrations-openai-ai-react` | Wrapper OpenAI (client) |
| `@workspace/object-storage-web` | `lib/object-storage-web` | Utilitários de storage no browser |

---

## Stack Frontend (`artifacts/hub`)

```
Framework:      React 19
Build:          Vite 7
Estilos:        Tailwind CSS 4
Componentes:    Radix UI (primitivos acessíveis)
Estado server:  TanStack Query 5
Roteamento:     Wouter (NÃO é React Router — não confundir)
Gráficos:       Recharts
Animações:      Framer Motion
Forms:          react-hook-form + Zod
```

> ⚠️ O roteamento usa **Wouter**, não React Router DOM. Nunca instalar `react-router-dom`.

---

## Banco de Dados por Ambiente

| Ambiente | Host | Como mudar schema |
|---|---|---|
| Desenvolvimento | PostgreSQL local Replit (`helium`) | `migrate.ts` no startup ou `drizzle-kit push` |
| Produção | Neon PostgreSQL (externo) | Somente via `migrate.ts` com `IF NOT EXISTS` |
| Autenticação | Supabase | Não armazena dados de negócio |

> ⚠️ `drizzle-kit push` só funciona em dev. Mudanças de schema em produção exigem guard no `migrate.ts`.

---

## Modelo Multi-Tenant

- Cada tenant tem um `tenant_id` (UUID) e um `company_slug` (string legível)
- Todos os dados de negócio são isolados por `tenant_id` em cada tabela
- Isolamento feito na camada de aplicação (sem RLS ativo)
- Super-admin pode operar em qualquer tenant via seletor no header
- Seeds por tenant executam no startup (`seed...IfNeeded`)

> ⚠️ Nunca fazer query sem filtrar por `tenant_id`. Nunca alterar `tenant_id` de registros existentes.

---

## Processos Background (Schedulers)

Rodam no mesmo processo do `api-server`. Iniciam no startup:

| Scheduler | Função |
|---|---|
| `startBankImportScheduler` | Importação bancária periódica |
| `startBackupScheduler` | Backup periódico do banco |
| `startHelenaWebhookMonitor` | Monitora webhooks da Helena CRM |
| `startAgentExecutor` | Executa fila de agentes IA |
| `startN8nHealthMonitor` | Monitora saúde dos fluxos n8n |

> ⚠️ Falham silenciosamente. O endpoint `/health` deve reportar status de cada um.

---

## Fluxo de Deploy

```
Commit → Replit detecta → esbuild compila api-server
                        → Vite compila hub
                        → migrate.ts executa (idempotente)
                        → schedulers iniciam
                        → notificação WhatsApp obrigatória (Z-API)
```

> ⚠️ A notificação WhatsApp no startup é **obrigatória** em produção. Ver `docs/modules/07-integracoes.md`.

---

## Estrutura de Pastas (principais)

```
/
├── artifacts/
│   ├── api-server/src/
│   │   ├── routes/          ← todos os endpoints da API
│   │   ├── lib/             ← utilitários e clientes de integração
│   │   └── jobs/            ← schedulers e jobs background
│   └── hub/src/
│       ├── pages/           ← páginas do dashboard
│       ├── components/      ← componentes reutilizáveis
│       └── public/          ← arquivos estáticos
├── lib/
│   ├── db/src/schema/       ← todos os schemas Drizzle (fonte da verdade do banco)
│   └── [outros pacotes]/
└── docs/                    ← documentação permanente (este arquivo)
```
