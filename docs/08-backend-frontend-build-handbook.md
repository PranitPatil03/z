# Backend + Frontend Build Handbook

This document is the implementation handbook for engineering teams building on the current Foreman backend.

Use it when you need to:
- Build or change backend features safely.
- Integrate frontend screens against the live backend contract.
- Verify release readiness across API, worker, and contract docs.

---

## 1. Source of Truth Order

When information conflicts, use this precedence order:
1. Runtime behavior in API code.
2. Live OpenAPI contract from `GET /openapi.json`.
3. Interactive docs from `GET /docs`.
4. This handbook and the docs folder.

Why: frontend and backend teams must ship against the same real contract, not stale markdown examples.

---

## 2. Current Implementation Snapshot (April 2026)

### Services in repo
- `apps/api`: Express + TypeScript API.
- `apps/worker`: BullMQ worker for async AI, scheduler jobs, and notification delivery.
- `packages/db`: Drizzle schema and migrations.
- `packages/ai`: provider abstraction for OpenAI/Anthropic/Gemini/Azure OpenAI.
- `packages/domain`: shared policy and business logic helpers.
- `packages/sdk`: currently minimal and should be expanded from OpenAPI.
- `packages/types`: currently minimal and should be expanded from OpenAPI/shared Zod contracts.

### Frontend status
- No `apps/web` application exists in this repo yet.
- Frontend integration should start from the live API contract and route groups already mounted in `apps/api/src/app.ts`.

---

## 3. Local Setup and Daily Commands

### Prerequisites
- Node.js 22 LTS.
- pnpm 9.x.
- Docker (optional, but recommended for local Redis/service orchestration).

### Environment bootstrap
1. Copy environment template:
   - `cp .env.example .env`
2. Fill required secrets at minimum:
   - `BETTER_AUTH_SECRET`
   - `DATABASE_URL`
   - `REDIS_URL`

### Install dependencies
- `pnpm install`

### Run API and worker
- API only: `pnpm --filter @foreman/api dev`
- Worker only: `pnpm --filter @foreman/worker dev`
- Monorepo dev (parallel): `pnpm dev`

### Migrations
- Generate migration: `pnpm db:generate`
- Apply migration: `pnpm db:migrate`

### Quality gates
- API typecheck: `pnpm --filter @foreman/api typecheck`
- Worker typecheck: `pnpm --filter @foreman/worker typecheck`
- API tests: `pnpm --filter @foreman/api test`
- Worker tests: `pnpm --filter @foreman/worker test`

---

## 4. Backend Implementation Workflow (Required Pattern)

Follow this flow for every new or changed endpoint.

### Step 1: Define schema first
- Add or update request schema in `apps/api/src/schemas`.
- Use Zod constraints for all user input and query params.
- Keep enums centralized so frontend and backend can align on finite states.

### Step 2: Route with validation middleware
- Register `validateBody`, `validateQuery`, and `validateParams` in route definitions.
- Validation middleware metadata is used by OpenAPI generation, so skipping it causes contract drift.

### Step 3: Keep controllers thin
- Parse typed validated payloads.
- Delegate business logic to service layer.
- Return response payload only.

### Step 4: Keep services authoritative
- Enforce org scoping and role policy.
- Execute transaction/business rules.
- Emit events/audit where required.

### Step 5: Apply auth and role guards explicitly
- `requireAuth` for internal session-based endpoints.
- `requirePortalAuth` for portal token endpoints.
- `requireOrgRole` for owner/admin protected mutations.

### Step 6: Add tests in three layers
- Schema tests for parsing and guardrails.
- Service tests for business behavior.
- Route tests for endpoint contract behavior and status codes.

### Step 7: Validate contract and docs
- Ensure endpoints appear in `GET /openapi.json`.
- Ensure `GET /docs` renders and links to `/openapi.json`.
- Update docs if behavior or lifecycle changed.

---

## 5. Frontend Integration Workflow (Current Backend)

### 5.1 Contract pull
- Always fetch contract from `GET /openapi.json`.
- Use `GET /docs` for quick exploration and manual QA.
- Do not hardcode endpoint assumptions from old notes.

### 5.2 Auth model
There are two auth modes:

1. Internal app session auth (Better Auth)
- Paths: most API groups (`/projects`, `/organizations`, `/billing`, etc.).
- Transport: cookie-based session.
- Frontend requirement: send `credentials: "include"` on requests.

2. Portal token auth
- Paths: protected `/portal/*` endpoints.
- Transport: `Authorization: Bearer <token>` from portal login response.

### 5.3 Response handling model
The API is mostly standardized but not perfectly uniform yet.

Common shapes:
- `{ data: ... }`
- `{ items: ... }`
- `{ profile: ... }`
- direct objects for some auth/portal actions

Frontend rule:
- Generate or infer per-endpoint response types from OpenAPI.
- Avoid one global response unwrapping assumption.

### 5.4 Error handling model
Error envelope from middleware is standardized:
```json
{
  "error": {
    "code": "VALIDATION_ERROR|BAD_REQUEST|UNAUTHORIZED|FORBIDDEN|NOT_FOUND|INTERNAL_SERVER_ERROR",
    "message": "...",
    "details": null
  }
}
```

Frontend rule:
- Parse `error.code` for UI behavior.
- Use `error.message` for user-facing fallback text.
- Keep field-level validation handling endpoint-specific when `issues` are present.

### 5.5 Async job integration
For async AI flows:
- Create job using `POST /ai/generate` with async mode.
- Poll `GET /ai/jobs/:jobId` for `state` and `result`.
- Render deterministic loading/error/retry states in UI.

### 5.6 File upload integration
Use storage upload lifecycle:
1. `POST /storage/upload-session`
2. Upload file to returned signed target
3. `POST /storage/:fileAssetId/complete`
4. Use `GET /storage/:fileAssetId/download-url` to consume

---

## 6. Backend and Frontend Team Contract

### Backend team guarantees
- Every new endpoint is Zod-validated.
- Every protected endpoint has explicit auth/role guard.
- Every behavior change updates OpenAPI output.
- Every critical flow has at least one route/service test.

### Frontend team guarantees
- Consume only documented contract from `/openapi.json`.
- Handle both cookie session and portal bearer auth.
- Implement explicit loading/empty/error states per workflow.
- Avoid coupling to internal DB-driven assumptions.

---

## 7. Recommended Integration Order for New Frontend App

### Sprint 1: Foundation
- Session auth wiring and org context resolution.
- Health checks and API connectivity checks.
- Organization + project listing.

### Sprint 2: Core workflows
- Project detail + member management.
- Notifications feed, unread count, preferences.
- Activity feed list and project health.

### Sprint 3: Financial workflow
- RFQ, purchase orders, receipts, invoices.
- Match run execution and status UI.
- Billing usage and plan pages.

### Sprint 4: Specialized modules
- SiteSnap + AI async pipeline.
- Change order approval lifecycle.
- SubConnect internal + portal operations.
- SmartMail and command center analytics.

---

## 8. Release Readiness Checklist (Joint)

A release candidate is ready when all are true:
- API typecheck passes.
- Worker typecheck passes.
- API tests pass.
- Worker tests pass.
- `/openapi.json` is reachable and current.
- `/docs` is reachable.
- New endpoints are represented in contract.
- Required role guards are present for restricted writes.
- Error behaviors are UX-handled in frontend screens.

---

## 9. Known Current Gaps (Track Explicitly)

- `apps/web` is not yet scaffolded in this repository.
- `packages/sdk` is placeholder-level and should be generated/expanded from OpenAPI.
- `packages/types` is minimal and should be expanded with shared API domain contracts.
- Response envelope consistency is high but not fully unified across all endpoint groups.

None of these block frontend start, but they should be addressed early in implementation.

---

## 10. Related Docs

- [04-backend-setup.md](04-backend-setup.md)
- [05-auth-and-ai-stack.md](05-auth-and-ai-stack.md)
- [07-status.md](07-status.md)
- [09-api-integration-reference.md](09-api-integration-reference.md)
