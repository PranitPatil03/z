# Foreman Implementation Blueprint (Modern 2026 Stack)

## 1. Recommended Technology Stack

### 1.1 Frontend
- React 18 with TypeScript.
- Vite with React Router.
- TanStack Query for server state.
- Zustand for local UI orchestration.
- Tailwind CSS with a maintained component system.
- Form handling with React Hook Form + Zod validation.

UI direction for a simple, clean, modern experience:
- Neutral-first design tokens with strong contrast and minimal color accents.
- Consistent spacing scale, typography ramp, and component density by role.
- Reusable page patterns: list-detail, wizard, approval queue, analytics board.
- High-quality empty states, skeleton loaders, and recoverable error states.
- Keyboard-accessible controls and WCAG AA compliance baseline.

### 1.2 Backend
- Node.js 22 LTS.
- TypeScript end-to-end.
- Express with strict validation middleware.
- Better Auth for authentication, sessions, organizations, invitations, and social login.
- Drizzle ORM with PostgreSQL.
- OpenAPI contract generation from source schemas.

Production hardening baseline:
- Strict runtime validation on all inputs and integration payloads.
- Centralized error taxonomy with machine-readable codes.
- Idempotency for webhooks and financial mutation endpoints.
- Background job reliability with retries, DLQ, and replay tooling.
- Read/write path observability with correlation IDs.

### 1.3 Data and Infrastructure
- PostgreSQL (Neon or equivalent managed serverless offering).
- Redis (queue + cache + distributed locks).
- S3-compatible object storage (Cloudflare R2 or AWS S3).
- Message and job processing via BullMQ or Temporal (Temporal for advanced long-running workflows).

### 1.4 AI and Integrations
- Multi-LLM support through a provider abstraction layer.
- OpenAI, Anthropic, Google Gemini, and Azure OpenAI as supported providers.
- Use the best provider per task while keeping a single internal interface.
- Stripe Billing for subscription and metered usage.
- Gmail API and Microsoft Graph API for SmartMail.

### 1.5 DevOps and Quality
- pnpm workspace for package management.
- Turborepo for monorepo orchestration.
- Biome or ESLint + Prettier for lint and formatting.
- Vitest for unit tests.
- Playwright for end-to-end and critical journey tests.
- GitHub Actions for CI/CD pipelines.
- OpenTelemetry + Sentry + centralized logs for observability.

## 2. Suggested Monorepo Structure

/apps
- web: frontend app.
- api: backend API service.
- worker: async job processors.

/packages
- ui: shared UI components and tokens.
- ai: shared model adapters, prompt registry, and provider routing.
- types: shared TypeScript contracts.
- config: lint, tsconfig, tooling presets.
- sdk: typed API client.
- domain: reusable business rules and policy checks.

/infra
- terraform or bicep definitions.
- environment templates.
- runbooks and deployment scripts.

/docs
- product and architecture docs.

Use the exact folder layout in [00-repo-layout.md](00-repo-layout.md).

## 3. Delivery Phases with Exit Criteria

### Phase A: Foundation
Build:
- Auth, tenancy, RBAC, projects, core UI shell.

Exit criteria:
- All project reads and writes tenant-isolated.
- Permission matrix enforced server-side.
- Baseline observability available.

### Phase B: Hero Workflows
Build:
- SiteSnap AI and Change Order Engine.

Exit criteria:
- Photo-to-observation flow stable under retry conditions.
- Change order pipeline transition tests pass.
- Audit logs complete for every state transition.

### Phase C: Financial and Subcontractor Ops
Build:
- Budget variance, thresholds, SubConnect portal, compliance extraction.
- 3-way matching engine for PO, receipt, and invoice.
- Supplier directory and RFQ workflow if needed for launch scope.

Exit criteria:
- Variance calculations validated against test fixtures.
- External portal isolation tests pass.
- Compliance lifecycle reminders and status transitions working.
- Invoice exceptions are routed, resolved, and auditable before payment release.

### Phase D: Integrations, Monetization, Analytics
Build:
- SmartMail, Stripe billing, Command Center, PDF reporting.
- RFQ automation for supplier bidding and award flow.

Exit criteria:
- Stripe webhook idempotency validated.
- OAuth reconnect and token refresh reliability proven.
- Analytics numbers match source-of-truth queries.
- RFQ-to-award conversion works with comparison matrix and audit trail.

### Phase E: Launch Hardening and Scale Preparation
Build:
- Performance optimization, UX polish pass, SLO burn-in, and security hardening.

Exit criteria:
- p95 latency and error-rate SLOs are stable for two consecutive release cycles.
- Runbooks validated in staged incident drills.
- Security review completed with tracked remediation closure.

## 4. Engineering Standards
- No implicit any in production TypeScript.
- Schema-first API contracts with runtime validation.
- Feature flags for risky or staged rollout features.
- Idempotency for webhook and async mutation paths.
- Security checks in CI (dependency audit, secret scanning, SAST).
- No direct database access from route handlers; use domain services.
- Every financial status transition requires policy checks and audit event emission.

## 4.1 Frontend Build Standards (UI Polish)
- Design tokens in a dedicated package (colors, type, spacing, radius, motion).
- Component acceptance checklist: accessibility, loading, empty, error, success states.
- Avoid visual drift with story-driven component previews and visual regression tests.
- Keep pages task-focused with progressive disclosure for advanced controls.
- Prefer a restrained visual style: white or near-white surfaces, one strong accent color, clear tables, and simple filters.

## 4.2 Backend Build Standards (Production Readiness)
- Route layer only validates and delegates; business logic lives in services.
- Repository layer enforces tenant scoping and query safety.
- Async jobs are idempotent and safe to retry.
- Integration adapters implement timeout, retry, and circuit-breaker patterns.
- Migrations are backward compatible and include rollback strategy.
- All write endpoints return deterministic success states and clear error codes.
- All long-running tasks must expose status and retry visibility.
- Authentication should use Better Auth flows rather than custom session logic.
- AI calls should go through a provider abstraction, not directly from route handlers.

## 5. Testing Strategy

### Unit Tests
- Domain calculations.
- Policy and permission guards.
- State machine transitions.

### Integration Tests
- API + DB for each critical workflow.
- Queue job processing with retries and dead-letter paths.
- External adapter behavior with mocked providers.
- RFQ response and award transitions.
- 3-way matching outcomes and exception workflows.

### End-to-End Tests
- Auth and onboarding.
- SiteSnap review journey.
- Change-order approve or reject journey.
- Subcontractor portal compliance upload journey.
- Billing upgrade and downgrade journey.
- Invoice ingestion to payment release with match and exception handling.

### Non-Functional Tests
- Load tests for core API and dashboard queries.
- Chaos tests for integration outages.
- Security tests for authorization bypass attempts.

## 6. Security Baseline Checklist
- Secure cookie and token rotation strategy.
- Encryption for secrets and OAuth tokens.
- Upload scanning and type validation.
- RBAC and tenant checks on every mutation path.
- Audit logging for privileged actions.
- Incident response runbook and on-call ownership.

## 7. Observability Checklist
- Request correlation IDs across frontend, API, worker, and integrations.
- Dashboard for API p95, queue lag, worker failures, and AI error rates.
- Cost monitoring for AI usage by organization and use case.
- Alert routing by severity and ownership.
- Business metrics: RFQ cycle time, approval SLA breaches, match exception aging.

## 8. Data Governance and Retention
- Define retention policy per artifact class.
- Implement legal hold support for critical records.
- Provide export capability during cancellation grace periods.
- Ensure irreversible deletion workflow after retention window.

## 9. API and Workflow Governance
- Maintain OpenAPI spec and changelog per release.
- Use migration scripts with backward compatibility checks.
- Introduce contract tests to prevent accidental breaking changes.
- Version workflow rules and threshold configs for traceability.

## 10. LLM-Readable Design Conventions
Use these conventions in implementation docs and code comments so AI agents can reason accurately:
- Keep one responsibility per module file.
- Prefer explicit names for policy and guard functions.
- Add short, structured doc headers for complex workflows.
- Include state diagrams in markdown for lifecycle-heavy entities.
- Store prompt templates in versioned files, not inline strings.

## 11. Immediate Next Build Tasks
1. Scaffold monorepo and baseline tooling.
2. Implement auth, tenancy middleware, and RBAC policy engine.
3. Build project shell UI and project context provider.
4. Deliver SiteSnap upload plus async AI job pipeline.
5. Deliver change order state machine with transition APIs.
6. Add audit log service and event schema.
7. Add CI gates for lint, tests, typecheck, and security scan.
8. Implement PO/invoice 3-way matching service with exception queue.
9. Implement RFQ automation from invite through award conversion.
10. Run launch hardening sprint for performance and UX polish.

## 12. Risks and Mitigations
- Risk: scope overload in early cycles.
  - Mitigation: enforce phase exit criteria and feature flag unfinished modules.
- Risk: AI malformed outputs.
  - Mitigation: strict schema validation and human review gate.
- Risk: webhook duplication and ordering issues.
  - Mitigation: idempotency keys and event version checks.
- Risk: cross-tenant data leak.
  - Mitigation: global tenant guards and automated security tests.

## 13. Definition of Platform Readiness
The platform is ready for controlled production rollout when:
- Critical workflows pass end-to-end tests.
- Security baseline checks pass in CI and staging.
- SLO dashboards are active with alert coverage.
- Billing and entitlement flows are verified.
- Runbooks exist for top operational failure scenarios.
