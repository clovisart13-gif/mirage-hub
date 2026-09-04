# Padrões de Código — Mirage Hub

> Seguir estes padrões em todo código novo ou modificado.  
> Qualquer desvio deve ser explicitamente aprovado.  
> Atualizado em: Julho 2026.

---

## Stack — nunca trocar sem aprovação

| Camada | Tecnologia correta | Nunca usar |
|---|---|---|
| Roteamento frontend | **Wouter** | `react-router-dom` |
| Estilos | **Tailwind CSS 4** | CSS puro, styled-components, Emotion |
| Componentes primitivos | **Radix UI** | Material UI, Chakra UI, Ant Design |
| Estado de servidor | **TanStack Query 5** | Redux, Zustand, SWR |
| Validação | **Zod** | Yup, Joi, validação manual |
| ORM | **Drizzle ORM** | Prisma, TypeORM, Sequelize, queries SQL brutas |
| Forms | **react-hook-form + Zod** | Formik, controlled components manuais |
| Build frontend | **Vite 7** | webpack, Parcel |
| Runtime | **Node.js 24 ESM** | CommonJS (`require`), ts-node |

---

## TypeScript

- Sempre usar TypeScript — nunca criar arquivos `.js` em rotas ou componentes
- Sempre exportar tipos de request/response via `@workspace/api-zod` — nunca duplicar tipos entre backend e frontend
- Nunca usar `any` — usar `unknown` com type guard se necessário
- Interfaces de entidades de banco: usar os tipos inferidos pelo Drizzle (`InferSelectModel`, `InferInsertModel`)

```typescript
// ✅ Correto
import type { InferSelectModel } from 'drizzle-orm';
import { referencias } from '@workspace/db';
type Referencia = InferSelectModel<typeof referencias>;

// ❌ Errado
interface Referencia {
  id: string;
  // ... duplicar a definição do schema
}
```

---

## Backend — Rotas Express

### Estrutura de rota
```typescript
// ✅ Padrão de rota
router.get('/items', async (req, res) => {
  try {
    const tenantId = req.session.tenantId; // sempre pegar do session
    const items = await db.select()
      .from(tabela)
      .where(eq(tabela.tenantId, tenantId)); // sempre filtrar por tenant
    res.json({ items });
  } catch (error) {
    logger.error({ error }, 'Erro ao buscar items');
    res.status(500).json({ error: 'Erro interno' });
  }
});
```

### Regras de rota
- **Sempre filtrar por `tenant_id`** em toda query — sem exceção
- **Sempre usar `logger`** (Pino) — nunca `console.log` em produção
- **Sempre validar input com Zod** antes de processar
- **Nunca expor stack trace** no response — logar internamente, retornar mensagem genérica
- **Sempre retornar JSON consistente** — `{ data }` para sucesso, `{ error: string }` para erro

### Estrutura de módulo de rota
```
routes/
  meu-modulo/
    index.ts      ← router principal, monta sub-rotas
    items.ts      ← CRUD de items
    [sub-recurso].ts
```

---

## Banco de Dados — Drizzle ORM

### Nunca escrever SQL bruto para operações de negócio
```typescript
// ✅ Correto
const items = await db.select().from(tabela).where(eq(tabela.id, id));

// ❌ Errado (exceto em migrate.ts)
await pool.query('SELECT * FROM tabela WHERE id = $1', [id]);
```

### Schema — onde e como definir
- Schemas ficam em `lib/db/src/schema/[modulo].ts`
- Exportar do index: `lib/db/src/schema/index.ts`
- Usar `pgTable` do Drizzle
- Sempre incluir `tenantId` em tabelas de negócio
- Sempre incluir `createdAt` e `updatedAt` com `defaultNow()`

```typescript
// ✅ Template de tabela
export const minhaTabela = pgTable('minha_tabela', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  // campos de negócio aqui
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### Migrations
- Toda nova tabela ou coluna em produção precisa de guard em `migrate.ts`
- Usar `IF NOT EXISTS` para tabelas, `IF NOT EXISTS` + `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` para colunas
- **Nunca** usar `drizzle-kit push` para produção — só para dev

---

## Frontend — React / Vite

### Componentes
- Um componente por arquivo
- Arquivos de componente: PascalCase (`MeuComponente.tsx`)
- Pasta de componente só se tiver mais de um arquivo relacionado
- Nunca criar componente maior que ~300 linhas — quebrar em sub-componentes

### Fetch de dados
```typescript
// ✅ Correto — TanStack Query
const { data, isLoading } = useQuery({
  queryKey: ['meus-items', tenantId],
  queryFn: () => api.getMeusItems(),
});

// ❌ Errado — fetch manual com useEffect
useEffect(() => {
  fetch('/api/items').then(...);
}, []);
```

### Estilo
- Sempre usar classes Tailwind — nunca CSS inline ou arquivos `.css` separados para componentes
- Usar variantes `cn()` para classes condicionais
- Dark mode: prefixo `dark:` do Tailwind

### Rotas frontend (Wouter)
```typescript
// ✅ Correto
import { useLocation } from 'wouter';
const [, navigate] = useLocation();
navigate('/hub/kanban');

// ❌ Errado
import { useNavigate } from 'react-router-dom'; // não existe no projeto
```

---

## Segurança

- **Nunca logar secrets, tokens, senhas ou dados pessoais**
- **Nunca expor `tenant_id` de outros tenants** em responses
- **Nunca confiar em dados do cliente** sem validação Zod no backend
- **Nunca fazer query sem filtro de tenant** — mesmo em rotas admin, ser explícito

---

## Integrações externas

- Sempre usar as libs wrapper em `lib/integrations-*` — nunca chamar APIs externas diretamente sem passar por elas
- Sempre tratar erros de integração com try/catch e logar antes de relançar
- Para Z-API: ver regra de Client-Token no deploy notification (`.agents/memory/deploy-notification-rule.md`)
- Para n8n: sanitizar campos read-only antes de PUT (`.agents/memory/n8n-workflow-update-sanitization.md`)

---

## Checklist antes de commitar

- [ ] Filtro por `tenant_id` em toda query nova
- [ ] Input validado com Zod na rota
- [ ] Erros logados com `logger`, não `console.log`
- [ ] Nenhum `any` no TypeScript
- [ ] Nenhuma tabela nova sem `tenant_id` e `createdAt`
- [ ] Schema novo exportado em `lib/db/src/schema/index.ts`
- [ ] Migration guard em `migrate.ts` se criar tabela/coluna nova
- [ ] Nenhum secret ou dado pessoal em logs
