# Frontend Module-Wise Plan and Progress Tracker

**Last Updated:** April 11, 2026

This document is the execution tracker for frontend delivery using the existing backend contract.

## 1. How To Use This Tracker

1. Keep one owner per module.
2. Mark tasks with markdown checkboxes:
- [ ] not started
- [x] done
3. Update module status at least once per sprint.
4. A module is complete only when all checklist items in that module are checked.

## 2. Module Progress Board

- [x] M0: Frontend Foundation and App Shell
- [x] M1: Identity, Session, and Route Protection
- [x] M2: Organization and Project Workspace
- [x] M3: Notifications, Activity Feed, and Command Center
- [x] M4: Procurement and AP Core (RFQ, PO, Receipts, Invoices, Match)
- [x] M5: Change Orders Workflow
- [x] M6: Budget Controls and Variance Views
- [x] M7: SiteSnap, Storage, and AI Job UX
- [x] M8: SubConnect Internal Operations
- [x] M9: Subcontractor Portal Experience
- [x] M10: SmartMail and Integrations UX
- [x] M11: Billing, Plans, and Stripe Ops UX
- [ ] M12: QA Hardening, Accessibility, and Release Gates

## 3. Backend Route Map Reference

Primary backend mounting source:
- [../apps/api/src/app.ts](../apps/api/src/app.ts)

Supporting contract docs:
- [08-backend-frontend-build-handbook.md](08-backend-frontend-build-handbook.md)
- [09-api-integration-reference.md](09-api-integration-reference.md)

---

## M0: Frontend Foundation and App Shell

Backend dependencies:
- [../apps/api/src/app.ts](../apps/api/src/app.ts)
- [../apps/api/src/lib/openapi.ts](../apps/api/src/lib/openapi.ts)

Goal:
- Establish apps/web with production-ready baseline architecture and developer workflow.

Progress checklist:
- [x] Create apps/web scaffold with TypeScript.
- [x] Add routing skeleton (public, internal, portal route groups).
- [x] Add query client provider and request utilities.
- [x] Add global app state provider for session and org context.
- [x] Add shared page-state primitives (loading, empty, error).
- [x] Add environment config handling for API base URL.
- [x] Add frontend lint, typecheck, and test scripts.
- [x] Add CI task wiring for frontend checks.

Done when:
- Local app bootstraps cleanly.
- Lint, typecheck, test commands pass.
- Base shell and navigation layout are functional.

---

## M1: Identity, Session, and Route Protection

Backend routes:
- /auth
- /auth/oauth
- /portal (public auth endpoints)

Route files:
- [../apps/api/src/routes/auth.ts](../apps/api/src/routes/auth.ts)
- [../apps/api/src/routes/oauth.ts](../apps/api/src/routes/oauth.ts)
- [../apps/api/src/routes/portal.ts](../apps/api/src/routes/portal.ts)

Goal:
- Implement internal session auth and portal token auth with correct transport behavior.

Progress checklist:
- [x] Build internal session initialization flow.
- [x] Implement credentials include transport for internal routes.
- [x] Build portal login and token persistence flow.
- [x] Implement bearer transport for protected portal routes.
- [x] Add route guards for unauthenticated users.
- [x] Add role-aware guard wrappers for restricted actions.
- [x] Add auth error handling and re-login UX.
- [x] Add auth integration tests for internal and portal flows.

Done when:
- Internal users and portal users can authenticate and navigate protected routes reliably.

---

## M2: Organization and Project Workspace

Backend routes:
- /organizations
- /projects

Route files:
- [../apps/api/src/routes/organizations.ts](../apps/api/src/routes/organizations.ts)
- [../apps/api/src/routes/projects.ts](../apps/api/src/routes/projects.ts)

Goal:
- Deliver core workspace shell tied to active organization and project context.

Progress checklist:
- [x] Build organization selector and active organization state handling.
- [x] Build project list and project detail screens.
- [x] Build project member list/create/update/remove screens.
- [x] Add create and update forms with validation UX.
- [x] Add empty-state and permission-state UX for restricted users.
- [x] Add optimistic updates only for safe operations.
- [x] Add fallback refetch paths for failed mutations.
- [x] Add module tests for core workspace flows.

Done when:
- User can fully manage project workspace based on permissions.

---

## M3: Notifications, Activity Feed, and Command Center

Backend routes:
- /notifications
- /activity-feed
- /command-center
- /audit-log

Route files:
- [../apps/api/src/routes/notifications.ts](../apps/api/src/routes/notifications.ts)
- [../apps/api/src/routes/activity-feed.ts](../apps/api/src/routes/activity-feed.ts)
- [../apps/api/src/routes/command-center.ts](../apps/api/src/routes/command-center.ts)
- [../apps/api/src/routes/audit-log.ts](../apps/api/src/routes/audit-log.ts)

Goal:
- Deliver operational visibility surfaces for day-to-day execution and portfolio monitoring.

Progress checklist:
- [x] Build notification center list and unread counter UI.
- [x] Build notification preference settings UI.
- [x] Build activity feed list with filters and pagination.
- [x] Build entity timeline drill-down view.
- [x] Build command center overview, health, portfolio, trends views.
- [x] Build audit log list with filters and export-ready table structure.
- [x] Add retry and stale-state controls for dashboard data.
- [x] Add module tests for filter and summary behavior.

Done when:
- Operations and leadership users can monitor activity and health without API-level troubleshooting.

---

## M4: Procurement and AP Core (RFQ, PO, Receipts, Invoices, Match)

Backend routes:
- /rfqs
- /purchase-orders
- /receipts
- /invoices
- /match-runs

Route files:
- [../apps/api/src/routes/rfqs.ts](../apps/api/src/routes/rfqs.ts)
- [../apps/api/src/routes/purchase-orders.ts](../apps/api/src/routes/purchase-orders.ts)
- [../apps/api/src/routes/receipts.ts](../apps/api/src/routes/receipts.ts)
- [../apps/api/src/routes/invoices.ts](../apps/api/src/routes/invoices.ts)
- [../apps/api/src/routes/match-runs.ts](../apps/api/src/routes/match-runs.ts)

Goal:
- Deliver financial workflow UI from sourcing through payable controls.

Progress checklist:
- [x] Build RFQ list, detail, create, update, archive screens.
- [x] Build purchase order list, detail, create, update, archive screens.
- [x] Build receipts list, detail, create, update, archive screens.
- [x] Build invoices list, detail, create, update, archive screens.
- [x] Build 3-way match run list, run create, run detail screens.
- [x] Build status chips and lifecycle transitions with confirmations.
- [x] Build exception and override UX with explicit reason handling.
- [x] Add module tests for end-to-end financial happy and failure paths.

Done when:
- End users can complete procurement and AP cycles with visible status and error recovery.

---

## M5: Change Orders Workflow

Backend routes:
- /change-orders

Route files:
- [../apps/api/src/routes/change-orders.ts](../apps/api/src/routes/change-orders.ts)

Goal:
- Deliver full change order lifecycle UI with approval workflow clarity.

Progress checklist:
- [x] Build change order list and detail screens.
- [x] Build create and update forms for draft stage.
- [x] Build submit-for-approval action UX.
- [x] Build approve and reject decision UX with role checks.
- [x] Build attachments list/add/remove UX.
- [x] Build status timeline and decision history panel.
- [x] Build SLA and due-date warning indicators.
- [x] Add module tests for lifecycle transitions.

Done when:
- Change order lifecycle is manageable through UI with clear role-aware actions.

---

## M6: Budget Controls and Variance Views

Backend routes:
- /budgets

Route files:
- [../apps/api/src/routes/budgets.ts](../apps/api/src/routes/budgets.ts)

Goal:
- Deliver cost-code level control surfaces and variance intelligence UX.

Progress checklist:
- [x] Build budget cost code list/create/update views.
- [x] Build cost entry list/create views.
- [x] Build variance view with filter and drilldown UX.
- [x] Build reconciliation view.
- [x] Build narrative queue trigger and status feedback UX.
- [x] Build alert dedup action UX with safeguards.
- [x] Build project budget settings view.
- [x] Add module tests for calculations and user actions.

Done when:
- Users can monitor and operate budget controls from UI without manual API calls.

---

## M7: SiteSnap, Storage, and AI Job UX

Backend routes:
- /site-snaps
- /storage
- /ai

Route files:
- [../apps/api/src/routes/site-snaps.ts](../apps/api/src/routes/site-snaps.ts)
- [../apps/api/src/routes/storage.ts](../apps/api/src/routes/storage.ts)
- [../apps/api/src/routes/ai.ts](../apps/api/src/routes/ai.ts)

Goal:
- Deliver AI-assisted field workflow UX with reliable async state handling.

Progress checklist:
- [x] Build site snap list, detail, create, and update views.
- [x] Build observation create/update/delete UX.
- [x] Build analyze, reanalyze, and review actions with status indicators.
- [x] Build upload session workflow for file handling.
- [x] Build download URL and file lifecycle UX.
- [x] Build AI job polling component for long-running tasks.
- [x] Build failure and retry UX for async operations.
- [x] Add module tests for async and upload flows.

Done when:
- Field AI workflows are operational with deterministic loading and retry behavior.

Implementation note:
- Site snap-level archive route is not exposed in current backend contracts. File lifecycle archive is implemented through `/storage/:fileAssetId`.

---

## M8: SubConnect Internal Operations

Backend routes:
- /subcontractors
- /subconnect
- /compliance

Route files:
- [../apps/api/src/routes/subcontractors.ts](../apps/api/src/routes/subcontractors.ts)
- [../apps/api/src/routes/subconnect.ts](../apps/api/src/routes/subconnect.ts)
- [../apps/api/src/routes/compliance.ts](../apps/api/src/routes/compliance.ts)

Goal:
- Deliver internal subcontractor operations, invite lifecycle, and compliance administration.

Progress checklist:
- [x] Build subcontractor list, detail, create, update views.
- [x] Build subcontractor invite lifecycle UI.
- [x] Build compliance template management views.
- [x] Build prequalification score and review views.
- [x] Build internal pay application review views.
- [x] Build internal daily log review views.
- [x] Build compliance item review and insurance extraction UX.
- [x] Add module tests for internal operations and review decisions.

Done when:
- Internal operations team can run SubConnect workflows from frontend reliably.

Implementation note:
- Consolidated internal operations are delivered at `/app/subconnect`, wired to typed clients for `/subcontractors`, `/subconnect`, and `/compliance` with passing lint/typecheck/tests.

---

## M9: Subcontractor Portal Experience

Backend routes:
- /portal

Route files:
- [../apps/api/src/routes/portal.ts](../apps/api/src/routes/portal.ts)

Goal:
- Deliver external subcontractor self-service portal flows.

Progress checklist:
- [x] Build portal register, login, invitation acceptance screens.
- [x] Build password reset request and confirm screens.
- [x] Build portal profile and overview screens.
- [x] Build portal compliance read and upload views.
- [x] Build portal pay application list/create/detail views.
- [x] Build portal daily log list/create/detail views.
- [x] Build token expiry and session recovery UX.
- [x] Add portal-specific tests across auth and workflow flows.

Done when:
- Subcontractor users can complete full portal lifecycle without internal app access.

Implementation note:
- Portal lifecycle is delivered across `/portal/register`, `/portal/login`, `/portal/invitations/accept`, `/portal/forgot-password`, `/portal/reset-password`, and protected `/portal/*` workflow routes for overview/profile/compliance/pay-applications/daily-logs with passing lint/typecheck/tests.

---

## M10: SmartMail and Integrations UX

Backend routes:
- /smartmail
- /integrations
- /auth/oauth

Route files:
- [../apps/api/src/routes/smartmail.ts](../apps/api/src/routes/smartmail.ts)
- [../apps/api/src/routes/integrations.ts](../apps/api/src/routes/integrations.ts)
- [../apps/api/src/routes/oauth.ts](../apps/api/src/routes/oauth.ts)

Goal:
- Deliver communication and integration management experiences.

Progress checklist:
- [x] Build SmartMail account list/create/update/sync views.
- [x] Build thread list/detail and message compose views.
- [x] Build draft generation and linking UX.
- [x] Build template CRUD views.
- [x] Build integrations list/create/update/disconnect views.
- [x] Build OAuth connect and reconnect UX.
- [x] Build provider status and last-sync indicators.
- [x] Add module tests for email and integration actions.

Done when:
- Communication workflows and integration administration are operational from UI.

Implementation note:
- SmartMail and Integrations UX is delivered via `/app/smartmail`, `/app/smartmail/[threadId]`, `/app/integrations`, and OAuth callback handling at `/auth/oauth/callback`, with module API tests for smartmail, oauth, and integrations and passing frontend lint/typecheck/test gates.

---

## M11: Billing, Plans, and Stripe Ops UX

Backend routes:
- /billing

Route files:
- [../apps/api/src/routes/billing.ts](../apps/api/src/routes/billing.ts)

Goal:
- Deliver billing visibility and subscription management UX.

Progress checklist:
- [x] Build billing records list, detail, create, update views.
- [x] Build usage summary view.
- [x] Build subscription plans list and plan switch UX.
- [x] Build payment intent and subscription action UX for admins.
- [x] Build webhook event list and retry admin view.
- [x] Build role-based visibility for billing actions.
- [x] Build clear status messaging for payment and subscription changes.
- [x] Add module tests for billing and plan workflows.

Done when:
- Authorized users can operate billing workflows without backend console access.

Implementation note:
- Billing UX is now fully integrated with backend `/billing` contracts through `/app/billing`, including billing record CRUD, usage summary, subscription plan switch, Stripe payment/subscription actions, webhook event listing/retry controls, role-based action gating, and automated billing module API tests.

---

## M12: QA Hardening, Accessibility, and Release Gates

Backend dependencies:
- Full route groups and auth modes

Goal:
- Ensure frontend release reliability and quality against production expectations.

Progress checklist:
- [x] Add smoke E2E tests for critical journeys.
- [x] Add module-level integration tests for top-risk workflows.
- [x] Add accessibility checks for keyboard and semantics.
- [x] Add responsive checks for desktop and mobile breakpoints.
- [x] Add performance checks for key list/detail screens.
- [x] Add error-observability hooks and release diagnostics.
- [ ] Run full UAT checklist with role-based scenarios.
- [x] Complete go-live checklist and rollback notes.

Done when:
- Frontend can be released with stable quality gates and observable production behavior.

---

## 4. Sprint Progress Log Template

Use this block each sprint.

### Sprint YYYY-MM-DD

- [ ] Planned scope locked
- [ ] In-progress modules updated
- [ ] Completed modules marked in section 2
- [ ] Risks updated
- [ ] Next sprint plan added

Notes:
- Risks:
- Blockers:
- Decisions:
- Next sprint targets:

---

## 5. Related Docs

- [10-frontend-readiness-review.md](10-frontend-readiness-review.md)
- [11-frontend-execution-plan.md](11-frontend-execution-plan.md)
- [12-frontend-reference-intake-checklist.md](12-frontend-reference-intake-checklist.md)
- [08-backend-frontend-build-handbook.md](08-backend-frontend-build-handbook.md)
- [09-api-integration-reference.md](09-api-integration-reference.md)
