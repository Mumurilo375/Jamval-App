# Jamval Codex

Workspace com dois aplicativos:

- `BACKEND`: API Fastify + Prisma
- `FRONTEND`: app React + Vite

## Comandos na raiz

- `npm install`
- `npm run dev`
- `npm run dev:backend`
- `npm run dev:frontend`
- `npm run build`
- `npm run lint:frontend`
- `npm run prisma:generate`

## Ambiente

- Backend canonico em `BACKEND/.env`
- Frontend usa `FRONTEND/.env.example`
- Em desenvolvimento, o frontend usa `/api` e faz proxy para o backend
