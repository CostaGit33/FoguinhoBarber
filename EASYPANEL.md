# EasyPanel Setup

## Estrutura recomendada

- `frontend`: este projeto React/Vite
- `api`: a pasta `server/`
- `database`: PostgreSQL gerenciado pelo EasyPanel

## 1. Banco PostgreSQL

Crie um serviço PostgreSQL no EasyPanel e copie a `DATABASE_URL`.

## 2. API Node

Use a pasta `server/` como aplicação Node.

### Build/Install

```bash
npm install
```

### Start command

```bash
npm start
```

### Variáveis de ambiente da API

- `PORT=4000`
- `CLIENT_URL=https://seu-frontend.com`
- `DATABASE_URL=postgresql://...`
- `JWT_SECRET=troque-por-uma-chave-forte`
- `ADMIN_NAME=Administrador`
- `ADMIN_EMAIL=admin@foguinhobarber.com`
- `ADMIN_PASSWORD=admin123`
- `ADMIN_PHONE=(24) 99874-7229`

### Healthcheck

Use:

```text
/health
```

## 3. Frontend React

Use a raiz do projeto como aplicação estática/Vite.

### Build command

```bash
npm install && npm run build
```

### Publish directory

```text
dist
```

### Variável do frontend

- `VITE_API_URL=https://api.seu-frontend.com`

## 4. Banco e admin

A API cria as tabelas automaticamente ao iniciar e também garante a conta admin configurada por variáveis de ambiente.

Se quiser rodar manualmente:

```bash
cd server
npm install
npm run db:seed-admin
```

## 5. Próximo passo

Hoje o frontend ainda usa armazenamento local como base principal. A estrutura profissional já está pronta no repositório para a migração completa para API + Postgres no próximo passo.
