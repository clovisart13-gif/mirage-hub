#!/usr/bin/env bash
set -euo pipefail

# Bootstrap seguro da trilha paralela.
# Não inicia api, nginx ou qualquer componente do Hub de produção.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"
IMPORT_MARKER="$ROOT_DIR/.claude-worker-relay-imported"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Arquivo de ambiente ausente: $ENV_FILE" >&2
  echo "Crie-o a partir de .env.example e preencha os valores no servidor Hetzner." >&2
  exit 2
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker não encontrado no servidor." >&2
  exit 2
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

required_variables=(
  N8N_HOST
  N8N_USER
  N8N_PASSWORD
  N8N_DB_HOST
  N8N_DB_NAME
  N8N_DB_USER
  N8N_DB_PASSWORD
  CLAUDE_RELAY_SHARED_SECRET
  CLAUDE_WORKER_SHARED_SECRET
  CLAUDE_SANDBOX_SHARED_SECRET
  ANTHROPIC_API_KEY
)
missing_variables=()
for variable_name in "${required_variables[@]}"; do
  if [[ -z "${!variable_name:-}" ]]; then
    missing_variables+=("$variable_name")
  fi
done
if (( ${#missing_variables[@]} > 0 )); then
  printf 'Configuração incompleta no .env. Faltam: %s\n' "${missing_variables[*]}" >&2
  exit 2
fi

cd "$ROOT_DIR"
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-mirage-parallel}"

echo "Subindo somente n8n paralelo, Claude Sandbox e Claude Worker..."
docker compose --env-file "$ENV_FILE" up -d --build n8n claude-sandbox claude-worker

echo "Aguardando o Sandbox ficar saudável..."
for attempt in $(seq 1 30); do
  status="$(docker compose --env-file "$ENV_FILE" ps --format json claude-sandbox 2>/dev/null || true)"
  if grep -q '"Health":"healthy"' <<<"$status"; then
    break
  fi
  if [[ "$attempt" == "30" ]]; then
    echo "Sandbox não ficou saudável. Consulte: docker compose logs claude-sandbox" >&2
    exit 1
  fi
  sleep 2
done

if [[ ! -f "$IMPORT_MARKER" ]]; then
  echo "Importando e ativando o relay no n8n paralelo..."
  docker compose --env-file "$ENV_FILE" exec -T n8n node -e \
    'const fs=require("node:fs"); const p="/bootstrap/claude-worker-relay.json"; const w=JSON.parse(fs.readFileSync(p,"utf8")); w.active=true; fs.writeFileSync("/tmp/claude-worker-relay.active.json", JSON.stringify(w));'
  docker compose --env-file "$ENV_FILE" exec -T n8n \
    n8n import:workflow --input=/tmp/claude-worker-relay.active.json
  touch "$IMPORT_MARKER"
else
  echo "Relay já importado neste host; não duplicando workflow."
fi

echo "Estado dos serviços:"
docker compose --env-file "$ENV_FILE" ps n8n claude-sandbox claude-worker

if ! command -v curl >/dev/null 2>&1; then
  echo "curl não encontrado; serviços subiram, mas o healthcheck HTTPS não foi executado." >&2
  exit 1
fi

health_url="${N8N_BASE_URL:-https://${N8N_HOST}}/webhook/${CLAUDE_WORKER_HEALTH_WEBHOOK_PATH:-claude-worker-health}"
health_body="$(curl -fsS --max-time 20 -H "x-claude-relay-secret: ${CLAUDE_RELAY_SHARED_SECRET}" "$health_url")"
if ! grep -q 'mirage-claude-worker' <<<"$health_body"; then
  echo "Relay respondeu, mas não identificou o Claude Worker." >&2
  exit 1
fi

echo "relay_healthcheck=passed"
echo "endpoint=${health_url%%/webhook/*}/webhook/${CLAUDE_WORKER_HEALTH_WEBHOOK_PATH:-claude-worker-health}"