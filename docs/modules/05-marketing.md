# Módulo 5 — Marketing / Growth

**Status:** 🟡 Parcialmente funcional (publicação ativa, Growth em construção)  
**Acesso:** Somente administrador Mirage — tenants não têm acesso  
**Arquivo de schema:** `lib/db/src/schema/marketing.ts`  
**Rotas:** `artifacts/api-server/src/routes/marketing/`  
**Páginas:** `marketing-panel.tsx`, `marketing-growth.tsx`, `marketing-pilotos.tsx`, `marketing-content-pack.tsx`

---

## O que é

Ferramenta interna da Mirage para criação e publicação de conteúdo de marketing. Futuramente será a base para oferecer serviços de marketing para tenants assinantes. **Hoje é exclusivo do admin Mirage.**

---

## O que está funcionando

### Publicação de conteúdo ✅
- Publicação direta no Instagram e Meta
- Integração com Meta API ativa
- Criação de assets de campanha

---

## O que está em construção

### Growth (`marketing-growth.tsx`)
- Módulo em construção
- Propósito: ferramentas de crescimento para a Mirage usar na prestação de serviços a tenants
- Tenants não têm acesso direto

### Máquina de Vendas (`maquina-vendas.tsx`)
- **Status:** 🔴 Pausado
- **Motivo:** Meta bloqueou integração Z-API temporariamente
- **Propósito original:** multiagentes para atendimento e nutrição de leads via WhatsApp
- **Regra importante:** este módulo não deve conflitar com o CRM — deve cobrir o que o CRM não cobre
- Precisa de redefinição de escopo antes de retomar

---

## Rotas de API

**Arquivos:** `routes/marketing/index.ts`, `routes/internal/marketing.ts`, `routes/meta.ts`

| Método | Endpoint | Função |
|---|---|---|
| GET | `/api/marketing/instagram-account` | Dados da conta Instagram |
| GET | `/api/marketing/content-pack/my` | Content pack do tenant |
| POST | `/api/marketing/content-pack` | Criar content pack |
| POST | `/api/marketing/assets/upload` | Upload de asset |
| POST | `/api/internal/marketing/campaigns/:id/generate` | Gerar criativos da campanha |
| POST | `/api/internal/marketing/launch-campaign` | Publicar campanha |
| POST | `/api/meta/data-deletion` | Exclusão de dados Meta (obrigatório LGPD) |

---

## Componentes Frontend

**Páginas:** `artifacts/hub/src/pages/`
- `marketing-panel.tsx` — Painel principal de marketing
- `marketing-growth.tsx` — Módulo Growth
- `marketing-pilotos.tsx` — Criativos piloto
- `marketing-content-pack.tsx` — Content packs
- `maquina-vendas.tsx` — Máquina de Vendas (pausada)
- `maquina-marketing.tsx` — Automação de marketing

---

## Dependências

**Este módulo usa:**
- Google Gemini (geração de imagens)
- FAL.ai (geração de imagens alternativa)
- Meta API (publicação no Instagram/Facebook)
- HeyGen (geração de vídeos com avatar)
- Replit Object Storage (armazenamento de assets)
- Schema `marketing.ts`, `growth.ts`

**Outros módulos que dependem do Marketing:**
- Nenhum — módulo independente (uso exclusivo Mirage)

---

## Entidades

| Tabela | Propósito |
|---|---|
| `campaign_assets` | Assets de mídia das campanhas |
| `campaign_publications` | Publicações realizadas (Instagram, Meta) |
| `campaign_metrics` | Métricas de desempenho das campanhas |
| `tenant_assets` | Assets de marca por tenant |
| `brand_blueprints` | Templates de identidade visual |
| `campaign_blueprints` | Templates de campanhas reutilizáveis |
| `campaign_schedule_slots` | Agendamento de publicações |
| `machine_creatives` | Criativos gerados pela máquina de vendas |
| `content_pack_items` | Itens de content packs |

---

## O que NÃO fazer neste módulo

- Não dar acesso a tenants sem validação interna da Mirage primeiro
- Não retomar a Máquina de Vendas sem redefinir o escopo e garantir que não conflita com o CRM
- Não criar fluxos de WhatsApp por Z-API enquanto o bloqueio da Meta não for resolvido
