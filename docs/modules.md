# Módulos — Mirage Hub

> Visão consolidada de todos os módulos.  
> Para detalhes de cada módulo, abrir o arquivo correspondente em `docs/modules/`.  
> Atualizado em: Julho 2026 (auditoria com Clóvis).

---

## Mapa de módulos

| # | Módulo | Status | Acesso | Doc detalhada |
|---|---|---|---|---|
| 1 | Kanban Operacional | 🟢 Produção | Tenant | [01-kanban.md](modules/01-kanban.md) |
| 2 | PLM (Gestão de Produto) | 🟡 Implantação | Tenant | [02-plm.md](modules/02-plm.md) |
| 3 | CRM / Funil Comercial | 🟢 Produção | Tenant | [03-crm.md](modules/03-crm.md) |
| 4 | Cotações / Orçamento | 🟢 Produção | Tenant | — |
| 5 | Financeiro | 🔴 Em construção | Tenant | [04-financeiro.md](modules/04-financeiro.md) |
| 6 | Marketing / Growth | 🟡 Parcial | **Só Mirage** | [05-marketing.md](modules/05-marketing.md) |
| 7 | Comunidade / Banco de Parceiros | 🟡 Parcial | Tenant | [06-comunidade.md](modules/06-comunidade.md) |
| 8 | ATHOS | 🟢 Funcionando | **Só Mirage (Clóvis)** | — |
| 9 | Integrações | Varia | Admin | [07-integracoes.md](modules/07-integracoes.md) |

---

## Fluxo central do produto (R2PB)

```
Lead entra (WhatsApp / Landing Page / Site)
    │
    ▼
Helena CRM — robô de boas-vindas + qualificação
    │
    ├─► Potencial CLIENTE
    │       │
    │       ▼
    │   Pipeline Comercial (comercialLeads)
    │       │
    │       ▼
    │   Cotação / Orçamento
    │       │
    │       ▼ (aprovado)
    │   Kanban — pedido gerado
    │       │
    │       ├─► PLM — produto criado (ficha técnica)
    │       └─► VhSys — exportação de pedido
    │
    └─► Potencial PARCEIRO de produção
            │
            ▼
        Banco de Parceiros (parceiros_leads)
            │
            ▼
        Comunidade
```

---

## Módulo 1 — Kanban Operacional

**O que faz:** Gestão de pedidos, estoque, clientes, fornecedores e financeiro operacional.  
**Dados:** Em produção com dados reais da R2PB.  
**Integração principal:** Exporta pedidos e estoque para VhSys (manual).

**Entidades core:** `clientes`, `referencias` (= produtos), `pedidos`, `estoque`, `contas_a_pagar/receber`

---

## Módulo 2 — PLM (Gestão de Produto)

**O que faz:** Ciclo de vida do produto — ficha técnica, BOM, piloto, aprovação.  
**Usuários:** Estilista, designer, modelista.  
**Dados:** Em implantação — dados sendo inseridos agora.

**Débito:** `plm_produtos`, `plm_clientes` e `plm_fornecedores` precisam ser unificados com as tabelas do Kanban.

---

## Módulo 3 — CRM / Funil Comercial

**O que faz:** Captação, qualificação e progressão de leads. Integrado com Helena (WhatsApp).  
**Dados:** Funil ativo em produção.

**Tabelas de leads — mapa resumido:**
- `comercialLeads` — clientes em pipeline de vendas
- `mira_leads` — leads via IA da Hub
- `parceiros_leads` — parceiros de produção
- `leadsEspelho` — **desconhecido, não usar**

---

## Módulo 4 — Cotações / Orçamento

**O que faz:** Geração de orçamentos e fichas de custo.  
**Dados:** Em produção.  
**Posição no fluxo:** Recebe leads aprovados do CRM → gera orçamento → envia para Kanban.

---

## Módulo 5 — Financeiro

**O que faz:** Conciliação bancária via OFX e gestão de centros de custo.  
**Dados:** Importação manual, não usado para gestão real ainda.  
**Separação crítica:** Completamente independente do `contas_a_pagar/receber` do Kanban.

---

## Módulo 6 — Marketing / Growth

**O que faz:** Criação e publicação de conteúdo de marketing com IA.  
**Acesso:** Somente admin Mirage — tenants não acessam.  
**O que funciona:** Publicação no Instagram e Meta.  
**O que está parado:** Máquina de Vendas (bloqueio Meta/Z-API).

---

## Módulo 7 — Comunidade / Banco de Parceiros

**O que faz:** Diretório de parceiros de produção (oficinas, estamparias, etc.).  
**Prioridade:** 🎯 **#1 para o lançamento de agosto.**  
**Dados:** Tem parceiros cadastrados, captação não é sistemática.

---

## Módulo 8 — ATHOS

**O que faz:** Agente estratégico e mentor de Clóvis. Acesso a n8n, Supabase, GitHub, ATOS.  
**Acesso:** Somente Clóvis. Nunca expor a tenants.  
**Arquivos:** `routes/mentor/athosBridge.ts`, `routes/athos-memory/`

---

## Regras entre módulos

| Regra | Detalhes |
|---|---|
| Clientes e fornecedores são compartilhados | Kanban e PLM devem usar a mesma fonte |
| Referência = Produto | `referencias` no Kanban e `plm_produtos` no PLM são o mesmo objeto |
| Dois sistemas financeiros independentes | `contas_a_pagar/receber` (Kanban) ≠ `fin_*` (Financeiro) |
| Leads têm dois destinos | Cliente → pipeline comercial; Parceiro → banco de parceiros |
| Marketing/ATHOS são Mirage-only | Nunca expor esses módulos para tenants |
