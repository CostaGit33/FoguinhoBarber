# EasyPanel Setup

## Estrutura recomendada

- `frontend`: raiz deste projeto React/Vite
- `api`: pasta `server/`
- `database`: PostgreSQL gerenciado pelo EasyPanel

## Dominios usados

- `frontend`: `https://barbeariadofoguinho.online`
- `api`: `https://api.barbeariadofoguinho.online`

## 1. Banco PostgreSQL

Crie um servico PostgreSQL no projeto `scraper` e copie a `DATABASE_URL` interna.

Exemplo:

```text
postgresql://postgres:SENHA@scraper_foguinho-postgres:5432/scraper
```

## 2. API Node

Use a pasta `server/` como aplicacao Node.

### GitHub

- owner: `Costagit33`
- repo: `FoguinhoBarber`
- branch: `main`
- build path: `/server`

### Nixpacks

- install command: `npm install`
- build command: deixar vazio
- start command: `npm start`
- port: `4000`

### Variaveis de ambiente da API

- `PORT=4000`
- `CLIENT_URL=https://barbeariadofoguinho.online`
- `DATABASE_URL=postgresql://postgres:SENHA@scraper_foguinho-postgres:5432/scraper`
- `JWT_SECRET=troque-por-uma-chave-forte`
- `ADMIN_NAME=Administrador`
- `ADMIN_EMAIL=admin@foguinhobarber.com`
- `ADMIN_PASSWORD=admin123`
- `ADMIN_PHONE=(24) 99874-7229`

### Dominio da API

- host: `api.barbeariadofoguinho.online`
- protocol: `HTTP`
- port: `4000`
- path: `/`

### Healthcheck

Use:

```text
/health
```

## 3. Frontend React

Use a raiz do projeto como aplicacao Vite.

### GitHub

- owner: `Costagit33`
- repo: `FoguinhoBarber`
- branch: `main`
- build path: `/`

### Nixpacks

- install command: `npm install`
- build command: `npm run build`
- output directory: `dist`

### Variaveis do frontend

- `VITE_API_URL=https://api.barbeariadofoguinho.online`
- `VITE_APP_BASE=/`

### Dominio do frontend

- host: `barbeariadofoguinho.online`
- protocol: `HTTP`
- port: `80`
- path: `/`

## 4. Cloudflare DNS

Registros recomendados:

- `A` `@` -> `2.57.91.91` `Proxiado`
- `A` `api` -> `2.57.91.91` `Proxiado`
- `CNAME` `www` -> `barbeariadofoguinho.online` `Proxiado`

## 5. Observacoes importantes

- o frontend agora esta preparado para dominio proprio em raiz, sem depender de `/FoguinhoBarber/`
- o PWA usa caminhos relativos, funcionando melhor no EasyPanel
- o banco deve continuar interno, sem dominio publico
- a API ja esta online e pronta para ser conectada ao frontend

## 6. Estado atual

- o frontend React/Vite e a API Node/PostgreSQL formam agora a stack principal do projeto
- a agenda, autenticacao, perfil e listagem administrativa devem ser mantidos nessa estrutura
- qualquer codigo legado fora dessa stack deve permanecer removido para evitar conflitos
