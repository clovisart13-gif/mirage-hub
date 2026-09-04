# Módulo 6 — Comunidade / Moda Conecta

**Status:** 🟡 Em desenvolvimento ativo  
**Última atualização:** Agosto 2026

---

## O que é

O módulo Comunidade tem dois componentes distintos:

1. **Banco de Parceiros** — diretório de parceiros de produção já ativos (oficinas, estamparias, etc.)
2. **Moda Conecta** — marketplace B2B de fornecedores/confeccionistas, com fluxo de curadoria e onboarding controlado

> ⚠️ **Não confundir os dois.** São tabelas e fluxos separados.

---

## Fluxo Moda Conecta (estado atual — agosto 2026)

| Etapa | O que acontece | Status |
|---|---|---|
| 1 | Lead preenche mini-form → `moda_conecta_leads` (status: `novo`) | ✅ Funcionando |
| 2 | Admin aprova → envia link do formulário completo via WhatsApp (status: `convite_enviado`) | ✅ Funcionando |
| 3 | Lead preenche formulário completo → `comunidade_pre_cadastros` criado; `moda_conecta_leads.status` → `formulario_preenchido` | ✅ Funcionando |
| 4 | Admin consulta cadastro completo em `/admin/ver-cadastro?id=XXX` | ✅ Construído (publicar para ativar) |
| 5 | Admin aprova → gera link do Hub via Supabase invite | ✅ Construído (publicar para ativar) |
| 6 | Fornecedor usa link, cria conta e entra no Hub | ✅ Supabase auth |

---

## Tabelas principais

| Tabela | Propósito |
|---|---|
| `moda_conecta_leads` | Pipeline de curadoria (quem entrou pelo mini-form) |
| `comunidade_pre_cadastros` | Cadastro completo preenchido pelo fornecedor |
| `comunidade_profiles` | Perfil ativo na comunidade (pós-aprovação) |
| `parceiros_leads` | Parceiros de produção captados via CRM — **diferente do Moda Conecta** |

---

## Rotas de API relevantes

**Arquivo:** `artifacts/api-server/src/routes/comunidade/index.ts`

| Método | Endpoint | Função |
|---|---|---|
| GET | `/api/moda-conecta/leads` | Listar leads do pipeline |
| POST | `/api/moda-conecta/leads/:id/invite` | Enviar convite WhatsApp |
| GET | `/api/comunidade/admin/pre-cadastros` | Listar todos os pré-cadastros (admin) |
| GET | `/api/comunidade/admin/pre-cadastros/:id` | Consultar cadastro individual |
| PATCH | `/api/comunidade/admin/pre-cadastros/:id` | Editar dados do cadastro |
| POST | `/api/comunidade/admin/pre-cadastros/:id/gerar-link-hub` | Gerar link de acesso ao Hub (Supabase invite) |
| POST | `/api/comunidade/admin/pre-cadastros/:id/reprovar` | Reprovar cadastro |
| POST | `/api/comunidade/admin/pre-cadastros/:id/notificar-hub` | Enviar WhatsApp com link do Hub |
| GET | `/api/comunidade/admin/fornecedores` | Listar fornecedores ativos na comunidade |

---

## Páginas Frontend

**Arquivo:** `artifacts/hub/src/pages/`

| Página | Rota | Quem acessa |
|---|---|---|
| `admin.tsx` | `/admin` | Super admin — inclui seção "Curadoria Moda Conecta" |
| `admin-cadastros-moda-conecta.tsx` | `/admin/cadastros-moda-conecta` | Super admin — lista todos os pré-cadastros |
| `admin-ver-cadastro.tsx` | `/admin/ver-cadastro?id=XXX` | Super admin — detalhe + edição + aprovação |
| `comunidade-cadastro-fornecedor.tsx` | `/hub/comunidade/cadastro-fornecedor?token=XXX` | Fornecedor — formulário completo via link de convite |
| `comunidade-fornecedores.tsx` | `/hub/comunidade/fornecedores` | Todos os usuários — diretório público |
| `moda-conecta-leads.tsx` | `/hub/moda-conecta-leads` | Super admin — pipeline de leads |

---

## Bug conhecido corrigido

**Supabase Site URL:** O `generateLink` do Supabase usava `localhost:3000` como `redirect_to`
porque a Site URL do projeto Supabase estava configurada assim.
**Fix:** O endpoint `/gerar-link-hub` agora substitui o `redirect_to` no link gerado para
`https://www.gestaomirage.com.br/hub/comunidade/fornecedores` antes de retornar.

---

## O que NÃO fazer

- Não misturar `moda_conecta_leads` com `parceiros_leads` — são entidades diferentes
- Não usar `comercialLeads` para armazenar fornecedores Moda Conecta
- Não enviar e-mail pelo Supabase invite — apenas gerar o link e enviar via WhatsApp manualmente
