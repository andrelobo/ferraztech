# WATA — Contexto Canônico

Nome provisório do projeto: **WATA** (*WhatsApp Assistência Técnica Automatizada*). Atende o cliente comercial Ferraz Tech. Substitui o nome antigo "FerrazTech" nos docs; paths físicos (`/opt/ferraztech`, repo `ferraztech`) permanecem.

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
- `/opt/ferraztech` (a criar — ainda não existe)

Mapa de portas padrão por projeto (evitar colisão; reverse proxy assumirá roteamento por domínio):
- `3000` → ZERA
- `3001` → WATA (proposta)
- `3002+` → próximos projetos

## Deploy
- Hoje: manual (`git pull` + `docker compose up -d --build`); na VPS cada projeto é clonado em `/opt/<projeto>`.
- Objetivo futuro: GitHub → GitHub Actions → SSH → Oracle VPS → Docker Compose → deploy automático.
- A action atual `deploy.yml` assume `/opt/ferraztech` existente e roda `--profile production`.

## O que é
MVP de atendimento automatizado via WhatsApp para a Ferraz Tech.

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
