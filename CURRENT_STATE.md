# WATA — Estado Atual

Atualizado em: `2026-08-03`

## Resumo executivo
- **Migração do WhatsApp concluída**: WATA não usa mais `whatsapp-web.js`/Chromium/BullMQ/Redis. O envio/QR/estado agora são **proxy para o Muirakitan WhatsApp Gateway** (Baileys) via REST.
- **Deploy integrado na VPS funcionando**: `ferraztech-backend` (porta `3001`) e o gateway (`muirakitan-wsp-gateway`, porta `3002`) na **mesma rede docker** (`muirakitan-wsp-gateway_default`), com comunicação por **nome de container**.
- Fluxo ponta a ponta validado: evento do gateway (`qr.updated`) → fila BullMQ do gateway → `tenant.webhookUrl` → WATA `POST /api/webhooks/gateway` (HMAC) → `201 received:true`.
- QR da sessão principal pendente de **escaneamento** para abrir a conexão.

## Arquitetura atual (pós-migração)
- `gateway-client.service.ts` — cliente REST do gateway (Bearer `GATEWAY_API_KEY`), com spec.
- `whatsapp-webhook.controller.ts` — `POST /api/webhooks/gateway`, público, `@SkipThrottle`, valida HMAC-SHA256 (`x-muirakitan-signature`) sobre `rawBody`; `main.ts` com `rawBody: true`.
- `whatsapp.service.ts` / `whatsapp.controller.ts` — proxy de status, QR e envio para o gateway (sem sessões locais).
- Sem `whatsapp.session.ts`, `whatsapp.processor.ts`, `schemas/session.schema.ts`, BullMQ/Redis no WATA.

## Deploy na VPS (integrado)
- Repo `ferraztech` é **público** → VPS faz `git pull` normal em `/opt/ferraztech`; gateway continua sync via tar/scp (repo privado).
- Portas: WATA `3001` (interna 3000) · gateway `3002` · ZERA `3000` · portainer `9000/9443`.
- **`BUILD_TARGET=production` é obrigatório** (sem isso o backend reinicia em loop, sem CMD).
- Rede: `backend` do WATA anexado à external network `muirakitan-wsp-gateway_default` (compose commit `ddd2e5e`).
- `GATEWAY_BASE_URL=http://muirakitan-wsp-gateway:3000/api` (por nome, não por IP — IPs de bridge falham com EHOSTUNREACH).
- Tenant `wata` no gateway: `webhookUrl=http://ferraztech-backend:3000/api/webhooks/gateway` + secret (HMAC) — o **gateway** entrega eventos lendo `tenant.webhookUrl` (fila BullMQ `webhook`).
- Sessão ativa `atendimento-principal` (`6a6fe3652d663ef3b3d58e20`, state `qr`) — QR exposto em `GET /api/whatsapp/qr` (200 PNG).
- `docker-compose.yml`: profile `production`, sem redis; `WATA_HTTP_PORT` default `3001`.

## Gateway (muirakitan-wsp-gateway)
- `IsWebhookUrl` (validator custom, commit `a561efe`) aceita **hostnames de container docker** (ex.: `ferraztech-backend`) — `@IsUrl` do class-validator rejeita hostname sem ponto.
- Fix operacional: índice único órfão `sessionId_1` dropado da collection `sessions` (causava E11000 ao criar sessão).

## O que está funcionando
- Backend: API NestJS `/api`, login JWT, seed admin, leads/conversations em MongoDB Atlas, QR PNG, proxy de envio, webhook receiver com HMAC.
- Bot: fluxo de desbloqueio/IMEI (inalterado, roda no `atendimento-principal`).
- Admin: dashboard dark/glass, login, status de sessão, QR, envio manual, leads com histórico.
- Observabilidade: logs HTTP/emoji no Nest.

## Testes validados
- WATA backend: `npm test` **51/51** unit + `npm run test:e2e` **1/1** · `npm run build` ✅ · `npm run lint` ✅ (flat config ESLint 9).
- Gateway: `npm test` **18/18** · `npm run build` ✅.

## Gaps conhecidos
- QR da sessão principal ainda não escaneado (depende de ação do usuário no celular).
- Dois webhook URLs antigos inválidos (`172.18.0.1`/`172.19.0.1`) foram substituídos — não reutilizar IPs de bridge para comunicação entre containers.
- `docker-compose.yml` não tem profile `test`; modo development não monta `backend/src` (hot reload no container não garantido).

## Artefatos locais que nao devem entrar no commit
- `backend/sessions/`
- `backend/.wwebjs_cache/`
- `dump.rdb`
- `.env`

## Comandos mais confiáveis hoje
### Backend (local)
```bash
cd "/home/lobo/Área de trabalho/KODE/ferraztech/backend"
npm test -- --runInBand
npm run test:e2e
npm run build
npm run lint
```
### VPS
```bash
cd /opt/ferraztech && git pull
docker compose --profile production up -d --build
```
