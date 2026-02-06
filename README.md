# Anvil — AI-Powered Construction Operations Platform

A multi-tenant construction operations platform that unifies project execution, change orders, cost control, subcontractor workflows, compliance, and AI-driven field intelligence in one system. Built with **Next.js**, **Express**, **Better Auth**, **Drizzle ORM**, **Neon Postgres**, and **Stripe**.

---

## Who Is This For?

Construction teams run on fragmented systems — project managers track budgets in spreadsheets, field workers photograph site issues and email them around, subcontractors get chased over WhatsApp for compliance certificates, and change orders pile up as PDF attachments in inboxes. By the time a problem surfaces, it has already cascaded.

Anvil is built for the teams that feel this daily:

| Role | What Anvil solves for them |
|---|---|
| **Project Manager** | One place to track change orders, budget variance, and subcontractor status — no more spreadsheet juggling or chasing approvals over email |
| **Finance / Cost Controller** | Real-time committed vs. actual cost visibility with AI-generated variance narratives; threshold alerts fire before overruns become surprises |
| **Field Supervisor** | Upload site photos from a phone — SiteSnap AI flags safety issues, tracks progress, and generates inspection reports automatically |
| **Compliance Manager** | Subcontractor certificates, insurance, and licenses tracked in one place with automatic expiry alerts — no more manual spreadsheet audits |
| **Subcontractor** | A dedicated portal to submit pay applications, upload compliance docs, and respond to RFQs without needing a full platform account |
| **Executive / Owner** | Command Center gives a portfolio-level view of all projects, budgets, and risk signals in one dashboard |

### The Problem With How Construction Teams Work Today

- **Change orders live in email** — approvals happen in inboxes, nothing is tracked, disputes escalate at invoice time
- **Budget overruns are discovered late** — by the time variance shows up in a report, the money is already spent
- **Subcontractor compliance is a manual chase** — someone has to remember to ask for updated insurance every year
- **Site photos go nowhere** — thousands of daily field photos sit in phone camera rolls or group chats, unstructured and unsearchable
- **Project email is a black hole** — critical communications from subs, owners, and vendors are buried in personal inboxes

### How Anvil Fixes This

1. **Every change order has a lifecycle** — created, routed through configured approval stages, revised or rejected with a reason, and archived with a full audit trail. No more "I never approved that."
2. **Budget variance is visible in real time** — cost codes update as committed and actual costs come in. AI writes the narrative so finance doesn't have to explain the numbers from scratch.
3. **Compliance is automatic** — upload your compliance templates once per project; Anvil tracks expiry dates and alerts before certificates lapse.
4. **Site photos become intelligence** — SiteSnap AI reads your field photos and produces structured safety and progress reports. Field supervisors upload, managers read reports.
5. **Project email stays in context** — SmartMail syncs Gmail or Outlook and threads emails against the correct project and subcontractor, so nothing falls through the cracks.

---

## Features

- **Project Workspace** — Full project lifecycle management with activity feeds, health scoring, and operational visibility
- **Change Order Engine** — Multi-stage configurable approval routing with revision, rejection, escalation, and full auditability
- **Budget Variance Tracker** — Real-time cost tracking with threshold alerts, variance drilldown, and AI-generated narratives
- **SubConnect** — Internal and external subcontractor directory, onboarding, compliance tracking, pay applications, and a scoped subcontractor portal
- **Command Center** — Portfolio-level reporting, notification feed, and governance dashboards
- **Multi-Tenant Orgs** — Isolated workspaces with team invitations, role management, and project-scoped authorization
- **Stripe Billing** — Subscription lifecycle management with webhook-driven state tracking
- **OAuth + Email Auth** — Sign in with Google or email/password via Better Auth
- **SiteSnap AI** *(currently building)* — AI-powered field image intelligence that analyzes job site photos for safety flags, progress tracking, and structured reporting
- **SmartMail** *(currently building)* — Project-linked email intelligence that automatically syncs, categorizes, and surfaces relevant communications per project

---

## Features — Detailed

### Project Workspace

- Project CRUD, workspace setup, and team assignment
- Real-time **activity feed** for per-project operational visibility
- **Health score** endpoint with explainable project-level scoring factors

### Change Order Engine

- Change order creation with impact, reason, cost deltas, and file attachments
- **Configurable multi-stage approval routing** — define per-stage SLAs with `pm_review`, `finance_review`, and custom stages
- Revision, rejection, escalation, and deadline reminder flows
- Pipeline transitions with actor eligibility checks and a full audit trail per change

### Budget Variance Tracker

- Track **budget, committed, and actual costs** per project and cost code
- Variance calculations with configurable alert threshold (basis points)
- Reconciliation workflows and cost-code drilldown
- **AI-assisted narrative generation** for threshold breach events — automatically drafts human-readable variance explanations

### SubConnect — Subcontractor Operations

- **Internal directory** — subcontractor profiles, scopes, and contact management
- **Invitation and onboarding** flows with email notifications
- **Compliance templates** — track certificate expiry, insurance, and license documents per project
- **Pay application workflow** — submission, review, and approval pipeline
- **Daily log capture** — subcontractor-submitted field logs
- **External portal** — strict entity-scoped access for subcontractors to manage their own submissions without full platform access

### Command Center and Governance

- Portfolio-level **reporting endpoints** for cross-project views
- **Notification feed** with action-oriented event updates and read/unread tracking
- Billing and subscription lifecycle integration via Stripe webhooks
- Full **audit log** for critical business actions — who did what, when, and on which entity

### Authentication and Organizations

- **Email/password** authentication with session lifecycle management
- **Google OAuth** social sign-in via Better Auth
- Team **invitations** via email (Resend)
- Project-scoped **role authorization** checks enforced server-side
- Multi-tenant isolation — all data scoped by `organizationId`


### SiteSnap AI *(currently building)*

- Upload **field site photos** directly from mobile or desktop
- AI analyzes images for **safety hazards**, progress milestones, and site conditions
- Structured **inspection reports** generated per image batch
- Confidence-scored flags surfaced to project managers with supporting image evidence
- Integrated into the project workspace for per-project site intelligence history

### SmartMail *(currently building)*

- **OAuth-linked email sync** — connect Gmail or Outlook to pull project-relevant emails
- Automatic **classification and threading** of emails by project, subcontractor, and topic
- Surfaces **action items** and unresolved threads in the project activity feed
- Background sync via BullMQ workers with configurable lookback windows
- Keeps all project communication in context without leaving the platform

---

## Tech Stack

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express_5-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/Neon_Postgres-00E699?style=for-the-badge&logo=postgresql&logoColor=black)
![Drizzle](https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=for-the-badge&logoColor=black)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![BullMQ](https://img.shields.io/badge/BullMQ-EF4444?style=for-the-badge&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-635BFF?style=for-the-badge&logo=stripe&logoColor=white)
![AWS S3](https://img.shields.io/badge/AWS_S3-FF9900?style=for-the-badge&logo=amazons3&logoColor=white)
![Turborepo](https://img.shields.io/badge/Turborepo-EF4444?style=for-the-badge&logo=turborepo&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge&logo=zod&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)

### Frontend (`apps/web`)

| Technology | Purpose |
|---|---|
| **Next.js** | App Router, routing, rendering |
| **React** | UI library |
| **TypeScript** | Static typing and shared contracts |
| **Tailwind CSS** | Utility-first styling |
| **shadcn/ui** + **Radix UI** | Component library and accessible primitives |
| **TanStack Query** | Server state, caching, and data fetching |
| **Zustand** | Local client state management |
| **Zod** | Runtime schema validation |
| **Better Auth (client)** | Session management and OAuth flows |
| **Vitest** + **Testing Library** | Frontend unit and component testing |

### Backend API (`apps/api`)

| Technology | Purpose |
|---|---|
| **Node.js + Express 5** | REST API server and middleware pipeline |
| **Better Auth** | Authentication, sessions, and OAuth |
| **Drizzle ORM + Drizzle Kit** | Database access layer and migrations |
| **Neon serverless Postgres** | PostgreSQL database connectivity |
| **BullMQ** | Async job queue orchestration |
| **Redis / Upstash** | Queue backend and cache |
| **Stripe** | Billing and subscription operations |
| **AWS SDK S3** | File upload and presigned URL workflows |
| **Pino + pino-http** | Structured application and request logging |
| **Zod** | Request and domain validation |

### Worker (`apps/worker`)

| Technology | Purpose |
|---|---|
| **BullMQ** | Background job processing |
| **Redis** | Queue transport and coordination |
| **Drizzle ORM** | Data writes from worker jobs |
| **Nodemailer** | Email dispatch in async flows |
| **Pino** | Operational logging |

### Shared Packages

| Package | Purpose |
|---|---|
| `packages/db` | Drizzle schema, migrations, and shared DB exports |
| `packages/domain` | Shared business rules and domain contracts |
| `packages/types` | Shared TypeScript model types |
| `packages/ui` | Shared UI primitives and components |
| `packages/ai` | Shared AI abstractions (SiteSnap, SmartMail, budget narratives) |
| **Turborepo** | Task graph and monorepo build orchestration |
| **Biome** | Linting and formatting |

---

## Getting Started

### Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9
- A **PostgreSQL** database (Neon recommended)
- **Redis** instance (Upstash recommended for serverless)
- API keys for **Stripe**, **AWS S3**, and **Resend**

### 1. Clone and Install

```bash
git clone https://github.com/pranitpatil03/anvil.git
cd anvil
pnpm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Fill in the required values:

```env
# Database
DATABASE_URL="postgresql://user:password@host/db?sslmode=require"

# Auth
BETTER_AUTH_SECRET="your-32-char-plus-secret"
BETTER_AUTH_URL="http://localhost:3001"

# Google OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Storage
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="ap-south-1"
S3_BUCKET="your-bucket"

# Redis
REDIS_URL="rediss://..."

# Email
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="Anvil <no-reply@yourdomain.com>"

# Billing
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Frontend
NEXT_PUBLIC_API_BASE_URL="http://localhost:3001"
CORS_ORIGIN="http://localhost:5173"
WEB_APP_URL="http://localhost:5173"
```

### 3. Initialize the Database

```bash
pnpm db:migrate
pnpm db:seed:append
```

### 4. Run Development Servers

```bash
pnpm dev
```

| App | URL | Description |
|---|---|---|
| Web | [http://localhost:5173](http://localhost:5173) | Next.js dashboard |
| API | [http://localhost:3001](http://localhost:3001) | Express REST API |
| Worker | — | BullMQ background processor |

### 5. Build for Production

```bash
pnpm build
```

---

## Test Credentials

| Field | Value |
|---|---|
| Email | `olivia.reed@summitbuild.com` |
| Password | `Password123!` |

---

## Project Structure

### `apps/api` — Express REST API

```
apps/api/
└── src/
    ├── auth/                 # Better Auth setup, Google OAuth config
    ├── config/               # Env validation (Zod), app config
    ├── controllers/          # Request handlers — one file per domain
    │   ├── project.ts
    │   ├── change-order.ts
    │   ├── budget.ts
    │   ├── subcontractor.ts
    │   ├── site-snap.ts      # SiteSnap AI controller
    │   ├── smartmail.ts      # SmartMail controller
    │   ├── invoice.ts
    │   ├── rfq.ts
    │   ├── compliance.ts
    │   ├── notification.ts
    │   ├── organization.ts
    │   ├── billing.ts
    │   └── ...
    ├── routes/               # Express router definitions per domain
    ├── services/             # Business logic — called by controllers
    ├── middleware/           # Auth guards, rate limiting, error handler
    ├── schemas/              # Zod request/response schemas per domain
    ├── validators/           # Shared validation helpers
    ├── lib/
    │   ├── email.ts          # Resend email dispatch
    │   ├── s3.ts             # AWS S3 presign and upload
    │   ├── queues.ts         # BullMQ queue definitions
    │   ├── logger.ts         # Pino logger instance
    │   └── permissions.ts    # Role and project-scoped permission checks
    ├── database.ts           # Drizzle DB client (Neon)
    ├── app.ts                # Express app — CORS, middleware, route mounts
    └── index.ts              # Server entry point
```

---

### `apps/web` — Next.js Frontend

```
apps/web/
└── src/
    ├── app/
    │   ├── (auth)/                    # Public auth pages
    │   │   ├── login/                 # Email + Google sign-in
    │   │   ├── signup/
    │   │   └── forgot-password/
    │   ├── (console)/                 # Protected dashboard shell
    │   │   ├── layout.tsx             # App shell — sidebar, header, org gate
    │   │   ├── dashboard/             # Portfolio overview
    │   │   ├── projects/              # Project workspace and activity feed
    │   │   ├── change-orders/         # Change order pipeline
    │   │   ├── budgets/               # Budget variance tracker
    │   │   ├── subconnect/            # Subcontractor directory and portal
    │   │   ├── site-snaps/            # SiteSnap AI — field image analysis
    │   │   ├── smartmail/             # SmartMail — project email intelligence
    │   │   ├── invoices/
    │   │   ├── rfqs/
    │   │   ├── compliance/
    │   │   ├── notifications/
    │   │   └── billing/
    │   ├── (portal)/                  # External subcontractor portal
    │   │   └── portal/                # Scoped portal pages (login, overview, submissions)
    │   ├── providers/                 # React context — session, query, theme
    │   └── layouts/                   # Shared layout components
    ├── components/
    │   ├── auth/                      # Auth guards, org gate
    │   ├── navigation/                # Sidebar, top header, account menu
    │   ├── branding/                  # Logo and brand assets
    │   └── ui/                        # Shared UI primitives (shadcn/ui)
    ├── features/                      # Feature-scoped views and logic
    │   ├── projects/
    │   ├── change-orders/
    │   ├── budgets/
    │   ├── site-snaps/
    │   ├── smartmail/
    │   └── ...
    ├── lib/
    │   ├── auth-client.ts             # Better Auth React client
    │   ├── api/                       # Typed API modules per domain
    │   │   ├── http-client.ts         # Base fetch wrapper with auth + 401 handling
    │   │   ├── modules/               # Per-domain API functions
    │   │   └── query-keys.ts          # TanStack Query key factory
    │   ├── auth/                      # Route guards, session helpers
    │   ├── env.ts                     # Validated env variables
    │   └── observability/             # Frontend error diagnostics
    ├── store/
    │   └── session-store.ts           # Zustand — active org, auth mode, portal token
    └── proxy.ts                       # Next.js middleware — session checks, cross-origin
```

---

### `packages/db` — Shared Database Layer

```
packages/db/
└── src/
    ├── schema.ts             # Drizzle table definitions — all domain models
    ├── client.ts             # Neon serverless Postgres + Drizzle client
    └── index.ts              # Barrel exports (schema, client, types)
```

> All Drizzle migrations live in `apps/api/` and are run via `pnpm db:migrate`.

---

### Monorepo Root

```
anvil/
├── apps/
│   ├── api/                  # Express REST API (port 3001)
│   ├── web/                  # Next.js frontend (port 5173)
│   └── worker/               # BullMQ background processor
│       └── src/
│           ├── site-snap-analysis.ts      # SiteSnap AI job processor
│           ├── budget-narrative-analysis.ts
│           ├── insurance-extraction-analysis.ts
│           ├── email.ts                   # Async email dispatch jobs
│           ├── scheduler.ts               # Recurring job schedules
│           └── runtime.ts                 # Worker boot and queue registration
├── packages/
│   ├── db/                   # Drizzle schema, client, shared DB exports
│   ├── types/                # Shared TypeScript model types
│   ├── ui/                   # Shared shadcn/ui component library
│   ├── ai/                   # Shared AI abstractions (SiteSnap, SmartMail, narratives)
│   ├── eslint-config/        # Shared ESLint configurations
│   └── typescript-config/    # Shared TypeScript configs
├── docs/                     # Architecture and implementation docs
├── turbo.json                # Turborepo task graph
└── pnpm-workspace.yaml       # pnpm workspace config
```
