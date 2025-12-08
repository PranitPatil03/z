# Docker Local and Deployment Setup

## 1. Required Environment Variables

Minimum required for app startup:
- NODE_ENV
- PORT
- DATABASE_URL
- BETTER_AUTH_URL
- BETTER_AUTH_SECRET
- CORS_ORIGIN

Required for queue-backed async AI and notifications:
- REDIS_URL

Optional but supported:
- OPENAI_API_KEY
- ANTHROPIC_API_KEY
- GEMINI_API_KEY
- AZURE_OPENAI_API_KEY
- AZURE_OPENAI_ENDPOINT
- SMTP_HOST
- SMTP_PORT
- SMTP_USER
- SMTP_PASSWORD
- SMTP_FROM
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET

Your dev DATABASE_URL (Neon):
- postgresql://neondb_owner:npg_meCIJS1Zs8zN@ep-blue-hall-amiwsw6h-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

## 2. Local Dev with Docker

1. Create env file from template:

```bash
cp .env.example .env
```

2. Start local stack:

```bash
docker compose up --build
```

3. Health check:

```bash
curl http://localhost:3001/health
```

This starts:
- api
- worker
- redis

Database is Neon via DATABASE_URL in .env.

## 3. Run Migrations

If you run migrations from host:

```bash
cd apps/api
CI=1 DATABASE_URL="$DATABASE_URL" pnpm exec drizzle-kit migrate --config=drizzle.config.ts
```

If you run from container:

```bash
docker compose run --rm api pnpm --filter @foreman/api db:migrate
```

## 4. Deployment with Docker

Use deployment compose profile:

```bash
docker compose -f docker-compose.deploy.yml up --build -d
```

Notes:
- This file does not include Redis service. Point REDIS_URL to managed Redis in your deployment environment.
- It uses the same .env contract as local.

## 5. Troubleshooting

1. If migration command exits with code 1 and only spinner output:
- verify DATABASE_URL is reachable from current environment
- verify sslmode=require and channel_binding=require are present for Neon
- ensure migration SQL exists in apps/api/drizzle

2. If async AI mode fails:
- ensure REDIS_URL is set and reachable

3. If auth startup fails:
- ensure BETTER_AUTH_SECRET is set to at least 32 characters
