# BACKLOG - MVP do Sistema Jamval

## Objetivo do backlog

Este backlog organiza a construção do MVP em etapas pequenas, seguras e fáceis de validar.
A prioridade é entregar primeiro a estrutura essencial do sistema e depois avançar para o fluxo principal de visita.

---

# FASE 0 - Planejamento e base

## Tarefa 0.1 - Criar documentação inicial
- criar PRD.md
- criar RULES.md
- criar BACKLOG.md

## Tarefa 0.2 - Definir stack final
- frontend React
- backend Node.js
- PostgreSQL
- Prisma
- decidir ferramenta de UI
- decidir biblioteca de formulários
- decidir biblioteca de validação

## Tarefa 0.3 - Estruturar repositório
- criar estrutura inicial do projeto
- configurar lint
- configurar formatação
- configurar variáveis de ambiente
- configurar scripts básicos

### Critério de pronto
- repositório sobe localmente
- documentação inicial presente
- ambiente de desenvolvimento configurado

---

# FASE 1 - Especificação técnica

## Tarefa 1.1 - Modelagem conceitual
- definir entidades principais
- definir relacionamentos
- definir enums
- validar regras de negócio no modelo

## Tarefa 1.2 - Desenhar API
- listar endpoints
- definir payloads principais
- definir contratos básicos

## Tarefa 1.3 - Planejar estrutura de pastas
- frontend
- backend
- serviços compartilhados, se necessário

### Critério de pronto
- existe um documento técnico inicial
- banco e API estão desenhados antes da implementação

---

# FASE 2 - Banco de dados

## Tarefa 2.1 - Configurar Prisma
- instalar Prisma
- configurar conexão com PostgreSQL
- criar schema inicial

## Tarefa 2.2 - Implementar entidades principais
- Product
- Client
- ClientProduct
- ClientProduct.currentUnitPrice
- CentralStock ou estrutura equivalente
- ConsignedStock
- Visit
- VisitItem
- Payment ou Receivable
- ReceiptDocument

## Tarefa 2.3 - Criar enums e constraints
- status financeiros
- tipos de movimentação
- status de visita, se necessário

## Tarefa 2.4 - Criar migrations
- rodar migrations
- validar estrutura do banco

### Critério de pronto
- banco sobe corretamente
- migrations executam sem erro
- entidades refletem as regras principais do domínio

---

# FASE 3 - Backend básico

## Tarefa 3.1 - Setup do backend
- criar servidor Node.js
- configurar framework da API
- configurar validação
- configurar tratamento de erro
- configurar ORM

## Tarefa 3.2 - CRUD de produtos
- criar produto
- listar produtos
- editar produto
- ativar/inativar produto

## Tarefa 3.3 - CRUD de clientes
- criar cliente
- listar clientes
- editar cliente
- atualizar observações
- marcar se exige nota fiscal

## Tarefa 3.4 - Configuração de produto por cliente
- vincular produto ao cliente
- definir preço por cliente
- definir quantidade ideal
- ativar/desativar produto no cliente

### Critério de pronto
- produtos e clientes já podem ser cadastrados
- preços por cliente já podem ser configurados
- API validada por testes manuais

---

# FASE 4 - Estoque

## Tarefa 4.1 - Estoque central
- registrar saldo inicial
- registrar entrada manual
- registrar ajuste manual
- consultar saldo atual

## Tarefa 4.2 - Estoque por cliente
- consultar saldo consignado por cliente
- manter saldo por produto no cliente
- registrar histórico de movimentação

### Critério de pronto
- sistema sabe quanto existe no estoque central
- sistema sabe quanto há em cada cliente

---

# FASE 5 - Fluxo principal da visita

## Tarefa 5.1 - Abrir visita
- selecionar cliente
- carregar produtos ativos do cliente
- carregar quantidades anteriores

## Tarefa 5.2 - Registrar conferência por item
- informar quantidade restante boa
- informar devolução com defeito
- informar perda/extravio
- calcular vendido automaticamente
- aplicar preço unitário
- calcular subtotal

## Tarefa 5.3 - Reposição
- sugerir quantidade com base na quantidade ideal
- permitir editar quantidade reposta
- atualizar estoque central
- atualizar consignado do cliente

## Tarefa 5.4 - Fechar visita
- calcular total geral
- registrar observações
- salvar visita e itens

### Critério de pronto
- uma visita completa pode ser registrada do início ao fim
- o cálculo de venda funciona corretamente
- estoque é atualizado após a visita

---

# FASE 6 - Financeiro

## Tarefa 6.1 - Registrar pagamento
- informar valor recebido
- informar forma de pagamento
- calcular saldo pendente

## Tarefa 6.2 - Status financeiro
- pago
- parcial
- pendente
- vencido

## Tarefa 6.3 - Consultas financeiras
- listar clientes com pendências
- listar visitas pendentes
- mostrar histórico de recebimentos por cliente

### Critério de pronto
- o sistema registra pagamento total, parcial ou nenhum
- pendências podem ser consultadas facilmente

---

# FASE 7 - Comprovante e assinatura

## Tarefa 7.1 - Assinatura digital
- capturar assinatura do cliente
- armazenar assinatura da visita

## Tarefa 7.2 - Gerar PDF
- incluir dados do cliente
- incluir itens da visita
- incluir valores
- incluir assinatura
- salvar referência do comprovante

## Tarefa 7.3 - Compartilhamento
- permitir baixar PDF
- preparar fluxo de compartilhamento por WhatsApp

### Critério de pronto
- toda visita pode gerar um comprovante em PDF com assinatura

---

# FASE 8 - Frontend mobile

## Tarefa 8.1 - Base visual
- layout mobile-first
- navegação simples
- componentes reutilizáveis

## Tarefa 8.2 - Telas de cadastro
- produtos
- clientes
- configuração de produto por cliente

## Tarefa 8.3 - Tela de visita
- lista de itens
- campos numéricos rápidos
- totais automáticos
- visual limpo

## Tarefa 8.4 - Telas financeiras
- pendências
- histórico
- detalhes da visita

### Critério de pronto
- o fluxo principal funciona pelo celular com boa usabilidade

---

# FASE 9 - Ajustes e validação real

## Tarefa 9.1 - Teste com dados reais
- cadastrar alguns clientes reais
- cadastrar alguns produtos reais
- simular visitas reais

## Tarefa 9.2 - Validar usabilidade com o usuário
- observar tempo da visita
- observar pontos de confusão
- ajustar interface

## Tarefa 9.3 - Corrigir regras de negócio
- revisar edge cases
- revisar comportamento de pagamento parcial
- revisar devoluções e perdas

### Critério de pronto
- o sistema consegue ser usado em um cenário real com segurança

---

# FASE 10 - Evolução futura

Estas tarefas ficam explicitamente fora da V1, mas devem ser consideradas depois:

- transformar em PWA completo
- implementar suporte offline real
- sincronização pendente
- separar estoque da casa e do carro
- impressão física opcional
- relatórios avançados
- apoio à nota fiscal
- alertas de inadimplência
- alertas de estoque baixo
- sugestão inteligente de reposição

---

# Ordem recomendada de execução com Codex

1. especificação técnica
2. modelagem do banco
3. backend de produtos e clientes
4. backend de configuração por cliente
5. estoque
6. visita
7. financeiro
8. PDF e assinatura
9. frontend mobile
10. validação com uso real
11. PWA/offline depois

---

# Definição prática de MVP pronto

O MVP estará pronto quando for possível:

- cadastrar produtos e clientes;
- definir preço por cliente;
- registrar o estoque consignado de um cliente;
- abrir uma visita;
- calcular automaticamente o vendido;
- registrar reposição;
- registrar pagamento total, parcial ou pendente;
- gerar comprovante com assinatura;
- consultar histórico básico do cliente.
