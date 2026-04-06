CREATE TYPE "public"."daily_log_review_status" AS ENUM('pending', 'reviewed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."pay_application_status" AS ENUM('draft', 'submitted', 'under_review', 'approved', 'rejected', 'paid');--> statement-breakpoint
CREATE TYPE "public"."subcontractor_invitation_status" AS ENUM('pending', 'accepted', 'expired', 'revoked');--> statement-breakpoint
CREATE TABLE "compliance_requirement_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"compliance_type" text NOT NULL,
	"default_due_days" integer DEFAULT 30 NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"high_risk" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "daily_log_status_events" (
	"id" text PRIMARY KEY NOT NULL,
	"daily_log_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"subcontractor_id" text NOT NULL,
	"status" "daily_log_review_status" NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"reason" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"subcontractor_id" text NOT NULL,
	"log_date" timestamp with time zone NOT NULL,
	"labor_count" integer DEFAULT 0 NOT NULL,
	"equipment_used" jsonb,
	"performed_work" text NOT NULL,
	"attachments" jsonb,
	"review_status" "daily_log_review_status" DEFAULT 'pending' NOT NULL,
	"review_notes" text,
	"reviewer_user_id" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pay_application_line_items" (
	"id" text PRIMARY KEY NOT NULL,
	"pay_application_id" text NOT NULL,
	"description" text NOT NULL,
	"cost_code" text,
	"quantity_units" integer DEFAULT 1 NOT NULL,
	"unit_amount_cents" integer,
	"amount_cents" integer NOT NULL,
	"evidence" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pay_application_status_events" (
	"id" text PRIMARY KEY NOT NULL,
	"pay_application_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"subcontractor_id" text NOT NULL,
	"status" "pay_application_status" NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"reason" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pay_applications" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"subcontractor_id" text NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"status" "pay_application_status" DEFAULT 'draft' NOT NULL,
	"total_amount_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"summary" text,
	"evidence" jsonb,
	"rejection_reason" text,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"reviewer_user_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "portal_password_reset_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"subcontractor_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subcontractor_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"subcontractor_id" text NOT NULL,
	"invited_by_user_id" text NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"status" "subcontractor_invitation_status" DEFAULT 'pending' NOT NULL,
	"assigned_scope" text,
	"milestones" jsonb,
	"metadata" jsonb,
	"invited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subcontractor_prequalification_scores" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text,
	"subcontractor_id" text NOT NULL,
	"overall_score_bps" integer NOT NULL,
	"safety_score_bps" integer,
	"financial_score_bps" integer,
	"compliance_score_bps" integer,
	"capacity_score_bps" integer,
	"risk_level" text DEFAULT 'medium' NOT NULL,
	"model_version" text DEFAULT 'v1' NOT NULL,
	"notes" text,
	"metadata" jsonb,
	"scored_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "compliance_items" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "compliance_items" ALTER COLUMN "status" SET DEFAULT 'pending'::text;--> statement-breakpoint
DROP TYPE "public"."compliance_status";--> statement-breakpoint
CREATE TYPE "public"."compliance_status" AS ENUM('pending', 'verified', 'expiring', 'expired', 'non_compliant', 'compliant');--> statement-breakpoint
ALTER TABLE "compliance_items" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."compliance_status";--> statement-breakpoint
ALTER TABLE "compliance_items" ALTER COLUMN "status" SET DATA TYPE "public"."compliance_status" USING "status"::"public"."compliance_status";--> statement-breakpoint
ALTER TABLE "compliance_items" ADD COLUMN "high_risk" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "compliance_items" ADD COLUMN "reminder_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "compliance_items" ADD COLUMN "escalation_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "compliance_items" ADD COLUMN "reviewer_confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "compliance_items" ADD COLUMN "reviewer_confirmed_by_user_id" text;--> statement-breakpoint
ALTER TABLE "daily_log_status_events" ADD CONSTRAINT "daily_log_status_events_daily_log_id_daily_logs_id_fk" FOREIGN KEY ("daily_log_id") REFERENCES "public"."daily_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_log_status_events" ADD CONSTRAINT "daily_log_status_events_subcontractor_id_subcontractors_id_fk" FOREIGN KEY ("subcontractor_id") REFERENCES "public"."subcontractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_subcontractor_id_subcontractors_id_fk" FOREIGN KEY ("subcontractor_id") REFERENCES "public"."subcontractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pay_application_line_items" ADD CONSTRAINT "pay_application_line_items_pay_application_id_pay_applications_id_fk" FOREIGN KEY ("pay_application_id") REFERENCES "public"."pay_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pay_application_status_events" ADD CONSTRAINT "pay_application_status_events_pay_application_id_pay_applications_id_fk" FOREIGN KEY ("pay_application_id") REFERENCES "public"."pay_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pay_application_status_events" ADD CONSTRAINT "pay_application_status_events_subcontractor_id_subcontractors_id_fk" FOREIGN KEY ("subcontractor_id") REFERENCES "public"."subcontractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pay_applications" ADD CONSTRAINT "pay_applications_subcontractor_id_subcontractors_id_fk" FOREIGN KEY ("subcontractor_id") REFERENCES "public"."subcontractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_password_reset_tokens" ADD CONSTRAINT "portal_password_reset_tokens_subcontractor_id_subcontractors_id_fk" FOREIGN KEY ("subcontractor_id") REFERENCES "public"."subcontractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcontractor_invitations" ADD CONSTRAINT "subcontractor_invitations_subcontractor_id_subcontractors_id_fk" FOREIGN KEY ("subcontractor_id") REFERENCES "public"."subcontractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcontractor_prequalification_scores" ADD CONSTRAINT "subcontractor_prequalification_scores_subcontractor_id_subcontractors_id_fk" FOREIGN KEY ("subcontractor_id") REFERENCES "public"."subcontractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "compliance_requirement_templates_org_project_idx" ON "compliance_requirement_templates" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "compliance_requirement_templates_compliance_type_idx" ON "compliance_requirement_templates" USING btree ("compliance_type");--> statement-breakpoint
CREATE UNIQUE INDEX "compliance_requirement_templates_org_project_name_unique" ON "compliance_requirement_templates" USING btree ("organization_id","project_id","name");--> statement-breakpoint
CREATE INDEX "daily_log_status_events_daily_log_idx" ON "daily_log_status_events" USING btree ("daily_log_id","created_at");--> statement-breakpoint
CREATE INDEX "daily_log_status_events_org_project_idx" ON "daily_log_status_events" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "daily_logs_org_project_date_idx" ON "daily_logs" USING btree ("organization_id","project_id","log_date");--> statement-breakpoint
CREATE INDEX "daily_logs_subcontractor_idx" ON "daily_logs" USING btree ("subcontractor_id","log_date");--> statement-breakpoint
CREATE INDEX "daily_logs_review_status_idx" ON "daily_logs" USING btree ("review_status","created_at");--> statement-breakpoint
CREATE INDEX "pay_application_line_items_pay_app_idx" ON "pay_application_line_items" USING btree ("pay_application_id","created_at");--> statement-breakpoint
CREATE INDEX "pay_application_status_events_pay_app_idx" ON "pay_application_status_events" USING btree ("pay_application_id","created_at");--> statement-breakpoint
CREATE INDEX "pay_application_status_events_org_project_idx" ON "pay_application_status_events" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "pay_applications_org_project_idx" ON "pay_applications" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "pay_applications_subcontractor_idx" ON "pay_applications" USING btree ("subcontractor_id","created_at");--> statement-breakpoint
CREATE INDEX "pay_applications_status_idx" ON "pay_applications" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "portal_password_reset_tokens_token_hash_unique" ON "portal_password_reset_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "portal_password_reset_tokens_subcontractor_idx" ON "portal_password_reset_tokens" USING btree ("subcontractor_id","created_at");--> statement-breakpoint
CREATE INDEX "portal_password_reset_tokens_org_expires_idx" ON "portal_password_reset_tokens" USING btree ("organization_id","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "subcontractor_invitations_token_hash_unique" ON "subcontractor_invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "subcontractor_invitations_org_project_idx" ON "subcontractor_invitations" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "subcontractor_invitations_subcontractor_idx" ON "subcontractor_invitations" USING btree ("subcontractor_id","created_at");--> statement-breakpoint
CREATE INDEX "subcontractor_prequalification_scores_sub_idx" ON "subcontractor_prequalification_scores" USING btree ("subcontractor_id","created_at");--> statement-breakpoint
CREATE INDEX "subcontractor_prequalification_scores_org_project_idx" ON "subcontractor_prequalification_scores" USING btree ("organization_id","project_id");