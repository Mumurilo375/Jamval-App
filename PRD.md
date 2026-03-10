# PRD - Sistema de Consignado Jamval

## 1. Visão geral do produto

Este projeto tem como objetivo criar um sistema web mobile-first para controlar a operação de vendas em consignado da Jamval, uma microempresa que trabalha com acessórios eletrônicos como fones, carregadores, baterias portáteis, mouses e produtos similares.

A operação atual é manual, baseada em papel, cálculo manual e assinatura física em duas vias. O sistema deverá digitalizar esse fluxo, reduzir erros, economizar tempo nas visitas e manter histórico confiável das operações.

O sistema será usado principalmente no celular, com possibilidade de uso eventual em notebook.

---

## 2. Problema que o sistema resolve

Hoje a operação possui dificuldades como:

- conferência manual de produtos em cada cliente;
- cálculo manual da quantidade vendida;
- soma manual dos valores;
- controle manual do que foi recebido, parcial ou pendente;
- pouca visibilidade do estoque que ficou em cada cliente;
- dificuldade para acompanhar clientes inadimplentes;
- dificuldade para preservar histórico e comprovantes;
- trabalho repetitivo para organizar dados de nota fiscal manual.

O sistema deverá transformar esse fluxo em um processo digital rápido, confiável e rastreável.

---

## 3. Objetivo principal

Criar um sistema que permita ao vendedor:

- saber quanto deixou em cada cliente;
- contar rapidamente o que restou;
- calcular automaticamente o que foi vendido;
- registrar devoluções com defeito e perdas/extravios;
- fazer o acerto financeiro;
- registrar reposição na mesma visita;
- gerar comprovante com assinatura;
- manter histórico por cliente, produto e visita.

---

## 4. Perfil de uso

### Usuário principal
- dono da operação Jamval
- uso principal no celular
- conhecimento técnico baixo a médio
- precisa de uma interface muito simples, rápida e prática

### Usuário secundário eventual
- administrador de apoio
- pode acessar por notebook para ajudar em cadastros ou conferências

---

## 5. Como o negócio funciona hoje

1. O vendedor deixa produtos em consignado em mercados, lojas, restaurantes e outros pontos.
2. Depois de cerca de 30 a 40 dias, ele volta ao local.
3. O cliente normalmente não controla quantidades vendidas.
4. O vendedor conta o que restou no cliente.
5. Ele compara com a quantidade que havia deixado antes.
6. Calcula o que foi vendido.
7. Faz o acerto financeiro.
8. Reposição costuma acontecer na mesma viagem.
9. Ele registra tudo em papel.
10. As vias são assinadas.
11. Ele fotografa a via do cliente e guarda a via dele.

---

## 6. Escopo do MVP

A primeira versão deve incluir os seguintes módulos:

### 6.1 Cadastro de produtos
- nome
- SKU
- categoria
- marca
- modelo
- cor
- voltagem
- tipo de conector
- preço base
- status ativo/inativo

### 6.2 Cadastro de clientes
- nome do estabelecimento
- contato
- telefone
- endereço
- observações
- ciclo aproximado de visita
- informação opcional sobre necessidade de nota fiscal

### 6.3 Configuração de produtos por cliente
- produtos ativos daquele cliente
- preço específico por cliente e por produto
- quantidade ideal por produto no cliente
- possibilidade de ativar ou desativar produto para aquele cliente

### 6.4 Estoque central
- saldo disponível dos produtos
- entradas manuais
- ajustes manuais
- saídas por reposição para clientes

### 6.5 Controle de estoque por cliente
- quantidade atual em consignado por cliente e produto
- histórico de movimentações
- visão do que está em cada ponto

### 6.6 Registro de visita
- abertura da visita
- listagem dos produtos ativos do cliente
- exibição da quantidade anterior por item
- digitação da quantidade restante boa
- digitação da quantidade devolvida com defeito
- digitação da quantidade perdida/extraviada
- cálculo automático da quantidade vendida
- preço unitário da visita
- subtotal por item
- sugestão de reposição
- quantidade efetivamente reposta

### 6.7 Financeiro da visita
- valor total da visita
- valor recebido
- saldo pendente
- forma de pagamento
- status financeiro

### 6.8 Comprovante
- assinatura
- geração de PDF
- histórico salvo no sistema
- possibilidade de compartilhamento por WhatsApp

---

## 7. Itens fora do escopo da V1

Os itens abaixo não entram na primeira versão:

- emissão integrada de nota fiscal
- integração com Receitapr
- impressora térmica ou impressora portátil
- multiusuário avançado
- controle separado de estoque da casa e estoque do carro
- dashboards avançados
- leitura de código de barras
- roteirização inteligente
- recomendações automáticas por IA
- portal do cliente

---

## 8. Fluxo principal da visita

### Passo 1
Selecionar o cliente.

### Passo 2
Carregar os produtos ativos daquele cliente.

### Passo 3
Mostrar a quantidade anterior deixada no cliente.

### Passo 4
Registrar:
- quantidade restante boa
- quantidade devolvida com defeito
- quantidade perdida ou extraviada

### Passo 5
Calcular automaticamente a quantidade vendida.

Fórmula:

vendido = quantidade_anterior - quantidade_restante_boa - quantidade_devolvida_com_defeito - quantidade_perdida_ou_extraviada

### Passo 6
Aplicar o preço unitário daquele cliente para cada item.

### Passo 7
Calcular subtotal por item e total geral da visita.

### Passo 8
Sugerir reposição com base na quantidade ideal.

### Passo 9
Registrar a quantidade realmente reposta.

### Passo 10
Registrar:
- valor recebido
- saldo pendente
- forma de pagamento
- status

### Passo 11
Coletar assinatura.

### Passo 12
Gerar comprovante e salvar histórico.

---

## 9. Regras essenciais do domínio

- o cliente não controla quantidades vendidas;
- o vendedor conta manualmente o que sobrou;
- acerto e reposição normalmente acontecem na mesma visita;
- o pagamento pode ser total, parcial ou inexistente no dia;
- uma visita pode existir sem recebimento completo;
- o preço é negociado por cliente e por produto;
- o preço pode mudar entre visitas;
- produto com defeito devolvido não conta como venda;
- perda ou extravio não conta como venda;
- a assinatura é obrigatória como prova do acordo;
- o sistema deve guardar histórico completo;
- o preço praticado em cada visita deve permanecer salvo, mesmo se o preço atual mudar depois.

---

## 10. Status financeiros necessários

Cada visita ou cobrança deve permitir status como:

- pago
- parcial
- pendente
- vencido

---

## 11. Requisitos de usabilidade

- interface mobile-first
- foco em poucos toques
- teclado numérico rápido
- carregamento leve
- formulário simples
- visual limpo
- dados salvos com segurança
- preparado para futura evolução para PWA offline

---

## 12. Requisitos técnicos de alto nível

- frontend em React
- backend em Node.js
- banco de dados PostgreSQL
- ORM Prisma
- API simples
- arquitetura monolítica
- código legível e sem excesso de abstração
- preparado para futura evolução para PWA

---

## 13. Critérios de sucesso do MVP

O MVP será considerado bem-sucedido se permitir:

- cadastrar clientes e produtos;
- configurar preço por cliente;
- registrar visita completa;
- calcular venda automaticamente;
- registrar pagamento parcial ou pendente;
- controlar saldo por cliente;
- gerar comprovante PDF com assinatura;
- consultar histórico básico de visitas e pendências.

---

## 14. Evoluções futuras

Possíveis melhorias futuras:

- PWA com offline real
- sincronização local/remota
- separação de estoque da casa e do carro
- envio automático de comprovante por WhatsApp
- relatórios de giro por produto
- alertas de inadimplência
- alertas de estoque baixo
- apoio à emissão manual de nota fiscal
- impressão física opcional