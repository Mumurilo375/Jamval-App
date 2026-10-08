# frontend

Aplicacao React + Vite do workspace Jamval.

## Comandos

Na raiz do projeto:

- `npm run dev`
- `npm run dev:frontend`
- `npm run build`
- `npm run lint:frontend`

Para gerar o bundle de produção neste ambiente, use `cd frontend && npx vite build`. Evite `npm run build`: ele executa `tsc -b` antes do Vite, etapa que pode exceder a memória disponível.

Diretamente nesta pasta:

- `npm run dev`
- `npx vite build` (build de produção recomendado neste ambiente)
- `npm run lint`

## Ambiente

- `VITE_API_BASE_URL=/api`
- `VITE_API_PROXY_TARGET=http://127.0.0.1:3333`

Em desenvolvimento, o frontend usa `/api` para manter a sessao same-origin e o Vite faz proxy para o backend.
Na Vercel, `/api/*` e reescrito pelo `frontend/vercel.json` para o deploy do backend.
