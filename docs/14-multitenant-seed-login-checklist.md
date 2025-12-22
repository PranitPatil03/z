# Multi-Tenant Seed Login And Verification Guide

This guide lists exactly what is seeded and how to verify it from UI and API while developing frontend features.

## Purpose

Use this as the single checklist to:
- log in with seeded users,
- switch between organizations,
- validate role/permission behavior,
- verify realistic module data in UI.

## Seed Commands

Run from repository root:

```bash
pnpm db:migrate
pnpm db:seed:append
```

Reset mode (destructive):

```bash
ALLOW_REMOTE_SEED_RESET=true pnpm db:seed
```

Notes:
- Non-local reset is blocked unless `ALLOW_REMOTE_SEED_RESET=true`.
- Append mode is idempotent and skips baseline replay once seeded.

## Seeded Login Credentials

Default password for all seeded users:
- `Password123!`

### Tenant 1: Summit Build Group
- Olivia Reed (Owner): `olivia.reed@summitbuild.com`
- Marcus Lee (Admin): `marcus.lee@summitbuild.com`
- Dana Patel (PM): `dana.patel@summitbuild.com`
- Kevin Ross (PM): `kevin.ross@summitbuild.com`
- Juan Ramirez (Field Supervisor): `juan.ramirez@summitbuild.com`
- Lena Wong (Field Supervisor): `lena.wong@summitbuild.com`
- Nina Cho (Finance): `nina.cho@summitbuild.com`
- Aaron Price (Safety): `aaron.price@summitbuild.com`
- Rachel Kim (Procurement): `rachel.kim@summitbuild.com`

### Tenant 2: Northline Infrastructure
- Ethan Murphy (Owner): `ethan.murphy@northlineinfra.com`
- Maria Garcia (Admin): `maria.garcia@northlineinfra.com`
- Isaac Wilson (PM): `isaac.wilson@northlineinfra.com`

### Cross-Tenant User
- Avery Stone (Exec in both orgs): `ceo@globalbuilders.example`

## Seeded Organizations

- `org_summit_build` -> Summit Build Group
- `org_northline_infra` -> Northline Infrastructure

## Seeded Projects

### Summit Build Group
- `proj_summit_harbor_tower` -> Harbor Medical Tower Expansion (`HMT-2026`)
- `proj_summit_data_center` -> Eastside Data Center Phase II (`EDC-P2`)
- `proj_summit_school_retrofit` -> Riverview School Retrofit (`RVS-RETRO`)

### Northline Infrastructure
- `proj_northline_transit_hub` -> Riverfront Transit Hub (`RTH-01`)

## Role And Permission Model In Use

The backend supports both:
- Better Auth organization roles: `owner`, `admin`, `member`
- Project roles: `pm`, `field_supervisor`, `viewer`
- Custom access roles via access-control tables:
  - `finance_manager` (org scope)
  - `safety_lead` (org scope)
  - `procurement_specialist` (project scope)
  - `qa_qc_manager` (project scope)

Permission APIs are available under `/permissions` (catalog, bootstrap, roles, assignments, effective checks).

## Real-World Seed Data Coverage

The seed includes realistic records for:
- Organization/member/team/invitation data
- Project members and department assignments
- RFQ, PO, Invoice, Receipt, Match Run workflows
- Subcontractors, compliance templates/items, prequalification
- Pay applications and status events
- Daily logs and Site Snap observations
- Change orders and budget tracking
- SmartMail accounts, threads, messages, templates, sync runs
- Integrations and billing records
- Organization subscriptions and usage events
- Audit logs and notifications

## Quick Verification Checklist (UI)

1. Login as Summit owner (`olivia.reed@summitbuild.com`) and verify you can access all modules.
2. Switch active org to Summit and verify 3 Summit projects appear.
3. Login as Northline PM (`isaac.wilson@northlineinfra.com`) and verify only Northline project context appears.
4. Login as procurement user (`rachel.kim@summitbuild.com`) and confirm procurement-heavy screens have data.
5. Login as finance user (`nina.cho@summitbuild.com`) and validate billing/invoice/budget sections.
6. Login as safety user (`aaron.price@summitbuild.com`) and validate compliance + field risk flows.
7. Confirm invitations, teams, and member-role pages show seeded records.
8. Confirm no cross-tenant leakage while switching users/orgs.

## Quick Verification Checklist (API)

1. Create org as a fresh user:
   - `POST /organizations`
2. Set active organization:
   - `POST /organizations/active`
3. Create project:
   - `POST /projects`
4. Invite member to org:
   - `POST /organizations/:organizationId/invitations`
5. Add/update project member role:
   - `POST /projects/:projectId/members`
   - `PATCH /projects/:projectId/members/:userId`
6. Bootstrap and verify permissions:
   - `POST /permissions/bootstrap`
   - `GET /permissions/effective`

## Authorization Gates To Validate

- Organization/team/member/invitation routes use permission-based checks.
- Project and project-member routes use permission-based checks.
- Organization delete remains owner-only.

Use this matrix for backend checks:
- Owner -> full access
- Admin -> full operational access except owner-only delete
- PM/Field/Viewer -> scoped project behavior
- Custom roles -> explicit permission grants

## If You See Missing Data

1. Run `pnpm db:migrate`
2. Run `pnpm db:seed:append`
3. If doing full reset in remote DB, run with explicit flag:
   - `ALLOW_REMOTE_SEED_RESET=true pnpm db:seed`
