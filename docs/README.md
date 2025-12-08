# Foreman Documentation Hub

This folder contains implementation-ready documentation for the Foreman construction operations platform.

## Who This Is For
- Product owners and founders
- Solution architects and engineering leads
- Full-stack developers
- QA, DevOps, and security teams
- LLM agents that need complete context

## Document Map
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
1. Read [08-backend-frontend-build-handbook.md](08-backend-frontend-build-handbook.md) for the current execution flow across backend and frontend teams.
2. Read [09-api-integration-reference.md](09-api-integration-reference.md) for the current route and contract integration map.
3. Read feature set to understand what to build.
4. Read architecture design to understand how to build it safely.
5. Read implementation blueprint to understand the exact tools and delivery path.
