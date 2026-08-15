# Mirage Hub — Stack Paralela na Hetzner

> Ambiente paralelo de validação. **Replit continua sendo produção oficial** até convicção total.

## Arquitetura

```
Hetzner VPS (4 GB recomendado)
├── mirage-api   → API Server (porta 3000)
└── mirage-n8n   → n8n self-hosted (porta 5678)
```

## Setup

```bash
git clone https://github.com/clovisart13-gif/mirage-hub.git
cd mirage-hub/docker

cp .env.example .env
nano .env   # preencher todas as variáveis

docker compose up -d
docker compose logs -f api-server
```

## Healthcheck

```bash
curl http://localhost:3000/api/health
```

## Migração de workflows n8n — por camadas

**Não migrar tudo de uma vez.** Ordem definida pelo ATHOS:

| Camada | Workflows | Quando |
|---|---|---|
| **A** | MIRAGE_PING, rotinas de teste | Primeiro |
| **B** | MIRAGE_INSTAGRAM_PUBLISHER_V2, HEYGEN_ORCHESTRATOR, CAMPAIGN_FACTORY | Após A validada |
| **C** | LEAD_NURTURE_ENGINE, LEAD_RESCUE_ENGINE, ZAPI_POSTFUNNEL_ROUTER | Após B validada |
| **D** | Fluxos R2PB e atendimento sensíveis | Aprovação explícita de Clóvis |

**Como migrar:** exportar JSON no n8n cloud → importar no n8n Hetzner → reconfigurar credenciais → testar → só desativar no cloud após confirmação.

## Variáveis críticas

| Variável | Obrigatória |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ |
| `SESSION_SECRET` | ✅ |
| `N8N_API_KEY` | ✅ |
| `ZAPI_CLIENT_TOKEN` | ⚠️ WhatsApp |

## Importante

> Upgrade da Hetzner de **2 GB → 4 GB** antes de subir a stack completa.
> Com 2 GB o n8n pode ficar sem memória em workflows pesados.
