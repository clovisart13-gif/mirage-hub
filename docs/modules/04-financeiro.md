# Módulo 4 — Financeiro

**Status:** 🔴 Em construção / teste  
**Arquivo de schema:** `lib/db/src/schema/financeiro.ts`  
**Rotas:** `artifacts/api-server/src/routes/financeiro/`

---

## O que é

Módulo de conciliação bancária e gestão de centros de custo. É **completamente independente** de todos os outros módulos — não tem conexão com Kanban, VhSys, PLM ou CRM hoje.

---

## Separação crítica

| Sistema | O que controla | Conexão com outros módulos |
|---|---|---|
| `contas_a_pagar/receber` (Kanban) | Financeiro operacional dos pedidos | Integrado ao fluxo de pedidos do Kanban |
| `fin_*` (este módulo) | Conciliação bancária + centros de custo | **Nenhuma** conexão com outros módulos hoje |

> ⚠️ São dois sistemas financeiros independentes. Nunca misturar os dados dos dois.

---

## Como funciona hoje

- Entrada de dados: **importação manual de arquivo OFX** (extrato bancário)
- A importação não é feita com regularidade — depende de ação manual
- Os dados existem mas não são usados para gestão real da R2PB hoje

---

## Entidades

| Tabela | Propósito |
|---|---|
| `fin_contas` | Contas bancárias cadastradas |
| `fin_categorias` | Categorias de receita/despesa |
| `fin_naturezas` | Naturezas contábeis |
| `fin_centros_custo` | Centros de custo para rateio |
| `fin_transacoes` | Transações importadas do OFX |
| `fin_regras_class` | Regras automáticas de classificação de transações |
| `fin_historico_import` | Histórico de importações OFX realizadas |
| `fin_metas_mensais` | Metas mensais de receita/despesa |

---

## Rotas de API

**Arquivo:** `artifacts/api-server/src/routes/financeiro/index.ts`

| Método | Endpoint | Função |
|---|---|---|
| GET | `/api/financeiro/conexoes-banco` | Listar conexões bancárias |
| POST | `/api/financeiro/conexoes-banco` | Criar conexão bancária |
| PUT | `/api/financeiro/conexoes-banco/:id` | Atualizar conexão |
| DELETE | `/api/financeiro/conexoes-banco/:id` | Remover conexão |
| POST | `/api/financeiro/conexoes-banco/:id/importar` | Importar OFX da conexão |
| POST | `/api/financeiro/pluggy/set-accounts` | Configurar contas Pluggy |

---

## Componentes Frontend

**Páginas:** `artifacts/hub/src/pages/financeiro/`
- `index.tsx` — Dashboard financeiro
- `extrato.tsx` — Extrato bancário
- `conciliacao.tsx` — Conciliação de transações
- `categorias.tsx` — Gestão de categorias
- `regras.tsx` — Regras de classificação automática
- `importar.tsx` — Importação OFX manual
- `conexoes.tsx` — Gestão de conexões bancárias

**Componentes:** `artifacts/hub/src/components/financeiro/`
- `FinanceiroLayout.tsx` — Layout base do módulo

---

## Dependências

**Este módulo usa:**
- Schema `financeiro.ts` — completamente isolado
- Pluggy (open banking — conexão com bancos)

**Outros módulos que dependem do Financeiro:**
- Nenhum — módulo totalmente independente hoje

---

## VhSys e Financeiro

O VhSys tem módulo fiscal (notas fiscais) mas **não tem DRE ou conciliação bancária**. Por isso o módulo Financeiro do Hub existe separadamente — para cobrir o que o VhSys não cobre.

---

## Objetivo futuro

Integração automática com banco para conciliação sem ação humana.

---

## O que NÃO fazer neste módulo

- Não conectar `fin_transacoes` com `contas_a_pagar/receber` do Kanban sem definição explícita de como reconciliar os dois
- Não usar os dados do financeiro como fonte de verdade para gestão — ainda não é confiável
