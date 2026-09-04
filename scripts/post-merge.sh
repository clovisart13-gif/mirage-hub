#!/bin/bash
set -e

pnpm install --frozen-lockfile

# Rebuild API server (migrate.ts runs on startup and aplica colunas novas de forma segura)
pnpm --filter @workspace/api-server run build
