# QA Fixes

## Baseline inicial

### `npm run lint --workspace frontend`
- Status inicial: falhou
- Resultado inicial: `33 problemas (26 errors, 7 warnings)`
- Resultado final: `5 warnings, 0 errors`
- Erros priorizados nesta rodada:
  - `react-hooks/rules-of-hooks` em `/visits`
  - `react-hooks/set-state-in-effect` nas telas de lista e nos fluxos de visita
  - `react-refresh/only-export-components` em `operational-queue.tsx`

### `npm run build --workspace frontend`
- Status inicial: passou
- Status final: passou

### `npm run build --workspace backend`
- Status inicial: bloqueado por ambiente
- Status final: continua bloqueado por ambiente
- Observação: `prisma generate` falha com `EPERM` ao renomear `query_engine-windows.dll.node`

## Checklist de correção

| Status | Etapa | Escopo |
| --- | --- | --- |
| `feito` | Criar trilha de QA | Arquivo raiz com baseline e backlog |
| `feito` | Corrigir `/visits` e telas de lista | Paginação, hooks e resets de página |
| `feito` | Separar exports de `operational-queue.tsx` | Hook e utilitários em arquivos próprios |
| `feito` | Corrigir `direct-sale-visit-flow.tsx` | Reset guiado por visita persistida, sem limpar edição em refetch comum |
| `feito` | Corrigir `consignment-visit-flow.tsx` | Reset guiado por visita persistida e preenchimento do drawer sem `useEffect` |
| `feito` | Rodar checks finais | Lint sem erros + build frontend |

## Erros priorizados por arquivo

1. `FRONTEND/src/features/visits/visits-list-page.tsx`
   - `react-hooks/rules-of-hooks`
2. `FRONTEND/src/features/products/products-list-page.tsx`
   - `react-hooks/set-state-in-effect`
3. `FRONTEND/src/features/clients/clients-list-page.tsx`
   - `react-hooks/set-state-in-effect`
4. `FRONTEND/src/features/client-catalog/catalog-list-page.tsx`
   - `react-hooks/set-state-in-effect`
5. `FRONTEND/src/features/finance/finance-page.tsx`
   - `react-hooks/set-state-in-effect`
6. `FRONTEND/src/features/receipts/receipts-page.tsx`
   - `react-hooks/set-state-in-effect`
7. `FRONTEND/src/features/stock/stock-page.tsx`
   - `react-hooks/set-state-in-effect`
8. `FRONTEND/src/features/visits/operational-queue.tsx`
   - `react-refresh/only-export-components`
9. `FRONTEND/src/features/visits/direct-sale-visit-flow.tsx`
   - `react-hooks/set-state-in-effect`
10. `FRONTEND/src/features/visits/consignment-visit-flow.tsx`
    - `react-hooks/set-state-in-effect`

## Pendências adiadas

### Warnings de React Hook Form
- `FRONTEND/src/features/client-catalog/catalog-form.tsx`
- `FRONTEND/src/features/clients/client-form.tsx`
- `FRONTEND/src/features/products/product-form.tsx`
- `FRONTEND/src/features/stock/stock-manual-adjustment-page.tsx`
- `FRONTEND/src/features/visits/visit-item-form.tsx`

### Outros warnings
- `FRONTEND/src/features/stock/stock-page.tsx`
  - `react-hooks/exhaustive-deps`
- `FRONTEND/src/features/visits/consignment-visit-flow.tsx`
  - `react-hooks/exhaustive-deps`

### Backend fora do escopo desta rodada
- `npm run build --workspace backend`
  - manter apenas como registro de bloqueio de ambiente enquanto o erro `EPERM` do Prisma continuar reproduzindo

## Resultado desta rodada

- `react-hooks/rules-of-hooks` corrigido em `/visits`
- todos os erros `react-hooks/set-state-in-effect` do frontend foram removidos
- `react-refresh/only-export-components` corrigido com separação de hook e utilitários da fila operacional
- `npm run lint --workspace frontend`: sem erros
- `npm run build --workspace frontend`: passou
- `npm run build --workspace backend`: segue bloqueado por ambiente no Prisma
