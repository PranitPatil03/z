# Frontend Readiness Review

**Last Updated:** April 7, 2026

This review answers a single question: are we ready to start frontend development against the current backend?

## 1. Executive Answer

Yes, the backend is ready for frontend integration.

What is ready now:
- Live API contract endpoint (`/openapi.json`) and interactive docs (`/docs`).
- Auth model is implemented (internal session auth + portal bearer auth).
- Core domain modules are mounted and test-covered.
- Error envelope and request validation are in place.
- Worker-backed async flows are available for AI and notifications.

What is not ready yet on the frontend side:
- No `apps/web` application exists yet.
- `packages/sdk` is minimal and not generated from OpenAPI.
- `packages/ui` is minimal and not yet a production design system.
- `packages/types` is minimal and needs expansion from API contracts.

Conclusion:
- We should start frontend work only after reference intake and frontend scaffolding.
- Backend contract maturity is sufficient to begin safely.

## 2. Readiness Matrix

| Area | Status | Notes |
|---|---|---|
| Backend API surface | Ready | Route groups are mounted and available. |
| OpenAPI contract | Ready | Contract is live at `/openapi.json`. |
| Interactive docs | Ready | ReDoc is live at `/docs`. |
| Internal auth | Ready | Better Auth cookie-session model available. |
| Portal auth | Ready | Bearer-token model available for protected portal endpoints. |
| Validation and error handling | Ready | Zod-based request validation + standardized error envelope. |
| Async workflows | Ready | AI jobs and notifications are queue-backed. |
| API/worker tests | Ready | Backend and worker test suites are passing in current cycle. |
| Frontend app (`apps/web`) | Not started | App scaffold does not exist yet. |
| SDK package (`packages/sdk`) | Partial | Placeholder implementation only. |
| UI package (`packages/ui`) | Partial | Placeholder implementation only. |
| Shared frontend types (`packages/types`) | Partial | Placeholder implementation only. |

## 3. Evidence Snapshot

Backend contract and docs:
- [../apps/api/src/app.ts](../apps/api/src/app.ts)
- [../apps/api/src/lib/openapi.ts](../apps/api/src/lib/openapi.ts)
- [08-backend-frontend-build-handbook.md](08-backend-frontend-build-handbook.md)
- [09-api-integration-reference.md](09-api-integration-reference.md)

Current repo structure status:
- [../apps](../apps)
- [../packages/sdk/src/index.ts](../packages/sdk/src/index.ts)
- [../packages/ui/src/index.ts](../packages/ui/src/index.ts)
- [../packages/types/src/index.ts](../packages/types/src/index.ts)

## 4. Known Gaps That Must Be Addressed Early

1. Frontend scaffold gap
- We need to create `apps/web` with baseline routing, providers, and environment handling.

2. Contract-consumption gap
- We need generated or strongly typed API access from `/openapi.json`.

3. UI system gap
- We need reusable primitives, layout system, and consistent state components.

4. Auth integration gap
- We need dual-mode client auth handling:
  - Cookie-based internal routes.
  - Bearer-token portal routes.

5. Error and loading standardization gap
- We need one frontend error normalization layer and consistent async UX behavior.

## 5. Frontend Start Gate (Definition of Ready)

Frontend implementation should start when all conditions below are true:

1. Reference inputs are provided and approved.
2. `apps/web` scaffold and tooling are created.
3. API client strategy is selected and documented.
4. Auth handling strategy is implemented and verified for both auth modes.
5. Core shell screens and route guards are implemented.
6. CI checks run for lint, typecheck, and tests in frontend workspace.

## 6. Recommended Immediate Next Step (No Coding Yet)

Use [12-frontend-reference-intake-checklist.md](12-frontend-reference-intake-checklist.md) to provide references for:
- Design direction.
- Screen inventory and priority.
- Role and permission behavior.
- API and integration expectations.

After that, execute [11-frontend-execution-plan.md](11-frontend-execution-plan.md) phase by phase.

Track module-level progress in [13-frontend-module-wise-plan-and-progress.md](13-frontend-module-wise-plan-and-progress.md).
