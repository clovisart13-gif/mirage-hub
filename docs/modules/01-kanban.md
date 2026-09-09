# Módulo 1 — Kanban Operacional

**Status:** 🟢 Em produção com dados reais  
**Tenant principal:** R2PB  
**Arquivo de schema:** `lib/db/src/schema/kanban.ts`  
**Rotas:** `artifacts/api-server/src/routes/kanban/`  
**Página principal:** `artifacts/hub/src/pages/kanban.tsx`

---

## O que é

O Kanban é o núcleo operacional da plataforma. Gerencia pedidos, estoque, clientes, fornecedores e movimentações financeiras básicas da operação de moda (R2PB).

---

## Entidades principais

### `clientes`
- São os **mesmos clientes do VhSys** — não é uma entidade separada
- Ciclo de vida do cliente:
  1. Entra no CRM com dados básicos (nome + WhatsApp)
  2. É aprovado no pipeline comercial → gera orçamento
  3. Fecha pedido → cadastro completo preenchido no Kanban
  4. Exportado para o VhSys

### `referencias`
- **Referência = Produto** (mesma coisa que `plm_produtos` no PLM)
- No Kanban e PLM: 1 referência = 1 produto, com variações de cor/tamanho
- No VhSys: cada SKU é individual (cor diferente = SKU diferente) por exigência contábil
- **Regra:** não criar lógica de SKU no Kanban/PLM — isso é responsabilidade do VhSys

### `fornecedores`
- Mesmos fornecedores do PLM — o banco de dados deve ser compartilhado

### `pedidos` / `itens_pedido`
- Pedidos gerados a partir de orçamentos aprovados
- Exportados para VhSys via botão manual (integração existe mas precisa de melhorias nos campos)

### `estoque` / `estoque_grades`
- Controle de estoque por referência e grade (cor/tamanho)
- Exportação para VhSys via botão manual

### `pre_agendamentos` / `pre_agendamento_itens` / `pre_agendamento_ajustes`
- Uma referência só fica elegível depois de possuir uma movimentação de saída da fase `corte`
- A fase `corte` é obrigatória; elegibilidade também exige `quantidade_cortada` maior que zero
- Owner/admin do tenant pode diagnosticar um pedido ausente e reconstruir o marco do Corte, com quantidade confirmada e sem alterar fase, custos ou integrações; autoridade Master não concede acesso operacional implícito
- O documento de pré-agendamento gera Pix BR Code estático com o total final incorporado e código copia e cola; não cria cobrança bancária nem chama integrações externas
- O documento pode reunir vários produtos do mesmo pedido
- Quantidade é congelada a partir da conferência do Corte; valor unitário vem do item do pedido
- Sinais, desconto e acréscimo do pedido são congelados como ajustes de origem `order`
- Ajustes manuais exigem tipo, descrição e valor
- Um pré-agendamento ativo pode ser revertido enquanto nenhum estoque vinculado estiver faturado
- A entrada em Expedição continua criando o estoque; a conferência de cor, grade e quantidade real permanece manual
- O pré-agendamento é finalizado somente quando todos os seus produtos estiverem faturados no Estoque

### `contas_a_pagar` / `contas_a_receber`
- **Sistema financeiro próprio do Kanban** — completamente independente do módulo Financeiro (`fin_*`)
- Não há nenhuma conexão entre os dois sistemas hoje
- Representa o financeiro operacional da operação de pedidos

---

## Integração com VhSys

**Direção (R2PB):** Kanban → VhSys  
**O que exporta:** pedidos e estoque  
**Como:** botão manual na interface (não automático)  
**Status:** funcional mas precisa melhorar campos integrados  

> ⚠️ Para outros tenants, pode fazer sentido a direção inversa (VhSys → Kanban). Isso precisa ser parametrizável por tenant no futuro.

---

## Rotas de API

**Arquivo:** `artifacts/api-server/src/routes/kanban/index.ts`

| Método | Endpoint | Função |
|---|---|---|
| GET | `/api/kanban/clientes` | Listar clientes |
| POST | `/api/kanban/clientes` | Criar cliente |
| PATCH | `/api/kanban/clientes/:id` | Atualizar cliente |
| DELETE | `/api/kanban/clientes/:id` | Remover cliente |
| GET | `/api/kanban/fornecedores` | Listar fornecedores |
| POST | `/api/kanban/fornecedores` | Criar fornecedor |
| PATCH | `/api/kanban/fornecedores/:id` | Atualizar fornecedor |
| DELETE | `/api/kanban/fornecedores/:id` | Remover fornecedor |
| GET | `/api/kanban/pedidos` | Listar pedidos |
| POST | `/api/kanban/pedidos` | Criar pedido |
| PATCH | `/api/kanban/pedidos/:id` | Atualizar pedido |
| DELETE | `/api/kanban/pedidos/:id` | Remover pedido |
| GET | `/api/kanban/pedidos/:id/detail` | Detalhe do pedido |
| GET | `/api/kanban/pedidos/:id/cartoes` | Cartões do pedido |
| POST | `/api/kanban/pedidos/:id/gerar-cartao-referencia` | Gerar cartão de referência |
| POST | `/api/kanban/pedidos/:id/enviar-cliente-erp` | Exportar pedido para VhSys |
| GET/POST/DELETE | `/api/kanban/pedidos/:id/sinais` | Sinais/marcos do pedido |
| GET | `/api/kanban/contas-a-pagar` | Listar contas a pagar |
| POST | `/api/kanban/contas-a-pagar` | Criar conta a pagar |
| PATCH | `/api/kanban/contas-a-pagar/:id` | Atualizar conta |
| PATCH | `/api/kanban/contas-a-pagar/:id/pagar` | Marcar como paga |
| DELETE | `/api/kanban/contas-a-pagar/:id` | Remover conta |
| POST | `/api/kanban/itens-pedido` | Adicionar item ao pedido |
| GET | `/api/kanban/pre-agendamentos/eligiveis` | Listar produtos que já saíram do Corte e ainda não estão pré-agendados |
| GET | `/api/kanban/pre-agendamentos` | Listar documentos ativos, revertidos e finalizados |
| GET | `/api/kanban/pre-agendamentos/:id` | Abrir documento com produtos e ajustes congelados |
| POST | `/api/kanban/pre-agendamentos` | Criar documento para vários produtos do mesmo pedido |
| POST/DELETE | `/api/kanban/pre-agendamentos/:id/ajustes` | Incluir ou remover ajustes manuais |
| POST | `/api/kanban/pre-agendamentos/:id/reverter` | Reverter documento ainda não faturado |

---

## Componentes Frontend

**Páginas:** `artifacts/hub/src/pages/`
- `kanban.tsx` — Board principal do Kanban
- `kanban-pedidos.tsx` — Gestão de pedidos
- `kanban-estoque.tsx` — Controle de estoque
- `kanban-clientes.tsx` — Gestão de clientes
- `kanban-fornecedores.tsx` — Gestão de fornecedores
- `kanban-contas-pagar.tsx` — Contas a pagar
- `kanban-contas-receber.tsx` — Contas a receber
- `kanban-gerir-aviamentos.tsx` — Gestão de aviamentos
- `kanban-relatorio-fases.tsx` — Relatório de fases
- `kanban-preview.tsx` — Preview de referência

**Componentes:** `artifacts/hub/src/components/kanban/`
- `KanbanLayout.tsx` — Layout base do módulo
- `NovoCartaoDialog.tsx` — Dialog para criar cartão
- `EditarCartaoDialog.tsx` — Dialog para editar cartão
- `ConcluirFaseDialog.tsx` — Dialog para concluir fase
- `ExpedicaoDialog.tsx` — Dialog de expedição

---

## Dependências

**Este módulo usa:**
- VhSys (exportação de pedidos e estoque)
- Módulo PLM (referências/produtos compartilhados)
- Schema `kanban.ts` — fonte principal de dados

**Outros módulos que dependem do Kanban:**
- PLM (lê clientes e fornecedores do Kanban)
- Cotações/Orçamento (gera pedido no Kanban após aprovação)

---

## O que NÃO fazer neste módulo

- Não criar lógica de SKU individual — isso é do VhSys
- Não misturar `contas_a_pagar/receber` do Kanban com `fin_transacoes` do módulo Financeiro
- Não duplicar cadastro de clientes/fornecedores — devem ser os mesmos do PLM

---

## Próximos passos conhecidos

- Aprimorar campos na exportação Kanban → VhSys
- Unificar cadastro de clientes/fornecedores com o PLM (banco compartilhado)
