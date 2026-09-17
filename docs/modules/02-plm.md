# Módulo 2 — PLM (Product Lifecycle Management)

**Status:** 🟡 Em implantação (identidade técnica autorizada e famílias compartilhadas)
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
- Registros históricos permanecem para compatibilidade; novos cadastros usam `clientes`

Novos produtos, fichas e pilotos usam a tabela central `clientes`. `plm_clientes`
permanece somente para compatibilidade com dados legados (`cliente_central_id`).

### Identidade técnica
- Cada tenant usa uma única sequência de referências técnicas. O prefixo é
  resolvido genericamente a partir do tenant (R2PB gera `R2PB-0001`).
- O código técnico é criado pelo servidor, pertence ao tenant + cliente central
  + produto técnico e é imutável. A referência original do orçamento permanece
  no campo `referencia`; o código `R2PB-0001` alimenta o campo separado
  `referencia_cliente` no produto, no pedido e no cartão criado pelo fluxo normal.
- A ficha é preenchida progressivamente como uma identidade estável; sua
  referência técnica e referência do cliente não mudam.
- O SKU do VhSys continua sendo referência técnica + cor + tamanho. O Hub não
  faz chamadas externas ao VhSys.

### `plm_familias_produto`
- Mestre de famílias por tenant compartilhado com Fichas de Custo.
- É preenchido conservadoramente a partir de famílias não vazias em
  `fichas_custo`, categorias de produtos e fichas PLM (incluindo BERMUDA).
- API: `GET/POST /api/plm/familias-produto` e `/api/custos/familias`.

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
- Registra o andamento reversível das fases da pilotagem: `pendente → iniciado → concluido`
- Uma fase concluída pode ser reaberta e uma fase iniciada pode voltar para pendente; todas as mudanças entram na auditoria
- `aprovado` e `reprovado` pertencem somente à decisão final da pilotagem
- Alçadas por usuário/empresa são uma evolução futura; durante a implantação, usuários com acesso ao tenant podem operar as fases

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

### Padrão de busca e filtros
- Listagens do PLM combinam busca textual e filtros sem deixar controles visuais desconectados dos dados.
- Seletores com clientes, produtos, famílias, coleções, processos ou outras listas extensas devem ter altura limitada e rolagem vertical.
- Quando qualquer filtro estiver ativo, a tela oferece `Limpar filtros`; telas paginadas voltam à primeira página ao alterar os filtros.
- Pilotagem, Aprovações e Relatórios resolvem o cliente pelo cadastro central, usando o identificador legado apenas como compatibilidade.
- A busca de materiais por família exclui materiais inativos e nunca permite reinseri-los em uma ficha de custo.
- Histórico permite filtrar por texto, módulo e ação e carregar registros além do primeiro lote.

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
3. A aprovação de uma cotação cria/reutiliza o cliente central e cria somente o
   produto PLM. Ficha técnica e pilotagem começam depois por ação explícita. O
   envio posterior ao Pedido/Kanban mantém a referência original e copia o código
   técnico para o campo separado de referência do cliente.

---

## O que NÃO fazer neste módulo

- Não criar lógica de SKU individual (isso é do VhSys)
- Não cadastrar clientes/fornecedores separadamente do Kanban — devem ser a mesma fonte
- Não criar condicionais por slug ou nome de tenant para regras de negócio.
