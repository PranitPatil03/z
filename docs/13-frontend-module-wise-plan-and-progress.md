# Frontend Module-Wise Plan and Progress Tracker

**Last Updated:** April 7, 2026

This document is the execution tracker for frontend delivery using the existing backend contract.

## 1. How To Use This Tracker

1. Keep one owner per module.
2. Mark tasks with markdown checkboxes:
- [ ] not started
- [x] done
3. Update module status at least once per sprint.
4. A module is complete only when all checklist items in that module are checked.

## 2. Module Progress Board

- [ ] M0: Frontend Foundation and App Shell
- [ ] M1: Identity, Session, and Route Protection
- [ ] M2: Organization and Project Workspace
- [ ] M3: Notifications, Activity Feed, and Command Center
- [ ] M4: Procurement and AP Core (RFQ, PO, Receipts, Invoices, Match)
- [ ] M5: Change Orders Workflow
- [ ] M6: Budget Controls and Variance Views
- [ ] M7: SiteSnap, Storage, and AI Job UX
- [ ] M8: SubConnect Internal Operations
- [ ] M9: Subcontractor Portal Experience
- [ ] M10: SmartMail and Integrations UX
- [ ] M11: Billing, Plans, and Stripe Ops UX
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
- [ ] Create apps/web scaffold with TypeScript.
- [ ] Add routing skeleton (public, internal, portal route groups).
- [ ] Add query client provider and request utilities.
- [ ] Add global app state provider for session and org context.
- [ ] Add shared page-state primitives (loading, empty, error).
- [ ] Add environment config handling for API base URL.
- [ ] Add frontend lint, typecheck, and test scripts.
- [ ] Add CI task wiring for frontend checks.

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
- [ ] Build internal session initialization flow.
- [ ] Implement credentials include transport for internal routes.
- [ ] Build portal login and token persistence flow.
- [ ] Implement bearer transport for protected portal routes.
- [ ] Add route guards for unauthenticated users.
- [ ] Add role-aware guard wrappers for restricted actions.
- [ ] Add auth error handling and re-login UX.
- [ ] Add auth integration tests for internal and portal flows.

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
- [ ] Build organization selector and active organization state handling.
- [ ] Build project list and project detail screens.
- [ ] Build project member list/create/update/remove screens.
- [ ] Add create and update forms with validation UX.
- [ ] Add empty-state and permission-state UX for restricted users.
- [ ] Add optimistic updates only for safe operations.
- [ ] Add fallback refetch paths for failed mutations.
- [ ] Add module tests for core workspace flows.

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
- [ ] Build notification center list and unread counter UI.
- [ ] Build notification preference settings UI.
- [ ] Build activity feed list with filters and pagination.
- [ ] Build entity timeline drill-down view.
- [ ] Build command center overview, health, portfolio, trends views.
- [ ] Build audit log list with filters and export-ready table structure.
- [ ] Add retry and stale-state controls for dashboard data.
- [ ] Add module tests for filter and summary behavior.

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
- [ ] Build RFQ list, detail, create, update, archive screens.
- [ ] Build purchase order list, detail, create, update, archive screens.
- [ ] Build receipts list, detail, create, update, archive screens.
- [ ] Build invoices list, detail, create, update, archive screens.
- [ ] Build 3-way match run list, run create, run detail screens.
- [ ] Build status chips and lifecycle transitions with confirmations.
- [ ] Build exception and override UX with explicit reason handling.
- [ ] Add module tests for end-to-end financial happy and failure paths.

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
- [ ] Build change order list and detail screens.
- [ ] Build create and update forms for draft stage.
- [ ] Build submit-for-approval action UX.
- [ ] Build approve and reject decision UX with role checks.
- [ ] Build attachments list/add/remove UX.
- [ ] Build status timeline and decision history panel.
- [ ] Build SLA and due-date warning indicators.
- [ ] Add module tests for lifecycle transitions.

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
- [ ] Build budget cost code list/create/update views.
- [ ] Build cost entry list/create views.
- [ ] Build variance view with filter and drilldown UX.
- [ ] Build reconciliation view.
- [ ] Build narrative queue trigger and status feedback UX.
- [ ] Build alert dedup action UX with safeguards.
- [ ] Build project budget settings view.
- [ ] Add module tests for calculations and user actions.

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
- [ ] Build site snap list, detail, create, update, archive views.
- [ ] Build observation create/update/delete UX.
- [ ] Build analyze, reanalyze, and review actions with status indicators.
- [ ] Build upload session workflow for file handling.
- [ ] Build download URL and file lifecycle UX.
- [ ] Build AI job polling component for long-running tasks.
- [ ] Build failure and retry UX for async operations.
- [ ] Add module tests for async and upload flows.

Done when:
- Field AI workflows are operational with deterministic loading and retry behavior.

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
- [ ] Build subcontractor list, detail, create, update views.
- [ ] Build subcontractor invite lifecycle UI.
- [ ] Build compliance template management views.
- [ ] Build prequalification score and review views.
- [ ] Build internal pay application review views.
- [ ] Build internal daily log review views.
- [ ] Build compliance item review and insurance extraction UX.
- [ ] Add module tests for internal operations and review decisions.

Done when:
- Internal operations team can run SubConnect workflows from frontend reliably.

---

## M9: Subcontractor Portal Experience

Backend routes:
- /portal

Route files:
- [../apps/api/src/routes/portal.ts](../apps/api/src/routes/portal.ts)

Goal:
- Deliver external subcontractor self-service portal flows.

Progress checklist:
- [ ] Build portal register, login, invitation acceptance screens.
- [ ] Build password reset request and confirm screens.
- [ ] Build portal profile and overview screens.
- [ ] Build portal compliance read and upload views.
- [ ] Build portal pay application list/create/detail views.
- [ ] Build portal daily log list/create/detail views.
- [ ] Build token expiry and session recovery UX.
- [ ] Add portal-specific tests across auth and workflow flows.

Done when:
- Subcontractor users can complete full portal lifecycle without internal app access.

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
- [ ] Build SmartMail account list/create/update/sync views.
- [ ] Build thread list/detail and message compose views.
- [ ] Build draft generation and linking UX.
- [ ] Build template CRUD views.
- [ ] Build integrations list/create/update/disconnect views.
- [ ] Build OAuth connect and reconnect UX.
- [ ] Build provider status and last-sync indicators.
- [ ] Add module tests for email and integration actions.

Done when:
- Communication workflows and integration administration are operational from UI.

---

## M11: Billing, Plans, and Stripe Ops UX

Backend routes:
- /billing

Route files:
- [../apps/api/src/routes/billing.ts](../apps/api/src/routes/billing.ts)

Goal:
- Deliver billing visibility and subscription management UX.

Progress checklist:
- [ ] Build billing records list, detail, create, update views.
- [ ] Build usage summary view.
- [ ] Build subscription plans list and plan switch UX.
- [ ] Build payment intent and subscription action UX for admins.
- [ ] Build webhook event list and retry admin view.
- [ ] Build role-based visibility for billing actions.
- [ ] Build clear status messaging for payment and subscription changes.
- [ ] Add module tests for billing and plan workflows.

Done when:
- Authorized users can operate billing workflows without backend console access.

---

## M12: QA Hardening, Accessibility, and Release Gates

Backend dependencies:
- Full route groups and auth modes

Goal:
- Ensure frontend release reliability and quality against production expectations.

Progress checklist:
- [ ] Add smoke E2E tests for critical journeys.
- [ ] Add module-level integration tests for top-risk workflows.
- [ ] Add accessibility checks for keyboard and semantics.
- [ ] Add responsive checks for desktop and mobile breakpoints.
- [ ] Add performance checks for key list/detail screens.
- [ ] Add error-observability hooks and release diagnostics.
- [ ] Run full UAT checklist with role-based scenarios.
- [ ] Complete go-live checklist and rollback notes.

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
