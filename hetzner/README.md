# Mirage Hub — Motor Operacional (Hetzner VPS)

> **Plano B — Infraestrutura de produção futura.**  
> Hoje tudo roda no Replit. Esta pasta contém os arquivos prontos para subir no Hetzner quando você decidir migrar.

---

## Arquitetura

```
Replit Agent  →  GitHub  →  Vercel (frontend: mirage-hub)
                          →  Hetzner (backend: API Server + n8n + Claude Worker)
                                  Supabase (banco central)
```

---

## Pré-requisitos no Hetzner

- VPS com Ubuntu 22.04 (mínimo 2 vCPU / 4 GB RAM)
- Docker + Docker Compose instalados
- Domínio apontando para o IP do VPS:
  - `api.seudominio.com.br` → IP do Hetzner
  - `n8n.seudominio.com.br` → IP do Hetzner

---

## Passo a passo para subir

### 1. Copiar os arquivos para o servidor

```bash
scp -r ./hetzner/ root@IP_DO_HETZNER:/opt/mirage/
ssh root@IP_DO_HETZNER
cd /opt/mirage
```

### 2. Criar o arquivo .env

```bash
cp .env.example .env
nano .env   # preencher todos os valores reais
```

### 3. Gerar certificados SSL (primeira vez)

```bash
# Sobe só o nginx primeiro para validar o domínio
docker compose up -d nginx

# Gera o certificado para a API
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d api.seudominio.com.br

# Gera o certificado para o n8n
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d n8n.seudominio.com.br
```

### 4. Subir o motor paralelo

Para esta trilha, não suba `api` ou `nginx` junto. O bootstrap inicia somente o n8n paralelo, o Sandbox e o Claude Worker, importa o relay e executa o healthcheck:

```bash
bash /opt/mirage/hetzner/bootstrap-claude-parallel.sh
```

Esse comando não altera o Hub de produção. Ele usa `COMPOSE_PROJECT_NAME=mirage-parallel`, não inicia `api` nem `nginx`, importa o workflow apenas uma vez neste host e falha sem executar tarefa externa se o healthcheck não passar.

### 5. Apontar o frontend (Vercel) para a nova API

No painel da Vercel, adicionar variável de ambiente:
```
VITE_API_URL=https://api.seudominio.com.br
```

---

## Atualizar o código depois de um push no GitHub

```bash
cd /opt/mirage
git pull
docker compose restart api
```

---

## Comandos úteis

| Comando | Descrição |
|---|---|
| `docker compose ps` | Status de todos os containers |
| `docker compose logs -f api` | Logs em tempo real da API |
| `docker compose logs -f n8n` | Logs em tempo real do n8n |
| `docker compose restart api` | Reiniciar só a API |
| `docker compose down` | Parar tudo |
| `docker compose up -d` | Subir tudo |

---

## Claude Worker operacional

O `claude-worker` é um consultor técnico operacional isolado. Ele recebe tarefas por HTTP dentro da rede Docker, clona apenas repositórios autorizados, trabalha em uma branch própria, executa checks, abre pull requests e publica somente previews no Vercel.

Os checks de build/typecheck não rodam no container com credenciais: o `claude-sandbox` recebe somente um pacote temporário do workspace da tarefa corrente, executa uma cópia descartável sem tokens, sem perfil de browser e sem acesso ao volume de configuração, e fica numa rede Docker interna sem saída pública. Ele nunca monta os workspaces persistentes do Worker.

O n8n pode chamar o Worker internamente:

```text
POST http://claude-worker:8787/tasks
Authorization: Bearer <CLAUDE_WORKER_SHARED_SECRET>
Content-Type: application/json
```

Exemplo de tarefa de código:

```json
{
  "taskId": "vercel-hub-diagnostico-001",
  "mode": "hybrid",
  "environment": "preview",
  "tenant": { "slug": "mirage" },
  "asset": "frontend Hub Mirage no Vercel",
  "repo": {
    "owner": "clovisart13-gif",
    "name": "mirage-hub",
    "ref": "main"
  },
  "objective": "Diagnosticar e corrigir o bloqueio do build do frontend sem tocar na produção.",
  "instructions": "Leia o contexto do Mirage, investigue primeiro, faça a menor correção e valide o preview.",
  "allowedTools": [
    "workspace_list",
    "workspace_read",
    "workspace_write",
    "run_check",
    "git_diff",
    "git_commit_push",
    "github_open_pull_request",
    "vercel_preview"
  ],
  "externalWritesApproved": true,
  "timeoutSeconds": 900
}
```

Endpoints disponíveis:

- `GET /health` — healthcheck sem autenticação, sem expor valores.
- `POST /tasks` — cria e inicia uma tarefa autenticada.
- `GET /tasks/:taskId` — consulta status e resultado.
- `POST /tasks/:taskId/cancel` — solicita cancelamento.

Para operar Helena ou VhSys, o handoff deve informar o tenant e o ativo exato, autorizar os domínios no `.env`, liberar apenas as ferramentas necessárias e usar `environment: "operations"`. O breaker `CLAUDE_EXTERNAL_OPERATIONS_ENABLED` inicia em `false`: operações externas não executam até que ele seja ativado conscientemente após configurar as allowlists. O browser começa em contexto efêmero; perfis persistentes devem ser ativados separadamente por tenant, nunca compartilhados.

Para qualquer clique ou preenchimento externo, o Worker exige `browser_verify_scope`: a página precisa exibir os marcadores de tenant e ativo recebidos no handoff antes da ação. APIs de Helena/VhSys exigem provider, paths e IDs de recurso específicos em `externalScope`.

Os valores operacionais não vêm do handoff. Antes de ligar o breaker, o operador deve criar o conteúdo do volume Docker `claude_worker_config` a partir de `hetzner/claude-worker/context/operations-registry.example.json`, gravando `operations-registry.json` como root no host e montando o volume somente em leitura no Worker. Esse arquivo não fica no workspace da tarefa e não pode ser alterado pelo processo do Claude. O handoff usa apenas `tenant`, `provider` e `assetId`; se eles não baterem com esse registro, o Worker recusa a tarefa.

Ferramentas externas de leitura possuem allowlist:

- Helena: `api.wts.chat`, endpoints de painéis/sessões conhecidos.
- VhSys: `api.vhsys.com/v2`, endpoints de clientes, pedidos, produtos e financeiro.

Criação de robôs, movimentação de cards ou outros writes externos deve usar browser com `externalWritesApproved=true` em uma tarefa específica. Não há acesso genérico a qualquer site.

### Política de credenciais

- `ANTHROPIC_API_KEY`, GitHub, Vercel, Helena, VhSys e logins de browser ficam somente no ambiente da Hetzner.
- Nunca enviar valores ao ATHOS, ao modelo, ao Git ou aos logs.
- O GitHub do Worker deve ser limitado ao repositório necessário.
- O Vercel do Worker deve ser limitado a previews; o Worker não usa `--prod`.
- Builds e typechecks são executados exclusivamente no `claude-sandbox`, que não recebe credenciais e não tem saída pública. Para `vercel build`, o Sandbox recebe apenas `VERCEL_ORG_ID` e `VERCEL_PROJECT_ID` (metadados não secretos), gera seu `.vercel/project.json` localmente e não possui token para fazer pull de settings ou variáveis. O build produz um pacote `.vercel/output` hash-verificado, que o Worker extrai em diretório limpo e envia com `vercel deploy --prebuilt`; a CLI de deploy não executa scripts da branch. Git e Vercel recebem somente a credencial pontual necessária, nunca o conjunto de secrets do Worker.

## Relé ATHOS → n8n → Claude Worker

O ponto de entrada técnico da trilha paralela é:

```text
GET  https://${N8N_HOST}/webhook/claude-worker-health
POST https://${N8N_HOST}/webhook/claude-worker-task
       └─ n8n (rede mirage-net)
            └─ http://claude-worker:8787/health ou /tasks
```

O workflow está em `hetzner/n8n/claude-worker-relay.json`. O arquivo também é montado como `/bootstrap/claude-worker-relay.json` no container n8n. Para importar uma única vez no n8n paralelo:

```bash
cd /opt/mirage/hetzner
docker compose exec -T n8n n8n import:workflow --input=/bootstrap/claude-worker-relay.json
```

Depois da importação, confirme que **ATHOS → Claude Worker Relay** está ativo. O workflow valida `x-claude-relay-secret` antes de encaminhar qualquer chamada e envia o segredo do Worker somente no salto interno n8n → Worker.

O teste seguro, que não cria tarefa nem chama Anthropic, é:

```bash
cd /opt/mirage/hetzner
N8N_BASE_URL="https://${N8N_HOST}" \
CLAUDE_RELAY_SHARED_SECRET="$CLAUDE_RELAY_SHARED_SECRET" \
node scripts/claude-relay-healthcheck.mjs
```

O script deve retornar HTTP 200 e `service: "mirage-claude-worker"`. Ele não executa código, não chama browser, não aciona Helena/VhSys e não altera produção.

O dispatch de tarefa só deve ser usado depois desse healthcheck. O ATHOS precisa ter `N8N_BASE_URL`, `CLAUDE_RELAY_SHARED_SECRET` e `CLAUDE_WORKER_WEBHOOK_PATH=claude-worker-task` em seu próprio ambiente. O segredo do relé deve ser o mesmo nos dois lados, mas deve ser diferente de `CLAUDE_WORKER_SHARED_SECRET`.

O endereço recebido anteriormente (`clovisart13.app.n8n.cloud/signin`) é uma conta n8n Cloud e não é o n8n paralelo da Hetzner. O bootstrap usa o `N8N_HOST` definido no `.env` do servidor; não deve ser apontado para o n8n Cloud enquanto o Worker permanecer privado na rede Docker.
