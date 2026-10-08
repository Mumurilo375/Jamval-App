# Instruções para agentes

## Build do frontend

Para gerar o build do frontend neste ambiente, execute `npx vite build` dentro da pasta `frontend`.

Não use `npm run build` para essa verificação: o script executa `tsc -b && vite build`, e a etapa `tsc -b` pode exceder a memória disponível. `npx vite build` valida e gera o bundle do Vite sem essa etapa de TypeScript.
