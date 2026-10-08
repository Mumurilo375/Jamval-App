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
Na Vercel, `/api/*` é reescrito pelo `frontend/vercel.json` para `https://jamval-app.vercel.app`, o domínio estável de produção do backend. URLs individuais de deploy podem exigir login na Vercel e devolver um redirecionamento em vez do JSON da API.

Use `https://jamval-app-zjpk.vercel.app` para acessar a versão atual do frontend. URLs individuais de deploy continuam servindo a versão antiga mesmo depois de um novo push.
