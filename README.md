# Mirage Hub

Mirage Hub is a multi-tenant SaaS for the Brazilian textile/apparel market, managing production, costs, sales, and community interactions.

## Run & Operate

- **Run Dev Server:** `pnpm dev`
- **Build:** `pnpm build`
- **Typecheck:** `pnpm typecheck`
- **Codegen:** `pnpm codegen`
- **DB Push:** `pnpm --filter @workspace/db run push-force`
- **Environment Variables:**
    - `SUPABASE_SERVICE_ROLE_KEY`
    - `SESSION_SECRET`
    - `ASAAS_API_KEY`
    - `ASAAS_WEBHOOK_TOKEN`
    - `VHSYS_ACCESS_TOKEN`
    - `VHSYS_SECRET_ACCESS_TOKEN`
    - `DEFAULT_OBJECT_STORAGE_BUCKET_ID`
    - `PRIVATE_OBJECT_DIR`
    - `PUBLIC_OBJECT_SEARCH_PATHS`
    - `GITHUB_TOKEN`
    - `DATABASE_URL=postgresql://postgres:password@helium/heliumdb` (for local DB)

## Stack

- **Frontend:** React 19, Vite, Tailwind CSS, shadcn/ui, wouter, Recharts, xlsx
- **Backend:** Express 4, TypeScript, Drizzle ORM
- **Database:** PostgreSQL (local `helium/heliumdb`)
- **Authentication:** HTTP sessions (`express-session`), `requireAuth`, `requireTenantAccess` middleware
- **Monorepo Tool:** pnpm workspaces

## Where things live

- **API Server:** `artifacts/api-server/` (Express API)
- **Frontend Hub:** `artifacts/hub/` (React + Vite)
- **DB Schemas:** `lib/db/src/schema/` (e.g., `kanban.ts`, `orcamentos.ts`, `comunidade.ts`, `plm.ts`)
- **API Specification:** `lib/api-spec/` (OpenAPI spec)
- **Unified Sidebar Layout:** `artifacts/hub/src/components/kanban/KanbanLayout.tsx`
- **PLM Sidebar Layout:** `artifacts/hub/src/components/plm/PLMLayout.tsx`
- **PLM Pages:** `artifacts/hub/src/pages/plm/` (14 pages)
- **PLM API Routes:** `artifacts/api-server/src/routes/plm/index.ts`
- **Report Endpoints:** `artifacts/api-server/src/routes/relatorios/index.ts`
- **Report Frontend Page:** `artifacts/hub/src/pages/relatorios.tsx`
- **Main Router Registration:** `artifacts/api-server/src/routes/index.ts`
- **Frontend Routes:** `artifacts/hub/src/App.tsx`

## Architecture decisions

- **Monetary Values in Cents:** All monetary values are stored as integers in cents in the database to avoid floating-point inaccuracies.
- **Tenant Isolation:** Every protected route enforces tenant isolation using `requireAuth` and `requireTenantAccess` middleware.
- **Super Admin Access:** A designated super admin (`clovisart13@gmail.com`) can access any tenant for administrative purposes.
- **Kanban Stages:** A fixed sequence of 14 Kanban stages is enforced for production workflow.
- **Local PostgreSQL:** Development and testing utilize a local PostgreSQL instance (`helium/heliumdb`) separate from the legacy Manus system's database.
- **PLM IDs:** PLM tables use serial integers (not UUIDs) with `tenant_id varchar` for isolation; PLM monetary values use NUMERIC(10,2) directly (not cents).
- **Auto-generated codes:** `plm_sequencias` table tracks per-tenant sequences; `gerarCodigo(tenantId, prefixo)` generates codes atomically on insert (e.g. CAM-0001, FT-0001, MAT-0001, FOR-0001, CLI-0001, FC-0001).

## Product

- **Central Hub:** Landing page for 6 ecosystem apps with subscription-based access control.
- **PLM (Product Lifecycle Management):** Full PLM migrated from Manus — 13 DB tables (`plm_*`), REST API at `/api/plm/*`, sidebar with 11 modules: Dashboard, Produtos, Fichas Técnicas, Modelagem, Materiais, Fornecedores PLM, BOM/Custos, Pilotagem, Aprovações, Clientes PLM, Histórico.
- **Production Kanban:** A 14-stage Kanban board to track production orders, integrate with various modules, and automate accounts payable.
- **Cost/Budget Generator:** CRUD for cost sheets (calculates raw material and labor costs) and budgets, including email sending and approval workflows.
- **Comprehensive Reporting:** Six distinct report tabs covering general KPIs, sales BI with Excel export, production control, client-specific views, historical data, and accounts receivable management with invoicing capabilities.
- **Community Module:** Manages supplier profiles, specialties, reviews, and a pre-registration process for new suppliers.
- **CRM:** Basic customer relationship management (in development).
- **ERP Integration (VhSys):** Integration with VhSys ERP for potential future automation.

## ATHOS_MENTOR

Mentor cognitivo estratégico integrado ao Hub. Acessível SOMENTE para o admin (`clovisart13@gmail.com`).

- **Rota frontend:** `/hub/mentor`
- **API:** `/api/mentor/*` — `requireAuth + requireSuperAdmin`
- **LLM:** OpenAI GPT via Replit AI Integrations (streaming SSE)
- **Histórico:** tabela `mentor_messages` no Supabase (PostgreSQL local)
- **Snapshot:** tabela `mirage_environment_snapshot` — POST `/api/mentor/snapshot`
- **Capacidades do bridge (`athosBridge.ts`):**
  - n8n: `list_n8n_workflows`, `get_n8n_workflow`, `create_n8n_workflow`, `activate/deactivate_n8n_workflow`, `trigger_n8n_webhook` (requer `N8N_BASE_URL` e `N8N_API_KEY` como secrets)
  - Supabase: `list_supabase_tables`, `query_supabase_table`, `count_supabase_table`
  - GitHub: `github_list_files`, `github_read_file` (Athos repo), `github_list_mirage_files`, `github_read_mirage_file` (Hub repo)
- **Atualizar Athos (Manus):** O system prompt (`ATOS_SYSTEM_PROMPT`) vive em `server/mentorRouter.ts` no repo GitHub `clovisart13-gif/atos-control-center` (branch `main`). O `GITHUB_TOKEN` disponível no ambiente TEM permissão de escrita nesse repo (confirmado em 2026-07-02 via PUT direto na API de contents) — Replit Agent pode ler e editar esse arquivo diretamente via GitHub API, sem precisar de PAT adicional.

## Fluxo de confirmação de reunião via WhatsApp (Google Calendar → n8n → Z-API)

- **Problema resolvido:** o CRM Helena não expõe e-mail/telefone do lead via API de leitura de cards (retorna `contacts: null`), e a criação do card na pipeline "Vendas PRO" acontece quando o robô **manda** o link de agendamento — não quando o lead **efetiva** a reunião. Por isso o Google Agenda (`diagnosticor2pb@gmail.com`) é a ÚNICA fonte de verdade de "reunião realmente marcada".
- **Tabela-espelho:** `leads_espelho` (`lib/db/src/schema/leads_espelho.ts`) guarda `tenantId, nome, email, whatsapp, agendou, followupSent, createdAt`. Populada assim que o link é enviado (nome/e-mail já coletados pelo robô, whatsapp é o próprio canal).
- **Endpoints internos** (`artifacts/api-server/src/routes/internal/leads.ts`, protegidos por header `x-internal-key` = `MARKETING_INTERNAL_API_KEY`):
  - `POST /api/internal/leads/mirror` — upsert nome/e-mail/whatsapp (chamar quando o link é enviado ao lead).
  - `GET /api/internal/leads/by-email?email=...` — n8n usa para achar o whatsapp a partir do e-mail do evento do Google Calendar.
  - `POST /api/internal/leads/mark-agendado` — n8n chama após confirmar match via `by-email`, marca `agendou=true`.
  - `GET /api/internal/leads/pending-followup?hours=24` — lista leads que receberam link há mais de X horas e nunca agendaram, para reengajamento.
  - `POST /api/internal/leads/mark-followup-sent` — evita reenviar a mensagem de reengajamento pro mesmo lead.
- **Quem configura o quê:** Replit Agent já construiu e publicou os endpoints acima. ATHOS monta os workflows n8n consumindo essas rotas (trigger no Google Calendar → `by-email` → `mark-agendado` → mensagem de confirmação; e um cron separado → `pending-followup` → mensagem de reengajamento → `mark-followup-sent`).
- **Textos das mensagens (aprovados por Clóvis em 2026-07-03):** confirmação, lembrete (1h antes) e reengajamento (lead que não agendou) — pedir ao Replit Agent se precisar recuperar os textos exatos; tom sempre casual/simpático, igual ao robô do início da conversa.
- **Debug temporário ativo:** `artifacts/api-server/src/routes/helena/index.ts` loga o payload completo de QUALQUER evento recebido do webhook Helena (não só mudança de coluna) — remover assim que confirmado o formato do evento de criação de card.

## Mirage Growth OS — Fase 2 Creative Engine Plugável

- **Etapa 2.1 (concluída):** modelo unificado de assets — tabelas `growth_campaigns`, `growth_assets`, `growth_asset_versions`, `growth_provider_runs` (`lib/db/src/schema/growth.ts`), CRUD interno em `artifacts/api-server/src/routes/internal/growth.ts`, protegido por `x-internal-key` (`MARKETING_INTERNAL_API_KEY`).
- **Etapa 2.2 (concluída e validada com credencial real):** integração HeyGen (geração de vídeo com avatar) — `artifacts/api-server/src/lib/heygenProvider.ts` + endpoints `POST /api/internal/growth/providers/heygen/generate`, `GET /api/internal/growth/providers/heygen/job/:jobId`, `POST /api/internal/growth/providers/heygen/job/:jobId/sync`. Uso exclusivo interno (Máquina de Marketing da Mirage), não exposto a assinantes. `HEYGEN_API_KEY` configurada; avatar/voz padrão via `HEYGEN_DEFAULT_AVATAR_ID`/`HEYGEN_DEFAULT_VOICE_ID`/`HEYGEN_DEFAULT_AVATAR_TYPE`.
- **Midjourney (Etapa 2.3):** bloqueado por dependência externa — Midjourney não tem API oficial; precisa de assinatura ativa + servidor Discord com o bot + um serviço-ponte (ex. PiAPI/useapi.net/GoAPI) para expor uma API real. Usuário está verificando uma conta Discord antiga. Não implementar código de provider até essa infraestrutura existir e o serviço-ponte escolhido ser confirmado.
- **Provider Router (concluído):** `artifacts/api-server/src/lib/growthProviderRouter.ts` centraliza `selectGrowthProvider`/`resolveGrowthFallback` e `POST /api/internal/growth/providers/route`. Regras: `video`/`video_avatar`→heygen (sem fallback automático); `image_premium`→midjourney→banana→manual; `image_fast/image_generic`→banana→midjourney→manual; `copy/headline/script/cta/caption/hook`→openai (retry único). Disponibilidade de `banana` lida de `AI_INTEGRATIONS_GEMINI_BASE_URL`/`AI_INTEGRATIONS_GEMINI_API_KEY` (provisionados via Replit AI Integrations, sem secret dedicado); `heygen` de `HEYGEN_API_KEY`; `midjourney` ainda requer `MIDJOURNEY_ENABLED="true"` manual (bloqueado); `openai` default true.
- **Frente de Front-end (concluída):** primeira interface visual do Growth OS em `/hub/marketing/growth` (`artifacts/hub/src/pages/marketing-growth.tsx`), acesso restrito a super admin, com header executivo, cards de status, blocos operacionais (Brand Lab/Campaign Factory/Traffic Room/Sales Sync), painel de providers com badges de status, fila de aprovação e próximos passos. Dados reais vêm de `GET /marketing/growth/overview` (`artifacts/api-server/src/routes/marketing/index.ts`, `requireAuth + requireSuperAdmin` — distinto do `/internal/growth/*` protegido por `x-internal-key`, que é server-to-server apenas). Navegação a partir de `/hub/marketing` (card "Mirage Growth OS").
- **Banana (Etapa "Frente B", concluída e validada end-to-end):** "Banana" = Gemini nano-banana (`gemini-2.5-flash-image`), acessado via Replit AI Integrations (sem API key própria). `artifacts/api-server/src/lib/bananaProvider.ts` chama `generateImage()` de `@workspace/integrations-gemini-ai/image`, salva o PNG/JPEG resultante no Object Storage (`growth-assets/{tenantId}/{campaignId}/{uuid}.png`, mesmo padrão de `campaignAssets`) e retorna `outputUrl` no formato `/objects/...`. Endpoint síncrono (sem polling): `POST /api/internal/growth/providers/banana/generate` — cria `growth_assets`(status `requested`→`generating`→`awaiting_approval`) + `growth_provider_runs`, chama Gemini, grava resultado. Testado ao vivo: gerou PNG real (~965KB), acessível em `GET /api/storage/objects/...`.

## User preferences

_Populate as you build_

## ATHOS_MENTOR — Como buscar contexto histórico

Quando o usuário chegar aqui sem explicar o contexto, consulte o histórico do ATHOS antes de perguntar:

```bash
psql postgresql://postgres:password@helium/heliumdb -c \
  "SELECT role, LEFT(content, 600) AS resumo, created_at FROM mentor_messages ORDER BY created_at DESC LIMIT 20;"
```

Isso mostra as últimas conversas entre Clóvis e o ATHOS. Use para entender o que foi decidido, o que está em andamento, e o que foi pedido — sem precisar que o usuário repita.

**Divisão de responsabilidades:**
- ATHOS: memória histórica, estratégia, orquestração de n8n, decisões de negócio
- Replit Agent (eu): construção de código, infraestrutura, migrations, deploy
- Quando ATHOS precisa de código: ele gera uma instrução formatada e completa → usuário cola aqui → eu executo sem perguntas adicionais
- **n8n — quem cria o quê:** ATHOS deve criar/configurar workflows e nodes no n8n via sua própria API (`create_n8n_workflow`, `activate_n8n_workflow`, etc.). O usuário (Clóvis) NUNCA deve ser instruído a criar node, montar workflow ou configurar campos manualmente. A única exceção é autorização OAuth (ex.: "Sign in with Google" em um node de Google Calendar/Gmail) — isso é bloqueio de segurança do provedor e exige clique humano; nesse caso, ATHOS deve pedir apenas isso, apontando workflow e node exatos, nunca pedir para o usuário construir a automação.

### Fatos fixos do fluxo de agendamento (Google Calendar → WhatsApp)

Registrado aqui para não depender da memória de conversa de nenhum agente:

- **Conta/agenda do Google usada para agendamentos de leads:** `diagnosticor2pb@gmail.com` (criada a pedido do próprio ATHOS especificamente para este fluxo — usar como `calendarId` no node Google Calendar Trigger).
- **Credencial n8n:** "Google Calendar account" (id `dwHaHfaWKAjjjtaW`).
- **Workflow n8n:** `R2PB_CALL_CONFIRMATION_AND_REMINDER_ZAPI` (id `RXCVKGHauHFV698Q`), webhook path `r2pb-call-confirmation-zapi`.
- **Decisão de arquitetura:** o Mirage NUNCA cria/confirma o evento do Google Calendar (o lead agenda direto pela página do Google). A origem do gatilho é o próprio Google Calendar Trigger dentro do n8n, não o endpoint `/api/crm/agendamento` do Mirage (esse endpoint existe apenas para agendamentos manuais/internos, é caminho secundário).

## Gotchas

- **Monetary Values:** Always divide by 100 when displaying monetary values retrieved from the database (stored in cents).
- **Tenant Isolation:** Ensure all new protected API endpoints and frontend routes correctly implement `requireAuth` and `requireTenantAccess` for multi-tenancy.
- **Kanban Phase Order:** Adhere strictly to the defined 14-phase order for Kanban production.
- **Manus vs. Mirage DB:** Remember that Manus uses MySQL/TiDB while Mirage uses PostgreSQL; schema differences exist.

## Pointers

- **Drizzle ORM Documentation:** [https://orm.drizzle.team/docs/overview](https://orm.drizzle.team/docs/overview)
- **shadcn/ui Documentation:** [https://ui.shadcn.com/docs](https://ui.shadcn.com/docs)
- **Recharts Documentation:** [https://recharts.org/en-US/api](https://recharts.org/en-US/api)
- **wouter Documentation:** [https://www.npmjs.com/package/wouter](https://www.npmjs.com/package/wouter)
- **xlsx Library Documentation:** [https://docs.sheetjs.com/](https://docs.sheetjs.com/)
- **Manus Project (Reference):** `https://github.com/clovisart13-gif/kanban-producao.git`