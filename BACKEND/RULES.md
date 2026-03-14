# RULES - Regras de Negócio do Sistema Jamval

## 1. Regras gerais

1. O sistema controla uma operação de venda em consignado.
2. Existe um único estoque central na V1.
3. Cada cliente possui seu próprio conjunto de produtos ativos.
4. Cada cliente pode ter preço específico por produto.
5. O preço de um produto pode mudar entre visitas.
6. O preço praticado em cada visita deve ser preservado no histórico.
7. O sistema deve ser otimizado para uso no celular.

---

## 2. Regras sobre clientes

1. Um cliente pode ter vários produtos ativos.
2. Um cliente pode ter uma quantidade ideal por produto.
3. Um cliente pode exigir nota fiscal, mas a emissão não será feita pelo sistema na V1.
4. Um cliente pode atrasar pagamento.
5. Um cliente pode receber reposição mesmo sem quitar totalmente a visita anterior, dependendo da decisão do operador.

---

## 3. Regras sobre produtos

1. Todo produto deve possuir SKU.
2. Produtos podem variar por:
   - marca
   - modelo
   - cor
   - voltagem
   - conector
3. O sistema não precisa controlar validade.
4. O sistema não precisa controlar código de barras na V1.
5. Produtos podem ser ativados ou desativados globalmente.
6. Produtos também podem ser ativados ou desativados por cliente.

---

## 4. Regras sobre estoque

1. Na V1, o estoque da casa e o estoque levado no carro serão tratados como um único estoque central.
2. O sistema deve controlar:
   - saldo do estoque central
   - saldo em consignado por cliente
3. Toda reposição para cliente reduz o estoque central.
4. Toda devolução com defeito que retorna fisicamente ao vendedor deve ser registrada.
5. Perda ou extravio não retorna ao estoque central.
6. O histórico de estoque deve ser preservado.

---

## 5. Regras sobre visita

1. A visita é o evento central do sistema.
2. Em uma visita, o vendedor:
   - confere o que restou no cliente
   - calcula o vendido
   - registra devoluções
   - registra perdas
   - registra reposição
   - registra o acerto financeiro
3. O cliente normalmente não informa quantidades vendidas.
4. O vendedor é responsável por contar os itens restantes no local.
5. Acerto e reposição normalmente acontecem na mesma visita.
6. A visita pode ser concluída mesmo sem pagamento total.
7. A visita deve gerar histórico completo.

---

## 6. Regras de cálculo por item da visita

Para cada item visitado, devem existir os seguintes campos operacionais:

- quantidade anterior
- quantidade restante boa
- quantidade devolvida com defeito
- quantidade perdida ou extraviada
- quantidade vendida
- preço unitário praticado
- subtotal
- quantidade sugerida para reposição
- quantidade realmente reposta

### Fórmula oficial da venda

vendido = quantidade_anterior - quantidade_restante_boa - quantidade_devolvida_com_defeito - quantidade_perdida_ou_extraviada

### Regras da fórmula

1. Produto devolvido com defeito não conta como venda.
2. Produto perdido ou extraviado não conta como venda.
3. A quantidade vendida nunca deve ser negativa.
4. Caso o cálculo resulte em valor negativo, o sistema deve impedir o salvamento ou exigir correção.
5. O subtotal deve ser calculado com base na quantidade vendida multiplicada pelo preço unitário praticado na visita.

---

## 7. Regras sobre reposição

1. O sistema pode sugerir reposição com base na quantidade ideal configurada para aquele cliente e produto.
2. A quantidade sugerida não precisa ser igual à quantidade realmente reposta.
3. O operador pode ajustar a reposição manualmente.
4. A quantidade reposta reduz o estoque central.
5. A quantidade reposta atualiza o novo saldo em consignado do cliente.

---

## 8. Regras financeiras

1. O valor total da visita é a soma dos subtotais dos itens vendidos.
2. O valor recebido pode ser:
   - igual ao total
   - menor que o total
   - zero
3. O saldo pendente deve ser calculado automaticamente.
4. O sistema deve permitir registrar pagamentos parciais.
5. O sistema deve permitir registrar pendência após a visita.
6. O sistema deve permitir status financeiros:
   - pago
   - parcial
   - pendente
   - vencido
7. Uma visita pode gerar dívida em aberto.
8. O histórico financeiro do cliente deve permanecer rastreável.

---

## 9. Regras sobre cobrança

1. O recebimento pode acontecer no dia da visita ou em outro dia.
2. O sistema deve estar preparado para registrar cobrança posterior.
3. O sistema deve permitir consultar clientes com saldo pendente.
4. O sistema deve permitir diferenciar operação da visita de operação de pagamento.

---

## 10. Regras sobre assinatura e comprovante

1. Toda visita deve permitir coleta de assinatura.
2. A assinatura é importante como comprovação do acordo.
3. O sistema deve gerar comprovante em PDF.
4. O comprovante deve conter os dados da visita.
5. O comprovante deve ficar salvo no sistema.
6. O comprovante deve poder ser compartilhado digitalmente.
7. A V1 não exigirá impressão física obrigatória.

---

## 11. Regras sobre histórico

1. O sistema deve manter histórico de visitas.
2. O sistema deve manter histórico de preços praticados.
3. O sistema deve manter histórico de recebimentos.
4. O sistema deve manter histórico de saldo consignado por cliente.
5. O sistema deve manter histórico de devoluções com defeito.
6. O sistema deve manter histórico de perdas ou extravios.
7. Nenhum dado histórico importante deve ser sobrescrito sem rastreabilidade.

---

## 12. Regras sobre nota fiscal

1. O sistema não emitirá nota fiscal na V1.
2. A emissão continuará sendo feita manualmente fora do sistema.
3. O sistema deve organizar os dados para facilitar a emissão posterior.
4. O cliente pode ou não exigir nota fiscal.

---

## 13. Restrições da V1

1. Não haverá integração com sistema fiscal.
2. Não haverá impressão portátil obrigatória.
3. Não haverá múltiplos perfis complexos de usuário.
4. Não haverá separação de estoque da casa e do carro.
5. Não haverá leitura de código de barras.
6. Não haverá automação avançada por IA.
7. Não haverá dashboard complexo na V1.

---

## 14. Diretrizes de implementação

1. Priorizar simplicidade.
2. Evitar overengineering.
3. Pensar primeiro no fluxo da visita.
4. Preservar clareza do domínio.
5. Modelar visita, item da visita e pagamento como conceitos separados.
6. Construir o MVP em etapas pequenas e testáveis.