# Dados de demonstração

O seeder cria uma base fictícia para explorar o sistema: produtos, clientes, catálogos por cliente, entrada de estoque, movimentações, visitas de consignação e venda direta, rascunhos, contas a receber e pagamentos.

## Rodar

Com as migrations aplicadas e o `DATABASE_URL` apontando para o **banco local/de desenvolvimento**, execute na raiz do projeto:

```bash
npm run prisma:seed
```

Com Docker Compose, prefira executar dentro do container do backend:

```bash
npm run prisma:seed:docker
```

Para partir de um banco limpo:

```bash
npm run prisma:migrate:dev --workspace backend
npm run prisma:seed
```

> Atenção: não execute este comando no banco de produção. Em cada execução ele remove e recria as visitas identificadas por `SEED-VIS-`, seus pagamentos e suas movimentações; os saldos dos produtos do seed também são reconstruídos.

## O que será criado

- 18 produtos de acessórios;
- 12 clientes e seus catálogos personalizados;
- uma entrada inicial de estoque para cada produto;
- 14 visitas concluídas, incluindo consignação, venda direta, devolução por defeito e perda;
- contas a receber nos estados pago, parcial e pendente;
- três rascunhos prontos para testar o fluxo de conclusão.

Todos os registros gerados recebem o marcador `[seed:jamval-dev:v1]` nas observações quando o campo permite identificação. O seed pode ser executado novamente para restaurar a base fictícia.
