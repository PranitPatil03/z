# Frontend Execution Plan (What We Will Do and How)

**Last Updated:** April 7, 2026

This document defines the detailed frontend plan without starting implementation yet.

## 1. Goals

1. Build a production-ready frontend foundation that consumes the current backend safely.
2. Keep frontend behavior contract-driven from `/openapi.json`.
3. Deliver role-aware workflows with clear loading, empty, error, and success states.
4. Ensure both internal and portal auth models are implemented correctly.

## 2. Scope Boundaries

In scope:
- Frontend app scaffold (`apps/web`).
- Shared API client approach.
- Shared UI primitives and layout patterns.
- Core workflows based on current backend route groups.

Out of scope in initial start:
- New backend features unrelated to frontend enablement.
- Broad refactors to existing backend modules.
- Visual polish cycles not tied to core flow completion.

## 3. Delivery Strategy

We will execute in phases with strict exit criteria.
Each phase is complete only when all acceptance checks pass.

### Phase 0: Reference Intake and Functional Mapping

What we will do:
- Collect design and UX references.
- Map references to backend modules and endpoints.
- Freeze MVP screen inventory and role matrix.

How we will do it:
- Use [12-frontend-reference-intake-checklist.md](12-frontend-reference-intake-checklist.md).
- Produce a route-to-screen and endpoint-to-feature map.
- Confirm acceptance criteria per screen before coding starts.

Exit criteria:
- Approved screen list with priority order.
- Approved role access matrix.
- Approved visual direction and component expectations.

### Phase 1: Frontend Foundation Scaffold

What we will do:
- Create `apps/web` with TypeScript, routing, environment config, and base tooling.
- Add baseline lint, typecheck, and test setup.

How we will do it:
- Scaffold app with feature-oriented folders:
  - `app` or `routes`
  - `features`
  - `components`
  - `layouts`
  - `lib`
  - `hooks`
- Add providers for query cache, auth/session state, and global app state.

Exit criteria:
- Frontend app runs locally.
- Lint/typecheck/test commands are green.
- Baseline app shell and route structure exist.

### Phase 2: API Client and Auth Integration

What we will do:
- Implement contract-driven API access.
- Implement dual auth transport behavior.

How we will do it:
- Build or generate typed API client from `/openapi.json`.
- Add request pipeline that supports:
  - `credentials: "include"` for internal routes.
  - `Authorization: Bearer <token>` for portal routes.
- Add unified error normalization from backend error envelope.

Exit criteria:
- API client can call representative routes in each major group.
- Internal and portal auth calls are both validated end to end.
- Error normalization layer is used in all API calls.

### Phase 3: UI System and Shared Patterns

What we will do:
- Expand `packages/ui` into usable primitives and layout patterns.
- Define shared page states and interaction behaviors.

How we will do it:
- Build reusable primitives first:
  - Button, Input, Select, Modal, Table, Badge, Tabs, Drawer.
- Build reusable state components:
  - Skeleton, EmptyState, ErrorState, InlineValidation, RetryAction.
- Add role-aware wrappers for view/edit/approve actions.

Exit criteria:
- Core primitives are documented and reused by feature screens.
- Page-state behavior is consistent across modules.
- Accessibility baseline checks pass for keyboard and semantics.

### Phase 4: Core Workflow Screens (MVP)

What we will do:
- Deliver high-value workflows first in this order:
  1. Auth + org/project shell
  2. Notifications + activity feed + command center overview
  3. Financial core (RFQ, PO, receipts, invoices, match runs)
  4. Change orders + budgets

How we will do it:
- Build each feature as a vertical slice:
  - Route
  - Data hooks
  - UI states
  - Actions/mutations
  - Feature tests
- Use endpoint-specific types and avoid global response assumptions.

Exit criteria:
- Users can complete end-to-end happy paths for MVP features.
- Failure paths are surfaced with clear recoverable UX.
- Feature-level tests pass for each completed slice.

### Phase 5: Portal Flows and Async AI UX

What we will do:
- Build protected portal workflows.
- Build polling and async UX for AI-driven tasks.

How we will do it:
- Implement portal login and token lifecycle handling.
- Implement portal overview/compliance/pay-app/daily-log flows.
- Implement deterministic polling components for `/ai/jobs/:jobId`.

Exit criteria:
- Portal users can complete submit and review lifecycle paths.
- Async AI flows show status, retry, and failure recovery clearly.

### Phase 6: Hardening and Release Readiness

What we will do:
- Complete performance, reliability, and release quality gates.

How we will do it:
- Add route-level and feature-level frontend tests.
- Add smoke E2E checks for critical journeys.
- Run accessibility checks and responsive checks for key screens.
- Verify production build and deployment pipeline.

Exit criteria:
- Critical journey tests are stable.
- No blocker-level accessibility failures in MVP flows.
- Release checklist passes.

## 4. Frontend Architecture Decisions

1. Feature-first folder structure.
2. Typed API access from backend contract.
3. One normalized error model for UI.
4. Shared query and mutation patterns per feature.
5. Role-aware UI behavior driven by backend permissions.

## 5. Route-to-Module Priority Map

Priority 1:
- `/organizations`
- `/projects`
- `/notifications`
- `/activity-feed`
- `/command-center`

Priority 2:
- `/rfqs`
- `/purchase-orders`
- `/receipts`
- `/invoices`
- `/match-runs`
- `/billing`

Priority 3:
- `/change-orders`
- `/budgets`
- `/site-snaps`
- `/smartmail`
- `/integrations`

Priority 4 (portal and specialized):
- `/portal`
- `/subconnect`
- `/compliance`
- `/storage`
- `/ai`

## 6. Quality and Governance Gates

For every frontend feature slice, we will require:

1. Type-safe API usage.
2. Explicit loading, empty, error, success states.
3. Role-based action visibility checks.
4. Input validation aligned with backend rules.
5. Basic accessibility checks.
6. Unit/integration test coverage on core logic.

## 7. Risk Register and Mitigations

Risk 1: Contract drift between frontend assumptions and backend behavior.
- Mitigation: consume `/openapi.json` continuously and verify before merges.

Risk 2: Mixed response envelopes across endpoints.
- Mitigation: endpoint-specific adapters in API layer, not UI components.

Risk 3: Auth confusion between internal and portal contexts.
- Mitigation: explicit client separation and route-group mapping.

Risk 4: UI inconsistency from rapid feature delivery.
- Mitigation: enforce shared component usage from `packages/ui`.

Risk 5: Async UX instability on long-running jobs.
- Mitigation: standardized polling and retry primitives.

## 8. Implementation Checklist (When You Say Start)

1. Finalize references from [12-frontend-reference-intake-checklist.md](12-frontend-reference-intake-checklist.md).
2. Lock MVP scope and sequence.
3. Scaffold `apps/web` and baseline tooling.
4. Implement API and auth client layer.
5. Build core UI shell and priority workflows.
6. Add tests and release hardening.
7. Run full readiness checklist and deploy.

## 9. Related Docs

- [10-frontend-readiness-review.md](10-frontend-readiness-review.md)
- [12-frontend-reference-intake-checklist.md](12-frontend-reference-intake-checklist.md)
- [13-frontend-module-wise-plan-and-progress.md](13-frontend-module-wise-plan-and-progress.md)
- [08-backend-frontend-build-handbook.md](08-backend-frontend-build-handbook.md)
- [09-api-integration-reference.md](09-api-integration-reference.md)
- [03-implementation-blueprint.md](03-implementation-blueprint.md)
