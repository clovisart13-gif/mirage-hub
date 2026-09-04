# Auditoria de Módulos — Mirage Hub
> Criado pelo Replit Agent para validação com Clóvis.
> **Como usar:** leia cada seção, apague a linha `Resposta:` e escreva a sua resposta.
> Não precisa ser formal — pode ser informal, pode ser incompleto. Qualquer informação já ajuda.
> Quando terminar, manda o arquivo de volta ou fala "terminei a auditoria" no Replit.

---

## 🧩 MÓDULO 1 — KANBAN OPERACIONAL

O schema `kanban.ts` tem as tabelas: `clientes`, `fornecedores`, `cores`, `grades`, `referencias`, `pedidos`, `itens_pedido`, `estoque`, `estoque_grades`, `contas_a_pagar`, `contas_a_receber`, `movimentacoes`, `pedido_sinais`.

### Perguntas

**1.1** A tabela `clientes` do Kanban — quem são esses clientes?
- [ ] Clientes da marca (quem compra os produtos da empresa)
- [ ] Lojistas / revendedores
- [ ] Os mesmos clientes do VhSys (sincronizados)
- [ ] Outra coisa

Resposta: 

---

**1.2** A tabela `referencias` — o que é uma "referência" nesse contexto?
- [ ] É o mesmo que produto (uma referência = um produto)
- [ ] É o SKU de um produto (variação de produto)
- [ ] É uma referência de peça/modelo para produção
- [ ] Outra coisa

Resposta: 

---

**1.3** O Kanban tem `contas_a_pagar` e `contas_a_receber`. O módulo **Financeiro** também tem `fin_transacoes`. São a mesma coisa ou dois sistemas financeiros separados?

Resposta: 

---

**1.4** O Kanban está funcionando em produção hoje? Os dados são reais ou ainda está em teste?

Resposta: 

---

**1.5** O Kanban se conecta com o VhSys? De que forma?
- [ ] Não se conecta
- [ ] VhSys envia pedidos para o Kanban
- [ ] Kanban envia pedidos para o VhSys
- [ ] Sincronização em ambos os sentidos

Resposta: 

---

## 🧩 MÓDULO 2 — PLM (Gestão de Produto)

O schema `plm.ts` tem: `plm_clientes`, `plm_fornecedores`, `plm_produtos`, `plm_fichas_tecnicas`, `plm_moldes`, `plm_materiais`, `plm_boms`, `plm_colecoes`, `plm_pilotos`, `plm_aprovacoes`.

### Perguntas

**2.1** O PLM tem seus próprios `plm_clientes` e `plm_fornecedores`. São os mesmos clientes e fornecedores do Kanban, ou são entidades separadas?

Resposta: 

---

**2.2** Qual a diferença entre `plm_produtos` e `referencias` do Kanban? O mesmo produto existe nas duas tabelas?

Resposta: 

---

**2.3** O PLM está funcionando em produção ou ainda é um módulo em construção?
- [ ] Em produção, com dados reais
- [ ] Em construção / beta
- [ ] Só mockup, sem backend funcionando

Resposta: 

---

**2.4** Quem usa o PLM no dia a dia? (estilista, produção, você mesmo?)

Resposta: 

---

## 🧩 MÓDULO 3 — CRM / FUNIL COMERCIAL

Tabelas encontradas: `comercialLeads`, `mira_leads`, `parceiros_leads`, `leadsEspelho`, `leadJourney`, `leadJourneyEvents`, `leadConversationState`, `leadAiEvents`.

### Perguntas

**3.1** Existem 4 tabelas que parecem ser "leads". Me ajuda a entender cada uma:

- `comercialLeads` — 

- `mira_leads` — 

- `parceiros_leads` — 

- `leadsEspelho` — 

Resposta: (preencha ao lado de cada uma)

---

**3.2** A Helena — o que é exatamente? 
- [ ] Um CRM externo (software terceiro)
- [ ] Um bot de WhatsApp que vocês operam
- [ ] Um produto da Mirage (white-label)
- [ ] Outra coisa

Resposta: 

---

**3.3** Quando um lead chega, qual o caminho que ele percorre no sistema? (pode ser informal, tipo "lead vem do instagram, entra no..., depois vai para...")

Resposta: 

---

**3.4** O funil comercial (`crm.tsx`, `funil-leads.tsx`) está ativo e sendo usado no dia a dia?

Resposta: 

---

## 🧩 MÓDULO 4 — FINANCEIRO

Tabelas: `fin_contas`, `fin_categorias`, `fin_naturezas`, `fin_centros_custo`, `fin_transacoes`, `fin_regras_class`, `fin_historico_import`, `fin_metas_mensais`.

### Perguntas

**4.1** O financeiro é separado do VhSys ou é o mesmo? O VhSys não tem módulo financeiro também?

Resposta: 

---

**4.2** Como entram as transações no financeiro do Hub? 
- [ ] Importação manual (planilha)
- [ ] Integração automática com banco
- [ ] Digitação manual
- [ ] Sincronizado com VhSys

Resposta: 

---

**4.3** O financeiro está funcionando em produção?
- [ ] Sim, dados reais
- [ ] Em construção
- [ ] Só interface, sem dados reais

Resposta: 

---

## 🧩 MÓDULO 5 — MARKETING / GROWTH

Tabelas: `campaign_assets`, `campaign_publications`, `campaign_metrics`, `tenant_assets`, `brand_blueprints`, `campaign_blueprints`, `machine_creatives`, `content_pack_items`.

### Perguntas

**5.1** O módulo de Growth — quem é o cliente final? A Mirage usa para si mesma ou é um produto vendido para outros?

Resposta: 

---

**5.2** A "Máquina de Vendas" (`maquina-vendas.tsx`) — o que ela faz exatamente?

Resposta: 

---

**5.3** O marketing está integrado com alguma plataforma externa (Meta Ads, RD Station, etc)?

Resposta: 

---

## 🧩 MÓDULO 6 — COMUNIDADE / BANCO DE PARCEIROS

Tabelas relacionadas: `parceiros_leads` (no schema kanban).

### Perguntas

**6.1** O Banco de Parceiros (`banco-parceiros.tsx`) — quem são os parceiros?
- [ ] Fornecedores de matéria-prima
- [ ] Representantes / lojistas parceiros
- [ ] Candidatos a franqueados
- [ ] Outra coisa

Resposta: 

---

**6.2** Essa funcionalidade está ativa? Tem parceiros cadastrados?

Resposta: 

---

## 🧩 MÓDULO 7 — INTEGRAÇÕES EXTERNAS

### Perguntas

**7.1** VhSys — o que é sincronizado entre o Hub e o VhSys hoje? (pode listar o que funciona de verdade, não o que era pra funcionar)

Resposta: 

---

**7.2** Z-API — quais fluxos de WhatsApp estão ativos hoje?

Resposta: 

---

**7.3** n8n — tem fluxos ativos? Quais?

Resposta: 

---

**7.4** Supabase — é usado só para autenticação ou tem dados armazenados lá também?

Resposta: 

---

## 🧩 MÓDULO 8 — STATUS GERAL

### Perguntas

**8.1** Dos módulos abaixo, marque o status real de cada um:

| Módulo | 🟢 Funcionando | 🟡 Parcial | 🔴 Não funciona / em construção |
|---|---|---|---|
| Kanban Operacional | | | |
| PLM | | | |
| Financeiro | | | |
| CRM / Funil | | | |
| Marketing / Growth | | | |
| Banco de Parceiros | | | |
| Cotações / Orçamento | | | |
| Comunidade | | | |
| ATHOS | | | |

---

**8.2** Quais são as 3 funcionalidades que mais travam o seu dia hoje (que não funcionam direito)?

1. 
2. 
3. 

---

**8.3** Se você pudesse resolver só UMA coisa antes do lançamento de agosto, qual seria?

Resposta: 

---

*Fim da auditoria. Obrigado pela paciência — essas respostas vão eliminar 80% dos erros das próximas sessões.*
