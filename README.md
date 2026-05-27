# FerrazTech

MVP de atendimento automatizado via WhatsApp para a Ferraz Tech.

Os arquivos canônicos deste repo são:
- `context.md`
- `CURRENT_STATE.md`

## Estrutura
- `backend/` — NestJS + MongoDB + BullMQ + whatsapp-web.js
- `admin/` — React + Vite
- `nginx/` — proxy de produção
- `scripts/` — setup e deploy

## Subir localmente

### Backend
```bash
cd "/home/lobo/Área de trabalho/KODE/ferraztech/backend"
npm install
npm run start
```

### Admin
```bash
cd "/home/lobo/Área de trabalho/KODE/ferraztech/admin"
npm install
npm run dev
```

URLs:
- admin: `http://localhost:5173`
- api: `http://localhost:3000/api`

## Testes

### Backend
```bash
cd "/home/lobo/Área de trabalho/KODE/ferraztech/backend"
npm test -- --runInBand
```

### Admin
```bash
cd "/home/lobo/Área de trabalho/KODE/ferraztech/admin"
npm test
npm run build
```

Observação:
- `npm run test:e2e` no backend ainda não roda porque o arquivo `test/jest-e2e.json` não existe no estado atual do repo

## Docker Compose

Perfis existentes hoje:
- `development`
- `production`

Exemplo:
```bash
cd "/home/lobo/Área de trabalho/KODE/ferraztech"
docker compose --profile development up
```

Observação importante:
- o compose atual não monta `backend/src`, então o desenvolvimento com hot reload do backend continua mais confiável rodando por `npm run start` ou `npm run start:dev`

## Git rápido

Para commitar só a atualização de documentação:
```bash
cd "/home/lobo/Área de trabalho/KODE/ferraztech"
git status --short
git add context.md CURRENT_STATE.md README.md
git commit -m "docs: update project context and current state"
```

Evite `git add .` enquanto existirem artefatos locais como:
- `backend/sessions/`
- `backend/.wwebjs_cache/`
- `dump.rdb`
