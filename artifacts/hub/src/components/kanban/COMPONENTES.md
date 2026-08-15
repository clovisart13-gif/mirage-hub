# Componentes Kanban — Ecossistema Mirage

Diretório: `artifacts/hub/src/components/kanban/`

---

## Mapa de arquivos

```
kanban/
├── types.ts                    ← Tipos TypeScript + constantes de fases
├── NovoCartaoDialog.tsx        ← Criar nova referência
├── EditarCartaoDialog.tsx      ← Editar referência existente
├── ConcluirFaseDialog.tsx      ← Popup ao SAIR de fase produtiva (registra CMO + perdas)
├── IniciarProximaFaseDialog.tsx← Popup ao ENTRAR em fase produtiva (define CMO, fornecedor, datas)
├── IniciarTecidoDialog.tsx     ← Popup especial: enviar para Tecido (sem CMO)
├── ConcluirTecidoDialog.tsx    ← Popup especial: retorno do Tecido
├── IniciarExpedicaoDialog.tsx  ← Popup especial: enviar para Expedição
├── ExpedicaoDialog.tsx         ← Popup especial: concluir Expedição (move para Faturamento)
└── COMPONENTES.md              ← este arquivo
```

Página principal: `artifacts/hub/src/pages/kanban.tsx`

---

## types.ts — referência rápida

```typescript
// Todas as fases na ordem correta do fluxo:
FASES: Fase[]

// Conjunto de fases que geram popup ao SAIR (ConcluirFaseDialog):
FASES_ORIGEM_COM_POPUP: Set<string>
// = corte, beneficiamento, costura, lavanderia, acabamento, passadoria

// Conjunto de fases que geram popup ao ENTRAR (IniciarProximaFaseDialog):
FASES_PRODUTIVAS: Set<string>
// = corte, beneficiamento, costura, lavanderia, acabamento, passadoria

// Label legível de cada fase:
FASE_LABEL: Record<string, string>
// ex: FASE_LABEL['costura'] = 'Costura'

// Cor de badge de cada fase:
FASE_COLOR: Record<string, string>
```

---

## Fluxo de dialogs ao arrastar um cartão

```
Fase de origem →  Fase de destino      Resultado
─────────────────────────────────────────────────────────────────
qualquer          tecido               IniciarTecidoDialog
tecido            qualquer             ConcluirTecidoDialog
expedicao         qualquer             ExpedicaoDialog
produtiva*        expedicao            ConcluirFaseDialog → IniciarExpedicaoDialog
produtiva*        outra fase           ConcluirFaseDialog → IniciarProximaFaseDialog
espera            produtiva*           IniciarProximaFaseDialog (sem ConcluirFase)
administrativa†   qualquer             Mover direto (sem popup)
```

*produtiva = corte, beneficiamento, costura, lavanderia, acabamento, passadoria  
†administrativa = inicio, espera, modelagem, risco, faturamento, concluido

---

## Props dos dialogs

### NovoCartaoDialog
```typescript
{ open, onOpenChange, onSuccess, clientes? }
```

### EditarCartaoDialog
```typescript
{ open, onOpenChange, referencia, onSuccess, clientes? }
```

### ConcluirFaseDialog
```typescript
{
  open, onOpenChange,
  cartao: Referencia | null,
  proximaEtapa: string,    // fase de destino do drag
  onSuccess?: () => void,  // chamado após concluir — abre o próximo dialog
}
```

### IniciarProximaFaseDialog
```typescript
{
  open, onOpenChange,
  cartao: Referencia | null,
  proximaEtapa: string,
  fornecedores?: Fornecedor[],
  onSuccess?: () => void,
  onMoverEspera?: () => void,  // botão "Mover para Espera"
}
```

### IniciarTecidoDialog / ConcluirTecidoDialog
```typescript
{
  open, onOpenChange,
  cartao: Referencia | null,
  fornecedores?: Fornecedor[],   // só IniciarTecidoDialog
  etapaDestino?: string,         // só ConcluirTecidoDialog
  onSuccess?: () => void,
}
```

### IniciarExpedicaoDialog / ExpedicaoDialog
```typescript
{ open, onOpenChange, cartao: Referencia | null, onSuccess?: () => void }
```

---

## Como adicionar uma nova fase

1. **`types.ts`** — adicionar a string no array `FASES` na posição correta
2. **`types.ts`** — adicionar entrada em `FASE_LABEL` e `FASE_COLOR`
3. **`references.ts` (API)** — adicionar no array `FASES`
4. Se for produtiva — adicionar em `FASES_PRODUTIVAS` e `FASES_ORIGEM_COM_POPUP` nos dois arquivos acima
5. **`kanban.tsx`** — adicionar cor no mapa `COR_PADRAO_FASE`

---

## Como ajustar lógica de CMO / conta a pagar

- **Geração automática**: `artifacts/api-server/src/routes/kanban/referencias.ts`
  - Procurar por `contas_a_pagar` nas rotas `/mover` e `/iniciar-proxima`
  - A condição é: `FASES_PRODUTIVAS.includes(fase_destino) && cmo > 0 && fornecedor_id`

- **Sem CMO**: No frontend, todos os dialogs de fase produtiva têm um toggle "Sem CMO"
  - Quando ativo, envia `cmo: 0` → conta a pagar NÃO é gerada

---

## Convenções de valores monetários

| Onde          | Formato                          | Exemplo        |
|---------------|----------------------------------|----------------|
| Banco (cmp/cmo) | INTEGER em centavos            | 2500 = R$ 25,00 |
| API (entrada) | INTEGER em centavos             | 2500           |
| Front (input) | FLOAT em reais                  | 25.00          |
| Conversão     | `Math.round(parseFloat(v) * 100)` | 25.00 → 2500 |
| Exibição      | `new Intl.NumberFormat('pt-BR', { style: 'currency', ... })` | R$ 25,00 |
| contas_a_pagar.valor | NUMERIC em REAIS         | "25.00"        |
