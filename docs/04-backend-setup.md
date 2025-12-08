# Backend Setup Guide

This document defines the backend stack, where each part belongs, and how we should deploy it.

## 1. Backend Stack and Where It Is Used

### App Layer
- `apps/api`: REST API for auth, tenancy, RBAC, projects, RFQ, purchase orders, invoices, matching, billing, notifications, and integrations.
- `apps/worker`: background jobs for AI, email sync, matching retries, billing events, notification fanout, and scheduled tasks.
- `packages/ai`: provider adapters, prompt registry, model routing, and AI utility helpers.
- `packages/domain`: shared business rules and calculations such as approval rules, match logic, budget variance, and policy checks.
- `packages/types`: shared request/response schemas and TypeScript types.
- `packages/sdk`: typed API client for the frontend.

### Infrastructure Layer
- PostgreSQL: primary transactional data store.
- Redis: job queue, cache, locks, and job state.
- S3-compatible storage: files, images, invoices, compliance docs.
- AI providers: OpenAI, Anthropic, Google Gemini, and Azure OpenAI through one abstraction layer.
- Stripe: billing, subscriptions, usage metering.
- Gmail and Microsoft Graph: SmartMail email sync and send.

### Dev and Build Layer
- pnpm: package management.
- Turborepo: monorepo task orchestration and caching.
- Vitest: unit tests.
- Playwright: end-to-end tests.
- Biome or ESLint + Prettier: code quality and formatting.
- OpenAPI: API contract source of truth.
- Better Auth: authentication and session management.

## 2. Backend Folder Structure

### `apps/api/src`
```text
src
  /routes
  /controllers
  /services
  /repositories
  /middleware
  /validators
  /domain
  /integrations
  /jobs
  /utils
```

Responsibilities:
- `routes`: HTTP endpoints only.
- `controllers`: request parsing and response shaping.
- `services`: business logic and workflow orchestration.
- `repositories`: database access.
- `middleware`: auth, tenant scoping, RBAC, error handling.
- `validators`: request and payload validation.
- `domain`: reusable rules and calculations.
- `integrations`: Stripe, OpenAI, email, storage adapters.
- `jobs`: job scheduling and queue entry points.
- `utils`: shared helpers.

### `apps/worker/src`
```text
src
  /jobs
  /processors
  /queues
  /schedules
  /integrations
  /utils
```

Responsibilities:
- `jobs`: job definitions.
- `processors`: queue consumers.
- `queues`: queue setup and config.
- `schedules`: cron and delayed work.
- `integrations`: external service calls from workers.
- `utils`: helper functions.

### `packages/domain`
Use this package for business logic that must stay consistent across API and worker code:
- approval chain logic
- 3-way match rules
- variance calculations
- permission checks
- policy helpers
- state transition helpers

### `packages/types`
Use this package for:
- Zod schemas
- shared enums
- API request/response types
- event payload contracts

## 3. Required Backend Modules

### Core Modules
- Auth module powered by Better Auth
- Tenant module
- RBAC module
- Project module
- Notification module
- Audit module

### Financial Modules
- RFQ module
- Supplier module
- Purchase order module
- Invoice module
- Receipt and matching module
- Billing module

### Operational Modules
- SiteSnap module
- Change order module
- Budget module
- SubConnect module
- SmartMail module
- Analytics module

## 4. API Layout We Need First
Start with these endpoint groups:
- `/auth`
- `/organizations`
- `/projects`
- `/roles` and `/permissions`
- `/rfqs`
- `/purchase-orders`
- `/invoices`
- `/match-runs`
- `/receipts`
- `/subcontractors`
- `/compliance`
- `/notifications`
- `/audit-log`
- `/billing`
- `/integrations`

## 5. Production Rules
- Every request must pass auth and tenant checks.
- Every write must be validated.
- Every payment-related action must be idempotent.
- Every async job must be retry-safe.
- Every critical action must be audited.
- Every integration must have timeout, retry, and failure handling.
- Every AI feature must go through the provider abstraction and record model usage.

## 5.1 Auth Stack
- Better Auth handles login, signup, invitations, session cookies, password reset, and OAuth connections.
- Use PostgreSQL as the auth data store.
- Keep auth flows server-driven and cookie-based for security.
- Avoid custom auth/session code unless Better Auth does not cover the case.

## 5.2 AI Stack
- Use one internal AI service layer for all model calls.
- Route tasks to the best provider by use case, cost, and quality.
- Store provider name, model name, token usage, latency, and prompt version for each call.
- Keep prompt templates versioned in code or a prompt registry.

## 6. Deployment Path

### Local Development
- Run backend locally.
- Use local or containerized Postgres and Redis.
- Store secrets in `.env` files only for development.

### Early Deployment
- Use Railway for fast deployment of the API and worker.
- Keep the stack simple while validating product-market fit.
- Use Railway-managed services where it reduces setup time.

### Production Scale
- Move to AWS when you need more control, custom networking, stronger infrastructure policy, or higher scale.
- Likely AWS services later:
  - ECS or EKS for API and workers
  - RDS for PostgreSQL
  - ElastiCache for Redis
  - S3 for files
  - CloudWatch and OpenTelemetry for observability

## 7. What We Need to Know Before Coding
- Exact first MVP workflows.
- Which entities must exist on day one.
- Which endpoints must be public versus internal.
- Which features are phase 1 versus phase 2.
- Which data must be tenant-isolated from the start.
- Which jobs must be synchronous versus async.
- Which integrations are required for launch.
- Which auth flows must exist on day one: email/password, invitations, OAuth, password reset.
- Which AI providers we want enabled at launch and which can be added later.

## 8. Recommended Build Order
1. Auth, tenant, and RBAC middleware.
2. Project CRUD and organization membership.
3. RFQ, purchase order, invoice, and 3-way matching core.
4. Audit logging and notification framework.
5. Budget, SubConnect, and compliance flows.
6. SiteSnap and change order flows.
7. Stripe billing and usage metering.
8. SmartMail and analytics.

## 9. Minimum Production Checklist
- Typed request validation in every route.
- Database migrations in place.
- Queue and worker setup in place.
- Audit log table and event writer in place.
- Error handling middleware in place.
- Health check endpoint in place.
- Logging and tracing in place.
- CI checks in place.
- Deployment plan documented.
