Seeds
Como rodar os seeds:

Garanta que a variável DATABASE_URL do projeto aponte para o banco de desenvolvimento.
Garanta que as migrations já estejam aplicadas.
Rode o comando: npm run prisma:seed

O seed foi desenhado para rerun seguro:
produtos são atualizados por SKU
clientes de seed são reencontrados pelo marcador interno de seed nas notes
vínculos de catálogo usam a chave composta já existente
visitas de seed usam visitCode fixo e itens por combinação visitId + productId