# Reconciliação de Cadastros Mestres — Fase 3

**Ambiente:** desenvolvimento
**Tenant confirmado:** Quick Threads Ltda.
**Tenant ID:** 4a21771a-2f34-4506-8bb2-176b94731387
**Escopo:** Mirage Hub / R2PB
**Data:** 05/09/2026

## 1. Alteração estrutural aplicada

O schema aditivo foi aplicado no banco de desenvolvimento:

- tabela central produtos;
- tabela entidade_integracoes;
- IDs centrais opcionais em referências, itens de pedido, fichas de custo, orçamentos, itens de orçamento, PLM e parceiros de produção;
- índices tenant + vínculo;
- nenhuma tabela ou coluna removida;
- nenhum registro operacional alterado;
- nenhum backfill executado.

## 2. Clientes centrais

O tenant possui **85 clientes centrais**.

### Correspondências por nome normalizado

| Fonte | Registros | Nomes distintos | Registros com vínculo seguro | Nomes sem correspondência | Ambíguos |
|---|---:|---:|---:|---:|---:|
| Fichas de custo | 229 | 67 | 208 | 10 | 0 |
| Orçamentos | 83 | 74 | 70 | 13 | 0 |
| Pedidos | 57 | 50 | 54 | 3 | 0 |

### Backfill possível sem sobrescrever IDs

- fichas_custo.cliente_id: **208** registros;
- orcamentos_custos.cliente_id: **70** registros;
- pedidos.cliente_id: **1** registro ainda vazio;
- os **53** pedidos já vinculados permanecem intactos;
- as **70** referências já vinculadas permanecem intactas;
- não existem IDs de cliente preenchidos inválidos ou cross-tenant em pedidos/referências.

### Nomes sem correspondência central

#### Fichas de custo

- LARISSA LIEVA — 8
- VINICIUS VITNES — 4
- SECRETO SELLADO — 2
- ALAN CAOS — 1
- ANDRESSA - DOPPIA FIT — 1
- DAYANA KHIYA — 1
- LEONARDO — 1
- MARIA MENDES - TALCHÁ — 1
- SUELLEN — 1
- VITÓRIA CAFÉ — 1

#### Orçamentos

- ALAN CAOS
- ANDRESSA - DOPPIA FIT
- CRISTIANE
- DAYANA KHIYA
- EVILÁSIO
- LARISSA LIEVA
- LEONARDO
- MARIA MENDES - TALCHÁ
- SECRETO SELLADO
- SISMO
- SUELLEN
- VINICIUS VITNES
- VITÓRIA CAFÉ

#### Pedidos

- Cliente Teste CustoPlus
- Cliente Teste E2E
- JANAINA SITE LISA

Esses nomes não devem gerar novos clientes automaticamente sem revisão.

## 3. Produtos

### Origem operacional Kanban

- ordens/referências: **75**;
- códigos distintos: **74**;
- códigos sem conflito de descrição ou cliente: **74**;
- códigos ambíguos: **0**;
- produtos centrais existentes: **0**.

### Backfill candidato

- criar **74 produtos centrais** a partir dos códigos consistentes do Kanban;
- **69** desses produtos podem receber cliente central já validado;
- preencher referencias.produto_id em **75** ordens;
- preencher fichas_custo.produto_id em **6** fichas com código exato;
- preencher itens_pedido.produto_id em **18** itens com código exato.

Apesar de não haver colisões, a criação dos 74 produtos deve ser uma operação aprovada separadamente, porque transforma ocorrências operacionais em identidades centrais.

## 4. Fornecedores e parceiros

O tenant possui:

- **17 fornecedores centrais**;
- **2 parceiros de produção**.

Nenhum parceiro possui correspondência exata com fornecedor central:

- Teste Fornecedor;
- clovis.

Nenhum fornecedor_id deve ser preenchido automaticamente nesses dois registros.

## 5. Bloqueio do PLM

No desenvolvimento, o tenant Quick Threads não possui:

- plm_clientes;
- plm_produtos;
- plm_fichas_tecnicas;
- plm_pilotos.

Existe um conjunto PLM sob o tenant sem configuração 093a253e-9c1c-43f5-b988-a50df952d0cd:

- 5 clientes;
- 9 produtos;
- 8 fichas técnicas;
- 3 pilotos.

Também existem conjuntos PLM em tenants explicitamente E2E.

Não existe prova suficiente para associar o tenant sem configuração à R2PB. Nenhum dado PLM foi movido ou vinculado.

## 6. Recomendação

### Pode ser aprovado como backfill seguro

1. Preencher cliente_id apenas por correspondência única de nome central:
   - 208 fichas de custo;
   - 70 orçamentos;
   - 1 pedido.
2. Criar 74 produtos centrais a partir dos códigos não ambíguos do Kanban.
3. Vincular 75 referências aos produtos centrais.
4. Vincular somente as 6 fichas e 18 itens de pedido com código exato.
5. Não sobrescrever IDs existentes.

### Deve permanecer para revisão manual

- nomes de clientes sem correspondência;
- parceiros sem fornecedor central;
- conjunto PLM no tenant sem configuração;
- produtos/fichas/itens sem código exato.

## 7. Estado final desta fase

- schema aplicado somente em desenvolvimento;
- reconciliação executada somente em leitura;
- nenhum backfill executado;
- nenhuma alteração em produção;
- nenhuma publicação;
- nenhuma sincronização com GitHub.


---

# Resultado do backfill autorizado

O backfill seguro foi executado em uma única transação no banco de desenvolvimento.

## Quantidades executadas

- fichas_custo.cliente_id preenchido: **208**;
- orcamentos_custos.cliente_id preenchido: **70**;
- pedidos.cliente_id preenchido: **1 novo vínculo**; total vinculado agora: **54 de 57**;
- produtos centrais criados: **74**;
- referencias.produto_id preenchido: **75 de 75**;
- fichas_custo.produto_id preenchido: **6 de 229**;
- itens_pedido.produto_id preenchido: **18 de 194**.

## Validação de integridade

- vínculos inválidos ou cross-tenant: **0**;
- produtos criados em outros tenants: **0**;
- produtos PLM alterados: **0**;
- fichas técnicas PLM alteradas: **0**;
- parceiros de produção alterados: **0**;
- identificadores externos criados: **0**.

## Escopo ainda bloqueado

O conjunto PLM sob tenant sem configuração continua isolado e não foi associado à Quick Threads. Nomes de clientes sem correspondência e parceiros sem fornecedor central também permaneceram inalterados.

## Publicação

- produção não alterada;
- aplicação não publicada;
- GitHub não sincronizado.
