# Repository Layout

This is the recommended folder structure for a production-ready Foreman codebase.

## Top-Level Structure
```text
/anvil
  /apps
    /web
    /api
    /worker
  /packages
    /ui
    /ai
    /types
    /config
    /sdk
    /domain
  /infra
    /deploy
    /database
    /scripts
  /docs
    00-repo-layout.md
    01-feature-set.md
    02-architecture-design.md
    03-implementation-blueprint.md
  /tests
    /e2e
    /integration
    /fixtures
```

## Folder Purpose

### /apps/web
Frontend app for internal users and subcontractor portal UI.

Recommended structure:
```text
/apps/web/src
  /app or /routes
  /components
  /features
  /layouts
  /hooks
  /lib
  /styles
  /assets
```

### /apps/api
Backend API for auth, tenants, workflows, billing, and integrations.

Recommended structure:
```text
/apps/api/src
  /routes
  /controllers
  /services
  /repositories
  /middleware
  /validators
  /jobs
  /integrations
  /domain
  /utils
```

### /apps/worker
Background job processors for AI, email sync, billing events, and scheduled tasks.

Recommended structure:
```text
/apps/worker/src
  /jobs
  /processors
  /queues
  /schedules
  /integrations
  /utils
```

### /packages/ui
Shared design system and reusable components.

### /packages/ai
Shared LLM provider adapters, prompt registry, model routing, and AI utility helpers.

### /packages/types
Shared TypeScript types, Zod schemas, and API contracts.

### /packages/config
Shared lint, TypeScript, testing, and formatting configs.

### /packages/sdk
Typed API client used by the frontend and portal.

### /packages/domain
Reusable business rules, policies, and calculation helpers.

### /infra
Deployment manifests, database migration support, and operational scripts.

### /docs
Product, architecture, and implementation documentation.

## Practical Rules
- Keep feature logic inside feature folders, not in shared global code.
- Keep business rules in domain/services, not in route handlers.
- Keep UI components small and reusable.
- Keep integration code isolated from core business logic.
- Keep tests close to the behavior they validate.

## Naming Rules
- Use singular names for domain entities: `invoice`, `purchase-order`, `rfq`.
- Use plural names for collection folders or lists: `routes`, `services`, `jobs`.
- Use consistent suffixes for clarity: `*.service.ts`, `*.route.ts`, `*.schema.ts`, `*.test.ts`.

## Minimal Production Rules
- Every critical path must have tests.
- Every API change must be versioned or backward compatible.
- Every database migration must be reversible or safely forward-only.
- Every async job must be idempotent.
- Every tenant-owned table must include `organization_id`.
