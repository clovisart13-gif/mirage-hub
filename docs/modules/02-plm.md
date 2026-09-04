# Módulo 2 — PLM (Product Lifecycle Management)

**Status:** 🟡 Em implantação (dados sendo inseridos agora)  
**Usuários:** Estilista, Designer, Modelista  
**Arquivo de schema:** `lib/db/src/schema/plm.ts`  
**Rotas:** `artifacts/api-server/src/routes/plm/`  
**Página principal:** `artifacts/hub/src/pages/` (rotas PLM)

---

## O que é

Gerencia o ciclo de vida dos produtos da R2PB: desde a concepção (coleção, ficha técnica, modelagem) até a aprovação para produção. É usado pelo time criativo — estilistas, designers e modelistas.

---

## Entidades principais

### `plm_produtos`
- **Mesma coisa que `referencias` do Kanban** — são o mesmo produto visto de ângulos diferentes
- PLM vê o produto pelo ângulo técnico (ficha técnica, BOM, piloto)
- Kanban vê o produto pelo ângulo operacional (pedido, estoque)
- **Pendência:** padronizar e unificar as duas tabelas ou criar referência cruzada clara

### `plm_clientes`
- **Mesmos clientes do Kanban** — banco de dados deve ser compartilhado
- Hoje estão separados — isso é um problema a corrigir

### `plm_fornecedores`
- **Mesmos fornecedores do Kanban** — banco de dados deve ser compartilhado
- Hoje estão separados — isso é um problema a corrigir

### `plm_fichas_tecnicas`
- Especificação técnica do produto (materiais, medidas, acabamentos)

### `plm_colecoes`
- Agrupamento de produtos por coleção (ex: Verão 2025)

### `plm_moldes` / `plm_materiais` / `plm_boms` / `plm_bom_linhas`
- BOM (Bill of Materials): lista de insumos necessários para produzir o produto
- Moldes: arquivos/dados de modelagem

### `plm_pilotos` / `plm_piloto_etapas`
- Controle do piloto (protótipo) do produto antes da produção em escala

### `plm_aprovacoes`
- Fluxo de aprovação: produto aprovado no PLM → vai para Kanban como referência/pedido

---

## Fluxo de criação de produto

```
Orçamento aprovado no CRM
    └─► Enviado ao Kanban (gera pedido)
          └─► Deve criar automaticamente produto no PLM
                └─► Estilista/modelista preenche ficha técnica
                └─► Piloto criado e aprovado
                └─► Produto liberado para produção
```

> ⚠️ A criação automática do produto no PLM a partir do Kanban ainda não está implementada — está sendo feita manualmente agora.

---

## Rotas de API

**Arquivo:** `artifacts/api-server/src/routes/plm/index.ts`

| Método | Endpoint | Função |
|---|---|---|
| GET | `/api/plm/dashboard/kpis` | KPIs do dashboard PLM |
| GET | `/api/plm/dashboard/kanban` | Visão kanban do PLM |
| GET | `/api/plm/dashboard/atividades` | Atividades recentes |
| GET | `/api/plm/colecoes` | Listar coleções |
| POST | `/api/plm/colecoes` | Criar coleção |
| PATCH | `/api/plm/colecoes/:id` | Atualizar coleção |
| GET | `/api/plm/clientes` | Listar clientes PLM |

---

## Componentes Frontend

**Páginas:** `artifacts/hub/src/pages/plm/`
- `index.tsx` — Dashboard PLM
- `produtos.tsx` — Gestão de produtos/referências
- `fichas.tsx` — Fichas técnicas
- `materiais.tsx` — Gestão de materiais
- `fornecedores.tsx` — Fornecedores PLM
- `colecoes.tsx` — Coleções
- `pilotagem.tsx` — Gestão de pilotos
- `aprovacoes.tsx` — Fluxo de aprovações

**Componentes:** `artifacts/hub/src/components/plm/`
- `PLMLayout.tsx` — Layout base do módulo

---

## Dependências

**Este módulo usa:**
- Schema `plm.ts` — dados próprios
- `clientes` e `fornecedores` do Kanban (devem ser unificados)

**Outros módulos que dependem do PLM:**
- Kanban (produto aprovado no PLM libera produção)
- Cotações (ficha técnica origina orçamento)

---

## Problemas conhecidos

1. `plm_clientes` e `plm_fornecedores` são tabelas separadas das equivalentes no Kanban — precisam ser unificadas
2. `plm_produtos` e `referencias` (Kanban) representam o mesmo conceito — precisam de padronização
3. Nenhuma automação entre Kanban → PLM ainda implementada

---

## O que NÃO fazer neste módulo

- Não criar lógica de SKU individual (isso é do VhSys)
- Não cadastrar clientes/fornecedores separadamente do Kanban — devem ser a mesma fonte
