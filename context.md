# FERRAZTECH — Contexto Canônico

## O que é
MVP de atendimento automatizado via WhatsApp para a FERRAZTECH.

Objetivo atual:
- validar um fluxo funcional de atendimento para desbloqueio de iPhone
- operar com `1` sessão de WhatsApp por padrão
- manter o painel admin simples, observável e utilizável

Escala inicial esperada:
- aproximadamente `50` atendimentos por dia

Evolução planejada:
- manter o MVP em `whatsapp-web.js`
- migrar no futuro para `Meta Cloud API`

## Stack real do projeto
| Camada | Tecnologia |
|---|---|
| Backend | NestJS + TypeScript |
| Banco | MongoDB Atlas |
| WhatsApp | whatsapp-web.js |
| Fila | BullMQ + Redis |
| Frontend | React + Vite + TypeScript |
| Proxy local do front | Vite proxy para `/api` |
| Proxy de produção | Nginx |
| Containers | Docker + docker-compose |

## Arquitetura atual
- O backend sobe em `http://localhost:3000` e expõe tudo sob prefixo `/api`.
- O admin sobe em `http://localhost:5173` e consome a API via `baseURL: /api`.
- Em desenvolvimento local, o caminho mais confiável hoje é:
  - backend por `npm run start` ou `npm run start:dev`
  - admin por `npm run dev`
- O `docker-compose.yml` existe e sobe `redis`, `backend`, `admin` e `nginx`, mas o modo development atual não entrega hot reload real do backend porque não monta `src` no container.

## Backend — módulos reais
- `auth` — login JWT, guard e strategy
- `seed` — cria admin inicial se não existir
- `whatsapp` — sessão do WhatsApp, QR, envio, fila, reconexão
- `bot` — fluxo automatizado de atendimento
- `leads` — CRUD e status de leads
- `conversations` — histórico de mensagens por telefone
- `health` — status da API
- `common/interceptors` — observabilidade HTTP

## Frontend — áreas reais
- login admin
- dashboard principal
- status do WhatsApp com polling
- exibição de QR code via endpoint do backend
- envio manual de mensagem
- lista de leads com filtros
- modal de histórico da conversa

## Fluxo atual do bot
1. Primeiro contato:
   - saudação curta
   - foco em `desbloqueio do telefone`
2. Segunda etapa:
   - pede o `IMEI`
   - orienta procurar na `bandeja do chip (gavetinha do chip)`
   - avisa sobre aparelhos com `chip virtual`
3. Se o cliente ainda não mandar IMEI:
   - envia lembrete curto
4. Se o cliente mandar um IMEI válido:
   - confirma recebimento
   - orienta aguardar atendimento humano

Observação importante:
- hoje o bot considera IMEI válido como qualquer sequência com `15` dígitos

## WhatsApp — estado de projeto
- padrão atual: `WHATSAPP_SESSION_COUNT=1`
- QR code é servido pelo backend em `GET /api/whatsapp/qr`
- status da sessão é servido em `GET /api/whatsapp/status`
- envio manual usa `POST /api/whatsapp/send-message`
- a captura de inbound já contempla remetentes `@lid`, `@c.us` e `@s.whatsapp.net`
- grupos e `status@broadcast` são ignorados
- há logs em emoji no terminal do Nest para request, sessão e fluxo de mensagem

## Endpoints principais
- `POST /api/auth/login`
- `GET /api/health`
- `GET /api/leads`
- `GET /api/leads/:id`
- `POST /api/leads`
- `PATCH /api/leads/:id/status`
- `GET /api/conversations`
- `GET /api/conversations/:phone`
- `GET /api/conversations/:phone/messages`
- `GET /api/whatsapp/status`
- `GET /api/whatsapp/qr`
- `POST /api/whatsapp/send-message`

## Estrutura real relevante
```text
ferraztech/
├── context.md
├── CURRENT_STATE.md
├── README.md
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── app.module.ts
│       ├── main.ts
│       ├── common/
│       ├── modules/
│       └── seed/
├── admin/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/
│       └── styles.css
├── nginx/
├── scripts/
│   ├── setup.sh
│   └── deploy.sh
└── data/
    └── whatsapp-sessions/
```

## Diferenças importantes entre contexto antigo e código atual
- O repo hoje **não** tem `scripts/backup.sh`.
- O repo hoje **não** tem profile `test` funcional no `docker-compose.yml`.
- O script `backend npm run test:e2e` existe, mas aponta para um arquivo ausente.
- O fluxo operacional atual está mais estável e simples em `1` sessão padrão, não em `2-3` sessões por default.

## Validação esperada antes de avançar
- backend:
  - `cd "/home/lobo/Área de trabalho/KODE/ferraztech/backend"`
  - `npm test -- --runInBand`
- admin:
  - `cd "/home/lobo/Área de trabalho/KODE/ferraztech/admin"`
  - `npm test`
  - `npm run build`

## Regra de trabalho neste repo
- preservar comportamento
- preferir mudanças pequenas
- validar sempre depois das mudanças
- tratar `context.md` como verdade canônica, a menos que o código prove o contrário
