# Banco de Dados — Mirage Hub

> Fonte da verdade: `lib/db/src/schema/`  
> ORM: Drizzle ORM  
> Banco: PostgreSQL 16  
> Atualizado em: Julho 2026

---

## Ambientes

| Ambiente | Onde | Acesso |
|---|---|---|
| Desenvolvimento | PostgreSQL local Replit (host: `helium`) | Automático via `DATABASE_URL` |
| Produção | Neon PostgreSQL (externo) | `DATABASE_URL` nos secrets de produção |
| Auth | Supabase | Separado — só sessão/login, sem dados de negócio |

---

## Regras globais

- Todo dado de negócio tem `tenant_id` — **sempre filtrar por tenant em toda query**
- Nunca criar tabelas sem `tenant_id` (exceto tabelas de infraestrutura)
- Nunca deletar ou alterar `tenant_id` de registros existentes
- Nunca criar tabela sem verificar se já existe um equivalente
- Migrations de produção: apenas via `migrate.ts` com `IF NOT EXISTS`

---

## Mapa de schemas por arquivo

### `kanban.ts` — Operacional central
Módulo em produção com dados reais da R2PB.

| Tabela | Propósito |
|---|---|
| `clientes` | Clientes operacionais — mesmos do VhSys; cadastro completo acontece ao fechar pedido |
| `fornecedores` | Fornecedores — compartilhados com PLM (mesma entidade) |
| `cores` | Cores disponíveis para produtos |
| `grades` | Grades de tamanho (P/M/G/GG etc.) |
| `referencias` | **Produtos** — referência = produto com variações. Mesma entidade que `plm_produtos` |
| `imagens_referencia` | Imagens associadas a cada referência/produto |
| `pedidos` | Pedidos de produção/venda |
| `itens_pedido` | Itens de cada pedido (referência + quantidade + grade) |
| `estoque` | Saldo de estoque por referência |
| `estoque_grades` | Saldo de estoque por referência + grade específica |
| `movimentacoes` | Movimentações de estoque (entrada/saída) |
| `contas_a_pagar` | Contas a pagar — sistema financeiro **operacional** do Kanban, independente do módulo Financeiro |
| `contas_a_receber` | Contas a receber — idem acima |
| `pedido_sinais` | Sinais/marcos de progresso do pedido |
| `kanban_fase_config` | Configuração das fases do kanban por tenant |
| `mira_leads` | Leads que entram via IA da Hub Mirage |
| `parceiros_leads` | Parceiros de produção captados pelo CRM (oficinas, estamparias, etc.) |
| `listas_customizadas` | Listas customizáveis de kanban |

> ⚠️ `contas_a_pagar/receber` são do fluxo operacional de pedidos. **Não confundir com `fin_transacoes`.**

---

### `plm.ts` — Gestão de Produto
Módulo em implantação — dados sendo inseridos.

| Tabela | Propósito |
|---|---|
| `plm_clientes` | Clientes PLM — **devem ser os mesmos de `clientes` no Kanban** (pendente unificação) |
| `plm_fornecedores` | Fornecedores PLM — **devem ser os mesmos de `fornecedores` no Kanban** (pendente unificação) |
| `plm_produtos` | Produtos PLM — **mesma entidade que `referencias` no Kanban** (pendente padronização) |
| `plm_fichas_tecnicas` | Especificação técnica do produto |
| `plm_colecoes` | Agrupamento de produtos por coleção |
| `plm_moldes` | Dados de modelagem |
| `plm_materiais` | Materiais/insumos cadastrados |
| `plm_boms` | BOM (Bill of Materials) — lista de insumos por produto |
| `plm_bom_linhas` | Linhas individuais de cada BOM |
| `plm_pilotos` | Protótipos de produto |
| `plm_piloto_etapas` | Etapas de desenvolvimento do piloto |
| `plm_aprovacoes` | Fluxo de aprovação para liberar produção |
| `plm_auditoria` | Log de auditoria do PLM |

> ⚠️ `plm_clientes`, `plm_fornecedores` e `plm_produtos` são duplicatas lógicas das tabelas do Kanban. Não criar mais dados nestas até a unificação ser definida.

---

### `financeiro.ts` — Conciliação bancária
Módulo independente. Sem conexão com Kanban ou outros módulos.

| Tabela | Propósito |
|---|---|
| `fin_contas` | Contas bancárias cadastradas |
| `fin_categorias` | Categorias de receita/despesa |
| `fin_naturezas` | Naturezas contábeis |
| `fin_centros_custo` | Centros de custo para rateio |
| `fin_transacoes` | Transações importadas via OFX |
| `fin_regras_class` | Regras automáticas de classificação |
| `fin_historico_import` | Histórico de importações OFX |
| `fin_metas_mensais` | Metas mensais de receita/despesa |

> ⚠️ **Completamente separado de `contas_a_pagar/receber` do Kanban.** Nunca cruzar dados.

---

### `comercial_pipeline.ts` — Pipeline comercial
| Tabela | Propósito |
|---|---|
| `comercialLeads` | Leads aprovados para pipeline de vendas (potenciais clientes) |

---

### `lead_journey.ts` — Jornada do lead
| Tabela | Propósito |
|---|---|
| `leadJourney` | Registro da jornada do lead |
| `leadJourneyEvents` | Eventos individuais da jornada |
| `leadConversationState` | Estado da conversa com o lead |
| `leadAiEvents` | Eventos gerados por IA no lead |

---

### `leads_espelho.ts` — Espelho de leads
| Tabela | Propósito |
|---|---|
| `leadsEspelho` | **Propósito desconhecido** — não usar até investigar |

---

### `marketing.ts` — Marketing e campanhas
| Tabela | Propósito |
|---|---|
| `campaign_assets` | Assets de mídia (imagens, vídeos) das campanhas |
| `campaign_publications` | Publicações realizadas (Instagram, Meta) |
| `campaign_metrics` | Métricas de desempenho |
| `tenant_assets` | Assets de marca por tenant |
| `brand_blueprints` | Templates de identidade visual |
| `campaign_blueprints` | Templates de campanha reutilizáveis |
| `campaign_schedule_slots` | Agendamento de publicações |
| `machine_creatives` | Criativos da máquina de vendas |
| `content_pack_items` | Itens de content packs |

---

### `growth.ts` — Crescimento
| Tabela | Propósito |
|---|---|
| `growth_campaigns` | Campanhas de growth |
| `growth_campaign_slots` | Slots de criativo por campanha |
| `growth_assets` | Assets gerados (imagens, vídeos) |

---

### `automation.ts` — Automação comercial
| Tabela | Propósito |
|---|---|
| `sales_automation_config` | Configuração de automação por tenant |

---

### `comunidade.ts` — Comunidade
| Tabela | Propósito |
|---|---|
| (ver schema) | Fórum, fornecedores, vagas — módulo em construção |

---

### `moda_conecta.ts` — Moda Conecta
Módulo de pré-cadastro e curadoria de fornecedores da plataforma Moda Conecta.

| Tabela | Propósito |
|---|---|
| `moda_conecta_leads` | Pré-cadastros de fundadores/fornecedores captados via LP ou formulário |

**Separação de tenant:** via coluna `company_slug` (ex: `mirage`). **Não confundir com `comercial_leads`** (pipeline CRM da R2PB) nem com `parceiros_leads` (parceiros de produção).

**Campos principais:** `full_name`, `email`, `whatsapp`, `city`, `state`, `role_in_chain`, `specialties`, `main_need`, `main_offer`, `status`, `review_notes`

**Status possíveis:** `novo` → `em_revisao` → `aprovado` / `rejeitado` / `incompleto` / `convite_enviado`

**Curadoria:** feita no painel Admin do Hub (`/admin`, aba Moda Conecta) via endpoint `/api/moda-conecta/leads?companySlug=mirage`

---

### `parceiros.ts` — Banco de Parceiros
| Tabela | Propósito |
|---|---|
| `parceiros` | Parceiros de produção (oficinas, estamparias, etc.) aprovados |

---

### `helena.ts` — Integração Helena CRM
| Tabela | Propósito |
|---|---|
| `helena_card_migrations` | Controle de migração de cards da Helena |

---

### `agent_handoffs.ts` — Handoffs de agente
| Tabela | Propósito |
|---|---|
| `agent_handoffs` | Transferências de tarefa entre agentes IA e humano |

---

### `athos_memory.ts` — Memória do ATHOS
| Tabela | Propósito |
|---|---|
| (ver schema) | 4 domínios de memória: blueprints, market, entries, snapshots |

---

### `atos.ts` — Decisões automatizadas
| Tabela | Propósito |
|---|---|
| `atos_decisions` | Decisões tomadas pelo executor de agentes |

---

### `mentor.ts` — Mentor (ATHOS)
| Tabela | Propósito |
|---|---|
| `mentor_messages` | Histórico de mensagens do mentor |

---

### `conversations.ts` / `messages.ts` — Chat
| Tabela | Propósito |
|---|---|
| `conversations` | Conversas do chat interno |
| `messages` | Mensagens individuais |

---

### `feedback.ts` — Feedback
| Tabela | Propósito |
|---|---|
| `feedback` | Feedback de usuários |

---

### `orcamentos.ts` — Orçamentos
| Tabela | Propósito |
|---|---|
| (ver schema) | Orçamentos e fichas de custo |

---

### `integracoes.ts` — Integrações
| Tabela | Propósito |
|---|---|
| (ver schema) | Configurações de integrações por tenant |

---

## Entidades que precisam de unificação (débito técnico)

| Entidade | Tabela A | Tabela B | Situação |
|---|---|---|---|
| Produtos | `referencias` (kanban) | `plm_produtos` (plm) | Mesma coisa — pendente padronização |
| Clientes | `clientes` (kanban) | `plm_clientes` (plm) | Mesma fonte — pendente unificação |
| Fornecedores | `fornecedores` (kanban) | `plm_fornecedores` (plm) | Mesma fonte — pendente unificação |
