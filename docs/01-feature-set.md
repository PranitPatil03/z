# Foreman Complete Feature Set

## 1. Product Scope
Foreman is a unified construction project operations platform with six product pillars:
- SiteSnap AI (field photo intelligence)
- Change Order Engine (configurable approvals)
- Budget Variance Tracker (three-layer cost control)
- SubConnect (subcontractor management + external portal)
- SmartMail (project-linked communications)
- Command Center (project and portfolio analytics)

It also includes platform capabilities required for SaaS operation:
- Multi-tenancy
- Authentication and RBAC
- Billing and subscription control
- Notifications
- Audit trail and compliance controls

## 2. User Roles and Access Intent
- Owner or Director: portfolio visibility, escalated approvals, billing and governance controls.
- Project Manager: full project operations and configuration within assigned projects.
- Field Supervisor: mobile-first operational workflows, capture and submission rights, no financial governance approvals.
- Subcontractor User (external): limited project-specific access for compliance uploads, scope view, and payment submissions.

## 3. Complete Functional Feature Catalog

### 3.1 Core Platform and Identity
- User registration, login, refresh, logout.
- Password reset flow.
- Organization creation and tenant bootstrap.
- Team invitation and member lifecycle.
- Role assignment by project.
- Department-scoped permissions.
- Project membership controls.
- Session and token management.
- OAuth account linking for external services.

Acceptance criteria:
- Every authenticated request is tenant-validated server-side.
- Permission checks are centralized and reusable.
- Unauthorized access returns safe errors with no data leakage.

### 3.2 Project and Workspace Management
- Project CRUD.
- Project settings and thresholds.
- Project overview summary.
- Activity feed for project events.
- Health score endpoint with explainable factors.

Acceptance criteria:
- Users only see assigned projects unless role permits portfolio view.
- Project settings are versioned with audit records.

### 3.3 SiteSnap AI (Field Intelligence)
- Upload or capture up to 10 images per snap session.
- Add notes and location zone metadata.
- Async AI analysis with structured observations.
- Observation categories: work progress, safety issue, material present, site condition, equipment.
- Confidence score support and low-confidence flags.
- Manual edit or delete of AI observations.
- Mark snap as reviewed.
- Re-analyze request flow.
- Daily progress auto-compilation from reviewed snaps.

Acceptance criteria:
- AI output must be valid structured JSON before persistence.
- Failed analyses are recoverable through retry and manual mode.
- Every review and edit action is auditable.

### 3.4 Change Order Engine
- Change order CRUD with reason and impact fields.
- Attachment handling.
- Submit workflow and status transitions.
- Configurable rule-based pipeline routing.
- Multi-stage approvals by role and department.
- Revision request loop.
- Rejection and closure handling.
- Deadline reminders, SLA tracking, escalation logic.
- Final execution actions: budget and schedule impact hooks.

Acceptance criteria:
- Pipeline stage transitions enforce actor eligibility.
- State machine prevents invalid transitions.
- Escalation actions are deterministic and logged.

### 3.5 Budget and Cost Control
- Budget setup by cost code.
- Committed cost entries linked to contracts and orders.
- Actual cost entries linked to invoices and pay apps.
- Variance calculations:
  - budget minus committed
  - committed minus actual
  - budget minus actual
  - billed percent of committed
- Configurable alert thresholds at project and cost code levels.
- AI narrative generation for threshold breaches.
- Reconciliation dashboard and drilldown.

Acceptance criteria:
- Calculations must be reproducible and traceable.
- Narrative references underlying entities (CO, invoice, cost code).
- Alert deduplication prevents notification noise.

### 3.6 SubConnect (Internal + External)
Internal features:
- Subcontractor directory and profile management.
- Invitation and onboarding.
- Prequalification scoring.
- Compliance requirement templates per project.
- Compliance status tracking (received, verified, expiring, expired).
- Expiration reminders and escalation.
- Payment application review workflow.

External portal features:
- Portal account registration/login.
- View assigned scope and milestones.
- Upload compliance documents.
- Submit monthly payment applications.
- View status history and payment timeline.
- Submit daily logs (labor, equipment, performed work).

AI compliance features:
- Insurance document extraction (carrier, policy, limits, effective and expiry dates, additional insured status).
- Human verification and correction before final acceptance.

Acceptance criteria:
- External users are hard-scoped to assigned entities only.
- Every uploaded compliance artifact has status and reviewer trace.

### 3.7 SmartMail (Communications)
- Gmail and Outlook OAuth connect flows.
- Send and receive email in platform.
- AI-assisted email drafting with entity context.
- Manual and automatic entity linking from email content.
- Threading by project and related entities.
- Templates and reusable snippets.
- Email account disconnect and token revocation.

Acceptance criteria:
- OAuth tokens are encrypted at rest.
- Linked emails appear in entity timelines with immutable message references.
- AI draft generation preserves user edit before send.

### 3.8 Command Center Analytics
Project-level analytics:
- Health score.
- Budget burn rate.
- Change-order velocity.
- SiteSnap activity map.
- Subcontractor compliance status.
- Payment application aging.
- Cost code breakdown.
- AI usage against plan limits.

Portfolio-level analytics:
- Cross-project health and exposure.
- Compliance posture across organization.
- AI consumption and billing forecast.

Reporting:
- PDF export of dashboards.
- AI executive summary for exported reports.

Acceptance criteria:
- Metrics use consistent calculation windows.
- Cached aggregates refresh predictably with visible timestamp.

### 3.9 Billing, Subscription, and Usage
- Plan selection and checkout.
- Subscription activation and lifecycle.
- Plan upgrades and downgrades.
- Payment failure handling and grace periods.
- Metered AI usage recording.
- Usage and overage estimation endpoints.
- Invoice visibility.

Acceptance criteria:
- Stripe webhook handling is idempotent.
- Feature entitlements derive from current plan state.
- Usage counters reset correctly by billing cycle.

### 3.10 Notifications and Audit
- In-app notification feed.
- Unread counters and preferences.
- Event-triggered notifications for approvals, deadlines, compliance expiry, billing status.
- Full audit log filterable by entity, actor, action, and date.

Acceptance criteria:
- Critical events always emit audit logs.
- Notification delivery failures are retried and observable.

### 3.11 Supplier Discovery and RFQ Automation (Phase-2 Recommended)
- Supplier discovery directory by trade, geography, certifications, and historical performance.
- Search and filtering for approved or prequalified vendors.
- RFQ package builder (scope, drawings, specs, due date, terms).
- Multi-supplier RFQ dispatch with templated communication.
- Supplier response intake (price, lead time, exclusions, clarifications).
- Bid comparison matrix with weighted scoring.
- Recommendation workflow and award decision capture.
- Convert awarded RFQ to commitment and purchase order draft.

Acceptance criteria:
- RFQ timeline is fully auditable from issue to award.
- Bid comparison uses deterministic scoring inputs and transparent weights.
- Award action captures rationale and approver identity.

### 3.12 PO and Invoice 3-Way Matching (Phase-1.5 High Priority)
- Purchase order creation from approved commitment or RFQ award.
- Goods or work receipt records (manual, milestone-based, or evidence-linked).
- Invoice ingestion (manual upload plus OCR extraction where available).
- 3-way match engine:
  - PO/commitment amount and lines
  - received quantity or completed work
  - invoice amount and lines
- Tolerance rules by project and cost code (quantity, amount, tax).
- Match outcomes: MATCHED, PARTIAL_MATCH, OVER_BILL, UNDER_RECEIPT, PRICE_VARIANCE.
- Exception queue with assignment and resolution workflow.
- Approval chain integration for exceptions above thresholds.
- Payment release gate only after successful match or approved exception.

Acceptance criteria:
- No invoice can be marked payable without match result or authorized override.
- Exception resolution stores reason code, actor, and timestamp.
- All financial transitions emit audit events.

## 4. Cross-Cutting Functional Requirements
- Multi-tenant hard isolation.
- Role and department scoped authorization.
- End-to-end traceability for financial and safety actions.
- Human override for all AI outputs.
- Configurability for pipelines, thresholds, and compliance requirements.
- Mobile-first field workflows with low-friction data capture.
- Clean, simple, modern UX with role-focused navigation and low cognitive load.
- Explicit loading, empty, and failure states for every critical workflow.
- Optimistic updates only for safe operations; destructive actions require confirmation.

## 5. Out-of-Scope for Initial MVP (Recommended)
- Full offline-first synchronization.
- Native mobile apps (start with responsive web + PWA capability).
- Advanced forecasting and predictive optimization.
- Global multi-region active-active deployment.
- Marketplace-grade supplier network expansion beyond curated partner lists.

## 6. Definition of Done for Feature Readiness
A feature is release-ready only when all are complete:
- Functional workflow and edge states.
- Authorization and tenant isolation checks.
- Audit events and observability hooks.
- API contract tests and integration tests.
- UX for failure handling and retries.
- Documentation updated in this docs set.
