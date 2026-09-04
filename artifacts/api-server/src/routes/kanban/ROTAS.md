# Rotas da API — Módulo Kanban

Base URL: `/api` (prefixo aplicado pelo servidor Express)

Todas as rotas exigem autenticação via JWT do Supabase (`Authorization: Bearer <token>`).  
O `tenant_id` é extraído automaticamente do JWT pelo middleware `requireTenantAccess`.

---

## Arquivos do módulo

```
routes/kanban/
├── index.ts        ← Fornecedores, Clientes, Contas a Pagar, Pedidos,
│                     Movimentações, Estoque, Cores, Grades, Listas, Dashboard
└── referencias.ts  ← Referências (cartões do Kanban) + fases + imagens
```

---

## Referências (cartões do Kanban)

| Método | Rota                                        | Descrição                                             |
|--------|---------------------------------------------|-------------------------------------------------------|
| GET    | `/kanban/fases`                             | Lista todas as fases com metadados                   |
| GET    | `/kanban/referencias/board`                 | Board completo agrupado por fase                     |
| GET    | `/kanban/referencias`                       | Lista referências com filtros opcionais              |
| GET    | `/kanban/referencias/:id`                   | Detalhe de uma referência (+ imagens, movimentações) |
| POST   | `/kanban/referencias`                       | Criar nova referência (cartão)                       |
| PATCH  | `/kanban/referencias/:id`                   | Editar campos da referência                          |
| DELETE | `/kanban/referencias/:id`                   | Soft delete (ativo=false)                            |
| POST   | `/kanban/referencias/:id/mover`             | Mover para qualquer fase (drag simples)              |
| POST   | `/kanban/referencias/:id/concluir-fase`     | Concluir fase produtiva (popup ConcluirFaseDialog)   |
| POST   | `/kanban/referencias/:id/iniciar-proxima`   | Iniciar próxima fase (popup IniciarProximaFaseDialog) |
| GET    | `/kanban/referencias/:id/imagens`           | Listar imagens de uma referência                     |
| POST   | `/kanban/referencias/:id/imagens`           | Adicionar imagem                                     |
| DELETE | `/kanban/referencias/:id/imagens/:imgId`    | Remover imagem                                       |
| GET    | `/kanban/referencias/:id/movimentacoes`     | Histórico de fases de uma referência                 |

### Query params — `/kanban/referencias`
- `fase` — filtrar por fase (ex: `corte`)
- `cliente_id` — filtrar por cliente
- `busca` — busca por código (ILIKE)

### Query params — `/kanban/referencias/board`
- `cliente_id` — filtrar por cliente
- `busca` — busca por código

### Payload — POST `/kanban/referencias`
```json
{
  "codigo": "REF-001",
  "descricao_modelo": "Camiseta Oversized",
  "nome_cliente": "Cliente X",
  "cliente_id": "uuid-opcional",
  "numero_op": "OP-001",
  "numero_pedido": "PED-123",
  "quantidade": 100,
  "cmp": 1050,          // centavos (R$ 10,50)
  "valor_venda": 89.90, // reais
  "cores": "Azul, Vermelho",
  "grade": "P/M/G/GG",
  "previsao_conclusao": "2026-05-01",
  "fase_atual": "inicio"
}
```

### Payload — POST `/kanban/referencias/:id/mover`
```json
{
  "fase_destino": "costura",
  "quantidade": 98,
  "perda_quantidade": 2,
  "cmo": 2500,              // centavos
  "fornecedor_id": "uuid",
  "data_prevista": "2026-05-15",
  "data_real": "2026-05-10",
  "observacoes": "sem problemas"
}
```

### Payload — POST `/kanban/referencias/:id/concluir-fase`
```json
{
  "quantidade_conferida": 98,
  "perda_quantidade": 2,
  "cmo": 2500,           // centavos — gera conta a pagar se fornecedor estiver vinculado
  "data_real": "2026-05-10",
  "observacoes": ""
}
```

### Payload — POST `/kanban/referencias/:id/iniciar-proxima`
```json
{
  "fase_destino": "acabamento",
  "fornecedor_id": "uuid",
  "cmo": 1800,           // centavos — gera conta a pagar automaticamente
  "quantidade": 98,
  "data_prevista": "2026-05-20"
}
```

---

## Fornecedores

| Método | Rota                        | Descrição           |
|--------|-----------------------------|---------------------|
| GET    | `/kanban/fornecedores`      | Listar ativos       |
| POST   | `/kanban/fornecedores`      | Criar               |
| PATCH  | `/kanban/fornecedores/:id`  | Editar              |
| DELETE | `/kanban/fornecedores/:id`  | Soft delete         |

---

## Clientes

| Método | Rota                    | Descrição           |
|--------|-------------------------|---------------------|
| GET    | `/kanban/clientes`      | Listar ativos       |
| POST   | `/kanban/clientes`      | Criar               |
| PATCH  | `/kanban/clientes/:id`  | Editar              |
| DELETE | `/kanban/clientes/:id`  | Soft delete         |

---

## Contas a Pagar

| Método | Rota                               | Descrição                       |
|--------|------------------------------------|----------------------------------|
| GET    | `/kanban/contas-a-pagar`           | Listar (filtro: status, fornecedor_id) |
| POST   | `/kanban/contas-a-pagar`           | Criar manualmente               |
| PATCH  | `/kanban/contas-a-pagar/:id/pagar` | Marcar como pago                |
| PATCH  | `/kanban/contas-a-pagar/:id`       | Editar campos                   |
| DELETE | `/kanban/contas-a-pagar/:id`       | Cancelar (soft — status=cancelado) |

---

## Outros

| Método | Rota                     | Descrição                            |
|--------|--------------------------|--------------------------------------|
| GET    | `/kanban/pedidos`        | Listar pedidos                       |
| POST   | `/kanban/pedidos`        | Criar pedido                         |
| GET    | `/kanban/movimentacoes`  | Histórico geral de movimentações     |
| GET    | `/kanban/estoque`        | Estoque por referência               |
| GET    | `/kanban/cores`          | Listar cores                         |
| POST   | `/kanban/cores`          | Criar cor                            |
| DELETE | `/kanban/cores/:id`      | Excluir cor                          |
| GET    | `/kanban/grades`         | Listar grades                        |
| POST   | `/kanban/grades`         | Criar grade                          |
| DELETE | `/kanban/grades/:id`     | Excluir grade                        |
| GET    | `/kanban/listas`         | Filtros salvos                       |
| POST   | `/kanban/listas`         | Salvar filtro                        |
| PATCH  | `/kanban/listas/:id`     | Editar filtro                        |
| DELETE | `/kanban/listas/:id`     | Excluir filtro                       |
| GET    | `/kanban/dashboard`      | Resumo: refs por fase + financeiro   |

---

## Fluxo de fases e geração de contas

```
Drag de fase produtiva (corte/beneficiamento/costura/lavanderia/acabamento/passadoria)
  └─► ConcluirFaseDialog   → POST /concluir-fase  (registra conclusão + CMO)
        └─► IniciarProximaFaseDialog → POST /iniciar-proxima (inicia próxima + gera conta a pagar)

Drag entrando em TECIDO
  └─► IniciarTecidoDialog  → POST /iniciar-proxima  (sem CMO, sem conta a pagar)
        └─► ConcluirTecidoDialog → POST /mover (retorna para próxima fase)

Drag entrando em EXPEDIÇÃO
  └─► IniciarExpedicaoDialog → POST /iniciar-proxima
        └─► ExpedicaoDialog → POST /mover  (move para faturamento)

Fases administrativas (inicio/espera/modelagem/risco/faturamento/concluido)
  └─► Mover direto → POST /mover  (sem popup)
```

---

## Onde fica cada coisa no código

| O que fazer                    | Arquivo                                        |
|-------------------------------|------------------------------------------------|
| Alterar fases disponíveis     | `referencias.ts` — constante `FASES`          |
| Alterar fases produtivas      | `referencias.ts` — constante `FASES_PRODUTIVAS` |
| Lógica de gerar conta a pagar | `referencias.ts` — rotas `/mover` e `/iniciar-proxima` |
| Schema das tabelas            | `lib/db/src/schema/kanban.ts`                  |
| Sincronizar banco             | `pnpm --filter @workspace/db run push-force`   |
| Dialogs do front              | `artifacts/hub/src/components/kanban/`         |
| Board visual                  | `artifacts/hub/src/pages/kanban.tsx`           |
| Tipos TypeScript (front)      | `artifacts/hub/src/components/kanban/types.ts` |
