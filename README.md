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

<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/35c5cc5d-a82c-4bbb-8619-6c918111627b" />

1. O usuário cadastra produtos, clientes e o catálogo de produtos por cliente.
2. O estoque central recebe entradas manuais com quantidade e custo de compra.
3. Uma visita é aberta como **consignação** ou **venda direta**.
4. Na consignação, a tela carrega a base anterior do cliente e permite informar o que foi vendido, trocado, perdido e o que sobrou.
5. O sistema calcula o total do acerto e registra quanto foi pago na hora.
6. Depois vem a reposição: o usuário informa o que vai deixar no cliente e o sistema calcula a nova base.
7. Ao concluir, a visita movimenta estoque, cria o financeiro e fica disponível para geração de comprovante.
8. Se o cliente não pagou tudo, o valor restante aparece na área **Receber**.
9. A fila de retorno ajuda a lembrar quais clientes precisam ser visitados novamente.

<img width="1370" height="802" alt="image" src="https://github.com/user-attachments/assets/611e8c64-8fc2-4248-82a0-0d8685cb7588" />

<img width="1370" height="973" alt="image" src="https://github.com/user-attachments/assets/937efdc5-0a45-423d-9c67-5d949614b5e9" />

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

<img width="1212" height="359" alt="image" src="https://github.com/user-attachments/assets/490e3240-79a8-4af8-88fb-3e8f7fd1ca4c" />
<img width="1223" height="347" alt="image" src="https://github.com/user-attachments/assets/c337e5db-57a2-46bd-a355-6169ad3eb4e3" />


### Estoque

- Controle de estoque central por produto.
- Carga inicial para começar a operação.
- Entrada manual de mercadoria com custo unitário real.
- Ajuste manual positivo ou negativo para correções.
- Histórico de movimentações com filtros por tipo e período.
- Saídas automáticas por reposição de consignação e por venda direta.
- Alertas de produtos sem saldo ou com baixa quantidade.

<img width="1223" height="844" alt="image" src="https://github.com/user-attachments/assets/e9363f46-c9d4-4b38-a2a9-f7728b12d884" />
<img width="1223" height="836" alt="image" src="https://github.com/user-attachments/assets/dea67c6d-a2d2-470c-9315-72e90f832ede" />




### Comprovantes

- Geração de comprovante em PDF para visitas concluídas.
- Comprovante de venda direta.
- Comprovante de acerto e reposição para consignação.
- Dados da empresa, cliente, visita, produtos, valores, pagamento e assinatura manual.
- Página para localizar visitas concluídas e abrir o comprovante.

<img width="1219" height="285" alt="image" src="https://github.com/user-attachments/assets/ad357883-3741-442b-a8eb-3abb22984f40" />
<img width="788" height="958" alt="image" src="https://github.com/user-attachments/assets/97d0cdd7-c543-4ca7-a46c-1fe53714aef9" />


### Administração

- Dashboard financeiro com filtro de data.
- Comparativo **vendido x recebido**.
- Ritmo de visitas por período.
- Situação da carteira: pendente, parcial e quitado.
- Visão de lucro bruto quando há custo de compra disponível.
- Ranking de produtos por resultado e giro.
- Indicadores de produtos sem custo, sem estoque e clientes com maior pendência.
- Configuração dos dados da empresa usados nos comprovantes.

<img width="1609" height="1021" alt="image" src="https://github.com/user-attachments/assets/226ff721-bf22-4aaf-8cc9-39d3192f055f" />

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
- Ambiente local com Docker Compose
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

### Com Docker Compose (recomendado)

Na raiz, configure o `.env` a partir do exemplo e altere a senha do banco:

```bash
cp .env.example .env
docker compose up --build
```

O comando aplica as migrations e inicia banco, backend e frontend. Para iniciar apenas uma parte:

```bash
docker compose up backend   # backend + banco
docker compose up frontend  # frontend + backend + banco
```

URLs: `http://localhost:5173` (frontend) e `http://localhost:3333` (backend).

### Sem Docker

Na raiz do projeto:

```bash
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm run prisma:generate
npm run dev
```

Para aplicar migrations e popular dados de desenvolvimento:

```bash
npm run prisma:migrate:dev --workspace backend
npm run prisma:seed
```

O seeder cria uma base fictícia completa, com produtos, clientes, catálogo por cliente, estoque e movimentações, visitas de consignação e venda direta, pagamentos e contas a receber. Ele pode ser executado novamente para restaurar esses dados de demonstração.

> Use o seed somente no banco local/de desenvolvimento. Ele recria os registros de demonstração e os saldos dos produtos usados por eles. Veja [a documentação detalhada do seed](backend/prisma/seed.md).

Se estiver usando Docker Compose, com o serviço `backend` iniciado, use este comando para executar o seed dentro do container e aproveitar a conexão configurada pelo Compose:

```bash
npm run prisma:seed:docker
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
