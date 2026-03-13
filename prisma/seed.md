Seeds

Como rodar os seeds:

1. Garanta que `DATABASE_URL` aponte para o banco de desenvolvimento.
2. Garanta que as migrations ja estejam aplicadas.
3. Rode um dos fluxos:
   - `npx prisma migrate reset`
   - ou:
     - `npx prisma migrate reset --skip-seed`
     - `npm run prisma:seed`

O seed foi desenhado para rerun seguro:
- produtos sao atualizados por SKU
- clientes de seed sao reencontrados pelo marcador interno de seed nas notes
- vinculos de catalogo usam a chave composta existente
- visitas de seed usam `visitCode` fixo com prefixo `SEED-VIS-`
- a limpeza operacional atinge apenas dados identificados como seed pelo prefixo do `visitCode` e pelo `SEED_TAG`

O que o seed corrige na V1 atual:
- nao usa `dueDate`
- nao cria cenarios de `overdue`
- nao usa `quantityLoss` como parte visivel dos cenarios
- nao usa `suggestedRestockQuantity` como parte relevante do seed
- cria estoque central suficiente para os produtos usados nas visitas

Cenarios seedados

1. Mercado Nova Esperanca
- `SEED-VIS-MERCADO-CARGA-001`
  - cenario: carga inicial concluida
  - produtos:
    - `JMV-CABO-USBC-1M-BK`
    - `JMV-CARREG-20W-USBC`
- `SEED-VIS-MERCADO-COBRANCA-002`
  - cenario: visita normal concluida
  - produtos:
    - `JMV-CABO-USBC-1M-BK`
    - `JMV-CARREG-20W-USBC`
  - objetivo:
    - anterior maior que zero
    - restante menor
    - sem trocas
    - cobranca positiva

2. Conecta Cell Acessorios
- `SEED-VIS-CONECTA-HIST-014`
  - cenario: historico concluido com novo saldo igual a `14`
  - produto principal:
    - `JMV-CABO-LIGHT-1M-WH`
- `SEED-VIS-CONECTA-DRAFT-014`
  - cenario: draft com historico de `14`
  - produto principal:
    - `JMV-CABO-LIGHT-1M-WH`
  - esse draft permanece em `DRAFT`

3. Conveniencia Ponto 24h
- `SEED-VIS-CONV-CARGA-001`
  - cenario: carga inicial concluida
  - produtos:
    - `JMV-CARREG-VEIC-2USB`
    - `JMV-CABO-USBC-1M-BK`
- `SEED-VIS-CONV-TROCAS-002`
  - cenario: visita concluida com trocas
  - produtos:
    - `JMV-CARREG-VEIC-2USB`
    - `JMV-CABO-USBC-1M-BK`
  - objetivo:
    - `trocas > 0`
    - trocas nao entram como venda

4. Papelaria Central Mix
- `SEED-VIS-PAPELARIA-DRAFT-001`
  - cenario: draft de primeira visita
  - produto principal:
    - `JMV-FONE-P2-ESTEREO`
  - esse draft permanece em `DRAFT`

O que deve existir no frontend depois do seed

- na lista de visitas, deve haver pelo menos:
  - um rascunho de primeira visita
  - um rascunho com historico de `14`
  - uma visita concluida normal
  - uma visita concluida com trocas
- no draft `SEED-VIS-PAPELARIA-DRAFT-001`:
  - `Anterior no cliente = 0`
  - `Total a cobrar = 0`
- no draft `SEED-VIS-CONECTA-DRAFT-014`:
  - deve existir item com `Anterior no cliente = 14`
  - deve ser possivel validar o exemplo `14 -> 10 -> vendido 4 -> reposta 10 -> novo saldo 20`
- o estoque central deve estar suficiente para concluir os drafts seedados sem erro artificial de falta de estoque

Testes recomendados no frontend depois do seed

1. Draft de primeira visita
- abra `SEED-VIS-PAPELARIA-DRAFT-001`
- valide:
  - `Anterior no cliente = 0`
  - `Vendido = 0`
  - `Total a cobrar = 0`
  - reposicao formando saldo para a proxima visita

2. Draft com historico de 14
- abra `SEED-VIS-CONECTA-DRAFT-014`
- valide:
  - `Anterior no cliente = 14`
  - com `Restante na loja = 10` e `Trocas = 0`, o frontend mostra `Vendido = 4`
  - com `Quantidade reposta = 10`, o frontend mostra `Novo saldo no cliente = 20`

3. Visita concluida com trocas
- abra `SEED-VIS-CONV-TROCAS-002`
- valide:
  - `Trocas` visiveis
  - a cobranca nao inclui trocas

4. Conclusao de draft
- conclua um dos drafts seedados
- valide:
  - nao falha por estoque central insuficiente
  - totais e financeiro continuam coerentes
