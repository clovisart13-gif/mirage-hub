# Relatório Técnico de Transferência de Contexto — TexIntel AI × Hub Mirage

> **Classificação:** documento histórico de integração Hub ↔ TexIntel.
> **Não é a especificação do TexIntel standalone v1.** Para o produto independente, consulte [`docs/texintel-standalone-blueprint.md`](./texintel-standalone-blueprint.md). As rotas, tabelas, tenants, chaves e variáveis descritos aqui não são dependências do standalone.

> **Para o agente no novo chat:** Leia este documento integralmente antes de escrever qualquer linha de código.  
> O TexIntel AI deve ser um serviço externo autônomo que se conecta ao Hub Mirage via API interna.  
> Última atualização: Agosto 2026.

---

## 1. Stack e Padrões de Código

### Linguagem e Runtime
- **TypeScript** estrito em todo o projeto (Node.js 24)
- **pnpm workspaces** como monorepo (`pnpm-workspace.yaml`)
- Artefatos independentes em `artifacts/<nome>/`

### Backend (API Server — o que o TexIntel vai se conectar)
```
Runtime:    Node.js 24 + TypeScript
Framework:  Express 5
ORM:        Drizzle ORM (drizzle-orm) sobre node-postgres (pg)
Validação:  Zod (schemas em @workspace/api-zod)
Logger:     Pino + pino-http
Auth:       Supabase Auth (@supabase/supabase-js ^2)
```

### Dependências já instaladas no api-server (não reinstalar)
```json
{
  "@supabase/supabase-js": "^2.104.1",
  "drizzle-orm": "catalog:",
  "pg": "^8.20.0",
  "express": "^5",
  "zod": "catalog:",
  "pino": "^9",
  "@google/genai": "^1.44.0",
  "@workspace/integrations-openai-ai-server": "workspace:*",
  "@workspace/db": "workspace:*"
}
```

### Para o TexIntel AI (novo serviço Python ou Node)
O TexIntel AI **não precisa** estar no monorepo. Pode ser um serviço independente (FastAPI/Python ou Express/TypeScript) que:
1. Recebe triggers via HTTP do Hub
2. Faz scraping/enriquecimento de CNPJ
3. Chama a API do Claude (Anthropic)
4. Salva resultados de volta no Hub via `POST /api/internal/texintel/resultado`

---

## 2. Estrutura do Banco de Dados

### Configuração da Conexão
```
Driver:      node-postgres (pg)
ORM:         Drizzle ORM
Pool:        max=20, idleTimeout=30s, connectionTimeout=5s
Env var:     DATABASE_URL (PostgreSQL local em dev; Neon PostgreSQL em produção)
Auth layer:  Supabase (somente para autenticação de usuários — tabelas auth.users, tenants, tenant_users)
```

> ⚠️ **Regra crítica:** O banco de dados local (dev) e o banco de produção (Neon/Supabase) são separados. Migrações novas devem ir para `artifacts/api-server/src/migrate.ts` com guards `IF NOT EXISTS` para serem aplicadas no próximo deploy.

---

### Tabela `tenants` (Supabase — lida via supabaseAdmin)
```sql
-- Gerenciada pelo Supabase, não pelo Drizzle
SELECT id, slug, name FROM tenants WHERE slug = 'r2pb';
-- slug é o identificador humano; id (UUID) é a FK usada em todas as tabelas
```

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | uuid | PK — usado como `tenant_id` em todas as tabelas |
| `slug` | text | Identificador legível (ex: `r2pb`, `mirage`) |
| `name` | text | Nome da empresa |

---

### Tabela `configuracoes_empresa` (dados da empresa/tenant)
```sql
-- FK implícita: tenant_id → tenants.id (via slug resolution)
id              VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()
tenant_id       VARCHAR NOT NULL
nome_empresa    VARCHAR
cnpj            VARCHAR          -- ← campo-chave para o TexIntel
email           VARCHAR
site            VARCHAR
telefone        VARCHAR
endereco        VARCHAR
cidade_estado_cep VARCHAR
created_at      TIMESTAMP DEFAULT now()
updated_at      TIMESTAMP DEFAULT now()
```

---

### Tabela `comercial_leads` (leads no pipeline comercial)
```sql
-- Upsert por (tenant_id, phone) — phone é o identificador único
id              VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()
tenant_id       VARCHAR(100) NOT NULL
lead_name       VARCHAR(255)
phone           VARCHAR(50) NOT NULL
email           VARCHAR(255)
empresa         VARCHAR
segmento        VARCHAR
canal           VARCHAR       -- zapi | meta_oficial | wts
origem          VARCHAR       -- resgate | confirmacao | robo
pipeline_key    VARCHAR       -- ex: comercial_humano
stage_key       VARCHAR       -- ex: aguardando_atendimento
status          VARCHAR       -- aberto | fechado
score           INTEGER DEFAULT 0
classificacao   VARCHAR DEFAULT 'lead'
obs             TEXT
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()

UNIQUE INDEX ON (tenant_id, phone)
```

---

### Tabela `parceiros_leads` (fornecedores/parceiros captados pelo CRM)
```sql
-- NÃO confundir com comercial_leads — são entidades diferentes
id              VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()
tenant_id       VARCHAR NOT NULL
nome            VARCHAR
whatsapp        VARCHAR
email           VARCHAR
canal           VARCHAR
status          VARCHAR DEFAULT 'novo'
created_at      TIMESTAMPTZ
```

---

### Tabela `market_intelligence_profiles` ← **USE ESTA para salvar resultados do TexIntel**
```sql
-- Tabela já existente, desenhada para inteligência de mercado
-- domain_key é o identificador (ex: 'r2pb', 'vestuario-feminino-sp')
id                    SERIAL PRIMARY KEY
domain_key            TEXT NOT NULL      -- identificador do domínio/empresa
title                 TEXT NOT NULL      -- nome do perfil
market_summary_json   JSONB             -- resumo de mercado
customer_behavior_json JSONB            -- comportamento do cliente
pains_json            JSONB             -- ← dores detectadas (output principal do TexIntel)
opportunities_json    JSONB             -- oportunidades
threats_json          JSONB             -- ameaças
competitors_json      JSONB             -- concorrentes
trends_json           JSONB             -- tendências
terminology_json      JSONB             -- terminologia do segmento
confidence_score      NUMERIC DEFAULT 0 -- score de confiança da análise
status                TEXT DEFAULT 'draft'  -- draft | active | archived
created_at            TIMESTAMPTZ DEFAULT now()
updated_at            TIMESTAMPTZ DEFAULT now()
```

---

### Tabela sugerida para o TexIntel criar (migration em migrate.ts)
```sql
-- Adicionar ao migrate.ts do api-server com IF NOT EXISTS
CREATE TABLE IF NOT EXISTS texintel_enrichments (
  id              VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(100) NOT NULL,
  cnpj            VARCHAR(20),
  company_name    VARCHAR(255),
  domain          VARCHAR(255),
  -- Dados CNPJ (Receita Federal)
  cnpj_data       JSONB,          -- razão social, porte, atividade, endereço
  -- Scraping
  site_content    TEXT,           -- conteúdo extraído do site
  site_scraped_at TIMESTAMPTZ,
  -- Análise IA (Claude)
  detected_pains  JSONB,          -- array de dores detectadas
  icp_score       INTEGER,        -- 0-100 fit com ICP da Mirage
  ai_summary      TEXT,           -- resumo gerado pelo Claude
  ai_model        VARCHAR(100),   -- claude-3-5-sonnet-20241022
  -- Destino
  lead_id         VARCHAR(36),    -- FK → comercial_leads.id (opcional)
  market_profile_id INTEGER,      -- FK → market_intelligence_profiles.id
  -- Status do pipeline
  status          VARCHAR(50) DEFAULT 'pending',
  -- pending | scraping | analyzing | done | error
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS texintel_enrichments_tenant_idx ON texintel_enrichments(tenant_id);
CREATE INDEX IF NOT EXISTS texintel_enrichments_cnpj_idx ON texintel_enrichments(cnpj);
```

---

## 3. Autenticação e Padrões de API

### Fluxo A — Usuário autenticado (Frontend → API)
```
Frontend → Supabase Auth → obtém JWT → envia como Bearer token
API recebe → requireAuth() valida JWT com supabaseAdmin.auth.getUser(token)
→ resolve tenant_id → chama requireTenantAccess()
```

### Fluxo B — Serviço interno / n8n → API (o que o TexIntel deve usar)
```
Header obrigatório: x-internal-key: <MARKETING_INTERNAL_API_KEY>
Sem JWT, sem sessão — autenticação por chave de serviço compartilhada
```

**Como o TexIntel deve se autenticar:**
```python
# Python (requests)
headers = {
    "x-internal-key": os.environ["MARKETING_INTERNAL_API_KEY"],
    "Content-Type": "application/json"
}
response = requests.post(
    "https://clovisart13.replit.app/api/internal/texintel/resultado",
    headers=headers,
    json=payload
)
```

```typescript
// TypeScript (fetch)
const res = await fetch(`${HUB_BASE_URL}/api/internal/texintel/resultado`, {
  method: "POST",
  headers: {
    "x-internal-key": process.env.MARKETING_INTERNAL_API_KEY!,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});
```

### Fluxo C — Chamadas internas processo-a-processo (mesmo servidor)
```typescript
// INTERNAL_SECRET — gerado no startup do processo, não persiste
// Usado apenas para chamadas loopback (127.0.0.1) dentro do mesmo container
import { INTERNAL_SECRET } from "./internalSecret";
// Só funciona de localhost — não usar do TexIntel externo
```

### Resolução de tenant por slug
```typescript
// Padrão usado em todas as rotas internas
const { data } = await supabaseAdmin
  .from("tenants")
  .select("id")
  .eq("slug", company_slug)  // ex: "r2pb"
  .single();
const tenantId = data?.id;
```

---

## 4. Funções e Triggers Reutilizáveis

> **Confirmado:** Não existem funções PostgreSQL nem triggers nativos no banco atual. Toda a lógica de evento é feita em código Node.js (jobs, webhooks, n8n).

### Webhooks/Jobs existentes que o TexIntel pode disparar via HTTP

| Endpoint Hub | Método | O que faz |
|---|---|---|
| `/api/internal/leads/by-email?email=X&tenant_id=Y` | GET | Busca lead por email |
| `/api/internal/leads/mirror` | POST | Espelha/cria lead no pipeline |
| `/api/internal/zapi/send-message` | POST | Envia WhatsApp via Z-API |
| `/api/internal/crm/meeting-booked` | POST | Confirma reunião agendada |
| `/api/atos/deliveries` | POST | Registra entrega no ATOS (rastreabilidade) |

### Header obrigatório para todas as rotas `/api/internal/*`
```
x-internal-key: <valor de MARKETING_INTERNAL_API_KEY>
```

### Notificação ao Kanban (quando lead converte)
Não há trigger automático. O fluxo é:
1. TexIntel salva em `texintel_enrichments` + `market_intelligence_profiles`
2. Chama `POST /api/internal/leads/mirror` para criar lead no pipeline
3. Opcionalmente chama `POST /api/atos/deliveries` para rastrear no ATOS

---

## 5. Boilerplate de Integração

### 5.1 Conexão com o banco (Drizzle ORM — dentro do monorepo)
```typescript
// lib/db/src/index.ts — padrão do projeto
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});
export const db = drizzle(pool, { schema });
export * from "./schema";
```

### 5.2 Schema Drizzle para nova tabela
```typescript
// lib/db/src/schema/texintel.ts
import { pgTable, varchar, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const texintelEnrichments = pgTable("texintel_enrichments", {
  id:           varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  tenantId:     varchar("tenant_id", { length: 100 }).notNull(),
  cnpj:         varchar("cnpj", { length: 20 }),
  companyName:  varchar("company_name", { length: 255 }),
  domain:       varchar("domain", { length: 255 }),
  cnpjData:     jsonb("cnpj_data"),
  siteContent:  text("site_content"),
  detectedPains:jsonb("detected_pains"),
  icpScore:     integer("icp_score"),
  aiSummary:    text("ai_summary"),
  aiModel:      varchar("ai_model", { length: 100 }),
  leadId:       varchar("lead_id", { length: 36 }),
  status:       varchar("status", { length: 50 }).default("pending"),
  errorMessage: text("error_message"),
  createdAt:    timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type TexintelEnrichment = typeof texintelEnrichments.$inferSelect;
```

### 5.3 Rota interna padrão (Express + Zod)
```typescript
// artifacts/api-server/src/routes/internal/texintel.ts
import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../../lib/logger";

const router = Router();

// Auth por x-internal-key (padrão do projeto)
function requireInternalKey(req: Request, res: Response, next: () => void) {
  const key = process.env["MARKETING_INTERNAL_API_KEY"];
  const provided = req.headers["x-internal-key"];
  if (!key || !provided || provided !== key) {
    res.status(401).json({ error: "Unauthorized — invalid x-internal-key" });
    return;
  }
  next();
}

const resultSchema = z.object({
  tenant_id:      z.string(),
  cnpj:           z.string().optional(),
  company_name:   z.string().optional(),
  detected_pains: z.array(z.string()).optional(),
  icp_score:      z.number().int().min(0).max(100).optional(),
  ai_summary:     z.string().optional(),
  ai_model:       z.string().optional(),
  lead_id:        z.string().optional(),
});

// POST /api/internal/texintel/resultado
router.post("/internal/texintel/resultado", requireInternalKey, async (req: Request, res: Response) => {
  const parsed = resultSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Payload inválido", details: parsed.error.issues });
    return;
  }

  const { tenant_id, cnpj, company_name, detected_pains, icp_score, ai_summary, ai_model, lead_id } = parsed.data;

  try {
    await db.execute(sql`
      INSERT INTO texintel_enrichments
        (tenant_id, cnpj, company_name, detected_pains, icp_score, ai_summary, ai_model, lead_id, status)
      VALUES
        (${tenant_id}, ${cnpj ?? null}, ${company_name ?? null},
         ${JSON.stringify(detected_pains ?? [])}::jsonb,
         ${icp_score ?? null}, ${ai_summary ?? null}, ${ai_model ?? null},
         ${lead_id ?? null}, 'done')
    `);

    logger.info({ tenant_id, cnpj }, "texintel: resultado salvo");
    res.json({ ok: true });
  } catch (err: any) {
    logger.error({ err: err.message }, "texintel: erro ao salvar resultado");
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

### 5.4 Chamada à API do Claude (padrão Anthropic)
```typescript
// O TexIntel chama diretamente via SDK da Anthropic
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,  // ou AI_INTEGRATIONS via Replit
});

async function detectPains(siteContent: string, cnpjData: object): Promise<string[]> {
  const response = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Você é um analista de inteligência B2B para o setor de moda/vestuário.
Analise os dados abaixo e identifique as 5 principais dores operacionais desta empresa.

DADOS CNPJ:
${JSON.stringify(cnpjData, null, 2)}

CONTEÚDO DO SITE:
${siteContent.slice(0, 3000)}

Retorne um JSON com: { "pains": ["dor1", "dor2", ...], "icp_score": 0-100, "summary": "..." }`
      }
    ]
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const parsed = JSON.parse(text);
  return parsed;
}
```

### 5.5 Enriquecimento de CNPJ (API pública — Brasil API)
```python
# Python — Brasil API (gratuita, sem autenticação)
import httpx

async def enrich_cnpj(cnpj: str) -> dict:
    cnpj_clean = "".join(filter(str.isdigit, cnpj))
    async with httpx.AsyncClient() as client:
        r = await client.get(f"https://brasilapi.com.br/api/cnpj/v1/{cnpj_clean}")
        r.raise_for_status()
        return r.json()
        # Retorna: razao_social, nome_fantasia, cnae_fiscal_descricao,
        #          porte, logradouro, municipio, uf, email, telefone, etc.
```

### 5.6 Salvar resultado de volta no Hub
```python
# Python — enviar resultado do TexIntel para o Hub
import httpx, os

HUB_BASE_URL = "https://clovisart13.replit.app"  # produção
# HUB_BASE_URL = "https://<dev-domain>.worf.replit.dev"  # dev

async def save_to_hub(tenant_id: str, result: dict):
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{HUB_BASE_URL}/api/internal/texintel/resultado",
            headers={
                "x-internal-key": os.environ["MARKETING_INTERNAL_API_KEY"],
                "Content-Type": "application/json"
            },
            json={
                "tenant_id": tenant_id,
                "cnpj": result.get("cnpj"),
                "company_name": result.get("company_name"),
                "detected_pains": result.get("pains", []),
                "icp_score": result.get("icp_score"),
                "ai_summary": result.get("summary"),
                "ai_model": "claude-opus-4-5"
            }
        )
        r.raise_for_status()
        return r.json()
```

---

## 6. Regras Críticas que o TexIntel deve respeitar

### Multi-tenancy
- **Toda** inserção no banco deve incluir `tenant_id` correto
- `tenant_id` é o UUID do tenant (não o slug) — resolva via Supabase: `SELECT id FROM tenants WHERE slug = 'r2pb'`
- Nunca inserir dados sem `tenant_id` — não existe dado "global" de lead ou empresa

### Separação de entidades de lead
```
comercial_leads   → potenciais CLIENTES em pipeline de vendas
parceiros_leads   → parceiros de PRODUÇÃO (oficinas, estamparias)
mira_leads        → leads do chatbot interno da Mirage
```
O TexIntel deve salvar em `texintel_enrichments` e linkar ao `comercial_lead` correto via `lead_id`.

### Banco de dados — nunca usar drizzle push em produção
- Dev: `drizzle-kit push` (interativo — cuidado com rename detection)
- Produção: adicionar migração idempotente em `artifacts/api-server/src/migrate.ts` → executada no próximo deploy via `CREATE TABLE IF NOT EXISTS`

### Env vars necessárias para o TexIntel
```bash
# No serviço TexIntel
ANTHROPIC_API_KEY=         # chave da API do Claude
HUB_BASE_URL=https://clovisart13.replit.app
MARKETING_INTERNAL_API_KEY= # mesma chave configurada no Hub (x-internal-key)

# Opcionais
BRASIL_API_BASE=https://brasilapi.com.br/api
```

### Env vars do Hub que o TexIntel NÃO deve ter acesso
```
DATABASE_URL              # acesso direto ao banco — nunca expor ao TexIntel
SUPABASE_SERVICE_ROLE_KEY # chave admin do Supabase — nunca expor
SESSION_SECRET
```

---

## 7. URLs de Produção

| Serviço | URL |
|---|---|
| Hub Mirage (frontend) | `https://clovisart13.replit.app` |
| API Hub (backend) | `https://clovisart13.replit.app/api/...` |
| n8n Cloud | `https://clovisart13.app.n8n.cloud` |
| Dev domain (Replit) | `https://<id>.worf.replit.dev` |

---

## 8. Fluxo Completo do TexIntel AI

```
Trigger (Hub UI ou n8n)
    └─► POST /api/internal/texintel/enrich { cnpj, tenant_id, lead_id? }
          └─► TexIntel recebe
                ├─► GET brasilapi.com.br/cnpj/{cnpj}     → dados da empresa
                ├─► Scraping do site (se site disponível)  → conteúdo
                └─► Claude API                             → pains, icp_score, summary
                      └─► POST /api/internal/texintel/resultado → salva no Hub
                            ├─► texintel_enrichments (tabela nova)
                            └─► market_intelligence_profiles (tabela existente)
```
