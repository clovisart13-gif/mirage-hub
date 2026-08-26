# Status do relay paralelo

Atualizado em 2026-08-26.

## Escopo

Esta trilha é independente do Hub Mirage em produção. Não publica o Hub, não usa `--prod` na Vercel, não altera DNS, banco de produção ou automações ativas.

## Estado objetivo

**Parcialmente preparado — ainda não operacional.**

## Componentes preparados

1. ATHOS (`atos-control-center`, branch `main`)
   - `server/athosBridge.ts` ganhou `dispatch_claude_task`.
   - `server/mentorRouter.ts` recebeu as regras de papel, escopo e segurança do Claude.
   - Commits remotos registrados:
     - `5522f506b9aacc38a8332662eac905388417db79`
     - `dab48e46510aae8751cdf421d3c3e04aee42f56e`
2. n8n paralelo
   - Webhook público autenticado por segredo do relé.
   - Workflow: `n8n/claude-worker-relay.json`.
3. Claude Worker
   - `http://claude-worker:8787` somente na rede Docker.
   - `GET /health` para verificação.
   - `POST /tasks` para dispatch autenticado.
4. Claude Sandbox
   - Rede interna sem egress público.
   - Recebe apenas o source da tarefa atual.

## Teste mínimo definido

URL técnica:

```text
GET https://${N8N_HOST}/webhook/claude-worker-health
```

O comando executável é:

```bash
cd /opt/mirage/hetzner
N8N_BASE_URL="https://${N8N_HOST}" \
CLAUDE_RELAY_SHARED_SECRET="$CLAUDE_RELAY_SHARED_SECRET" \
node scripts/claude-relay-healthcheck.mjs
```

Critério de sucesso:

- HTTP 200 no webhook do n8n;
- resposta com `service` igual a `mirage-claude-worker`;
- `ok` igual a `true`;
- logs do n8n mostrando o encaminhamento;
- logs do Worker mostrando a consulta de health.

## Bloqueio atual

Nesta sessão não há acesso SSH, URL real ou credenciais administrativas do host Hetzner. Portanto não é possível afirmar que o workflow foi importado/ativado nem executar o healthcheck contra o servidor real. A configuração local foi validada estaticamente; o relay só pode ser chamado de forma operacional após o deploy paralelo e a importação do workflow.

## O que falta para “operacional”

1. Aplicar no host Hetzner os arquivos desta trilha sem apontar o Hub de produção para eles.
2. Preencher no ambiente da Hetzner os segredos do relé, Worker e Sandbox.
3. Copiar o registro operacional aprovado para o volume/configuração do Worker; o breaker externo deve continuar `false`.
4. Importar e ativar `claude-worker-relay.json` no n8n paralelo.
5. Configurar no ambiente do ATHOS `N8N_BASE_URL`, `CLAUDE_RELAY_SHARED_SECRET` e `CLAUDE_WORKER_WEBHOOK_PATH`.
6. Rodar o healthcheck e guardar o resultado nos logs da Hetzner.
7. Somente depois, executar um dispatch de laboratório sem escrita externa.

## Bootstrap reproduzível

No servidor Hetzner, o próximo comando é:

```bash
bash /opt/mirage/hetzner/bootstrap-claude-parallel.sh
```

Ele inicia exclusivamente `n8n`, `claude-sandbox` e `claude-worker`, importa o relay uma vez e executa o healthcheck HTTPS. Não inicia `api`, `nginx` ou qualquer componente do Hub em produção.