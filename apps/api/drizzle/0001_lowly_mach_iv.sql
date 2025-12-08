CREATE TYPE "public"."change_order_status" AS ENUM('draft', 'submitted', 'under_review', 'approved', 'rejected', 'revision_requested', 'closed');--> statement-breakpoint
CREATE TYPE "public"."site_snap_observation_category" AS ENUM('work_progress', 'safety_issue', 'material_present', 'site_condition', 'equipment');--> statement-breakpoint
CREATE TYPE "public"."site_snap_status" AS ENUM('captured', 'analyzing', 'reviewed');--> statement-breakpoint
CREATE TYPE "public"."smartmail_account_status" AS ENUM('connected', 'disconnected', 'error');--> statement-breakpoint
CREATE TABLE "budget_alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"cost_code_id" text NOT NULL,
	"severity" text NOT NULL,
	"narrative" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "budget_cost_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"budget_cents" integer DEFAULT 0 NOT NULL,
	"committed_cents" integer DEFAULT 0 NOT NULL,
	"actual_cents" integer DEFAULT 0 NOT NULL,
	"billed_cents" integer DEFAULT 0 NOT NULL,
	"alert_threshold_bps" integer DEFAULT 500 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "change_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"title" text NOT NULL,
	"reason" text NOT NULL,
	"impact_cost_cents" integer DEFAULT 0 NOT NULL,
	"impact_days" integer DEFAULT 0 NOT NULL,
	"status" "change_order_status" DEFAULT 'draft' NOT NULL,
	"pipeline_stage" text DEFAULT 'draft' NOT NULL,
	"deadline_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"created_by_user_id" text NOT NULL,
	"decided_by_user_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_snap_images" (
	"id" text PRIMARY KEY NOT NULL,
	"snap_id" text NOT NULL,
	"image_url" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_snap_observations" (
	"id" text PRIMARY KEY NOT NULL,
	"snap_id" text NOT NULL,
	"category" "site_snap_observation_category" NOT NULL,
	"confidence_bps" integer DEFAULT 0 NOT NULL,
	"detail" text NOT NULL,
	"source" text DEFAULT 'ai' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_snaps" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"notes" text NOT NULL,
	"location_zone" text NOT NULL,
	"status" "site_snap_status" DEFAULT 'captured' NOT NULL,
	"analysis_state" text DEFAULT 'idle' NOT NULL,
	"analysis_job_id" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smartmail_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"email" text NOT NULL,
	"status" "smartmail_account_status" DEFAULT 'connected' NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_sync_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smartmail_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"from_email" text NOT NULL,
	"to_email" text NOT NULL,
	"body" text NOT NULL,
	"linked_entity_type" text,
	"linked_entity_id" text,
	"ai_draft" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smartmail_threads" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"subject" text NOT NULL,
	"external_thread_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "budget_alerts" ADD CONSTRAINT "budget_alerts_cost_code_id_budget_cost_codes_id_fk" FOREIGN KEY ("cost_code_id") REFERENCES "public"."budget_cost_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_snap_images" ADD CONSTRAINT "site_snap_images_snap_id_site_snaps_id_fk" FOREIGN KEY ("snap_id") REFERENCES "public"."site_snaps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_snap_observations" ADD CONSTRAINT "site_snap_observations_snap_id_site_snaps_id_fk" FOREIGN KEY ("snap_id") REFERENCES "public"."site_snaps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smartmail_messages" ADD CONSTRAINT "smartmail_messages_thread_id_smartmail_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."smartmail_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "budget_alerts_org_project_idx" ON "budget_alerts" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "budget_alerts_cost_code_idx" ON "budget_alerts" USING btree ("cost_code_id");--> statement-breakpoint
CREATE UNIQUE INDEX "budget_cost_codes_org_project_code_unique" ON "budget_cost_codes" USING btree ("organization_id","project_id","code");--> statement-breakpoint
CREATE INDEX "budget_cost_codes_org_project_idx" ON "budget_cost_codes" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "change_orders_org_project_idx" ON "change_orders" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "change_orders_org_status_idx" ON "change_orders" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "site_snap_images_snap_idx" ON "site_snap_images" USING btree ("snap_id");--> statement-breakpoint
CREATE INDEX "site_snap_observations_snap_idx" ON "site_snap_observations" USING btree ("snap_id");--> statement-breakpoint
CREATE INDEX "site_snap_observations_category_idx" ON "site_snap_observations" USING btree ("category");--> statement-breakpoint
CREATE INDEX "site_snaps_org_project_idx" ON "site_snaps" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "site_snaps_org_status_idx" ON "site_snaps" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "smartmail_accounts_org_provider_email_unique" ON "smartmail_accounts" USING btree ("organization_id","provider","email");--> statement-breakpoint
CREATE INDEX "smartmail_messages_thread_idx" ON "smartmail_messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "smartmail_threads_org_project_idx" ON "smartmail_threads" USING btree ("organization_id","project_id");