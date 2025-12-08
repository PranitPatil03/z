# Foreman Backend Implementation Status

**Last Updated:** April 7, 2026

---

## 📋 Summary

The Foreman backend is a comprehensive Express API built with TypeScript, featuring multiple domain modules for construction project management. The architecture includes database (Drizzle ORM/PostgreSQL), authentication (Better Auth), job processing (BullMQ), and AI capabilities.

### Module Progress Snapshot (Current Session)

| Module | Scope | Progress | Notes |
|---|---|---:|---|
| Module 1 | SiteSnap AI + storage/persistence + hazard automation | 100% | Completed earlier in this implementation cycle; AI queue path and persistence are in place. |
| Module 2 | Change order workflow, staged approvals, SLA hooks, attachments/finalization | 100% | Completed earlier in this implementation cycle; staged approval and lifecycle hooks are implemented. |
| Module 3 | Budget cost control (threshold policy, ledger entries, drilldown, narratives, dedupe) | 100% | Added project-level threshold settings, source-linked budget entries, drilldown/reconciliation enrichment, queue + worker narrative persistence, and deployable DB migration. |
| Module 4 | SubConnect (invite lifecycle, templates/automation, prequalification, pay apps, daily logs, AI extraction) | 100% | Completed: tokenized invites + acceptance, project-code policy registration + reset, compliance templates + auto-apply, compliance lifecycle automation + reminders/escalations, prequalification scoring model, pay application submit/review timeline, daily logs submit/review timeline, and insurance AI extraction with reviewer confirmation gates. |
| Module 5 | SmartMail production workflows (OAuth lifecycle, sync/send, deterministic linking, templates, scheduler auto-sync) | 100% | Completed in this cycle with provider helpers, OAuth hardening, API/worker integration, DB migration, and focused SmartMail test coverage. |
| Module 6 | Command Center analytics expansion (project health scoring + portfolio risk view) | 20% | Kickoff completed: new `/command-center/health` and `/command-center/portfolio` endpoints, scoring helpers, and unit/schema tests. |

Overall backend module progress: **Modules 1-5 complete, Module 6 in progress**

---

## ✅ Fully Implemented Features

### 1. **Change Order Management** 
**Status: COMPLETE**

**Location:** 
- Service: [apps/api/src/services/change-order.ts](apps/api/src/services/change-order.ts)
- Controller: [apps/api/src/controllers/change-order.ts](apps/api/src/controllers/change-order.ts)
- Routes: [apps/api/src/routes/change-orders.ts](apps/api/src/routes/change-orders.ts)
- Schema: [apps/api/src/schemas/change-order.schema.ts](apps/api/src/schemas/change-order.schema.ts)
- Database: [packages/db/src/schema.ts](packages/db/src/schema.ts) (lines ~740)

**Implemented:**
- ✅ Create change order (draft state)
- ✅ List change orders for project
- ✅ Get specific change order
- ✅ Update change order (status, cost/day impact, metadata)
- ✅ Submit for approval (status → `submitted`)
- ✅ Approve/Reject decision workflow
- ✅ Status pipeline: `draft` → `submitted` → `under_review` → `approved/rejected/revision_requested` → `closed`
- ✅ Database schema with full tracking (createdBy, decidedBy, timestamps, metadata)

**API Endpoints:**
```
GET    /change-orders?projectId=...
POST   /change-orders
GET    /change-orders/:changeOrderId
PATCH  /change-orders/:changeOrderId
POST   /change-orders/:changeOrderId/submit
POST   /change-orders/:changeOrderId/decision  { status, decision }
```

---

### 2. **Budget Narrative & Variance Alerts**
**Status: COMPLETE**

**Location:**
- Service: [apps/api/src/services/budget-narrative.ts](apps/api/src/services/budget-narrative.ts)
- Service: [apps/api/src/services/budget.ts](apps/api/src/services/budget.ts)
- Controller: [apps/api/src/controllers/budget.ts](apps/api/src/controllers/budget.ts)
- Routes: [apps/api/src/routes/budgets.ts](apps/api/src/routes/budgets.ts)
- Database schemas: [packages/db/src/schema.ts](packages/db/src/schema.ts) (budgetCostCodes ~860, budgetAlerts ~890)

**Implemented:**
- ✅ Cost code management (CRUD)
- ✅ Budget vs Actual tracking (budgetCents, actualCents, committedCents, billedCents)
- ✅ AI-powered narrative generation for variances
- ✅ Budget alert creation with severity levels (medium, high, critical)
- ✅ Queue narrative generation via worker jobs (BullMQ)
- ✅ Variance calculation & threshold-based alerts
- ✅ Budget reconciliation endpoint
- ✅ Budget variance endpoint
- ✅ Alert deduplication (within time window)

**Recent Fixes (from session memory):**
- Fixed type handling for Better Auth responses
- Integration with AI provider (GPT-4 Mini primary)

**API Endpoints:**
```
GET    /budgets/cost-codes?projectId=...
POST   /budgets/cost-codes
PATCH  /budgets/cost-codes/:costCodeId
GET    /budgets/variance?projectId=...
GET    /budgets/reconciliation?projectId=...
POST   /budgets/narratives/queue          { projectId }
POST   /budgets/alerts/deduplicate        { projectId, maxAgeHours }
```

---

### 3. **Notification System**
**Status: COMPLETE - Core Infrastructure**

**Location:**
- Service: [apps/api/src/services/notification.ts](apps/api/src/services/notification.ts)
- Controller: [apps/api/src/controllers/notification.ts](apps/api/src/controllers/notification.ts)
- Routes: [apps/api/src/routes/notifications.ts](apps/api/src/routes/notifications.ts)
- Schema: [apps/api/src/schemas/notification.schema.ts](apps/api/src/schemas/notification.schema.ts)
- Database: [packages/db/src/schema.ts](packages/db/src/schema.ts) (lines ~810)

**Implemented:**
- ✅ Create notifications (title, body, type, metadata)
- ✅ List user's notifications
- ✅ Mark notification as read
- ✅ Delete notification
- ✅ Async notification delivery via BullMQ worker

**Database Schema:**
```sql
notifications: id, organizationId, userId, type, title, body, 
               metadata (JSON), readAt, createdAt
```

**API Endpoints:**
```
GET    /notifications/
POST   /notifications/                    { userId, type, title, body, metadata }
PATCH  /notifications/:notificationId/read
DELETE /notifications/:notificationId
```

**Worker Integration:**
- Queue: `notification-delivery`
- Email delivery placeholder (configured but not fully implemented)

---

### 4. **Command Center (Dashboard Overview)**
**Status: COMPLETE - Initial Version**

**Location:**
- Service: [apps/api/src/services/command-center.ts](apps/api/src/services/command-center.ts)
- Controller: [apps/api/src/controllers/command-center.ts](apps/api/src/controllers/command-center.ts)
- Routes: [apps/api/src/routes/command-center.ts](apps/api/src/routes/command-center.ts)
- Schema: [apps/api/src/schemas/command-center.schema.ts](apps/api/src/schemas/command-center.schema.ts)

**Implemented:**
- ✅ Project overview aggregation
- ✅ Change order summary by status counts
- ✅ High-risk budget alerts (severity: high/critical)
- ✅ Site snap status breakdown
- ✅ Successful match run counts
- ✅ Invoice/receipt/PO integration

**Current Metrics:**
```
summary: {
  changeOrders, budgetAlerts, highRiskBudgetAlerts,
  siteSnaps, reviewedSiteSnaps,
  smartMailThreads, invoices, matchRuns, completedMatchRuns
}
breakdown: {
  changeOrderByStatus: { draft: N, submitted: N, approved: N, ... }
}
```

**API Endpoint:**
```
GET /command-center/overview?projectId=...
```

**Coming Next:**
- More detailed drilling-down per module
- Trends/forecasting
- Real-time updates (WebSocket)

---

### 5. **Audit Logging**
**Status: COMPLETE - Full Implementation**

**Location:**
- Service: [apps/api/src/services/audit-log.ts](apps/api/src/services/audit-log.ts)
- Controller: [apps/api/src/controllers/audit-log.ts](apps/api/src/controllers/audit-log.ts)
- Routes: [apps/api/src/routes/audit-log.ts](apps/api/src/routes/audit-log.ts)
- Database: [packages/db/src/schema.ts](packages/db/src/schema.ts) (auditLogs ~310)

**Implemented:**
- ✅ Full audit trail per organization
- ✅ Entity-level tracking (entityType, entityId)
- ✅ Before/after data snapshots (JSON)
- ✅ Action enums: create, update, delete, approve, reject, invite, archive, login
- ✅ Filter by entity type and action
- ✅ Actor user ID tracking

**API Endpoints:**
```
GET  /audit-log/?entityType=...&action=...
POST /audit-log/
GET  /audit-log/:auditLogId
```

---

## 🟡 Partially Implemented / Infrastructure Ready

### 6. **Billing & Payment Processing**
**Status: SCAFFOLDED - Ready for Stripe Integration**

**Location:**
- Service: [apps/api/src/services/billing.ts](apps/api/src/services/billing.ts)
- Controller: [apps/api/src/controllers/billing.ts](apps/api/src/controllers/billing.ts)
- Routes: [apps/api/src/routes/billing.ts](apps/api/src/routes/billing.ts)
- Schema: [apps/api/src/schemas/billing.schema.ts](apps/api/src/schemas/billing.schema.ts)
- Database: [packages/db/src/schema.ts](packages/db/src/schema.ts) (billingRecords ~840)

**Implemented:**
- ✅ Billing record CRUD (draft, issued, paid, void statuses)
- ✅ Amount tracking in cents (amountCents)
- ✅ Due date & paid date tracking
- ✅ Reference field (invoice ID, PO link)
- ✅ Metadata support

**Configuration:**
- Stripe SDK installed: `stripe@^18.5.0` ✓
- Environment variables ready: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

**Still Needed:**
- ❌ Stripe webhook handler (`/billing/webhooks/stripe`)
- ❌ Payment intent creation
- ❌ Invoice generation
- ❌ Stripe webhook event types (charge.succeeded, charge.failed, invoice.paid)
- ❌ Payment status sync from Stripe
- ❌ Subscription management (if applicable)

**API Endpoints (Existing):**
```
GET    /billing/
POST   /billing/                           { projectId, reference, amountCents, ... }
GET    /billing/:billingRecordId
PATCH  /billing/:billingRecordId           { status, paidAt, ... }
DELETE /billing/:billingRecordId           (soft delete via deletedAt)
```

---

### 7. **Activity Feed / Event Log**
**Status: NOT FOUND - Can Use AuditLog**

The codebase does **not** have a dedicated activity/event feed table. However:
- **Audit Logs** provide full trail: [packages/db/src/schema.ts](packages/db/src/schema.ts)
- Can be used as activity feed with UI filters
- Recommendation: Add activity-specific table for user-facing feed if audit logs are too verbose

---

## ❌ Not Yet Started

### 8. **SubConnect Portal API**
**Status: NO CODE FOUND**

The SubConnect portal (subcontractor-facing) is **not implemented**. 

**Database Support Exists:**
- `subcontractors` table with status (active, inactive, blocked)
- `complianceItems` table for subcontractor compliance tracking
- `smartMailAccounts` for email integration

**Needed:**
- [ ] SubConnect auth flow (separate from main app)
- [ ] Subcontractor profile endpoints
- [ ] Portal routes & controllers
- [ ] Compliance document upload/tracking
- [ ] Payment/invoice viewing for subcontractors
- [ ] Communication hub (smartmail integration)
- [ ] Time tracking (if applicable)

---

## 🔧 Key Infrastructure & Libraries

### Database (Drizzle ORM)
- **Location:** [packages/db/src/schema.ts](packages/db/src/schema.ts)
- **Driver:** PostgreSQL (Neon)
- **Tables:** 25+ tables covering full domain
- **Status:** ✅ Complete schema, ready for migrations

### Authentication (Better Auth)
- **Provider:** Better Auth v1.5.6
- **Location:** [apps/api/src/auth/](apps/api/src/auth/)
- **Status:** ✅ Configured, fixed in recent session
- **Routes:** `/auth/*` with OAuth support

### Job Processing (BullMQ)
- **Provider:** BullMQ v5.58.0 + Redis
- **Queues:** 
  - `ai-task` - AI completions (narratives, analysis)
  - `notification-delivery` - Email/notification delivery
- **Worker:** [apps/worker/src/index.ts](apps/worker/src/index.ts)
- **Status:** ✅ Operational, error handling in place

### AI Integration
- **Package:** `@foreman/ai` (workspace)
- **Providers:** OpenAI, Anthropic, Gemini, Azure OpenAI
- **Status:** ✅ Connected to budget narrative generation

### Email
- **Provider:** Nodemailer v8.0.4
- **Status:** ⚙️ Configured in env, not wired to notifications yet

### Validation
- **Framework:** Zod
- **Location:** [apps/api/src/schemas/](apps/api/src/schemas/)
- **Status:** ✅ All schemas defined

### Error Handling
- **Location:** [apps/api/src/lib/errors.ts](apps/api/src/lib/errors.ts)
- **Status:** ✅ Custom error classes (BadRequest, NotFound, etc.)

---

## 📊 Database Schema Overview

**Core Tables:**
- `users`, `sessions`, `accounts` - Auth
- `organizations`, `members`, `invitations`, `teams` - Org structure
- `projects`, `departments`, `projectMembers` - Projects
- `auditLogs` - Audit trail

**Domain Tables:**
- `changeOrders` - Change order WIP/tracking
- `budgetCostCodes`, `budgetAlerts` - Budget management
- `rfqs`, `purchaseOrders` - Procurement
- `invoices`, `receipts` - AP/AR
- `matchRuns` - Three-way match (PO-Invoice-Receipt)
- `subcontractors`, `complianceItems` - Vendor/compliance
- `notifications` - Notification queue
- `billingRecords` - Payment tracking
- `siteSnaps`, `siteSnapImages`, `siteSnapObservations` - Photo-based progress
- `smartMailAccounts`, `smartMailThreads`, `smartMailMessages` - Email integration
- `integrations` - External system connectors

---

## 🗺️ API Routing Architecture

**Main Router:** [apps/api/src/app.ts](apps/api/src/app.ts)

All routes require authentication via `requireAuth` middleware.

```
GET  /                          # Health check
GET  /health
/auth/*                         # Authentication & OAuth
/organizations/*                # Org CRUD & management
/projects/*                     # Project CRUD
/change-orders/*                # Change order workflow
/budgets/*                       # Budget & cost codes
/rfqs/*                          # RFQ management
/purchase-orders/*              # PO management
/invoices/*                      # Invoice management
/receipts/*                      # Receipt tracking
/match-runs/*                    # Three-way match automation
/subcontractors/*               # Vendor management
/compliance/*                    # Compliance tracking
/site-snaps/*                    # Photo documentation
/smartmail/*                     # Email integration
/notifications/*                # Notification management
/audit-log/*                     # Audit trail
/billing/*                       # Billing records
/integrations/*                  # External integrations
/ai/*                            # AI endpoints
/command-center/*               # Dashboard
```

---

## 🚀 Next Steps (Priority Order)

### Phase 1: Enable Stripe (Payment Gateway)
1. Implement `POST /billing/webhooks/stripe` webhook handler
2. Create Stripe payment intent endpoints
3. Test webhook signature validation
4. Add payment status sync

### Phase 2: SubConnect Portal (Subcontractor Portal)
1. Create separate auth flow for subcontractors
2. Build subcontractor profile endpoints
3. Portal CRUD for compliance items
4. Subcontractor invoice/payment viewing
5. SmartMail integration for portal users

### Phase 3: Activity Feed (User-Facing)
1. Decide: Use audit logs + UI filters OR create dedicated activity table
2. Create activity feed query/filtering logic
3. Implement paginated feed endpoint

### Phase 4: Enhancement & Polish
1. Real-time updates (WebSocket for notifications)
2. Advanced Command Center views
3. Batch operations & bulk imports
4. Export (PDF/CSV) support
5. Advanced filtering & full-text search

---

## 🔍 File Structure Reference

**API:**
```
apps/api/src/
├── app.ts                      # Express app setup
├── index.ts                    # Server entry
├── database.ts                 # DB client
├── auth/                       # Better Auth config
├── config/env.ts               # Environment validation
├── controllers/                # Request handlers (26 files)
├── services/                   # Business logic (21 files)
├── routes/                     # Express routers (22 files)
├── schemas/                    # Zod validators (22 files)
├── lib/
│   ├── errors.ts               # Error classes
│   ├── queues.ts               # BullMQ integration
│   ├── validate.ts             # Middleware for validation
│   └── email.ts                # Email helper
├── middleware/
│   ├── error-handler.ts        # Global error handler
│   └── require-auth.ts         # Auth middleware
└── controllers/ & services/
```

**Database:**
```
packages/db/src/
├── schema.ts                   # 25+ table definitions
├── client.ts                   # Drizzle client export
└── index.ts                    # Re-exports
```

**Worker:**
```
apps/worker/src/
└── index.ts                    # BullMQ workers (AI, Notifications)
```

---

## ✨ Key Achievements

1. ✅ Full domain modeling (schema covers all major entities)
2. ✅ Consistent API design (CRUD patterns)
3. ✅ Comprehensive validation layer (Zod)
4. ✅ Async job processing (BullMQ)
5. ✅ AI integration ready
6. ✅ Audit trail for compliance
7. ✅ Change order workflow ✨ (NEW)
8. ✅ Budget variance detection & narratives ✨ (RECENT)
9. ✅ Command center overview ✨ (RECENT)

---

## 📝 Notes

- **Environment Configuration:** See `apps/api/.env.local` (template exists)
- **Type Safety:** Full TypeScript coverage
- **Build System:** Turborepo + pnpm workspaces
- **Code Quality:** Biome linting configured

---

**Generated:** 2026-04-06  
**Reviewed:** Latest code state via repository analysis
