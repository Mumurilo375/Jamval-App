# Demo: https://jamval-frontend.vercel.app/

> Nota: este sistema foi desenvolvido para um único usuário (foi feito para meu pai) e não possui cadastro público. Para testar o site use o login: `teste@gmail.com` / senha: `#Borabill67`.

# Jamval App

Sistema web para controle de vendas em consignação, visitas, recebimentos, comprovantes e estoque de uma pequena operação familiar de acessórios eletrônicos.

Este é um projeto individual desenvolvido por **Murilo Pereira Macedo**, estudante do **3/5 semestre do Tecnólogo em Análise e Desenvolvimento de Sistemas**. A ideia nasceu de um problema real da empresa do meu pai, a Jamval, que vende cabos, carregadores, fones e outros acessórios principalmente por consignação.

> Status: em desenvolvimento avançado. A aplicação ainda passa por ajustes finais antes de entrar no uso diário real.

## Por Que Esse Projeto Existe

Na rotina atual, meu pai deixa produtos em lojas parceiras e volta depois para conferir o que foi vendido. Esse processo era feito com papel impresso, comparação manual com a lista anterior e cálculo na calculadora na frente do cliente.

O Jamval App foi criado para transformar esse fluxo em uma experiência mais rápida e confiável:

- saber o que ficou em cada cliente;
- calcular automaticamente o que foi vendido;
- registrar pagamento total, parcial ou pendente;
- controlar o que precisa receber depois;
- atualizar a nova base de produtos para a próxima visita;
- gerar um comprovante em PDF para conferência e envio ao cliente;
- acompanhar estoque, lucro, visitas e indicadores financeiros.

Usei apoio de ferramentas de inteligência artificial durante o desenvolvimento para estudar alternativas, acelerar partes da implementação e revisar decisões técnicas, mas a modelagem do problema, o fluxo do produto e a evolução da aplicação foram conduzidos por mim.

## Demonstração Do Fluxo

> Substitua por uma print da página `/` mostrando a **Fila do dia**, com clientes para retorno, visitas em andamento e histórico recente.

1. O usuário cadastra produtos, clientes e o catálogo de produtos por cliente.
2. O estoque central recebe entradas manuais com quantidade e custo de compra.
3. Uma visita é aberta como **consignação** ou **venda direta**.
4. Na consignação, a tela carrega a base anterior do cliente e permite informar o que foi vendido, trocado, perdido e o que sobrou.
5. O sistema calcula o total do acerto e registra quanto foi pago na hora.
6. Depois vem a reposição: o usuário informa o que vai deixar no cliente e o sistema calcula a nova base.
7. Ao concluir, a visita movimenta estoque, cria o financeiro e fica disponível para geração de comprovante.
8. Se o cliente não pagou tudo, o valor restante aparece na área **Receber**.
9. A fila de retorno ajuda a lembrar quais clientes precisam ser visitados novamente.

> Substitua por uma print da página `/visits/:id` mostrando as etapas **Conferir venda do período**, **Receber** e **Repor e gerar nova base**.

## Funcionalidades

### Operação e Visitas

- Dashboard inicial com fila de retorno, visitas abertas e histórico recente.
- Criação de visita por cliente, com tipo **Consignação** ou **Venda direta**.
- Bloqueio para evitar mais de uma visita em aberto para o mesmo cliente.
- Fluxo de consignação com:
  - base anterior do cliente;
  - unidades vendidas;
  - trocas/devoluções com defeito;
  - perdas;
  - restante no cliente;
  - preço por item;
  - total automático;
  - reposição do dia;
  - nova base para a próxima visita.
- Fluxo de venda direta com busca rápida de produtos, quantidade, preço e subtotal.
- Visitas concluídas ficam somente para leitura, preservando o histórico.

### Financeiro

- Registro de valor recebido no fechamento da visita.
- Criação automática de contas a receber quando existe saldo pendente.
- Página **Receber** com filtros por pendente, parcial e quitado.
- Registro de novos pagamentos com forma de pagamento, referência e observações.
- Proteção para impedir pagamento maior que o saldo atual.

> Substitua por uma print da página `/financeiro` mostrando clientes com saldo pendente e o resumo de total, recebido e saldo.

### Estoque

- Controle de estoque central por produto.
- Carga inicial para começar a operação.
- Entrada manual de mercadoria com custo unitário real.
- Ajuste manual positivo ou negativo para correções.
- Histórico de movimentações com filtros por tipo e período.
- Saídas automáticas por reposição de consignação e por venda direta.
- Alertas de produtos sem saldo ou com baixa quantidade.

> Substitua por uma print da página `/stock` mostrando saldo atual, produtos com baixa quantidade e atalhos de movimentação.

### Comprovantes

- Geração de comprovante em PDF para visitas concluídas.
- Comprovante de venda direta.
- Comprovante de acerto e reposição para consignação.
- Dados da empresa, cliente, visita, produtos, valores, pagamento e assinatura manual.
- Página para localizar visitas concluídas e abrir o comprovante.

> Substitua por uma print da página `/receipts` ou do detalhe de uma visita concluída mostrando o card de geração/download do comprovante.

### Administração

- Dashboard financeiro com filtro de data.
- Comparativo **vendido x recebido**.
- Ritmo de visitas por período.
- Situação da carteira: pendente, parcial e quitado.
- Visão de lucro bruto quando há custo de compra disponível.
- Ranking de produtos por resultado e giro.
- Indicadores de produtos sem custo, sem estoque e clientes com maior pendência.
- Configuração dos dados da empresa usados nos comprovantes.

> Substitua por uma print da página `/admin/dashboard` mostrando gráficos e cards financeiros.

## Rotas Principais

| Rota | Função |
| --- | --- |
| `/login` | Acesso do usuário administrador |
| `/` | Fila do dia e atalhos operacionais |
| `/visits` | Organizador de visitas |
| `/visits/new` | Abertura de visita |
| `/visits/:id` | Fluxo completo da visita |
| `/financeiro` | Contas a receber |
| `/stock` | Estoque central |
| `/products` | Cadastro de produtos |
| `/clients` | Cadastro de clientes |
| `/clients/:id/catalog` | Produtos, preços e quantidade ideal por cliente |
| `/receipts` | Localizador de comprovantes |
| `/admin/dashboard` | Dashboard administrativo |

## Stack

**Frontend**

- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router
- TanStack React Query
- React Hook Form
- Zod
- Recharts

**Backend**

- Node.js
- Fastify
- TypeScript
- Prisma ORM
- PostgreSQL
- Zod
- PDFKit
- Bcrypt
- Autenticação por sessão em cookie

**Infra e desenvolvimento**

- Monorepo com npm workspaces
- Frontend e backend com deploy na Vercel
- Banco PostgreSQL no Supabase
- Migrations e seed com Prisma
- Ambiente local com Docker Compose opcional
- Coleção Postman para testar API

## Competências Demonstradas

- Levantamento de problema real e transformação em produto.
- Modelagem de domínio com clientes, produtos, visitas, estoque, pagamentos e recebíveis.
- CRUDs completos com validação no frontend e backend.
- Fluxos guiados para reduzir erro operacional.
- Cálculo financeiro, saldo pendente e histórico de pagamentos.
- Controle de estoque central e estoque consignado por cliente.
- Transações no backend para concluir visitas com efeitos em estoque e financeiro.
- Geração de PDF com dados operacionais.
- Dashboards com indicadores e gráficos.
- Organização de código por módulos e features.
- Deploy full stack com banco remoto.

## Como Rodar Localmente

Na raiz do projeto:

```bash
npm install
cp BACKEND/.env.example BACKEND/.env
cp FRONTEND/.env.example FRONTEND/.env
npm run prisma:generate
npm run dev
```

Para aplicar migrations e popular dados de desenvolvimento:

```bash
npm run prisma:migrate:dev --workspace backend
npm run prisma:seed --workspace backend
```

Para criar ou atualizar um usuário administrador:

```bash
npm run admin:create -- --name "Murilo Pereira" --email "admin@jamval.local" --password "sua-senha"
```

O frontend roda com Vite e usa `/api` como proxy para o backend em desenvolvimento.

## Próximos Ajustes

- Finalizar pequenos ajustes de usabilidade antes do uso real diário.
- Polir o fluxo de comprovantes e compartilhamento.
- Revisar detalhes de responsividade no celular durante visitas reais.
- Evoluir futuras preferências operacionais na área administrativa.

## Autor

**Murilo Pereira Macedo**  
Tecnólogo em Análise e Desenvolvimento de Sistemas, 3/5 semestre.

Projeto criado para resolver uma necessidade real da Jamval e servir como principal case prático no meu portfólio.
