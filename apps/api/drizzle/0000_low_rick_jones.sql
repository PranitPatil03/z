CREATE TYPE "public"."audit_action" AS ENUM('create', 'update', 'delete', 'approve', 'reject', 'invite', 'archive', 'login');--> statement-breakpoint
CREATE TYPE "public"."billing_status" AS ENUM('draft', 'issued', 'paid', 'void');--> statement-breakpoint
CREATE TYPE "public"."compliance_status" AS ENUM('pending', 'compliant', 'non_compliant', 'expired');--> statement-breakpoint
CREATE TYPE "public"."integration_status" AS ENUM('connected', 'disconnected', 'error');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'submitted', 'approved', 'rejected', 'paid', 'hold');--> statement-breakpoint
CREATE TYPE "public"."match_run_result" AS ENUM('matched', 'partial_match', 'over_bill', 'under_receipt', 'price_variance');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('active', 'archived', 'completed');--> statement-breakpoint
CREATE TYPE "public"."purchase_order_status" AS ENUM('draft', 'issued', 'approved', 'closed', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."receipt_status" AS ENUM('received', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."rfq_status" AS ENUM('draft', 'sent', 'closed', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."subcontractor_status" AS ENUM('active', 'inactive', 'blocked');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"provider_id" text NOT NULL,
	"account_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" "audit_action" NOT NULL,
	"before_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"after_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_records" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text,
	"reference" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" "billing_status" DEFAULT 'draft' NOT NULL,
	"due_date" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "compliance_items" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"subcontractor_id" text,
	"compliance_type" text NOT NULL,
	"status" "compliance_status" DEFAULT 'pending' NOT NULL,
	"due_date" timestamp with time zone,
	"notes" text,
	"evidence" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"provider" text NOT NULL,
	"name" text NOT NULL,
	"status" "integration_status" DEFAULT 'disconnected' NOT NULL,
	"config" jsonb,
	"last_sync_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"team_id" text,
	"inviter_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"purchase_order_id" text,
	"invoice_number" text NOT NULL,
	"vendor_name" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"total_amount_cents" integer NOT NULL,
	"status" "invoice_status" DEFAULT 'submitted' NOT NULL,
	"due_date" timestamp with time zone,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "match_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"invoice_id" text NOT NULL,
	"purchase_order_id" text,
	"receipt_id" text,
	"result" "match_run_result" NOT NULL,
	"tolerance_bps" integer DEFAULT 0 NOT NULL,
	"variance_cents" integer DEFAULT 0 NOT NULL,
	"details" jsonb,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"metadata" jsonb,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"department_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"status" "project_status" DEFAULT 'active' NOT NULL,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"rfq_id" text,
	"po_number" text NOT NULL,
	"vendor_name" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"total_amount_cents" integer NOT NULL,
	"status" "purchase_order_status" DEFAULT 'draft' NOT NULL,
	"issue_date" timestamp with time zone,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"purchase_order_id" text,
	"receipt_number" text NOT NULL,
	"received_amount_cents" integer NOT NULL,
	"status" "receipt_status" DEFAULT 'received' NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rfqs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"title" text NOT NULL,
	"scope" text NOT NULL,
	"due_date" timestamp with time zone,
	"status" "rfq_status" DEFAULT 'draft' NOT NULL,
	"created_by_user_id" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"active_organization_id" text,
	"active_team_id" text
);
--> statement-breakpoint
CREATE TABLE "subcontractors" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"trade" text NOT NULL,
	"status" "subcontractor_status" DEFAULT 'active' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "team_member" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email" text NOT NULL,
	"email_verified" timestamp with time zone,
	"name" text NOT NULL,
	"image" text
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team" ADD CONSTRAINT "team_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_account_unique" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_org_entity_idx" ON "audit_logs" USING btree ("organization_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_org_action_idx" ON "audit_logs" USING btree ("organization_id","action");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_records_org_reference_unique" ON "billing_records" USING btree ("organization_id","reference");--> statement-breakpoint
CREATE INDEX "billing_records_org_project_idx" ON "billing_records" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "compliance_items_org_project_idx" ON "compliance_items" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "compliance_items_subcontractor_idx" ON "compliance_items" USING btree ("subcontractor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "departments_project_slug_unique" ON "departments" USING btree ("project_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "integrations_org_provider_name_unique" ON "integrations" USING btree ("organization_id","provider","name");--> statement-breakpoint
CREATE INDEX "integrations_org_provider_idx" ON "integrations" USING btree ("organization_id","provider");--> statement-breakpoint
CREATE INDEX "invitation_org_email_idx" ON "invitation" USING btree ("organization_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_org_invoice_number_unique" ON "invoices" USING btree ("organization_id","invoice_number");--> statement-breakpoint
CREATE INDEX "invoices_org_project_idx" ON "invoices" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "match_runs_org_project_idx" ON "match_runs" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "match_runs_invoice_idx" ON "match_runs" USING btree ("invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "member_org_user_unique" ON "member" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "member_org_idx" ON "member" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "notifications_org_user_created_idx" ON "notifications" USING btree ("organization_id","user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_slug_unique" ON "organization" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "project_members_project_user_unique" ON "project_members" USING btree ("project_id","user_id");--> statement-breakpoint
CREATE INDEX "project_members_project_role_idx" ON "project_members" USING btree ("project_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_organization_code_unique" ON "projects" USING btree ("organization_id","code");--> statement-breakpoint
CREATE INDEX "projects_organization_status_idx" ON "projects" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_orders_org_po_number_unique" ON "purchase_orders" USING btree ("organization_id","po_number");--> statement-breakpoint
CREATE INDEX "purchase_orders_org_project_idx" ON "purchase_orders" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "receipts_org_receipt_number_unique" ON "receipts" USING btree ("organization_id","receipt_number");--> statement-breakpoint
CREATE INDEX "receipts_org_project_idx" ON "receipts" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "rfqs_org_project_idx" ON "rfqs" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "rfqs_status_idx" ON "rfqs" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_unique" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subcontractors_org_name_unique" ON "subcontractors" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "subcontractors_org_project_idx" ON "subcontractors" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "team_member_team_user_unique" ON "team_member" USING btree ("team_id","user_id");--> statement-breakpoint
CREATE INDEX "team_member_team_idx" ON "team_member" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "team_org_idx" ON "team" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_unique" ON "user" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_identifier_value_unique" ON "verification" USING btree ("identifier","value");