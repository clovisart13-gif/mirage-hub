# TexIntel — Blueprint standalone v1

> **Status:** arquitetura de referência para implementação futura  
> **Versão:** 1.0  
> **Data:** 27 de agosto de 2026  
> **Produto:** inteligência comercial para descoberta e qualificação de marcas de moda de São Paulo

Este é o documento canônico para a versão independente do TexIntel. Ele substitui, para fins de decisão do produto standalone, qualquer desenho que trate o TexIntel como módulo, banco, tenant ou workflow do Hub Mirage.

O blueprint é documental. Não cria banco, não executa scraping, não chama IA, não cria leads e não configura um projeto Vercel.

---

## 1. Decisão principal

O TexIntel v1 será um produto independente de inteligência comercial, com:

- frontend, API, jobs, autenticação e banco próprios;
- workspaces e membros próprios, sem reutilizar tenants do Hub;
- marca prospectada como entidade mestre;
- descoberta pública por Instagram/web como primeira camada;
- enriquecimento empresarial/CNPJ como segunda camada;
- avaliação de fit explicável, versionada e revisável por uma pessoa;
- deploy paralelo em Vercel, sem depender do runtime do Mirage;
- integração futura apenas por contrato explícito, assinado e aprovado.

Em termos diretos: **sem base da R2PB, sem banco do Hub Mirage, sem tenants compartilhados, sem autenticação compartilhada e sem workflows produtivos do Mirage nesta fase**.

### 1.1 Limites invioláveis nesta fase

O TexIntel standalone **não pode**:

1. ler a base da R2PB, direta ou indiretamente;
2. ler ou gravar o banco do Hub Mirage;
3. usar `tenant_id`, `slug`, usuários ou permissões do Hub como identidade própria;
4. reutilizar autenticação, sessão ou chave interna do Hub;
5. depender de rotas `/api/texintel/*` do `api-server` do Mirage;
6. iniciar workflows produtivos do Mirage;
7. criar ou espelhar leads em `comercial_leads`, `parceiros_leads` ou qualquer entidade do Hub;
8. usar dados da R2PB como seed, dataset, fixture, validação ou benchmark;
9. tratar um resultado de IA como fato sem fonte, data, versão e nível de confiança;
10. raspar páginas privadas, contornar login, contornar bloqueios ou ignorar regras do provedor.

O fato de o produto descobrir empresas que possam futuramente ter fit com soluções do ecossistema Mirage não cria uma dependência técnica nem autorização para acessar o Hub.

---

## 2. Objetivo, público e fronteira do produto

### 2.1 Problema

Uma pessoa responsável por inteligência comercial precisa descobrir marcas de moda paulistas a partir de sinais públicos, organizar evidências, estimar fit comercial e decidir quais empresas merecem enriquecimento e revisão.

O TexIntel não é, na v1:

- um CRM;
- um ERP, PLM ou sistema de produção;
- um cadastro contábil oficial;
- um sistema de disparo de WhatsApp ou e-mail;
- um substituto para a Receita Federal;
- um motor autônomo de decisão comercial;
- uma base compartilhada de prospects do Hub.

### 2.2 Usuário principal

O usuário inicial é um analista, fundador ou curador comercial que:

1. define uma busca ou adiciona uma marca encontrada;
2. revisa a identidade e as fontes;
3. acompanha os sinais de fit;
4. decide se vale enriquecer com dados empresariais;
5. registra notas, decisão e próximo passo.

### 2.3 Geografia inicial

O recorte inicial é o estado de São Paulo, com prioridade para o município de São Paulo e sua região metropolitana. A localização é um sinal de fit e de descoberta, não uma restrição estrutural que impeça expansão posterior.

---

## 3. Auditoria do material existente

### 3.1 Protótipo atual

O protótipo em `artifacts/texintel/` é uma SPA React/Vite dentro deste monorepo. Ele é útil como referência visual e de fluxo, mas não é a arquitetura-alvo do produto standalone.

| Material | O que existe hoje | Classificação para o standalone |
|---|---|---|
| `artifact.toml` | Preview `/texintel/`, serviço web no Replit e build estático | Referência de execução local; não é configuração Vercel |
| `package.json` | React, Vite, Wouter, React Query e cliente de API do workspace | Dependências visuais/UX reaproveitáveis; não carregar o cliente do Hub |
| `App.tsx` | Rotas para dashboard, descoberta, empresas e análise por CNPJ | Referência para a hierarquia inicial do app |
| `shell.tsx` | Sidebar com Dashboard, Descoberta, Banco de Empresas e Analisar | Referência de navegação, a ser adaptada para autenticação e workspace próprio |
| `Descoberta.tsx` | Seleção de CNAE/UF e fila manual de CNPJs | Referência parcial; v1 deve começar pela descoberta Instagram/web |
| `CompaniesList.tsx` | Tabela com status, módulo recomendado e filtros | Referência para lista de marcas e filtros de curadoria |
| `CompanyDetail.tsx` | Dados cadastrais, dores, scores e justificativa | Referência para detalhe; deve incluir fontes, evidências e histórico |
| `Dashboard.tsx` | Totais do banco, fila, erros e ranking por módulo | Referência para painel; os indicadores v1 devem refletir marcas e runs |
| `AnalyzeForm.tsx` | Entrada direta de CNPJ e website | Referência de segunda camada; não pode ser o fluxo primário |

### 3.2 Acoplamentos encontrados

O protótipo atual:

- importa hooks de `@workspace/api-client-react`;
- chama rotas `/api/texintel/*` servidas pelo `artifacts/api-server`;
- espera a tabela `texintel_companies` existente no banco do Hub;
- usa conceitos de módulo Mirage (`crm`, `erp`, `plm`, `comunidade`) como saída principal;
- não possui uma camada própria de autenticação e autorização;
- está montado para CNPJ primeiro, em vez de descoberta pública primeiro.

Esses acoplamentos não devem ser transportados para o produto novo. O reaproveitamento permitido é de componentes de interface, linguagem e ideias de interação, após a troca dos contratos de dados.

### 3.3 Ponte e documentação histórica

`docs/texintel-ai-context-transfer.md` descreve um serviço externo que envia resultados ao Hub por `x-internal-key`, grava no banco do Hub e pode espelhar leads. Isso é um desenho de integração futura/histórica, não a especificação do TexIntel standalone.

Para evitar interpretação errada:

- o documento antigo permanece como registro de contexto da ponte legada;
- este blueprint é a autoridade para a v1 independente;
- nenhuma rota, chave, tabela, tenant ou segredo citados no documento antigo é dependência do standalone;
- a ponte só poderá ser desenhada depois, em tarefa própria, com contrato, escopo e autorização separados.

### 3.4 O que não será migrado automaticamente

Não haverá importação automática de:

- `texintel_companies`;
- `texintel_enrichments`;
- `market_intelligence_profiles`;
- qualquer tabela do banco do Hub;
- qualquer lista, seed, fixture ou exemplo proveniente da R2PB.

Se futuramente houver necessidade de migração de dados, ela deverá ser aprovada como projeto separado, com origem, titularidade, consentimento, mapeamento e auditoria definidos. A v1 começa com dados coletados no próprio produto ou fixtures sintéticas.

---

## 4. Autoridade, isolamento e tenancy

### 4.1 Hierarquia própria

O domínio standalone deve ter suas próprias entidades de acesso:

```text
texintel_user
    └─► texintel_workspace
            └─► texintel_workspace_member
                    └─► marcas prospectadas
```

Um workspace é uma unidade de trabalho do TexIntel. Ele não é um tenant do Mirage e não recebe um UUID, slug ou nome importado do Hub.

### 4.2 Papéis mínimos

| Papel | Pode fazer |
|---|---|
| `owner` | administrar workspace, membros, fontes, regras e dados |
| `admin` | administrar dados e configurações operacionais |
| `curator` | revisar fit, adicionar evidências, escrever notas e mudar decisão |
| `viewer` | consultar marcas, fontes, scores e histórico |

Todo endpoint autenticado deve:

1. validar a sessão própria do TexIntel;
2. identificar o workspace solicitado;
3. verificar a associação do usuário ao workspace;
4. aplicar `workspace_id` em toda consulta e mutação;
5. registrar o ator no histórico quando houver alteração.

Não existe endpoint de marca “global” para contornar essa regra.

### 4.3 Integração futura

Uma integração com o Hub, caso seja aprovada no futuro, será uma borda de sistema, não uma extensão do modelo interno. O desenho deverá usar:

- uma configuração de integração explicitamente ativada;
- mapeamento explícito entre um workspace TexIntel e um destino autorizado;
- contrato versionado;
- autenticação própria da integração;
- escopos mínimos;
- idempotency key;
- log de entrada e saída;
- possibilidade de revogação.

O modelo nuclear do TexIntel não armazenará `tenant_id` do Hub nem pressuporá que toda marca deve virar lead.

---

## 5. Modelo de domínio v1

### 5.1 Entidade mestre: `prospected_brand`

`prospected_brand` representa a marca como objeto comercial ainda em descoberta. Ela pode existir antes de existir um CNPJ confirmado.

Campos conceituais:

| Campo | Tipo conceitual | Regra |
|---|---|---|
| `id` | UUID | Identificador interno imutável |
| `workspace_id` | UUID | Obrigatório; escopo de autoridade |
| `display_name` | texto | Nome usado pela marca no mercado |
| `normalized_name` | texto | Forma normalizada para busca e deduplicação |
| `legal_name` | texto opcional | Só preencher após fonte empresarial confiável |
| `instagram_handle` | texto opcional | Handle público, normalizado sem `@` |
| `instagram_url` | URL opcional | URL canônica pública |
| `website_url` | URL opcional | Site oficial ou declarado |
| `city` / `state` | texto | Localização observada ou confirmada |
| `market_segment` | enum/texto | Segmento de moda identificado |
| `identity_status` | enum | `candidate`, `probable`, `confirmed`, `duplicate`, `rejected` |
| `lifecycle_status` | enum | Estado geral do pipeline |
| `discovery_summary` | texto | Resumo curto produzido pela descoberta |
| `created_at` / `updated_at` | timestamp | Auditoria técnica |
| `last_reviewed_at` | timestamp opcional | Última revisão humana |

A identidade da marca não deve ser deduzida apenas pelo nome. O sistema deve combinar handle, URL, domínio, cidade, descrição e evidências antes de mesclar candidatos.

### 5.2 Fontes: `brand_source`

Uma marca pode ter várias fontes, e uma fonte pode ser reconsultada.

Campos conceituais:

- `id`, `workspace_id`, `brand_id`;
- `source_type`: `instagram`, `website`, `search_result`, `directory`, `manual`, `business_registry`;
- `url` e identificador externo;
- `title`, `handle` ou domínio;
- `is_official`;
- `first_seen_at`, `last_seen_at`, `last_fetched_at`;
- `access_status`: `available`, `blocked`, `removed`, `not_checked`;
- `content_hash` ou fingerprint;
- `collector_version`;
- metadados estruturados mínimos;
- referência opcional a um snapshot de conteúdo próprio;
- `created_at`, `updated_at`.

URLs e metadados devem ser preservados mesmo quando a fonte deixa de estar disponível. O fato de uma fonte estar indisponível hoje não apaga a proveniência histórica.

### 5.3 Evidências: `brand_evidence`

Evidência é uma observação vinculada a uma fonte, não uma afirmação solta da IA.

Campos conceituais:

- `id`, `workspace_id`, `brand_id`, `source_id`;
- `evidence_type`: `brand_identity`, `product_category`, `production_signal`, `wholesale_signal`, `team_signal`, `digital_signal`, `location`, `business`;
- `claim`: afirmação curta e verificável;
- `excerpt`: trecho público ou descrição do sinal;
- `captured_at`;
- `source_published_at` quando disponível;
- `confidence`: `low`, `medium`, `high`;
- `extraction_method`: `manual`, `rule`, `ai_assisted`;
- `extractor_version` e `prompt_version` quando aplicável;
- `review_status`: `unreviewed`, `accepted`, `rejected`;
- `reviewed_by`, `reviewed_at`;
- hash do conteúdo de origem.

O detalhe da marca deve mostrar a evidência usada para cada sinal importante. Uma justificativa sem evidência deve ser marcada como hipótese.

### 5.4 Sinais de fit: `fit_signal`

Os sinais são dimensões observáveis que alimentam a avaliação. Cada sinal deve ter valor, direção, justificativa e evidências.

Rubrica inicial:

| Dimensão | Pergunta |
|---|---|
| `segment_fit` | A empresa atua em moda, vestuário ou cadeia próxima? |
| `geographic_fit` | Há operação, presença ou relevância em São Paulo? |
| `business_model_fit` | Há sinais de marca estruturada, atacado, produção ou operação recorrente? |
| `operational_complexity` | Existem sinais de variedade, coleção, fornecedores, pedidos ou processos que gerem complexidade? |
| `digital_maturity` | A presença digital permite identificar operação real e próximo passo? |
| `commercial_intent` | Há sinais públicos de expansão, atacado, contratação, lançamento ou busca de parceiros? |
| `evidence_quality` | As conclusões têm fontes atuais, consistentes e suficientes? |

Cada sinal contém:

- `dimension`;
- `value` em escala normalizada de 0 a 100;
- `confidence` de 0 a 1 ou nível equivalente;
- `rationale`;
- `evidence_ids`;
- `rubric_version`;
- `assessment_id`.

### 5.5 Avaliação e score: `fit_assessment`

O score total é uma fotografia versionada, nunca um valor sobrescrito sem histórico.

Campos conceituais:

- `id`, `workspace_id`, `brand_id`;
- `total_score` de 0 a 100;
- `fit_band`: `low`, `medium`, `high`, `review_required`;
- `dimension_scores` em JSON validado;
- `confidence_score`;
- `decision`: `unreviewed`, `keep`, `watch`, `discard`, `approved_for_enrichment`;
- `rubric_version`;
- `model_name` e `model_version` se houver IA;
- `input_snapshot_hash`;
- `generated_at`;
- `reviewed_by`, `reviewed_at`;
- `supersedes_assessment_id` opcional.

Recomendação inicial de interpretação, sujeita à validação com dados próprios:

- `0–39`: baixo fit;
- `40–64`: fit incerto / observar;
- `65–79`: fit alto, requer revisão;
- `80–100`: prioridade de revisão e possível enriquecimento.

Esses cortes não autorizam contato automático. Servem para ordenar trabalho humano.

### 5.6 Enriquecimento empresarial: `business_enrichment`

O enriquecimento empresarial é opcional e posterior à descoberta.

Campos conceituais:

- `id`, `workspace_id`, `brand_id`;
- `cnpj_normalized` opcional;
- `match_method`: `exact`, `domain`, `name_location`, `manual`, `unmatched`;
- `match_confidence`;
- `legal_name`, `trade_name`, `status`, `size`, `main_activity`;
- endereço empresarial e localização;
- `provider`;
- `provider_request_id` se existir;
- `raw_payload_reference` ou payload minimizado;
- `retrieved_at`;
- `status`: `not_requested`, `queued`, `running`, `matched`, `ambiguous`, `not_found`, `blocked`, `failed`, `stale`;
- `error_code`, `error_message` sanitizada;
- `run_id`.

O TexIntel não tratará esse registro como fonte contábil oficial. CNPJ confirmado aumenta a confiança de identidade, mas não substitui as fontes de marca nem garante fit comercial.

### 5.7 Notas de curadoria: `curation_note`

Notas são decisões e contexto humano, não campos livres perdidos no detalhe.

Campos conceituais:

- `id`, `workspace_id`, `brand_id`;
- `author_id`;
- `note_type`: `observation`, `decision`, `risk`, `next_step`, `rejection_reason`;
- `body`;
- `decision_after_note` opcional;
- `created_at`, `updated_at`;
- histórico de edição ou evento de alteração.

### 5.8 Execuções e rastreabilidade

Entidades auxiliares:

- `pipeline_run`: intenção completa de processamento, entrada, versão, estado e resultado;
- `pipeline_step_run`: execução individual de descoberta, normalização, fit ou enriquecimento;
- `idempotency_record`: chave, escopo, resultado e validade;
- `brand_event`: linha do tempo append-only de mudanças importantes;
- `source_fetch`: cada tentativa de coleta, com status, latência, fingerprint e erro categorizado.

Toda saída que muda o estado de uma marca deve apontar para um `run_id` e para as versões de regra/modelo utilizadas.

---

## 6. Estados e máquina de pipeline

### 6.1 Estado geral da marca

```text
candidate
  └─► identity_review
        ├─► duplicate
        ├─► rejected
        └─► fit_pending
                └─► fit_ready
                      ├─► enrichment_pending
                      │      └─► enriching
                      │             ├─► enrichment_ready
                      │             ├─► enrichment_ambiguous
                      │             └─► enrichment_failed
                      └─► curation_review
                               ├─► approved
                               ├─► watch
                               └─► archived
```

Estados técnicos como `queued`, `running`, `retry_wait` e `failed` pertencem às execuções. Não devem substituir o estado comercial da marca.

### 6.2 Camada 1 — descoberta Instagram/web

Entrada:

- consulta por cidade/estado e segmento;
- URL, handle ou nome fornecido manualmente;
- resultado público de mecanismo de busca;
- fonte pública autorizada.

Etapas:

1. coletar metadados mínimos;
2. normalizar nome, URL, handle e domínio;
3. detectar candidatos duplicados;
4. anexar fontes e evidências;
5. classificar identidade;
6. produzir sinais preliminares de fit;
7. enviar para revisão ou avaliação automática assistida.

Saída:

- uma marca candidata ou atualização idempotente de uma marca existente;
- fontes e evidências com timestamp;
- score preliminar, com rubrica e confiança;
- necessidade ou não de enriquecimento.

O sistema deve preferir adicionar uma fonte a uma marca existente a criar duplicata. Em caso de ambiguidade, cria uma fila de revisão, não uma fusão irreversível.

### 6.3 Camada 2 — enriquecimento empresarial/CNPJ

O enriquecimento só pode iniciar quando:

- a marca tem identidade provável ou confirmada;
- existe motivo de negócio registrado;
- a origem do CNPJ é pública, fornecida pelo usuário ou encontrada por fonte permitida;
- o workspace autorizou a execução.

Etapas:

1. normalizar e validar CNPJ, quando houver;
2. consultar provedor permitido;
3. associar o resultado à marca com método e confiança;
4. registrar dados empresariais e proveniência;
5. recalcular sinais dependentes de contexto empresarial;
6. criar nova avaliação versionada;
7. enviar para revisão humana.

Uma correspondência ambígua não deve ser promovida automaticamente a empresa confirmada. O usuário deve decidir entre os candidatos ou manter a marca sem enriquecimento.

### 6.4 Idempotência e reprocessamento

Cada etapa deve calcular uma chave determinística a partir de:

```text
workspace_id + brand_id + stage + input_snapshot_hash
         + rubric_version + collector_version
```

Regras:

- repetir a mesma solicitação não cria duas execuções ativas;
- uma execução concluída pode ser reutilizada enquanto a entrada e as versões não mudarem;
- reprocessamento manual cria novo `pipeline_run`, preserva o anterior e explicita o motivo;
- falhas transitórias usam backoff e limite de tentativas;
- falhas permanentes exigem correção de entrada ou revisão humana;
- jobs órfãos expiram o lease e podem ser retomados;
- uma resposta tardia não pode sobrescrever uma execução mais nova sem comparar versão e estado.

### 6.5 Proveniência e qualidade

Cada dado derivado deve responder:

1. de qual fonte veio;
2. quando foi observado;
3. por qual coletor, regra ou modelo foi extraído;
4. com qual versão de rubrica/prompt;
5. qual a confiança;
6. quem revisou ou rejeitou;
7. qual execução o produziu.

O texto da IA é uma interpretação auxiliar. A interface deve separar:

- fato observado;
- inferência;
- hipótese;
- decisão humana.

### 6.6 Limites de coleta

O worker deve:

- respeitar limites de taxa por domínio/provedor;
- respeitar termos de uso, robots e regras aplicáveis;
- coletar somente o mínimo necessário;
- evitar conteúdo privado, login e bypass de bloqueios;
- interromper após respostas de bloqueio ou remoção;
- não armazenar credenciais de redes sociais;
- não transformar dados pessoais de indivíduos em perfil comercial sem necessidade;
- expor ao usuário a data de coleta e eventual desatualização.

---

## 7. Arquitetura de aplicação v1

### 7.1 Topologia lógica

```text
Landing pública
      │
      └─► Autenticação própria
                │
                └─► Web app do workspace
                        ├─► API TexIntel
                        │      ├─► banco TexIntel
                        │      ├─► provedor de fontes públicas
                        │      ├─► provedor de CNPJ
                        │      └─► provedor de IA
                        └─► fila de jobs
                                   └─► workers de descoberta/enriquecimento
```

Nenhuma seta desse desenho aponta para o Hub Mirage.

### 7.2 Rotas de produto

| Rota | Função |
|---|---|
| `/` | landing: proposta, limites, chamada para entrar |
| `/login` | login próprio do TexIntel |
| `/app` | visão geral do workspace |
| `/app/discovery` | iniciar e acompanhar descobertas |
| `/app/brands` | lista filtrável de marcas |
| `/app/brands/:id` | detalhe, fontes, evidências, fit, enriquecimento e histórico |
| `/app/review` | fila de identidade, fit e correspondências ambíguas |
| `/app/settings` | workspace, membros, provedores e políticas |

O shell autenticado deve sempre exibir o workspace atual e o papel do usuário. Não haverá seletor que consulte tenants do Mirage.

### 7.3 Lista de marcas

A lista deve suportar:

- busca por nome, handle, domínio e município;
- filtro por estado e segmento;
- filtro por estado do pipeline;
- faixa de score e confiança;
- presença/ausência de CNPJ;
- necessidade de revisão;
- data da última evidência;
- ordenação por prioridade, atualização ou score;
- paginação baseada em cursor;
- ação explícita para abrir detalhe e revisar.

O ranking não deve usar apenas o score máximo de um módulo do Hub. A unidade de priorização é a marca e sua avaliação TexIntel.

### 7.4 Detalhe da marca

Ordem recomendada:

1. identidade e estado atual;
2. links públicos e fontes oficiais;
3. resumo de descoberta;
4. sinais de fit e score total;
5. evidências por sinal;
6. enriquecimento empresarial e confiança do match;
7. notas e decisão de curadoria;
8. linha do tempo de execuções e alterações;
9. ações: reprocessar, solicitar enriquecimento, marcar para revisão, arquivar.

O detalhe deve mostrar claramente quando um dado está ausente, desatualizado, bloqueado ou inferido.

### 7.5 Score de fit

O score deve ser apresentado com:

- valor total e banda;
- dimensões individuais;
- peso ou regra da rubrica;
- confiança;
- evidências utilizadas;
- versão da rubrica;
- data de geração;
- botão/ação para revisão humana;
- diferença em relação à avaliação anterior.

Não mostrar uma recomendação de produto do Mirage como se fosse resultado nativo da v1. Se uma futura integração precisar de um mapeamento comercial, ele será uma camada posterior e explicitamente rotulada.

### 7.6 Curadoria

A fila de revisão deve permitir:

- confirmar ou rejeitar identidade;
- resolver duplicatas;
- aceitar ou rejeitar evidências;
- aprovar, observar ou descartar um score;
- aprovar ou bloquear enriquecimento;
- resolver match empresarial ambíguo;
- adicionar nota e próximo passo;
- visualizar o que mudou desde a revisão anterior.

Nenhuma ação de curadoria envia mensagem, cria lead ou altera o Hub.

---

## 8. Contratos de API

Os contratos abaixo são a direção v1; schemas devem ser definidos em Zod/OpenAPI no projeto standalone e versionados junto com a API.

### 8.1 Convenções

- prefixo: `/api/v1`;
- JSON com `camelCase` na borda;
- UUIDs opacos;
- datas ISO 8601 em UTC;
- erros com `code`, `message`, `requestId` e detalhes seguros;
- paginação por `nextCursor`;
- `Idempotency-Key` em mutações que enfileiram trabalho;
- `X-Request-Id` para correlação;
- nunca aceitar `workspaceId` de um body sem verificar acesso;
- nunca retornar payload bruto de provedor sem necessidade.

### 8.2 Endpoints principais

```text
GET    /api/v1/me
GET    /api/v1/workspaces
POST   /api/v1/workspaces

GET    /api/v1/brands
POST   /api/v1/brands
GET    /api/v1/brands/:brandId
PATCH  /api/v1/brands/:brandId
POST   /api/v1/brands/:brandId/archive

GET    /api/v1/brands/:brandId/sources
POST   /api/v1/brands/:brandId/sources
GET    /api/v1/brands/:brandId/evidence
POST   /api/v1/brands/:brandId/evidence

GET    /api/v1/brands/:brandId/fit-assessments
POST   /api/v1/brands/:brandId/fit-assessments
POST   /api/v1/brands/:brandId/fit-assessments/:assessmentId/review

GET    /api/v1/brands/:brandId/enrichments
POST   /api/v1/brands/:brandId/enrichments
POST   /api/v1/brands/:brandId/enrichments/:enrichmentId/retry

GET    /api/v1/brands/:brandId/notes
POST   /api/v1/brands/:brandId/notes
PATCH  /api/v1/notes/:noteId

GET    /api/v1/discovery/runs
POST   /api/v1/discovery/runs
GET    /api/v1/discovery/runs/:runId
POST   /api/v1/runs/:runId/retry

GET    /api/v1/review-queue
GET    /api/v1/dashboard/summary
```

### 8.3 Exemplo de criação de marca candidata

```json
{
  "displayName": "Marca exemplo",
  "instagramHandle": "marcaexemplo",
  "instagramUrl": "https://www.instagram.com/marcaexemplo/",
  "websiteUrl": "https://www.marcaexemplo.com.br",
  "city": "São Paulo",
  "state": "SP",
  "marketSegment": "moda feminina",
  "source": {
    "type": "manual",
    "url": "https://www.instagram.com/marcaexemplo/"
  }
}
```

A resposta deve informar `brandId`, `identityStatus`, `lifecycleStatus` e eventual `reviewRequired`. Ela não deve criar lead em sistema externo.

### 8.4 Exemplo de enfileiramento

```json
{
  "reason": "match empresarial necessário para validar porte e atividade",
  "cnpj": "00000000000000"
}
```

A API responde `202 Accepted` com `runId` e estado `queued`. O processamento posterior atualiza a marca por eventos internos do TexIntel.

### 8.5 Futuro contrato de integração

Não faz parte da v1, mas qualquer ponte futura deve ser separada destes endpoints. Ela não poderá permitir que um consumidor externo:

- escolha um workspace sem uma autorização registrada;
- leia todas as marcas por padrão;
- grave score sem proveniência;
- crie lead automaticamente;
- use uma chave genérica compartilhada com o Hub.

---

## 9. Topologia de deploy em Vercel

### 9.1 Organização recomendada

O deploy deve ser um projeto Vercel próprio do TexIntel, idealmente originado de um repositório standalone ou de uma área que não importe pacotes do Hub em runtime.

Estrutura alvo:

```text
texintel-standalone/
  apps/
    web/                 # landing + app autenticado
  packages/
    domain/              # entidades e regras puras
    contracts/           # schemas API/eventos
    scoring/             # rubricas versionadas
  db/
    migrations/
    seeds/               # apenas fixtures sintéticas
  workers/
    discovery/
    enrichment/
  vercel.json
```

A estrutura é uma direção, não uma instrução para criar esse repositório nesta tarefa.

### 9.2 Componentes

| Componente | Hospedagem/direção | Responsabilidade |
|---|---|---|
| Web | Vercel | landing, autenticação, app shell e telas |
| API | Vercel Functions/Route Handlers | autenticação, CRUD, filtros e enqueue |
| Jobs | fila durável + funções/worker compatível | descoberta, coleta, scoring e enriquecimento |
| Banco | PostgreSQL dedicado do TexIntel | dados próprios e histórico |
| Snapshots | object storage dedicado opcional | conteúdo bruto minimizado e evidências |
| Observabilidade | logs estruturados + tracing/alertas próprios | erros, latência, jobs e auditoria |

Funções serverless não devem manter scraping ou processamento de IA longo na requisição HTTP. A API apenas valida, grava a intenção e enfileira.

### 9.3 Jobs e fila

Usar uma fila com retries, dead-letter e idempotência (por exemplo, Inngest, QStash ou equivalente escolhido na implementação). Vercel Cron pode disparar reconciliação ou limpeza, mas não deve ser o mecanismo exclusivo de um job longo.

Filas lógicas mínimas:

- `discovery.collect`;
- `brand.normalize`;
- `fit.assess`;
- `business.enrich`;
- `curation.notify` apenas para notificação interna futura;
- `pipeline.reconcile`.

Cada job carrega apenas IDs e versões. Conteúdo grande fica no banco/storage próprio e é lido com autorização.

### 9.4 Banco

O banco deve ser criado no projeto/conta do TexIntel, com:

- conexão própria;
- migrations próprias;
- credenciais próprias;
- backup e retenção próprios;
- `workspace_id` nas entidades de negócio;
- índices para workspace, estado, score e atualização;
- constraints para evitar duplicidade dentro do workspace;
- logs/auditoria append-only.

Não usar `DATABASE_URL`, pools, migrations, schemas ou tabelas do `api-server` do Mirage.

### 9.5 Autenticação

Usar um provedor ou implementação de autenticação própria do TexIntel, em projeto separado, com sessões e callbacks sob controle do produto. A decisão entre um provedor gerenciado e uma implementação própria deve respeitar:

- usuários e organizações independentes;
- recuperação e revogação próprias;
- MFA quando necessário;
- cookies e domínio do TexIntel;
- nenhuma validação contra Supabase/Auth do Hub;
- nenhum reaproveitamento de `SESSION_SECRET` ou token do Mirage.

### 9.6 Variáveis de ambiente próprias

Nomes sugeridos para o projeto TexIntel:

```text
APP_URL
AUTH_SECRET
AUTH_PROVIDER_*
DATABASE_URL
QUEUE_SIGNING_SECRET
AI_PROVIDER_API_KEY
AI_MODEL
BRASIL_API_BASE_URL
DISCOVERY_PROVIDER_*
OBJECT_STORAGE_ENDPOINT
OBJECT_STORAGE_BUCKET
OBJECT_STORAGE_ACCESS_KEY
OBJECT_STORAGE_SECRET_KEY
SENTRY_DSN
CRON_SECRET
```

Os valores devem ser configurados apenas no ambiente do TexIntel. Nunca copiar para esse projeto:

```text
MARKETING_INTERNAL_API_KEY
TEXINTEL_INTERNAL_KEY do Hub
HUB_BASE_URL
SUPABASE_SERVICE_ROLE_KEY do Mirage
DATABASE_URL do Mirage
SESSION_SECRET do Mirage
credenciais de canais, n8n ou Z-API do Mirage
```

Os nomes acima são contratos de separação; nenhum segredo deve ser registrado neste documento.

### 9.7 Ambientes

| Ambiente | Finalidade | Regra |
|---|---|---|
| local | desenvolvimento | banco/serviços locais ou sandbox do TexIntel |
| preview | PR e validação | dados sintéticos, provedores mockados ou sandbox |
| production | operação standalone | banco e credenciais próprios |

Preview nunca deve apontar para banco do Hub ou para dados da R2PB.

### 9.8 Observabilidade

Métricas mínimas:

- candidatos descobertos por fonte;
- taxa de duplicata;
- tempo por etapa;
- taxa de bloqueio por provedor;
- taxa de match de CNPJ;
- taxa de erro e retry;
- distribuição de score e confiança;
- quantidade de itens aguardando revisão;
- idade da evidência mais recente.

Logs devem conter `requestId`, `workspaceId` (quando autorizado), `brandId`, `runId`, etapa, versão e resultado. Não registrar tokens, conteúdo privado ou payloads desnecessários.

Alertas devem ser internos ao TexIntel. Nenhum alerta de job deve depender de canal ou workflow produtivo do Mirage.

---

## 10. Segurança, privacidade e qualidade

### 10.1 Controle de acesso

- autorização no servidor, não apenas na UI;
- escopo de workspace aplicado em todas as queries;
- revisão de ownership antes de ler uma fonte ou evidência;
- rate limit por usuário/workspace/provedor;
- proteção contra SSRF ao buscar URLs;
- allowlist e validação de esquema para URLs;
- sanitização de HTML e excerpts;
- limites de tamanho para conteúdo e payload;
- secrets somente no gerenciador de secrets do ambiente.

### 10.2 Dados públicos não significam dados sem responsabilidade

O produto deve armazenar apenas o que é necessário para a finalidade de inteligência comercial. Dados pessoais de fundadores, funcionários ou contatos não são o objeto mestre da v1. Caso apareçam em uma fonte, devem ser minimizados, não usados para abordagem automática e removidos quando não forem necessários.

### 10.3 IA como componente não autoritativo

Toda saída de IA deve:

- usar schema estruturado;
- validar tipos e limites;
- guardar modelo e versão;
- guardar versão do prompt/rubrica;
- apontar evidências;
- permitir falha sem corromper o estado anterior;
- ser revisável e substituível;
- nunca executar uma ação externa por conta própria.

Se o modelo não consegue sustentar uma conclusão, o resultado deve ser `review_required`, não uma certeza artificial.

---

## 11. Plano de implementação posterior

Esta tarefa não implementa as fases. A ordem recomendada é:

### Fase A — fundação standalone

- criar projeto/repositório Vercel próprio;
- escolher framework e provedor de autenticação;
- criar banco e migrations próprios;
- implementar workspaces, membros e autorização;
- publicar landing e shell autenticado sem dados reais;
- criar fixtures sintéticas.

### Fase B — domínio e contratos

- implementar `prospected_brand`, fontes, evidências e eventos;
- publicar schemas API;
- construir lista e detalhe;
- adicionar notas e revisão;
- aplicar testes de isolamento entre workspaces.

### Fase C — descoberta

- integrar uma fonte pública por vez;
- registrar fetches, fingerprints e limites;
- deduplicar candidatos;
- gerar sinais preliminares;
- tornar a revisão de identidade utilizável.

### Fase D — fit

- versionar a primeira rubrica;
- implementar avaliação estruturada;
- exibir evidências e confiança;
- registrar alterações de score;
- permitir decisão humana.

### Fase E — enriquecimento

- adicionar CNPJ após aprovação do fluxo de descoberta;
- implementar match exato, provável e ambíguo;
- registrar provider, run e falhas;
- permitir reprocessamento seguro;
- não criar nenhum lead externo.

### Fase F — operação

- configurar fila durável, alertas e dashboards;
- testar retries, dead-letter e recuperação de jobs;
- revisar retenção e privacidade;
- validar custos e limites dos provedores;
- preparar eventual contrato de integração em projeto separado.

---

## 12. Critérios de aceite da v1 arquitetural

Antes de iniciar implementação de produção, a solução deverá demonstrar:

- uma marca pode existir sem CNPJ;
- uma marca pode ter várias fontes e evidências;
- score tem dimensões, confiança, evidências e versão;
- nota humana aparece no histórico e não é perdida por reprocessamento;
- CNPJ ambíguo não vira match confirmado automaticamente;
- reprocessamento não duplica execução ativa;
- falha de provedor mantém o último resultado válido e registra o erro;
- todos os objetos de negócio são isolados por workspace;
- nenhum endpoint depende do Hub ou de tenant externo;
- preview usa somente fixtures sintéticas;
- nenhum job envia comunicação ou cria lead;
- dashboard distingue estado comercial de estado técnico;
- o detalhe explica o “por quê” do score;
- a coleta mostra fonte e data;
- o deploy pode ser feito sem credenciais do Mirage;
- desligar qualquer integração futura não impede a operação do núcleo standalone.

---

## 13. Relação com materiais e tarefas futuras

### Material de referência

- `artifacts/texintel/`: protótipo visual e de fluxo;
- `docs/texintel-ai-context-transfer.md`: desenho histórico da ponte com o Hub;
- `artifacts/api-server/src/routes/texintel.ts`: exemplo de contrato legado, não API-alvo;
- migrations e worker `texintel_*` do `api-server`: estado legado do Hub, não banco do standalone.

### Trabalho futuro separado

As tarefas existentes de **integração TexIntel–Hub** e de **pipeline de CNPJ/scraping/IA** não são dependências desta arquitetura. Elas só podem ser retomadas depois de:

1. o núcleo standalone estar definido e testado;
2. existir um contrato de integração aprovado;
3. cada lado possuir credenciais, escopos e banco separados;
4. a origem e o destino de cada campo serem explícitos;
5. haver decisão expressa sobre se alguma marca pode virar lead;
6. serem preservadas as barreiras contra R2PB, clientes e produção do Mirage.

Até lá, qualquer referência a `/api/internal/texintel/resultado`, `x-internal-key`, `market_intelligence_profiles`, `texintel_companies` ou `tenant_id` do Hub deve ser lida apenas como legado.

---

## 14. Checklist de não acoplamento

Antes de cada merge ou deploy do TexIntel, revisar:

- [ ] `rg` não encontra import de `@workspace/api-client-react` no app standalone.
- [ ] Não há URL, hostname ou rota do Hub nos contratos do núcleo.
- [ ] Não há import de `@workspace/db` ou schema do `api-server`.
- [ ] Não há `tenant_id` do Mirage no modelo.
- [ ] Não há seed, fixture ou teste com dados da R2PB.
- [ ] Não há segredo do Hub nas variáveis do projeto Vercel.
- [ ] Não há chamada a Z-API, n8n, Helena, VhSys ou ATOS.
- [ ] Toda query de negócio tem escopo de workspace.
- [ ] Toda alteração importante gera evento/histórico.
- [ ] Todo resultado externo tem proveniência e versão.
- [ ] Jobs são idempotentes e reprocessáveis.
- [ ] A UI não promete uma ação externa que a API não implementa.

Este checklist é uma barreira de arquitetura, não uma autorização para iniciar integração.