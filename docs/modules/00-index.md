# Documentação de Módulos — Mirage Hub

> **Para agentes de IA:** Leia este índice antes de qualquer sessão de trabalho.  
> Cada módulo tem seu arquivo detalhado. Abra o módulo relevante antes de tocar no código.  
> Última auditoria: Julho 2026 (validado com Clóvis, fundador).

---

## Índice de módulos

| # | Módulo | Arquivo | Status |
|---|---|---|---|
| 1 | Kanban Operacional | [01-kanban.md](./01-kanban.md) | 🟢 Produção |
| 2 | PLM (Gestão de Produto) | [02-plm.md](./02-plm.md) | 🟡 Implantação |
| 3 | CRM / Funil Comercial | [03-crm.md](./03-crm.md) | 🟢 Produção |
| 4 | Financeiro | [04-financeiro.md](./04-financeiro.md) | 🔴 Em construção |
| 5 | Marketing / Growth | [05-marketing.md](./05-marketing.md) | 🟡 Parcial |
| 6 | Comunidade / Banco de Parceiros | [06-comunidade.md](./06-comunidade.md) | 🟡 Parcial |
| 7 | Integrações Externas | [07-integracoes.md](./07-integracoes.md) | Varia |
| 8 | Status Geral | [08-status-geral.md](./08-status-geral.md) | — |

---

## Regras que todo agente deve saber

### Entidades compartilhadas — não duplicar
- `clientes` e `fornecedores` são **compartilhados entre Kanban e PLM** — mesma entidade, mesmo banco
- `referencias` (Kanban) = `plm_produtos` (PLM) — mesmo produto, dois ângulos

### Sistemas financeiros — não misturar
- `contas_a_pagar/receber` no Kanban = financeiro **operacional dos pedidos**
- `fin_*` no módulo Financeiro = conciliação bancária **independente**
- São completamente separados — nunca cruzar os dados

### Lógica de SKU — regra crítica
- No Hub (Kanban/PLM): **referência = produto** (variações de cor/tamanho são atributos)
- No VhSys: cada SKU é individual por exigência contábil
- Nunca aplicar lógica de SKU individual dentro do Hub

### Acesso a módulos
- Marketing, Growth, Máquina de Vendas, ATHOS: **somente admin Mirage (Clóvis)**
- Tenants só acessam seus próprios módulos operacionais

### Leads — não misturar tipos
- `comercialLeads` = potenciais clientes (pipeline de vendas)
- `parceiros_leads` = parceiros de produção (oficinas, fornecedores)
- `leadsEspelho` = **propósito desconhecido — não usar sem investigar**

### Integrações com cuidado
- Z-API número alternativo: sem fluxo ativo — não criar dependências nele
- VhSys: exportação manual via botão — integração não é automática
- Helena: todos os leads WhatsApp passam por ela primeiro

---

## Prioridade agosto 2026

> 🎯 **Comunidade para o Hub Mirage**

---

## Fluxo central do produto

```
Lead (WhatsApp / Landing Page)
    └─► Helena → qualificação
          ├─► Cliente → Pipeline → Cotação → Kanban → PLM → VhSys
          └─► Parceiro → Banco de Parceiros → Comunidade
```
