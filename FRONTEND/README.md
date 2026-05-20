# FRONTEND

Aplicacao React + Vite do workspace Jamval.

## Comandos

Na raiz do projeto:

- `npm run dev`
- `npm run dev:frontend`
- `npm run build`
- `npm run lint:frontend`

Diretamente nesta pasta:

- `npm run dev`
- `npm run build`
- `npm run lint`

## Ambiente

- `VITE_API_BASE_URL=/api`
- `VITE_API_PROXY_TARGET=http://127.0.0.1:3333`
- `BACKEND_PROXY_TARGET=https://jamval-app-backend-8flj.vercel.app`

Em desenvolvimento, o frontend usa `/api` para manter a sessao same-origin e o Vite faz proxy para o backend.
Na Vercel, `/api/*` passa pelo proxy serverless do frontend e `BACKEND_PROXY_TARGET` deve apontar para o deploy do backend quando a URL for diferente do default.
