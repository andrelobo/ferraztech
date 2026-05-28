# FERRAZTECH — Estado Atual

Atualizado em: `2026-05-28`

## Resumo executivo
- O fluxo principal `WhatsApp -> backend -> bot -> resposta -> histórico` já foi validado com mensagem real.
- O backend está com observabilidade em emoji no terminal do Nest.
- O admin está funcional, com QR carregado pelo backend e visual novo alinhado à marca.
- A base está boa para seguir iterando no fluxo do atendimento.

## O que está funcionando

### Backend
- API NestJS com prefixo `/api`
- login admin com JWT
- seed de usuário admin
- leads e conversations persistidos em MongoDB
- fila de mensagens via BullMQ
- logs HTTP de request/response
- logs de sessão do WhatsApp
- envio manual pelo painel
- captura de mensagens de entrada em `@lid`, `@c.us` e `@s.whatsapp.net`
- QR code em PNG pelo endpoint do backend

### Bot
- saudação inicial focada em `desbloqueio do telefone`
- etapa de pedido de `IMEI`
- orientação por `bandeja do chip (gavetinha do chip)`
- lembrete curto quando o cliente ainda não mandou o IMEI
- confirmação quando chega um IMEI válido

### Admin
- login funcional
- dashboard com visual dark/glass da Ferraz Tech
- status de sessão do WhatsApp com polling
- QR code visível no painel
- envio manual de mensagem
- leads com filtros
- modal com histórico da conversa

## Configuração operacional atual
- porta do backend: `3000`
- porta do admin: `5173`
- proxy do admin: `/api -> http://localhost:3000`
- sessão padrão do WhatsApp: `1`
- `WHATSAPP_SESSION_COUNT=1` em `.env.example`

## Persistência de sessão do WhatsApp
- rodando local com `npm run start`, a sessão fica em `backend/sessions/`
- rodando em container, o compose monta `./data/whatsapp-sessions` em `/app/sessions`

## Testes validados
- backend:
  - `npm test -- --runInBand`
  - status mais recente: `56/56` testes passando
  - `npm run test:e2e`
  - status mais recente: `1/1` suíte e2e passando
- admin:
  - `npm test`
  - status mais recente: `30/30` testes passando
  - `npm run build` passando

## Gaps conhecidos
- `docker-compose.yml` não tem profile `test`
- o modo development do compose não monta `backend/src`, então hot reload real do backend não está garantido no container
- `scripts/backup.sh` não existe no repo, apesar de versões antigas do contexto mencionarem isso
- os testes do admin ainda mostram warning de `act(...)` em `LeadDetailModal`, mas passam

## Artefatos locais que nao devem entrar no commit
- `backend/sessions/`
- `backend/.wwebjs_cache/`
- `dump.rdb`

## Comandos locais mais confiáveis hoje

### Backend
```bash
cd "/home/lobo/Área de trabalho/KODE/ferraztech/backend"
npm run start
```

### Admin
```bash
cd "/home/lobo/Área de trabalho/KODE/ferraztech/admin"
npm run dev
```

### Testes
```bash
cd "/home/lobo/Área de trabalho/KODE/ferraztech/backend"
npm test -- --runInBand
npm run test:e2e
```

```bash
cd "/home/lobo/Área de trabalho/KODE/ferraztech/admin"
npm test
npm run build
```
