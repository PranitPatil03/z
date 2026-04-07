# API Integration Reference

This document maps the current backend route surface for frontend and backend engineers.

Contract source of truth:
- JSON contract: `GET /openapi.json`
- Interactive contract UI: `GET /docs`

Use this file as a navigation index and integration playbook, not as a replacement for OpenAPI.

---

## 1. Base URL, Headers, and Auth

### Base URL
- Local default: `http://localhost:3001`

### Common headers
- `Content-Type: application/json` for JSON requests.
- `Authorization: Bearer <token>` only for portal-protected endpoints.
- `x-request-id` optional, useful for tracing.

### Auth modes

#### A) Internal session auth (Better Auth)
Used by most endpoint groups.

Frontend requirements:
- Use cookie/session flow via `/auth/*`.
- Send `credentials: "include"` on internal API requests.

#### B) Portal bearer auth
Used by protected `/portal/*` endpoints after portal login.

Frontend requirements:
- Capture `token` from portal login response.
- Send `Authorization: Bearer <token>` for protected portal calls.

---

## 2. Global Utility Endpoints

- `GET /` service status.
- `GET /health` liveness check.
- `GET /health/ready` readiness check (200 or 503).
- `GET /openapi.json` live OpenAPI 3.0.3 contract.
- `GET /docs` ReDoc UI.

---

## 3. Route Group Map

Each base path below is mounted in `apps/api/src/app.ts`.

### `/auth`
- Better Auth passthrough (dynamic handler).
- Includes session/login/invitation flows managed by Better Auth.

### `/auth/oauth`
- `GET /gmail/auth-url`
- `GET /outlook/auth-url`
- `POST /callback`
- `POST /disconnect`
- `POST /sync-emails`

### `/organizations`
- Org lifecycle, active org/team context, invitations, teams, members.
- Includes owner/admin guarded membership and invitation mutations.

### `/projects`
- Project CRUD.
- Project member management:
  - list
  - add
  - update
  - remove

### `/rfqs`
- RFQ CRUD and archive.

### `/purchase-orders`
- Purchase order CRUD and archive.

### `/receipts`
- Receipt CRUD and archive.

### `/invoices`
- Invoice CRUD and archive.
- Update supports payable gate controls with explicit override behavior.

### `/match-runs`
- Match run list, create, and get by id.

### `/billing`
- Stripe webhook endpoint:
  - `POST /webhook/stripe` (no auth)
- Billing record CRUD and usage summary.
- Subscription plans and plan change endpoint.
- Stripe operations:
  - payment intent
  - subscription creation
  - webhook event list/retry

### `/notifications`
- List notifications.
- Unread count.
- Preferences get/update.
- Create, mark-read, delete.

### `/audit-log`
- List, create, and get audit events.

### `/activity-feed`
- Feed list with filters and pagination.
- Entity timeline.
- Health and project health endpoints.

### `/command-center`
- Overview
- Health
- Portfolio
- Trends

### `/site-snaps`
- SiteSnap CRUD.
- Analyze/reanalyze/review actions.
- Observation create/update/delete.
- Daily progress endpoint.

### `/change-orders`
- Change order CRUD.
- Submit and decision actions.
- Attachment list/attach/detach.

### `/budgets`
- Cost code list/create/update.
- Cost code entries list/create.
- Drilldown, variance, reconciliation.
- Narrative queue and alert deduplication.
- Project settings get/upsert.

### `/subcontractors`
- Subcontractor CRUD.
- Portal invite for subcontractor.

### `/compliance`
- Compliance item CRUD.
- Insurance extraction queue endpoint.

### `/subconnect`
- Internal SubConnect operations:
  - invitations
  - prequalification scores
  - compliance templates lifecycle
  - internal pay application review
  - internal daily log review

### `/portal`
Public:
- register
- login
- invitation accept
- password reset request/confirm

Protected (bearer token):
- profile
- overview
- compliance get/update
- pay application list/create/get
- daily log list/create/get

### `/smartmail`
- account list/create/update/sync
- thread list/create
- thread messages list/create
- draft generation
- message link update
- template CRUD

### `/integrations`
- Integration list/create/get/update/disconnect

### `/storage`
- File assets list.
- Upload session create.
- Upload complete.
- Download URL create.
- File archive.

### `/ai`
- text generation
- estimate brief generation
- async job status

---

## 4. Response and Error Shapes

### Common success patterns
Most routes return one of:
- `{ data: ... }`
- `{ items: ... }`
- `{ profile: ... }`
- direct object payload for selected auth/portal flows

Integration rule:
- Use endpoint-specific response typing from OpenAPI.
- Do not apply one global unwrapping strategy.

### Error envelope
Errors are standardized via middleware:

```json
{
  "error": {
    "code": "BAD_REQUEST|UNAUTHORIZED|FORBIDDEN|NOT_FOUND|VALIDATION_ERROR|INTERNAL_SERVER_ERROR",
    "message": "Human-readable message",
    "details": null
  }
}
```

Validation responses can include issue arrays depending on source error type.

---

## 5. High-Value Integration Sequences

### Sequence A: Internal app bootstrap
1. Authenticate through Better Auth (`/auth/*`).
2. Resolve active organization via `/organizations/active-member` and related org endpoints.
3. Load project list via `/projects`.
4. Load notifications via `/notifications`.

### Sequence B: Financial control workflow
1. Create/update RFQ (`/rfqs`).
2. Create/update PO (`/purchase-orders`).
3. Create/update receipt (`/receipts`).
4. Create/update invoice (`/invoices`).
5. Run 3-way match (`/match-runs`).
6. Observe billing and usage (`/billing`).

### Sequence C: Portal workflow
1. Login via `/portal/login`.
2. Persist returned bearer token.
3. Read `/portal/overview` and `/portal/profile`.
4. Submit portal pay apps and daily logs.
5. Update compliance evidence in `/portal/compliance`.

### Sequence D: Async AI workflow
1. Create AI task via `/ai/generate` async mode.
2. Poll `/ai/jobs/:jobId`.
3. Render completion/failure state.

---

## 6. Frontend Integration Rules

- Always generate typed clients/models from `/openapi.json`.
- Keep auth interceptor logic split by mode:
  - cookie session for internal endpoints
  - bearer token for portal endpoints
- Normalize API errors into one UI-facing error model.
- Implement retries for idempotent reads and async polling.
- Avoid silent failures for `403` and `422/400` style validation responses.

---

## 7. Backend Change Impact Rules

When backend changes API behavior:
1. Update route/controller/service.
2. Ensure validation middleware exists for changed input.
3. Run API tests and typecheck.
4. Verify `/openapi.json` reflects change.
5. Update this reference if group-level behavior changed.

---

## 8. Engineering Notes

- OpenAPI generation is router-driven and validation-metadata-driven.
- `validateBody/query/params` metadata contributes directly to contract extraction.
- Wrapped async handlers preserve underlying handler identity for security inference in docs generation.
- Better Auth dynamic route internals are represented with fallback auth path documentation in OpenAPI.

---

## 9. Related Docs

- [08-backend-frontend-build-handbook.md](08-backend-frontend-build-handbook.md)
- [04-backend-setup.md](04-backend-setup.md)
- [05-auth-and-ai-stack.md](05-auth-and-ai-stack.md)
- [07-status.md](07-status.md)
