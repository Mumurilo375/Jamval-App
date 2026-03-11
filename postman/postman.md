Postman
Como importar a collection e o environment no Postman:

Abra o Postman.
Use Import.
Importe Jamval.postman_collection.json.
Importe Jamval.local.postman_environment.json.
Ative o environment Jamval Local.
Suba o backend localmente.
Execute as requests na ordem natural da coleção: Health, Products, Clients, Client Catalog e Visits Draft.
A coleção já salva IDs automaticamente nas variáveis de ambiente quando você roda:
Create Product
Create Client
Create Client Catalog Item
Create Draft Visit
Bulk Upsert Draft Visit Items

Erros incluídos com foco alto:
vínculo duplicado em Client Catalog
item inconsistente em Visits Draft, gerando quantitySold negativo
tentativa de editar visita já cancelada

Testes manuais para POST /visits/:id/complete:

1. Fechamento sem pagamento
- Rode Create Draft Visit.
- Rode Bulk Upsert Draft Visit Items.
- Ajuste o item para não exigir estoque central neste cenário, por exemplo com Patch Draft Visit Item usando restockedQuantity = 0.
- Garanta que a visita esteja com receivedAmountOnVisit = 0.
- Faça POST {{baseUrl}}/visits/{{visitId}}/complete com body {}.
- Esperado: status COMPLETED, completedAt preenchido, receivable criado com status PENDING e nenhum payment inicial.

2. Fechamento com pagamento parcial
- Rode novamente Create Draft Visit para gerar uma nova visita.
- Rode Bulk Upsert Draft Visit Items.
- Ajuste o item com Patch Draft Visit Item para restockedQuantity = 0 se quiser isolar o cenário financeiro.
- Atualize a visita com PATCH {{baseUrl}}/visits/{{visitId}} usando um receivedAmountOnVisit menor que o total, por exemplo 30.
- Faça POST {{baseUrl}}/visits/{{visitId}}/complete com body:
{
  "initialPayment": {
    "paymentMethod": "PIX",
    "reference": "pix nubank",
    "notes": "pago no balcão"
  }
}
- Esperado: status COMPLETED, receivable com status PARTIAL e payment inicial no mesmo valor de receivedAmountOnVisit.

3. Erro por estoque insuficiente
- Rode novamente Create Draft Visit para gerar outra visita.
- Rode Bulk Upsert Draft Visit Items mantendo restockedQuantity maior que zero.
- Faça POST {{baseUrl}}/visits/{{visitId}}/complete com body {}.
- No fluxo padrão da coleção, o produto criado via Postman não possui saldo no estoque central, então o esperado é 409 INSUFFICIENT_CENTRAL_STOCK.
- Valide que a visita permanece DRAFT e que nenhum efeito financeiro foi criado.
