# COMPLETE_VISIT_FLOW

## Objetivo

Este documento registra a regra de negócio esperada para o futuro endpoint POST /visits/:id/complete.

O objetivo do fechamento é transformar uma visita em DRAFT em um registro operacional concluído, consolidando três efeitos principais:

- congelar o histórico da visita e dos itens visitados
- aplicar os movimentos de estoque decorrentes da conferência, venda, perda, devolução e reposição
- abrir o financeiro da visita com receivable e pagamento inicial quando houver valor recebido no ato

Este documento não implementa código e não altera o fluxo atual do backend.

## Pré-condições

- a visita deve existir
- a visita deve estar em status DRAFT
- a visita deve possuir ao menos um item
- todos os itens da visita devem estar válidos e coerentes com as regras de cálculo do draft
- deve existir estoque central suficiente para atender a reposição de todos os itens
- se receivedAmountOnVisit for maior que zero, deve existir paymentMethod informado na requisição de fechamento

## Validações

### Consistência de VisitItem

Cada item precisa manter a fórmula oficial já adotada no draft:

- quantitySold = quantityPrevious - quantityGoodRemaining - quantityDefectiveReturn - quantityLoss
- quantitySold não pode ser negativo
- subtotalAmount deve ser recalculado como quantitySold x unitPrice
- resultingClientQuantity deve refletir quantityGoodRemaining + restockedQuantity
- clientProductId, quando informado, deve pertencer ao mesmo cliente e ao mesmo produto da visita

O fechamento não deve confiar apenas nos valores persistidos no draft. Antes de aplicar efeitos, o backend deve recalcular os campos derivados e garantir que os valores armazenados ainda estão consistentes.

### Total da visita

- totalAmount deve ser recalculado a partir da soma dos subtotalAmount de todos os itens
- receivedAmountOnVisit não pode ser negativo
- receivedAmountOnVisit deve ser menor ou igual a totalAmount

### Idempotência e segurança de referência

- o fechamento deve ser idempotente
- se a visita já estiver completed, o backend não pode repetir movimentos, nem criar novo receivable, nem criar novo payment inicial
- os movimentos de estoque e os lançamentos financeiros devem carregar referência consistente ao mesmo referenceType e referenceId da visita
- a unicidade por referência deve impedir duplicação de efeitos em cenários de retry

## Efeitos esperados

Ao concluir com sucesso:

- a visita muda de DRAFT para COMPLETED
- completedAt é preenchido
- a visita deixa de ser editável operacionalmente
- o estoque consignado do cliente é atualizado por produto
- o estoque central é atualizado por produto conforme a reposição realizada
- um receivable é criado para a visita
- um payment inicial é criado quando houver recebimento no ato

Este fechamento é o ponto a partir do qual o draft deixa de ser apenas conferência e passa a produzir efeitos permanentes em estoque e financeiro.

## Movimentos esperados

### Estoque central

- RESTOCK_TO_CLIENT: reduz o estoque central pela quantidade realmente reposta ao cliente
- DEFECTIVE_RETURN_LOG: registra a devolução com defeito para rastreabilidade, sem somar automaticamente ao saldo disponível do estoque central

### Estoque consignado do cliente

- SALE_OUT: baixa do consignado a quantidade vendida
- DEFECTIVE_RETURN_OUT: baixa do consignado a quantidade devolvida com defeito
- LOSS_OUT: baixa do consignado a quantidade perdida ou extraviada
- RESTOCK_IN: adiciona ao consignado a quantidade realmente reposta

Os movimentos devem ser lançados por item, com referência à visita, para preservar histórico auditável por cliente, produto e data.

## Financeiro

O receivable da visita deve consolidar os seguintes campos:

- originalAmount: valor total recalculado da visita
- amountReceived: valor efetivamente recebido no ato do fechamento
- amountOutstanding: originalAmount - amountReceived
- status: PENDING, PARTIAL ou PAID

Regras esperadas:

- se amountReceived for zero, status = PENDING
- se amountReceived for maior que zero e menor que originalAmount, status = PARTIAL
- se amountReceived for igual a originalAmount, status = PAID
- OVERDUE não deve ser persistido como status principal nesta fase; deve ser calculado em leitura com base em dueDate, status atual e data de consulta

Se houver pagamento no ato:

- deve existir paymentMethod válido
- deve ser criado um Payment inicial vinculado ao receivable
- o valor do payment inicial deve ser igual a receivedAmountOnVisit

Se não houver pagamento no ato:

- nenhum Payment deve ser criado no fechamento
- o receivable nasce com amountReceived = 0

## Idempotência

O endpoint deve ser seguro para retry de rede e para reenvio acidental da mesma requisição.

Comportamento esperado:

- se a visita já estiver COMPLETED, os efeitos não devem ser reaplicados
- movimentos de estoque não devem ser duplicados
- receivable não deve ser recriado
- payment inicial não deve ser recriado
- a resposta deve ser segura em retry, retornando o estado final já consolidado da visita e de seus efeitos relacionados

Esse cuidado é importante porque o fechamento é uma operação de fronteira entre conferência, estoque e financeiro. Duplicação aqui gera distorção operacional séria.

## Fora do escopo

- assinatura do cliente
- geração de PDF
- envio por WhatsApp
- reversão ou cancelamento depois que a visita estiver completed

Esses pontos podem consumir os dados gerados pelo fechamento, mas não fazem parte da primeira implementação do endpoint.

## Exemplos

### Fechamento sem pagamento

Cenário:

- totalAmount recalculado da visita = 182,70
- receivedAmountOnVisit = 0
- dueDate informada para cobrança posterior

Resultado esperado:

- visita vai para COMPLETED
- estoque é movimentado normalmente
- receivable é criado com originalAmount = 182,70, amountReceived = 0, amountOutstanding = 182,70 e status = PENDING
- nenhum payment é criado

### Fechamento com pagamento parcial

Cenário:

- totalAmount recalculado da visita = 240,00
- receivedAmountOnVisit = 100,00
- paymentMethod = PIX

Resultado esperado:

- visita vai para COMPLETED
- estoque é movimentado normalmente
- receivable é criado com originalAmount = 240,00, amountReceived = 100,00, amountOutstanding = 140,00 e status = PARTIAL
- payment inicial é criado no valor de 100,00 com método PIX

### Erro por estoque insuficiente

Cenário:

- os itens da visita pedem reposição total de 18 unidades de determinado produto
- o estoque central disponível para esse produto é 11

Resultado esperado:

- o fechamento deve falhar integralmente
- a visita permanece em DRAFT
- nenhum movimento de estoque deve ser gravado
- nenhum receivable deve ser criado
- nenhum payment deve ser criado

## Resumo operacional

POST /visits/:id/complete será, no futuro, a operação transacional que transforma a conferência draft em efeitos definitivos de estoque e financeiro. O ponto central do caso de uso é garantir recalculo, consistência e idempotência antes de mudar a visita para COMPLETED.