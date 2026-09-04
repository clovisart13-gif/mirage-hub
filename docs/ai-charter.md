# AI Charter — Mirage Hub

> **Este documento é a constituição do projeto.**
> Todo agente de IA (Replit Agent, ATHOS, ou qualquer outro) deve ler este arquivo antes de qualquer sessão de trabalho.
> As regras aqui são invioláveis. Não há exceções sem autorização explícita de Clóvis.

---

## Identidade do projeto

O Mirage Hub é um **SaaS multi-tenant em produção** com dados reais de clientes, pedidos e operações da R2PB.

Não é um protótipo. Não é um ambiente de teste.

Qualquer erro pode impactar dados reais e operações em andamento.

---

## Regras absolutas — nunca violar

### Sobre código e arquivos
- **Nunca altere módulos que não foram solicitados.** Se o pedido é sobre o Kanban, não toque em PLM, CRM, Financeiro ou qualquer outro módulo.
- **Nunca mova arquivos sem apresentar um plano escrito e receber aprovação.** Reorganizações de estrutura devem ser propostas antes de executadas.
- **Sempre proponha primeiro. Depois implemente.** Para qualquer mudança estrutural, apresente o plano, aguarde "pode fazer" e só então execute.
- **Nunca refatore código que não foi solicitado.** Melhorias de código só são feitas se explicitamente pedidas.

### Sobre banco de dados
- **Nunca crie tabelas duplicadas.** Antes de criar qualquer tabela, verifique o schema em `lib/db/src/schema/` para confirmar que não existe equivalente.
- **Nunca altere ou delete dados de produção sem backup confirmado.**
- **Nunca altere `tenant_id` de nenhum registro.**
- **Nunca altere RLS (Row Level Security) sem autorização explícita.**
- **Nunca aplique migrations sem confirmar o ambiente** — dev e produção têm bancos separados.
- **Sempre use `migrate.ts` para mudanças que precisam chegar em produção** — `drizzle-kit push` só funciona em dev.

### Sobre entidades compartilhadas
- `clientes` e `fornecedores` são **compartilhados entre Kanban e PLM** — nunca criar versões paralelas.
- `referencias` (Kanban) e `plm_produtos` (PLM) são **o mesmo produto** — nunca tratar como entidades separadas.
- `comercialLeads` ≠ `parceiros_leads` — são tipos de leads completamente diferentes, nunca misturar.
- `leadsEspelho` — **propósito desconhecido. Não usar até investigar.**

### Sobre finanças
- `contas_a_pagar/receber` (schema Kanban) e `fin_*` (módulo Financeiro) são **sistemas completamente independentes**. Nunca cruzar dados entre eles.

### Sobre multi-tenant
- Todo dado no banco tem `tenant_id`. Nunca fazer query sem filtrar por tenant.
- Nunca expor dados de um tenant para outro.
- Módulos Marketing/Growth, Máquina de Vendas e ATHOS são **exclusivos do admin Mirage (Clóvis)**. Nunca dar acesso a tenants nesses módulos.

---

## Regras de processo

### Antes de qualquer sessão
1. Ler `docs/modules/00-index.md` — índice geral com as regras mais importantes
2. Ler o arquivo do módulo relevante em `docs/modules/` antes de tocar no código
3. Verificar se existe algum handoff pendente em `agent_handoffs`

### Antes de qualquer mudança
1. Entender o impacto: quais outros módulos podem ser afetados?
2. Se a mudança envolve banco: qual é o plano de rollback?
3. Se a mudança envolve rotas de API: existe alguma integração externa que depende desse endpoint?

### Escopo estrito
- Nunca fazer mais do que foi pedido
- Se ao implementar algo descobrir um problema adjacente, **reportar** ao invés de corrigir por conta própria
- Dúvidas sobre regra de negócio: **perguntar** ao invés de assumir

---

## Arquitetura do banco de dados

| Ambiente | Onde fica | Como acessar |
|---|---|---|
| **Desenvolvimento** | PostgreSQL local no Replit (host: `helium`) | `DATABASE_URL` automático do Replit |
| **Produção** | Neon PostgreSQL (separado) | `DATABASE_URL` configurado nos secrets de produção |
| **Autenticação** | Supabase | Apenas para login/sessão — não armazena dados de negócio |

> ⚠️ Supabase é só autenticação. Os dados do negócio (pedidos, clientes, leads, etc.) estão no PostgreSQL local (dev) e Neon (produção). São bancos completamente separados.

---

## Módulos e responsabilidades

| Módulo | Arquivo de referência | Status |
|---|---|---|
| Kanban Operacional | `docs/modules/01-kanban.md` | 🟢 Produção |
| PLM | `docs/modules/02-plm.md` | 🟡 Implantação |
| CRM / Funil | `docs/modules/03-crm.md` | 🟢 Produção |
| Financeiro | `docs/modules/04-financeiro.md` | 🔴 Em construção |
| Marketing / Growth | `docs/modules/05-marketing.md` | 🟡 Parcial |
| Comunidade / Parceiros | `docs/modules/06-comunidade.md` | 🟡 Parcial |
| Integrações | `docs/modules/07-integracoes.md` | Varia |

---

## Integrações — regras críticas

- **VhSys:** lógica de SKU individual é do VhSys. Nunca replicar essa lógica no Hub.
- **Helena:** todos os leads WhatsApp passam pela Helena primeiro. Nunca criar fluxo que bypasse.
- **Z-API número alternativo:** sem fluxo ativo. Não criar dependências nele.
- **n8n:** qualquer alteração em workflow precisa de sanitização antes do PUT (ver memory `n8n-workflow-update-sanitization.md`).
- **Supabase:** não é banco de dados de negócio — apenas autenticação.

---

## Prioridade agosto 2026

> 🎯 **Comunidade para o Hub Mirage**
> Nenhuma outra feature nova deve ser iniciada antes da Comunidade estar funcional.

---

## Quem autoriza o quê

| Tipo de mudança | Precisa de autorização? |
|---|---|
| Bug fix em módulo isolado | Só descrição do problema + solução proposta |
| Nova feature | Proposta escrita + aprovação de Clóvis |
| Mudança de schema (banco) | Aprovação + plano de rollback |
| Reorganização de arquivos/pastas | Plano detalhado + aprovação explícita |
| Mudança em RLS / permissões | Aprovação explícita obrigatória |
| Deploy para produção | Aprovação explícita obrigatória |

---

*Este documento foi criado em julho de 2026 com base em auditoria direta com Clóvis (fundador).
Qualquer alteração neste arquivo requer aprovação do fundador.*
