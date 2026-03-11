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