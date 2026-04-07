# Foreman Documentation Hub

This folder contains implementation-ready documentation for the Foreman construction operations platform.

## Who This Is For
- Product owners and founders
- Solution architects and engineering leads
- Full-stack developers
- QA, DevOps, and security teams
- LLM agents that need complete context

## Document Map
- [10-frontend-readiness-review.md](10-frontend-readiness-review.md): Current frontend readiness decision, evidence snapshot, and start gate.
- [11-frontend-execution-plan.md](11-frontend-execution-plan.md): Detailed phase-by-phase frontend implementation plan (what and how).
- [12-frontend-reference-intake-checklist.md](12-frontend-reference-intake-checklist.md): Required reference inputs to lock scope and avoid rework before coding.
- [13-frontend-module-wise-plan-and-progress.md](13-frontend-module-wise-plan-and-progress.md): Detailed module-by-module frontend plan with markdown progress checklists.
- [08-backend-frontend-build-handbook.md](08-backend-frontend-build-handbook.md): Complete execution handbook for backend implementation and frontend integration on the current backend.
- [09-api-integration-reference.md](09-api-integration-reference.md): Current API route-group reference, auth modes, response/error patterns, and integration sequences.
- [05-auth-and-ai-stack.md](05-auth-and-ai-stack.md): Better Auth setup, session model, and multi-LLM provider strategy.
- [04-backend-setup.md](04-backend-setup.md): Backend stack, folder-by-folder responsibilities, API layers, jobs, and deployment path.
- [00-repo-layout.md](00-repo-layout.md): Exact folder structure for the codebase and how the frontend, backend, workers, and docs are organized.
- [01-feature-set.md](01-feature-set.md): Complete functional feature catalog and requirements by module.
- [02-architecture-design.md](02-architecture-design.md): End-to-end architecture design, data model strategy, security, integrations, and non-functional targets.
- [03-implementation-blueprint.md](03-implementation-blueprint.md): Recommended modern stack, repo structure, delivery plan, quality gates, and operating model.

Recent additions:
- Supplier discovery and RFQ automation feature scope.
- PO/invoice 3-way matching workflow and controls.
- Frontend UI polish standards for a clean, modern experience.
- Backend production hardening checklist and launch phase guidance.
- Backend kickoff plan with Railway-first and AWS-later deployment approach.
- Better Auth for complete authentication.
- Provider-agnostic multi-LLM support.
- Live backend contract docs: `/openapi.json` and `/docs`.

## Product Definition (One-Page)
Foreman is a multi-tenant SaaS platform for construction general contractors. It combines field documentation, change-order workflows, cost controls, subcontractor operations, project communications, and executive analytics.

Core principle: AI assists and automation accelerates, but humans approve decisions that affect cost, safety, liability, and client commitments.

## Build Priority
1. Platform foundation: auth, tenancy, RBAC, projects.
2. Core financial workflows: RFQ, PO, invoice matching, approvals.
3. Hero workflows: SiteSnap AI and Change Order Engine.
4. SubConnect, SmartMail, Billing, Command Center.

## Deployment Path
- Local development: run backend with local or containerized Postgres and Redis.
- Early deployment: Railway for API and worker services.
- Production scale: AWS for the long-term infrastructure layer.

## Traceability Rules
- Every business action must produce an audit event.
- Every AI-generated output must remain editable and reviewable.
- Every entity must be tenant-scoped and permission-checked server-side.

## Reading Order
1. Read [10-frontend-readiness-review.md](10-frontend-readiness-review.md) for the go/no-go frontend status and start gate.
2. Read [11-frontend-execution-plan.md](11-frontend-execution-plan.md) for the detailed implementation plan.
3. Read [12-frontend-reference-intake-checklist.md](12-frontend-reference-intake-checklist.md) and provide references.
4. Read [13-frontend-module-wise-plan-and-progress.md](13-frontend-module-wise-plan-and-progress.md) for module-by-module execution and progress tracking.
5. Read [08-backend-frontend-build-handbook.md](08-backend-frontend-build-handbook.md) for cross-team implementation workflow.
6. Read [09-api-integration-reference.md](09-api-integration-reference.md) for route and contract integration details.
7. Read feature set to understand what to build.
8. Read architecture design to understand how to build it safely.
9. Read implementation blueprint to understand the exact tools and delivery path.
