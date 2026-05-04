# SisGestão TI — Sistema de Gestão de Chamados

Sistema web completo para gestão de chamados de TI e comunicados internos, com controle de acesso por perfil (RBAC), chat em tempo real via WebSocket e interface responsiva sem frameworks externos.

---

## Tecnologias

**Backend**
- Node.js + Express
- TypeScript
- SQLite via `sql.js` (WebAssembly — sem compilação nativa)
- WebSocket (`ws`)
- JWT (`jsonwebtoken`) + bcrypt

**Frontend**
- HTML5 + CSS puro (sem frameworks)
- JavaScript vanilla (SPA com roteador hash)
- WebSocket nativo do browser

---

## Funcionalidades

### Autenticação e RBAC
- Login com JWT (expiração de 8h)
- Três perfis de acesso: **user**, **ti**, **admin**
- Todas as rotas protegidas por middleware de autenticação e autorização

### Chamados
| Ação | user | ti | admin |
|---|---|---|---|
| Abrir chamado | ✓ | ✓ | ✓ |
| Ver próprios chamados | ✓ | ✓ | ✓ |
| Ver todos os chamados | — | ✓ | ✓ |
| Atualizar status | — | ✓ | ✓ |
| Atribuir técnico | — | ✓ | ✓ |

### Chat em Tempo Real
- Mensagens por chamado via WebSocket
- Salas (rooms) isoladas por `ticketId`
- Histórico persistido no banco de dados
- Autenticação via token na conexão WS

### Comunicados Internos (C.I)
| Ação | user | ti | admin |
|---|---|---|---|
| Ver aprovados | ✓ | ✓ | ✓ |
| Criar C.I | — | ✓ | ✓ |
| Aprovar / Rejeitar | — | — | ✓ |
| C.I criado já aprovado | — | — | ✓ |

### Dashboard
- **user** — estatísticas dos próprios chamados + lista recente
- **ti** — chamados sem atribuição + atribuídos ao técnico logado
- **admin** — visão geral do sistema + CIs pendentes de aprovação

---

## Estrutura do Projeto

```
helpdesk/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.ts       # Inicialização do SQLite (sql.js)
│   │   ├── middlewares/
│   │   │   └── auth.ts           # authenticate + authorize(roles)
│   │   ├── routes/
│   │   │   ├── auth.ts           # POST /login, GET /me
│   │   │   ├── tickets.ts        # CRUD de chamados
│   │   │   ├── announcements.ts  # CRUD de comunicados
│   │   │   └── health.ts         # GET /health
│   │   ├── seeds/
│   │   │   └── seed.ts           # Usuários iniciais
│   │   ├── types/
│   │   │   └── index.ts          # Tipos TypeScript globais
│   │   ├── ws/
│   │   │   └── chat.ts           # Servidor WebSocket
│   │   └── server.ts             # Entry point
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/
    ├── index.html                 # Tela de login
    ├── pages/
    │   └── dashboard.html        # Shell da SPA
    ├── css/
    │   └── style.css             # Design system completo
    └── js/
        ├── config.js             # CONFIG, Auth, apiFetch()
        ├── router.js             # Roteador hash
        ├── layout.js             # Sidebar, header, utilitários
        ├── app.js                # Inicialização e registro de rotas
        └── pages/
            ├── dashboard-page.js
            ├── tickets-page.js
            └── announcements-page.js
```

---

## Instalação e Execução

### Pré-requisitos
- Node.js 18+
- npm

### 1. Clonar o repositório

```bash
git clone https://github.com/maiatechdev/SisGestaoTI.git
cd SisGestaoTI
```

### 2. Configurar o backend

```bash
cd backend
cp .env.example .env
```

Edite o `.env` e defina um `JWT_SECRET` seguro:

```env
PORT=3000
JWT_SECRET=sua_chave_secreta_aqui
DB_PATH=./helpdesk.db
```

### 3. Instalar dependências

```bash
npm install
```

### 4. Popular o banco de dados

```bash
npm run seed
```

Isso cria o banco SQLite e os três usuários de teste.

### 5. Iniciar o servidor

```bash
# Desenvolvimento (com hot reload)
npm run dev

# Produção
npm run build
npm start
```

O servidor estará disponível em `http://localhost:3000`.

### 6. Abrir o frontend

Abra o arquivo `frontend/index.html` diretamente no navegador.

> O backend precisa estar rodando para o frontend funcionar.

---

## Usuários de Teste

| E-mail | Senha | Perfil |
|---|---|---|
| admin@helpdesk.com | admin123 | Administrador |
| ti@helpdesk.com | ti123456 | Técnico de TI |
| user@helpdesk.com | user1234 | Usuário |

---

## API — Endpoints

### Autenticação
```
POST   /api/auth/login       # Login (retorna JWT)
GET    /api/auth/me          # Dados do usuário logado
```

### Chamados
```
GET    /api/tickets                    # Listar (filtrado por role)
POST   /api/tickets                    # Criar
GET    /api/tickets/:id                # Detalhe + mensagens
PATCH  /api/tickets/:id/status         # Atualizar status (ti, admin)
PATCH  /api/tickets/:id/assign         # Atribuir técnico (ti, admin)
```

Filtros disponíveis via query string: `?status=open&priority=high&category=hardware`

### Comunicados
```
GET    /api/announcements              # Listar (filtrado por role)
POST   /api/announcements             # Criar (ti, admin)
GET    /api/announcements/:id          # Detalhe
PATCH  /api/announcements/:id/review   # Aprovar/rejeitar (admin)
DELETE /api/announcements/:id          # Remover (admin)
```

### WebSocket
```
ws://localhost:3000/ws?token=JWT&ticket=ID
```

**Mensagens do cliente → servidor:**
```json
{ "type": "message", "content": "Texto da mensagem" }
```

**Mensagens do servidor → cliente:**
```json
{ "type": "history",  "messages": [ ... ] }
{ "type": "message",  "message": { ... } }
{ "type": "error",    "error": "descrição" }
```

---

## Perfis de Acesso Detalhado

### user
- Abre e acompanha os próprios chamados
- Participa do chat dos seus chamados
- Vê comunicados aprovados

### ti
- Acessa todos os chamados
- Atualiza status e se auto-atribui
- Cria comunicados (ficam pendentes até aprovação)

### admin
- Acesso total ao sistema
- Aprova/rejeita comunicados
- Comunicados criados pelo admin já nascem aprovados

---

## Licença

MIT
