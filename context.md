# FERRAZTECH — Contexto do Projeto

## O que é
MVP de atendimento automatizado via WhatsApp para a FERRAZTECH.
Volume inicial: ~50 usuários/dia. Escabilidade futura planejada via Meta Cloud API.

## Fluxo de desenvolvimento
1. Desenvolvimento local com docker-compose (dev)
2. Testes locais completos
3. Deploy para VPS com os mesmos containers (prod)

## Stack
| Camada | Tecnologia |
|---|---|
| Backend | NestJS + TypeScript |
| Banco | MongoDB Atlas (cloud) |
| WhatsApp | whatsapp-web.js (MVP) → Meta Cloud API (futuro) |
| Frontend | React Admin Dashboard (build estático) |
| Reverse Proxy | Nginx |
| Container | Docker + docker-compose |
| VPS | Ubuntu 22.04+ |
| SSL | Let's Encrypt (certbot) |
| CI/CD | GitHub Actions |
| Monitoramento | Uptime Kuma / Healthchecks.io |

## Arquitetura (produção)

```
                     ┌──────────────┐
                     │  MongoDB     │
                     │  Atlas       │
                     └──────┬───────┘
                            │
       ┌────────────┐      ┌┴───────────────┐      ┌────────────────┐
       │ WhatsApp   │◄────►│  NestJS API    │◄────►│  React Admin   │
       │ Web (QR)   │      │  (container)   │      │  (nginx static)│
       └────────────┘      └────────────────┘      └────────────────┘
                                  │
                          ┌───────┴───────┐
                          │   Nginx       │
                          │  (proxy + SSL)│
                          └───────┬───────┘
                                  │
                            Internet (VPS)

```

## Módulos do Backend
- **whatsapp** — conexão e gerenciamento do whatsapp-web.js
- **bot** — fluxos e menus automatizados
- **leads** — CRUD e gestão de leads
- **conversations** — histórico de mensagens
- **health** — monitoramento da API

## Collections MongoDB
- leads
- conversations
- messages
- bot_sessions
- users/admins

## Endpoints REST
- `GET /health`
- `GET /leads`, `GET /leads/:id`, `POST /leads`
- `PATCH /leads/:id/status`
- `GET /conversations`, `GET /conversations/:phone`
- `POST /whatsapp/send-message`
- `GET /whatsapp/status`

## Funcionalidades do Dashboard
- Visualizar/filtrar leads (status, tipo de serviço)
- Histórico de conversas
- Alterar status de atendimento
- Enviar mensagens manualmente
- Status da conexão WhatsApp

---

## Estrutura de diretórios (local = VPS)

```
ferraztech/
├── docker-compose.yml          # perfil dev (hot-reload) + prod
├── .env.example
├── .env                        # não versionado
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       ├── config/
│       ├── modules/
│       │   ├── whatsapp/
│       │   ├── bot/
│       │   ├── leads/
│       │   ├── conversations/
│       │   └── health/
│       └── shared/
├── admin/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx
│       ├── pages/
│       ├── components/
│       └── services/
├── nginx/
│   └── conf.d/
│       └── ferraztech.conf
├── scripts/
│   ├── setup.sh
│   ├── backup.sh
│   └── deploy.sh
└── data/
    └── whatsapp-sessions/      # persistência local (gitignored)
```

### docker-compose (dev × prod)

```yaml
services:
  backend:
    build:
      context: ./backend
      target: ${BUILD_TARGET:-development}
    restart: always
    env_file: .env
    volumes:
      # Dev: monta src para hot-reload
      - ${BACKEND_SRC_MOUNT:-./backend/src:/app/src}
      - ./data/whatsapp-sessions:/app/sessions

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"              # só mapeado em prod
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d
      - ./nginx/ssl:/etc/nginx/ssl   # só existe em prod
      - ./admin/dist:/usr/share/nginx/html
    profiles:
      - production
```

- **Dev:** `BUILD_TARGET=development` → hot-reload com nodemon/ts-node, sem nginx (acessa backend direto na porta 3000)
- **Prod:** `BUILD_TARGET=production` → build otimizado, nginx como reverse proxy + static files

### Fluxo de trabalho
1. **Desenvolvimento:** `docker compose up backend` com hot-reload, frontend em Vite standalone
2. **Teste integrado:** `docker compose --profile test up` (backend + admin build local)
3. **Deploy VPS:** `git push main` → GitHub Action → SSH → `docker compose pull && docker compose --profile production up -d`

---

## Necessidades para Desenvolvimento

### Backend (NestJS)
- [ ] setup do projeto NestJS com TypeScript
- [ ] conexão com MongoDB Atlas (Mongoose)
- [ ] módulo `whatsapp` — integração whatsapp-web.js com reconexão automática, multi-session, heartbeat, persistência de sessão em disco + MongoDB
- [ ] módulo `bot` — fluxos/menus automáticos (lógica de atendimento)
- [ ] módulo `leads` — CRUD + filtros + status
- [ ] módulo `conversations` — histórico de mensagens
- [ ] módulo `health` — health check da API + status do WhatsApp + uptime
- [ ] rate limiting interno com fila de mensagens (Bull ou similar)
- [ ] retry com backoff exponencial
- [ ] DTOs, pipes, guards, validação (class-validator)
- [ ] helmet + CORS configurados
- [ ] Dockerfile multi-stage (dev + prod)

### Frontend Admin (React)
- [ ] setup React + TypeScript + Vite
- [ ] tela de login (admin) com JWT
- [ ] página de leads com tabela, filtros (status, serviço) e busca
- [ ] modal de detalhes do lead + histórico da conversa
- [ ] ação de alterar status do lead
- [ ] painel de envio manual de mensagem
- [ ] indicador de status da conexão WhatsApp (com pooling)
- [ ] consumo da API com axios + interceptors (token)

### Infra & DevOps
- [ ] docker-compose (perfil dev + prod separados)
- [ ] Dockerfile multi-stage para backend
- [ ] Dockerfile para admin (build → nginx static)
- [ ] config do nginx (reverse proxy + SSL + static files)
- [ ] .env.example com todas as variáveis
- [ ] scripts: setup.sh (local), deploy.sh (VPS), backup.sh (VPS)
- [ ] GitHub Actions: CI (lint + test) + CD (build + deploy VPS)

### Resiliência (whatsapp-web.js)
- [ ] reconexão automática ao desconectar
- [ ] multi-session (2-3 instâncias de backup) com failover
- [ ] heartbeat a cada 30s no módulo health
- [ ] fila de mensagens com rate limit
- [ ] persistência de sessão em disco + fallback no MongoDB
- [ ] retry exponencial em falhas de envio

### Futuro (pós-MVP)
- [ ] migração para Meta Cloud API (trocar módulo `whatsapp`)
- [ ] autenticação JWT completa
- [ ] Webhooks Meta
- [ ] CI/CD maduro com blue-green

---

## Agentes de Desenvolvimento Propostos

### 1. Agente: **Backend Core**
- Criação do projeto NestJS, módulos, DTOs, conexão MongoDB
- Implementação de CRUDs (leads, conversations)
- Módulo health
- Dockerfile multi-stage
- Não toca no whatsapp-web.js nem no frontend

### 2. Agente: **WhatsApp Engine**
- Integração com whatsapp-web.js
- Reconexão automática, multi-session, failover
- Persistência de sessão (disco + MongoDB)
- Fila de mensagens + rate limit + retry
- Heartbeat do WhatsApp

### 3. Agente: **Bot Flow**
- Fluxos automatizados de atendimento (menus, respostas)
- Integração com leads e conversations
- Lógica de negócio do atendimento

### 4. Agente: **Admin Dashboard**
- React + Vite + TypeScript
- Páginas: login, leads, conversa, envio manual
- Consumo da API REST com axios + JWT
- Status da conexão WhatsApp com pooling

### 5. Agente: **DevOps**
- docker-compose (dev + prod)
- Nginx config
- GitHub Actions workflow
- Scripts de setup e deploy
- Setup de VPS (UFW, Docker, certbot)

### 6. Agente: **Revisor / QA**
- Revisão de código entre agentes
- Testes (unitários e integração)
- Validação de consistência entre back e front
- Linting e formatação
- Segurança (helmet, CORS, env vars)

> **Sequência sugerida:** Backend Core → WhatsApp Engine → Bot Flow → Dashboard → DevOps. O revisor atua em paralelo revisando cada entrega.

> **Ordem de testes:** 1. Backend (CRUD + health) → 2. WhatsApp Engine (conexão + reconexão) → 3. Bot Flow (fluxo completo) → 4. Dashboard (integração) → 5. Teste integrado (docker-compose) → 6. Deploy VPS
