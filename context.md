# WATA — Contexto Canônico

Nome provisório do projeto: **WATA** (*WhatsApp Assistência Técnica Automatizada*). Atende o cliente comercial Ferraz Tech. Substitui o nome antigo "FerrazTech" nos docs; paths físicos (`/opt/ferraztech`, repo `ferraztech`) permanecem.

## Próximos passos (quando voltarmos)
**Deploy integrado já está validado ponta a ponta na VPS.** O que falta é apenas o que depende do operador:

1. **Escanear o QR** da sessão `atendimento-principal` para abrir a conexão WhatsApp:
   - QR em `http://136.248.90.172:3001/api/whatsapp/qr` (PNG) ou `GET /api/whatsapp/qr` (via painel admin).
   - Fluxo: WhatsApp → Aparelhos conectados → Vincular → apontar a câmera para o QR.
   - Após scan, conferir `GET /api/whatsapp/status` → state deve ir de `qr` para `open`.
2. **Testar envio real**: pelo admin, mandar uma mensagem manual para um número de teste e validar `message.upsert` → lead/conversa → resposta do bot.
3. **Observar os logs**: `docker logs -f ferraztech-backend` deve mostrar `POST /api/webhooks/gateway` (eventos do gateway) e o fluxo `message.upsert → handleIncomingMessage`.

Credenciais/segredos da integração (API key do tenant, webhook secret, senhas) estão **somente no `.env` da VPS** — nunca commitá-los.

Se a sessão aparecer como `close`/`disconnected` ao voltar (morte da conexão Baileys sem número linkado), **recriar** a sessão:
```
curl -X POST -H "Authorization: Bearer <GATEWAY_API_KEY>" -H "content-type: application/json" \
  -d '{"name":"atendimento-principal"}' \
  http://localhost:3002/api/tenants/<GATEWAY_TENANT_ID>/sessions
```
(um novo evento `qr.updated` será entregue ao WATA automaticamente).

## Ecossistema Muirakitan
A WATA pertence ao ecossistema de produtos **Muirakitan**. Todos compartilham a mesma filosofia de infraestrutura e padrões. Produtos atuais:
- **ZERA** — NestJS, Mongo Atlas, PlugNotas, JWT, Swagger; frontend na Vercel; migrando do Render para a Oracle; primeiro backend oficial na VPS (porta `3000`)
- **HortiFácil** — novo SaaS MVP, Mongo Atlas, NestJS, frontend Vercel, backend Oracle, arquitetura desacoplada
- **Muirakitan WhatsApp Gateway** — projeto independente, reutilizado por todos os produtos; Baileys, NestJS, Mongo Atlas, Docker, webhook engine, sessões, mensageria, arquitetura modular
- Futuros: LicitaFácil e outros SaaS

## Infraestrutura (Oracle Cloud Always Free)
- Servidor: Oracle Cloud Always Free, hostname `lobojow`, Ubuntu Server 20.04
- IP público: `136.248.90.172`
- Hardware: 1 OCPU, 952 MB RAM, 2 GB swap, 45 GB SSD
- Instalado: Docker, Docker Compose, Portainer (portas `9000`/`9443`), UFW configurado, `rpcbind` removido
- Acesso: SSH por chave pública, sem login por senha

## Filosofia da infra
- A VPS hospeda **apenas aplicações leves**. Nunca instalar: MongoDB, PostgreSQL, Playwright, Chromium, LLMs/IA local, ou qualquer serviço pesado.
- Banco de dados **sempre externo**: MongoDB Atlas. Nunca MongoDB local.
- Frontend **sempre na Vercel** (React/Vite, Next.js quando necessário). Nunca hospedar frontend na Oracle.
- Backend **sempre NestJS**, Node 20+, Docker. Cada backend com: Dockerfile, docker-compose.yml, `.env.example`, healthcheck, logs e Swagger.
- Reverse proxy futuro: **Caddy (preferencial) ou Nginx**. Nunca expor aplicações diretamente em produção.
- Padrões: TypeScript, ESLint, Prettier, Docker, Docker Compose, variáveis via `.env`, nunca credenciais hardcoded, dependências mínimas, baixo consumo de memória.

## Organização da VPS
Cada projeto em `/opt/<projeto>` com Compose, Dockerfile, volumes e rede Docker próprios:
- `/opt/zera-api`
- `/opt/hortifacil-api`
- `/opt/muirakitan-wsp-gateway`
- `/opt/ferraztech` (deployado; repo público → VPS faz `git pull`; gateway é privado → sync por tar/scp)

Mapa de portas padrão por projeto (evitar colisão; reverse proxy assumirá roteamento por domínio):
- `3000` → ZERA
- `3001` → WATA (em produção)
- `3002` → Muirakitan WhatsApp Gateway (já em produção)
- `3003+` → próximos projetos

## Deploy
- Hoje: manual (`git pull` + `docker compose up -d --build`); na VPS cada projeto é clonado em `/opt/<projeto>`.
- WATA (repo `ferraztech`): **público** → VPS faz `git pull` normal.
- Gateway (repo `muirakitan-wsp-gateway`): **privado** → sincronizar por `tar` + `scp` + extrair em `/opt/muirakitan-wsp-gateway` + `docker compose up -d --build`.
- **`BUILD_TARGET=production` é obrigatório** no WATA (sem isso o container reinicia em loop, sem CMD).
- Objetivo futuro: GitHub → GitHub Actions → SSH → Oracle VPS → Docker Compose → deploy automático.
- A action atual `deploy.yml` assume `/opt/ferraztech` existente e roda `--profile production`.

## Estado do gateway (2026-08-03)
- **Muirakitan WhatsApp Gateway** construído e deployado na VPS na porta **`3002`** (app interno `3000`, host via `GATEWAY_PORT`).
- Repo privado: `github.com/andrelobo/muirakitan-wsp-gateway` (MVP commitado; último fix de integração `a561efe`).
- Local do VPS: `/opt/muirakitan-wsp-gateway` (compose + redis + gateway). Docker Compose v2 instalado na VPS (faltava o plugin).
- Banco: Mongo Atlas, database **`ferraztech`** (URI no `.env` do VPS, nunca commitada).
- Endpoints validados: `GET /api/health` ✅, `POST /api/tenants` ✅, `401` sem API key ✅, Swagger `:3002/docs` ✅.
- Tenant `wata` no gateway: `webhookUrl=http://ferraztech-backend:3000/api/webhooks/gateway` + `webhookSecret` (HMAC) — **o gateway entrega eventos lendo `tenant.webhookUrl`** (fila BullMQ `webhook`, redis próprio `muirakitan-gw-redis`).
- **Integração WATA × gateway validada (2026-08-03):** comunicação entre containers por **nome de container** na rede docker compartilhada `muirakitan-wsp-gateway_default` (IPs de bridge `172.x` falham com EHOSTUNREACH). `GATEWAY_BASE_URL=http://muirakitan-wsp-gateway:3000/api`. Evento `qr.updated` → fila → `tenant.webhookUrl` → `POST /api/webhooks/gateway` assinado → WATA responde `201 received:true`.
- Fix de integração no gateway: `IsWebhookUrl` (validator custom) aceita **hostnames de container docker** (`@IsUrl` rejeita hostname sem ponto). Commit `a561efe`.
- Fix operacional: índice único órfão `sessionId_1` dropado da collection `sessions` (causava `E11000` ao criar sessão).
- Sessão ativa: `atendimento-principal` (`state: qr`), QR pendente de escaneamento.
- **Migração WATA concluída no código (2026-08-02):** o backend WATA agora consome o gateway — envio via `POST /sessions/:id/send` e recepção via webhook `POST /api/webhooks/gateway` (assinado HMAC-SHA256). A camada local `whatsapp-web.js` (Chromium) foi removida do backend e do `package.json`. Ver `.env.example` (chaves `GATEWAY_*`) e módulo `whatsapp`.


## O que é
MVP de atendimento automatizado via WhatsApp para a Ferraz Tech.

Objetivo atual:
- validar um fluxo funcional de atendimento para desbloqueio de iPhone
- operar com `1` sessão de WhatsApp por padrão
- manter o painel admin simples, observável e utilizável

Escala inicial esperada:
- aproximadamente `50` atendimentos por dia

Evolução planejada:
- manter o MVP consumindo o **Muirakitan WhatsApp Gateway** (Baileys, sem Chromium)
- migrar no futuro para `Meta Cloud API`

## Stack real do projeto
| Camada | Tecnologia |
|---|---|
| Backend | NestJS + TypeScript |
| Banco | MongoDB Atlas |
| WhatsApp | Muirakitan WhatsApp Gateway (Baileys) via REST + webhook |
| Fila | gateway (BullMQ + Redis fica no gateway) |
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
- O `docker-compose.yml` sobe `backend`, `admin` e `nginx` (sem redis — o WATA não usa mais fila). O backend é anexado à rede docker do gateway (`muirakitan-wsp-gateway_default`) para comunicação por nome de container. O modo development atual não entrega hot reload real do backend porque não monta `src` no container.

## Backend — módulos reais
- `auth` — login JWT, guard e strategy
- `seed` — cria admin inicial se não existir
- `whatsapp` — cliente do gateway (envio REST), webhook de eventos e fluxo de mensagens
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
- transporte: **Muirakitan WhatsApp Gateway** — sessões, QR e envio ficam no gateway (porta `3002` na VPS)
- env vars: `GATEWAY_BASE_URL`, `GATEWAY_API_KEY`, `GATEWAY_TENANT_ID`, `GATEWAY_SESSION_ID`, `GATEWAY_WEBHOOK_SECRET`
- webhook WATA: `POST /api/webhooks/gateway` (publico, validado por HMAC-SHA256 via header `x-muirakitan-signature`; `@SkipThrottle`)
- QR code é servido pelo backend em `GET /api/whatsapp/qr` (proxy do gateway `GET /sessions/:id/qr`)
- status da sessão é servido em `GET /api/whatsapp/status` (proxy do gateway `GET /tenants/:id/sessions`)
- envio manual usa `POST /api/whatsapp/send-message` (proxy do gateway `POST /sessions/:id/send`)
- `message.upsert` chega via webhook → `handleIncomingMessage` (mesmo fluxo de lead/conversa/bot de antes)
- grupos e `status@broadcast` são ignorados (normalização de JID no webhook controller)
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
- O fluxo operacional atual está mais estável e simples em `1` sessão padrão, não em `2-3` sessões por default.

## Validação esperada antes de avançar
- backend:
  - `cd "/home/lobo/Área de trabalho/KODE/ferraztech/backend"`
  - `npm test -- --runInBand`
  - `npm run test:e2e`
- admin:
  - `cd "/home/lobo/Área de trabalho/KODE/ferraztech/admin"`
  - `npm test`
  - `npm run build`

## Regra de trabalho neste repo
- preservar comportamento
- preferir mudanças pequenas
- validar sempre depois das mudanças
- tratar `context.md` como verdade canônica, a menos que o código prove o contrário
