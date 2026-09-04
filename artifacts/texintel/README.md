# TexIntel standalone — fundação técnica

Esta pasta contém a fundação independente do TexIntel. Ela não usa banco, autenticação, tenants, rotas, workflows ou segredos do Hub Mirage.

O blueprint canônico está em [`../../docs/texintel-standalone-blueprint.md`](../../docs/texintel-standalone-blueprint.md).

## Estado atual

Implementado:

- registro com nome, e-mail, senha e criação do primeiro workspace;
- login, sessão HTTP-only e logout;
- seleção explícita quando um usuário possui mais de um workspace;
- senhas protegidas com `scrypt`, salt aleatório e comparação timing-safe;
- banco SQLite próprio e persistente no desenvolvimento;
- migrations locais idempotentes;
- usuários, workspaces e memberships;
- entidade mestre `prospected_brands`;
- evidências, notas de curadoria, avaliações de fit e eventos;
- isolamento de leitura e escrita por workspace;
- dashboard autenticado;
- criação de marca sem exigir CNPJ;
- detalhe da marca com evidência, nota e score versionado;
- build Vite independente do `api-server` e do cliente de API do Hub.

Não implementado:

- recuperação de senha por e-mail;
- convite e administração de membros;
- edição/arquivamento de marcas;
- descoberta e scraping reais;
- enriquecimento CNPJ;
- chamadas de IA;
- integração ou criação de leads no Hub;
- publicação em Vercel.

## Stack

- React 19 + Vite 7 + TypeScript;
- Wouter para rotas do frontend;
- servidor HTTP próprio em Node.js 24;
- `node:sqlite` para o banco local próprio;
- cookies HTTP-only, `SameSite=Lax`, com sessão persistida no banco;
- `scrypt` nativo do Node para hash de senha;
- Tailwind CSS e componentes Radix já existentes no artefato.

## Como rodar localmente

Na raiz do workspace:

```bash
pnpm --filter @workspace/texintel run dev
```

O workflow do Replit fornece `PORT=20386` e `BASE_PATH=/texintel/`. Fora do workflow, os mesmos valores são usados como padrão.

Para isolar o arquivo de banco:

```bash
TEXINTEL_DB_PATH=/tmp/meu-texintel.sqlite \
PORT=20400 \
BASE_PATH=/ \
pnpm --filter @workspace/texintel run dev
```

Comandos de qualidade:

```bash
pnpm --filter @workspace/texintel run typecheck
pnpm --filter @workspace/texintel run build
```

## Variáveis de ambiente

| Variável | Obrigatória | Uso |
|---|---|---|
| `PORT` | não | Porta do servidor; padrão `20386` |
| `BASE_PATH` | não | Prefixo público; padrão `/texintel/` |
| `TEXINTEL_DATA_DIR` | não | Diretório próprio para o SQLite |
| `TEXINTEL_DB_PATH` | não | Caminho absoluto/relativo do SQLite; prevalece sobre `TEXINTEL_DATA_DIR` |
| `NODE_ENV` | não | Ativa cookie `Secure` quando `production` |

Não configurar neste app credenciais do Hub, R2PB, n8n, Z-API ou Supabase do Mirage.

## Modelo inicial

### Autoridade

- `users`: identidade global exclusiva do TexIntel;
- `workspaces`: espaço operacional próprio;
- `memberships`: papel `owner`, `admin`, `curator` ou `viewer`;
- `sessions`: token hash, usuário, workspace ativo e expiração.

### Inteligência comercial

- `prospected_brands`: entidade mestre, independente de CNPJ;
- `brand_evidence`: sinal observado e sua fonte;
- `fit_assessments`: snapshots de score, dimensões, rubrica e justificativa;
- `curation_notes`: contexto e decisão humana;
- `brand_events`: histórico append-only das mudanças importantes.

Todas as tabelas de negócio carregam `workspace_id`. A API busca a sessão no servidor e nunca confia em um `workspace_id` enviado pelo frontend.

## API própria

Prefixo local: `${BASE_PATH}/api`.

Rotas principais:

- `GET /api/health`;
- `POST /api/auth/register`;
- `POST /api/auth/login`;
- `GET /api/auth/me`;
- `POST /api/auth/select-workspace`;
- `POST /api/auth/logout`;
- `GET /api/dashboard/summary`;
- `GET|POST /api/brands`;
- `GET /api/brands/:id`;
- `POST /api/brands/:id/evidence`;
- `POST /api/brands/:id/notes`;
- `POST /api/brands/:id/score`.

Nenhuma dessas rotas chama o Hub Mirage.

## Preparação para Vercel

O frontend já gera bundle estático com:

```bash
pnpm --filter @workspace/texintel run build
```

Saída:

```text
artifacts/texintel/dist/public
```

O deploy de produção continua deliberadamente bloqueado. SQLite em arquivo não é storage persistente seguro em funções serverless da Vercel.

Antes de criar o projeto Vercel:

1. criar um PostgreSQL dedicado do TexIntel;
2. adicionar um adapter de banco com o mesmo domínio atual;
3. converter as migrations SQLite em migrations PostgreSQL próprias;
4. mover as rotas HTTP para Vercel Functions/Route Handlers ou runtime equivalente;
5. configurar cookies `Secure` e URL pública própria;
6. validar registro, login, logout e isolamento em preview;
7. criar variáveis apenas no projeto TexIntel;
8. confirmar que nenhum import/hostname/segredo do Mirage está presente;
9. somente então criar `vercel.json` e publicar.

Não existe `vercel.json` ativo nesta fundação para impedir um deploy acidental com banco efêmero.

## Segurança e limites

- senha mínima atual: 8 caracteres;
- sessão expira em 7 dias;
- token bruto existe apenas no cookie; o banco guarda seu hash;
- cookies são HTTP-only e não ficam disponíveis ao JavaScript;
- isolamento por workspace é aplicado no servidor;
- URL de fonte aceita apenas `http` e `https`;
- payload JSON é limitado a 1 MB;
- não há scraping, IA ou comunicação externa nesta etapa.

## Arquivos principais

```text
server/db.ts                 banco, migrations e regras de persistência
server/index.ts              servidor, auth e API própria
src/lib/api.ts               cliente HTTP do frontend
src/pages/Auth.tsx           login e registro
src/pages/WorkspaceSelect.tsx seleção de workspace
src/pages/Dashboard.tsx      dashboard e criação de marca
src/pages/BrandDetail.tsx    evidência, nota e avaliação
```