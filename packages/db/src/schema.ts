import { relations, sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable(
  "user",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    email: text("email").notNull(),
    emailVerified: timestamp("email_verified", { withTimezone: true }),
    name: text("name").notNull(),
    image: text("image"),
  },
  (table) => ({
    emailUnique: uniqueIndex("user_email_unique").on(table.email),
  }),
);

export const sessions = pgTable(
  "session",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    activeOrganizationId: text("active_organization_id"),
    activeTeamId: text("active_team_id"),
  },
  (table) => ({
    tokenUnique: uniqueIndex("session_token_unique").on(table.token),
    userIdIndex: index("session_user_id_idx").on(table.userId),
  }),
);

export const accounts = pgTable(
  "account",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    providerId: text("provider_id").notNull(),
    accountId: text("account_id").notNull(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
  },
  (table) => ({
    providerAccountUnique: uniqueIndex("account_provider_account_unique").on(table.providerId, table.accountId),
    userIdIndex: index("account_user_id_idx").on(table.userId),
  }),
);

export const verifications = pgTable(
  "verification",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    identifierValueUnique: uniqueIndex("verification_identifier_value_unique").on(table.identifier, table.value),
  }),
);

export const organizations = pgTable(
  "organization",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    logo: text("logo"),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    slugUnique: uniqueIndex("organization_slug_unique").on(table.slug),
  }),
);

export const members = pgTable(
  "member",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgUserUnique: uniqueIndex("member_org_user_unique").on(table.organizationId, table.userId),
    orgIndex: index("member_org_idx").on(table.organizationId),
  }),
);

export const invitations = pgTable(
  "invitation",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").notNull(),
    status: text("status").notNull().default("pending"),
    teamId: text("team_id"),
    inviterId: text("inviter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgEmailIndex: index("invitation_org_email_idx").on(table.organizationId, table.email),
  }),
);

export const teams = pgTable(
  "team",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    orgIndex: index("team_org_idx").on(table.organizationId),
  }),
);

export const teamMembers = pgTable(
  "team_member",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    teamId: text("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    teamUserUnique: uniqueIndex("team_member_team_user_unique").on(table.teamId, table.userId),
    teamIndex: index("team_member_team_idx").on(table.teamId),
  }),
);

export const projectStatusEnum = pgEnum("project_status", ["active", "archived", "completed"]);
export const auditActionEnum = pgEnum("audit_action", ["create", "update", "delete", "approve", "reject", "invite", "archive", "login"]);
export const rfqStatusEnum = pgEnum("rfq_status", ["draft", "sent", "closed", "canceled"]);
export const purchaseOrderStatusEnum = pgEnum("purchase_order_status", ["draft", "issued", "approved", "closed", "canceled"]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["draft", "submitted", "approved", "rejected", "paid", "hold"]);
export const receiptStatusEnum = pgEnum("receipt_status", ["received", "verified", "rejected"]);
export const matchRunResultEnum = pgEnum("match_run_result", ["matched", "partial_match", "over_bill", "under_receipt", "price_variance"]);
export const subcontractorStatusEnum = pgEnum("subcontractor_status", ["active", "inactive", "blocked"]);
export const complianceStatusEnum = pgEnum("compliance_status", ["pending", "compliant", "non_compliant", "expired"]);
export const billingStatusEnum = pgEnum("billing_status", ["draft", "issued", "paid", "void"]);
export const integrationStatusEnum = pgEnum("integration_status", ["connected", "disconnected", "error"]);
export const siteSnapStatusEnum = pgEnum("site_snap_status", ["captured", "analyzing", "reviewed"]);
export const siteSnapObservationCategoryEnum = pgEnum("site_snap_observation_category", [
  "work_progress",
  "safety_issue",
  "material_present",
  "site_condition",
  "equipment",
]);
export const changeOrderStatusEnum = pgEnum("change_order_status", [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "revision_requested",
  "closed",
]);
export const smartMailAccountStatusEnum = pgEnum("smartmail_account_status", ["connected", "disconnected", "error"]);

export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull(),
    name: text("name").notNull(),
    code: text("code").notNull(),
    description: text("description"),
    status: projectStatusEnum("status").notNull().default("active"),
    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    organizationCodeUnique: uniqueIndex("projects_organization_code_unique").on(table.organizationId, table.code),
    organizationStatusIndex: index("projects_organization_status_idx").on(table.organizationId, table.status),
  }),
);

export const departments = pgTable(
  "departments",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    projectSlugUnique: uniqueIndex("departments_project_slug_unique").on(table.projectId, table.slug),
  }),
);

export const projectMembers = pgTable(
  "project_members",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    userId: text("user_id").notNull(),
    role: text("role").notNull(),
    departmentIds: jsonb("department_ids").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    projectMemberUnique: uniqueIndex("project_members_project_user_unique").on(table.projectId, table.userId),
    projectRoleIndex: index("project_members_project_role_idx").on(table.projectId, table.role),
  }),
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull(),
    actorUserId: text("actor_user_id").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    action: auditActionEnum("action").notNull(),
    beforeData: jsonb("before_data").$type<Record<string, unknown> | null>().notNull().default(sql`'{}'::jsonb`),
    afterData: jsonb("after_data").$type<Record<string, unknown> | null>().notNull().default(sql`'{}'::jsonb`),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>().notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgEntityIndex: index("audit_logs_org_entity_idx").on(table.organizationId, table.entityType, table.entityId),
    orgActionIndex: index("audit_logs_org_action_idx").on(table.organizationId, table.action),
  }),
);

export const rfqs = pgTable(
  "rfqs",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    title: text("title").notNull(),
    scope: text("scope").notNull(),
    dueDate: timestamp("due_date", { withTimezone: true }),
    status: rfqStatusEnum("status").notNull().default("draft"),
    createdByUserId: text("created_by_user_id").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    orgProjectIndex: index("rfqs_org_project_idx").on(table.organizationId, table.projectId),
    statusIndex: index("rfqs_status_idx").on(table.organizationId, table.status),
  }),
);

export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    rfqId: text("rfq_id"),
    poNumber: text("po_number").notNull(),
    vendorName: text("vendor_name").notNull(),
    currency: text("currency").notNull().default("USD"),
    totalAmountCents: integer("total_amount_cents").notNull(),
    status: purchaseOrderStatusEnum("status").notNull().default("draft"),
    issueDate: timestamp("issue_date", { withTimezone: true }),
    createdByUserId: text("created_by_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    orgPoNumberUnique: uniqueIndex("purchase_orders_org_po_number_unique").on(table.organizationId, table.poNumber),
    orgProjectIndex: index("purchase_orders_org_project_idx").on(table.organizationId, table.projectId),
  }),
);

export const invoices = pgTable(
  "invoices",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    purchaseOrderId: text("purchase_order_id"),
    invoiceNumber: text("invoice_number").notNull(),
    vendorName: text("vendor_name").notNull(),
    currency: text("currency").notNull().default("USD"),
    totalAmountCents: integer("total_amount_cents").notNull(),
    status: invoiceStatusEnum("status").notNull().default("submitted"),
    dueDate: timestamp("due_date", { withTimezone: true }),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    orgInvoiceNumberUnique: uniqueIndex("invoices_org_invoice_number_unique").on(table.organizationId, table.invoiceNumber),
    orgProjectIndex: index("invoices_org_project_idx").on(table.organizationId, table.projectId),
  }),
);

export const receipts = pgTable(
  "receipts",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    purchaseOrderId: text("purchase_order_id"),
    receiptNumber: text("receipt_number").notNull(),
    receivedAmountCents: integer("received_amount_cents").notNull(),
    status: receiptStatusEnum("status").notNull().default("received"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    orgReceiptNumberUnique: uniqueIndex("receipts_org_receipt_number_unique").on(table.organizationId, table.receiptNumber),
    orgProjectIndex: index("receipts_org_project_idx").on(table.organizationId, table.projectId),
  }),
);

export const matchRuns = pgTable(
  "match_runs",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    invoiceId: text("invoice_id").notNull(),
    purchaseOrderId: text("purchase_order_id"),
    receiptId: text("receipt_id"),
    result: matchRunResultEnum("result").notNull(),
    toleranceBps: integer("tolerance_bps").notNull().default(0),
    varianceCents: integer("variance_cents").notNull().default(0),
    details: jsonb("details").$type<Record<string, unknown> | null>(),
    createdByUserId: text("created_by_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgProjectIndex: index("match_runs_org_project_idx").on(table.organizationId, table.projectId),
    invoiceIndex: index("match_runs_invoice_idx").on(table.invoiceId),
  }),
);

export const subcontractors = pgTable(
  "subcontractors",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id"),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    trade: text("trade").notNull(),
    status: subcontractorStatusEnum("status").notNull().default("active"),
    passwordHash: text("password_hash"),
    portalEnabled: boolean("portal_enabled").notNull().default(false),
    lastPortalLoginAt: timestamp("last_portal_login_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    orgNameUnique: uniqueIndex("subcontractors_org_name_unique").on(table.organizationId, table.name),
    orgProjectIndex: index("subcontractors_org_project_idx").on(table.organizationId, table.projectId),
  }),
);

export const complianceItems = pgTable(
  "compliance_items",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    subcontractorId: text("subcontractor_id"),
    complianceType: text("compliance_type").notNull(),
    status: complianceStatusEnum("status").notNull().default("pending"),
    dueDate: timestamp("due_date", { withTimezone: true }),
    notes: text("notes"),
    evidence: jsonb("evidence").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    orgProjectIndex: index("compliance_items_org_project_idx").on(table.organizationId, table.projectId),
    subcontractorIndex: index("compliance_items_subcontractor_idx").on(table.subcontractorId),
  }),
);

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull(),
    userId: text("user_id").notNull(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgUserCreatedIndex: index("notifications_org_user_created_idx").on(table.organizationId, table.userId, table.createdAt),
  }),
);

export const billingRecords = pgTable(
  "billing_records",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id"),
    reference: text("reference").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("USD"),
    status: billingStatusEnum("status").notNull().default("draft"),
    dueDate: timestamp("due_date", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    stripeCustomerId: text("stripe_customer_id"),
    subscriptionId: text("subscription_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    orgReferenceUnique: uniqueIndex("billing_records_org_reference_unique").on(table.organizationId, table.reference),
    orgProjectIndex: index("billing_records_org_project_idx").on(table.organizationId, table.projectId),
  }),
);

export const integrations = pgTable(
  "integrations",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull(),
    provider: text("provider").notNull(),
    name: text("name").notNull(),
    status: integrationStatusEnum("status").notNull().default("disconnected"),
    config: jsonb("config").$type<Record<string, unknown> | null>(),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgProviderNameUnique: uniqueIndex("integrations_org_provider_name_unique").on(table.organizationId, table.provider, table.name),
    orgProviderIndex: index("integrations_org_provider_idx").on(table.organizationId, table.provider),
  }),
);

export const siteSnaps = pgTable(
  "site_snaps",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    createdByUserId: text("created_by_user_id").notNull(),
    notes: text("notes").notNull(),
    locationZone: text("location_zone").notNull(),
    status: siteSnapStatusEnum("status").notNull().default("captured"),
    analysisState: text("analysis_state").notNull().default("idle"),
    analysisJobId: text("analysis_job_id"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgProjectIndex: index("site_snaps_org_project_idx").on(table.organizationId, table.projectId),
    orgStatusIndex: index("site_snaps_org_status_idx").on(table.organizationId, table.status),
  }),
);

export const siteSnapImages = pgTable(
  "site_snap_images",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    snapId: text("snap_id").notNull().references(() => siteSnaps.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    snapIndex: index("site_snap_images_snap_idx").on(table.snapId),
  }),
);

export const siteSnapObservations = pgTable(
  "site_snap_observations",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    snapId: text("snap_id").notNull().references(() => siteSnaps.id, { onDelete: "cascade" }),
    category: siteSnapObservationCategoryEnum("category").notNull(),
    confidenceBps: integer("confidence_bps").notNull().default(0),
    detail: text("detail").notNull(),
    source: text("source").notNull().default("ai"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    snapIndex: index("site_snap_observations_snap_idx").on(table.snapId),
    categoryIndex: index("site_snap_observations_category_idx").on(table.category),
  }),
);

export const changeOrders = pgTable(
  "change_orders",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    title: text("title").notNull(),
    reason: text("reason").notNull(),
    impactCostCents: integer("impact_cost_cents").notNull().default(0),
    impactDays: integer("impact_days").notNull().default(0),
    status: changeOrderStatusEnum("status").notNull().default("draft"),
    pipelineStage: text("pipeline_stage").notNull().default("draft"),
    deadlineAt: timestamp("deadline_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdByUserId: text("created_by_user_id").notNull(),
    decidedByUserId: text("decided_by_user_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgProjectIndex: index("change_orders_org_project_idx").on(table.organizationId, table.projectId),
    orgStatusIndex: index("change_orders_org_status_idx").on(table.organizationId, table.status),
  }),
);

export const budgetCostCodes = pgTable(
  "budget_cost_codes",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    budgetCents: integer("budget_cents").notNull().default(0),
    committedCents: integer("committed_cents").notNull().default(0),
    actualCents: integer("actual_cents").notNull().default(0),
    billedCents: integer("billed_cents").notNull().default(0),
    alertThresholdBps: integer("alert_threshold_bps").notNull().default(500),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueCode: uniqueIndex("budget_cost_codes_org_project_code_unique").on(table.organizationId, table.projectId, table.code),
    orgProjectIndex: index("budget_cost_codes_org_project_idx").on(table.organizationId, table.projectId),
  }),
);

export const budgetAlerts = pgTable(
  "budget_alerts",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    costCodeId: text("cost_code_id").notNull().references(() => budgetCostCodes.id, { onDelete: "cascade" }),
    severity: text("severity").notNull(),
    narrative: text("narrative").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => ({
    orgProjectIndex: index("budget_alerts_org_project_idx").on(table.organizationId, table.projectId),
    costCodeIndex: index("budget_alerts_cost_code_idx").on(table.costCodeId),
  }),
);

export const smartMailAccounts = pgTable(
  "smartmail_accounts",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull(),
    userId: text("user_id").notNull(),
    provider: text("provider").notNull(),
    email: text("email").notNull(),
    status: smartMailAccountStatusEnum("status").notNull().default("connected"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    connectedAt: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueAccount: uniqueIndex("smartmail_accounts_org_provider_email_unique").on(table.organizationId, table.provider, table.email),
  }),
);

export const smartMailThreads = pgTable(
  "smartmail_threads",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    subject: text("subject").notNull(),
    externalThreadId: text("external_thread_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgProjectIndex: index("smartmail_threads_org_project_idx").on(table.organizationId, table.projectId),
  }),
);

export const smartMailMessages = pgTable(
  "smartmail_messages",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    threadId: text("thread_id").notNull().references(() => smartMailThreads.id, { onDelete: "cascade" }),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    fromEmail: text("from_email").notNull(),
    toEmail: text("to_email").notNull(),
    body: text("body").notNull(),
    linkedEntityType: text("linked_entity_type"),
    linkedEntityId: text("linked_entity_id"),
    aiDraft: integer("ai_draft").notNull().default(0),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    threadIndex: index("smartmail_messages_thread_idx").on(table.threadId),
  }),
);

export const projectsRelations = relations(projects, ({ many }) => ({
  members: many(projectMembers),
  departments: many(departments),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
}));

export const departmentsRelations = relations(departments, ({ one }) => ({
  project: one(projects, {
    fields: [departments.projectId],
    references: [projects.id],
  }),
}));

export const userRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  members: many(members),
  teamMembers: many(teamMembers),
}));

export const sessionRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const organizationRelations = relations(organizations, ({ many }) => ({
  members: many(members),
  invitations: many(invitations),
  teams: many(teams),
}));

export const memberRelations = relations(members, ({ one }) => ({
  organization: one(organizations, {
    fields: [members.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [members.userId],
    references: [users.id],
  }),
}));

export const invitationRelations = relations(invitations, ({ one }) => ({
  organization: one(organizations, {
    fields: [invitations.organizationId],
    references: [organizations.id],
  }),
  inviter: one(users, {
    fields: [invitations.inviterId],
    references: [users.id],
  }),
}));

export const teamRelations = relations(teams, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [teams.organizationId],
    references: [organizations.id],
  }),
  members: many(teamMembers),
}));

export const teamMemberRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
}));
