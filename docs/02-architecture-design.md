# Foreman Architecture Design

## 1. Architecture Goals
- Build a secure multi-tenant SaaS for construction operations.
- Keep workflows auditable and liability-safe.
- Support AI-assisted features with deterministic fallback paths.
- Scale from early customers to enterprise org portfolios.

## 2. System Context
Actors:
- Internal users (owners, PMs, supervisors)
- External subcontractor users
- Third-party platforms (Better Auth, OpenAI, Anthropic, Google Gemini, Azure OpenAI, Stripe, Google, Microsoft)

Core systems:
- Web frontend application
- API backend and authorization layer
- Relational database
- Object storage for files and images
- Queue workers for async processing
- Observability and alerting services

## 3. Logical Architecture

### 3.1 Frontend Layer
Responsibilities:
- Role-aware UX rendering.
- Data access through typed API client.
- Optimistic updates where safe.
- Background polling or subscriptions for long-running jobs.
- Fine-grained permission-driven UI states.

Recommended architecture:
- App shell with organization and project context.
- Module-based feature folders.
- Design system and shared primitives.
- Query cache with stale-while-revalidate strategy.

### 3.2 Backend API Layer
Responsibilities:
- AuthN and authZ through Better Auth and backend policies.
- Tenant scoping.
- Domain business logic.
- Workflow orchestration.
- Integration adapters.
- Audit emission.

Pattern:
- Route -> validation -> auth middleware -> tenant middleware -> authorization gate -> domain service -> repository -> event/audit emit.

### 3.3 Async Worker Layer
Responsibilities:
- AI analysis jobs.
- Email sync and token refresh.
- Escalation deadlines.
- Variance recalculation and aggregation refresh.
- Notification fanout.

Requirements:
- Retry with bounded attempts.
- Dead-letter queue and replay tools.
- Job idempotency keys.

### 3.4 Data Layer
Primary store:
- PostgreSQL for transactional data and relational workflows.

Object store:
- S3-compatible blob storage for images and documents.

Cache:
- Redis for queue backend, distributed locks, ephemeral cache.

## 4. Domain Architecture
Domains:
- Identity and access
- Organization and project management
- SiteSnap AI
- Change orders
- Budget and cost control
- Procurement and RFQ automation
- AP controls and 3-way matching
- Subcontractor operations
- SmartMail communications
- Billing and usage
- Analytics and reporting
- Notification and audit

Design rule:
- Each domain has clear ownership of entities and service boundaries.
- Cross-domain interactions occur through explicit service APIs or domain events.

## 5. Multi-Tenant Isolation Design
Isolation strategy:
- Shared schema with mandatory organization_id on tenant-owned tables.
- Server-side tenant predicate injection for all query paths.
- Prohibit trust in client-provided organization identifiers.

Hard controls:
- Global query guard in repository layer.
- Static analysis checks for unscoped queries.
- Security tests for cross-tenant access attempts.

## 6. Authorization Model
- Tiered role model with project assignment.
- Department-scoped privileges.
- Action-level policy checks in backend.

Policy examples:
- Field supervisor can create change order request but cannot approve.
- PM can approve below configured threshold only if department scope permits.
- Owner can perform org-level and portfolio-level actions.

## 7. Core Data Model Strategy
Entity groups:
- Core: organizations, users, memberships, roles, permissions.
- Projects: projects, settings, departments.
- SiteSnap: snaps, images, observations, daily logs.
- Change orders: orders, line items, pipelines, stages, transitions, attachments.
- Budgeting: budgets, cost codes, committed costs, actual costs, thresholds, alerts.
- Procurement: suppliers, supplier_profiles, rfqs, rfq_items, rfq_invites, rfq_responses, bid_comparisons, awards, purchase_orders, po_line_items.
- AP controls: receipts, receipt_line_items, invoices, invoice_line_items, match_runs, match_exceptions, exception_resolutions, payment_releases.
- Subcontractors: subcontractors, sub-users, compliance docs and requirements, insurance records, payment apps.
- Communications: email accounts, messages, entity links.
- Platform: subscriptions, usage records, billing events, notifications, audit logs.

Data integrity rules:
- Foreign keys on all ownership and relation edges.
- Unique constraints for natural keys where needed.
- Soft delete for recoverable records.
- Immutable append-only history for critical transitions and audit records.
- Financial control guardrails for payable status changes and approval overrides.

## 7.1 Procurement and 3-Way Matching Flow Architecture
RFQ flow:
- Create RFQ package -> invite suppliers -> collect responses -> score bids -> award -> generate PO draft.

3-way match flow:
- Receive invoice -> run match engine against PO and receipt/work evidence -> classify result -> route exceptions -> approve or reject -> release payment.

Design constraints:
- Match engine rules are configuration-driven and versioned.
- Each match run is immutable and reproducible.
- Exception approvals require explicit reason codes.

## 8. API Design Standards
- REST JSON API with explicit versioning strategy.
- Strict schema validation for request and response contracts.
- Consistent error envelope with machine-readable codes.
- Cursor-based pagination for large lists.
- Idempotency keys on create operations that can be retried.

Procurement and AP endpoints to add:
- RFQ CRUD, invite suppliers, collect responses, compare bids, award decision.
- PO CRUD and lifecycle transitions.
- Receipt creation and evidence linking.
- Invoice ingestion and parsing.
- Match run execution and exception resolution.
- Payment release authorization and audit endpoints.

Security controls:
- Better Auth session cookies and server-managed session state.
- HttpOnly secure cookie handling for session transport.
- Rate limits per organization and per user.

## 9. AI Architecture and Safety
Use cases:
- Vision analysis for SiteSnap and insurance docs.
- Text generation for variance narratives, email drafts, executive summaries.

Pipeline:
- Input normalization -> prompt assembly -> provider routing -> model call -> schema validation -> confidence scoring -> store with provenance -> human review.

Safety and governance:
- Store provider, model, prompt template version, and model metadata with output.
- Reject non-conforming payloads.
- Mark low-confidence outputs.
- Never auto-execute financial or compliance decisions from AI outputs.

Provider strategy:
- Use a shared AI gateway so providers can be swapped without changing business logic.
- Prefer the provider with the best fit for the task, not a single vendor for everything.

## 10. Integration Architecture
External integrations:
- AI providers for model workloads through one shared gateway.
- Stripe for subscription and metered billing.
- Gmail and Outlook APIs for SmartMail.

Integration patterns:
- Adapter layer per vendor.
- Retries with backoff and circuit breaking.
- Structured error mapping to internal codes.
- Secret rotation and health check endpoints.

## 11. Observability and Operations
Telemetry:
- Distributed tracing for API and worker paths.
- Structured logs with request and correlation IDs.
- Metrics for latency, throughput, queue lag, failure rates, and integration SLAs.

Alerting:
- Error budget burn alerts.
- Queue depth and retry spike alerts.
- AI failure rate and cost anomaly alerts.
- Match exception backlog and unresolved aging alerts.
- Invoice-to-payment cycle time alerts.

Runbooks:
- Webhook replay.
- Job replay from dead-letter queue.
- OAuth token failure recovery.
- Partial outage mode for AI-dependent features.

## 12. Security and Compliance
Security controls:
- TLS for transport.
- Encryption at rest for secrets and OAuth tokens.
- OWASP-aligned secure coding practices.
- Malware scanning for uploads.
- Content-type and size validation.

Compliance-oriented controls:
- Comprehensive audit trail for create, update, delete, approval, and escalation actions.
- Data retention lifecycle and deletion workflows.
- Access review and role entitlement reports.

## 13. Performance and Scalability Targets
- CRUD API p95 under 200ms for core endpoints.
- AI-backed endpoint p95 under 2s initiation and async completion targets.
- Dashboard first render under 1.5s with cached aggregates.
- Snap analysis under 10s for single image and under 30s for batch.
- Match engine run under 2s for standard invoice sizes and under 5s for large invoices.

Scale tactics:
- Read-optimized aggregation tables or materialized views.
- Queue-based async heavy operations.
- Targeted caching and invalidation.
- Horizontal worker scaling by queue type.
- Index strategy on invoice, PO, receipt, and cost code join paths.

## 14. Deployment Topology
Environments:
- Local, dev, staging, production.

Topology:
- Frontend hosting on edge platform.
- API service on container platform.
- Dedicated worker service for jobs.
- Managed PostgreSQL and Redis.
- Managed object storage.

Operational controls:
- Zero-downtime deploy strategy.
- Backward-compatible migrations.
- Feature flags for controlled rollouts.

## 15. Disaster Recovery and Business Continuity
- Automated database backups with tested restore process.
- Object store lifecycle and replication policy.
- Recovery point and recovery time objectives defined per tier.
- Incident response workflow and communication templates.

## 16. Architecture Decision Log (Initial)
- Use shared-schema multitenancy first for speed and cost efficiency.
- Use async workers for all external dependency-heavy tasks.
- Keep AI in assistive mode with human approval gates.
- Prioritize auditable workflows over automation depth in early releases.
