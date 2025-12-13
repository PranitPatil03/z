CREATE TYPE "public"."smartmail_message_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."smartmail_message_status" AS ENUM('draft', 'queued', 'sent', 'received', 'failed');--> statement-breakpoint
CREATE TYPE "public"."smartmail_template_type" AS ENUM('template', 'snippet');--> statement-breakpoint
CREATE TABLE "smartmail_sync_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"status" text NOT NULL,
	"fetched_count" integer DEFAULT 0 NOT NULL,
	"upserted_count" integer DEFAULT 0 NOT NULL,
	"cursor_before" text,
	"cursor_after" text,
	"error" text,
	"metadata" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smartmail_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text,
	"created_by_user_id" text NOT NULL,
	"name" text NOT NULL,
	"type" "smartmail_template_type" DEFAULT 'template' NOT NULL,
	"subject_template" text DEFAULT '' NOT NULL,
	"body_template" text NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_shared" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "smartmail_accounts" ADD COLUMN "token_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "smartmail_accounts" ADD COLUMN "sync_cursor" text;--> statement-breakpoint
ALTER TABLE "smartmail_accounts" ADD COLUMN "last_sync_status" text DEFAULT 'idle' NOT NULL;--> statement-breakpoint
ALTER TABLE "smartmail_accounts" ADD COLUMN "last_sync_error" text;--> statement-breakpoint
ALTER TABLE "smartmail_accounts" ADD COLUMN "auto_sync_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "smartmail_accounts" ADD COLUMN "default_project_id" text;--> statement-breakpoint
ALTER TABLE "smartmail_accounts" ADD COLUMN "revoked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "smartmail_messages" ADD COLUMN "external_message_id" text;--> statement-breakpoint
ALTER TABLE "smartmail_messages" ADD COLUMN "direction" "smartmail_message_direction" DEFAULT 'inbound' NOT NULL;--> statement-breakpoint
ALTER TABLE "smartmail_messages" ADD COLUMN "status" "smartmail_message_status" DEFAULT 'received' NOT NULL;--> statement-breakpoint
ALTER TABLE "smartmail_messages" ADD COLUMN "cc_emails" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "smartmail_messages" ADD COLUMN "bcc_emails" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "smartmail_messages" ADD COLUMN "subject" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "smartmail_messages" ADD COLUMN "link_confidence_bps" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "smartmail_messages" ADD COLUMN "link_reason" text;--> statement-breakpoint
ALTER TABLE "smartmail_messages" ADD COLUMN "link_overridden_by_user_id" text;--> statement-breakpoint
ALTER TABLE "smartmail_messages" ADD COLUMN "link_overridden_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "smartmail_messages" ADD COLUMN "is_ai_draft" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "smartmail_messages" ADD COLUMN "ai_model" text;--> statement-breakpoint
ALTER TABLE "smartmail_messages" ADD COLUMN "ai_prompt_template_version" text;--> statement-breakpoint
ALTER TABLE "smartmail_messages" ADD COLUMN "send_error" text;--> statement-breakpoint
ALTER TABLE "smartmail_messages" ADD COLUMN "provider_metadata" jsonb;--> statement-breakpoint
ALTER TABLE "smartmail_messages" ADD COLUMN "external_created_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "smartmail_messages" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "smartmail_threads" ADD COLUMN "account_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "smartmail_threads" ADD COLUMN "participants" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "smartmail_threads" ADD COLUMN "last_message_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "smartmail_threads" ADD COLUMN "linked_entity_type" text;--> statement-breakpoint
ALTER TABLE "smartmail_threads" ADD COLUMN "linked_entity_id" text;--> statement-breakpoint
ALTER TABLE "smartmail_sync_runs" ADD CONSTRAINT "smartmail_sync_runs_account_id_smartmail_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."smartmail_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "smartmail_sync_runs_account_started_idx" ON "smartmail_sync_runs" USING btree ("account_id","started_at");--> statement-breakpoint
CREATE INDEX "smartmail_sync_runs_org_project_idx" ON "smartmail_sync_runs" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "smartmail_templates_org_project_type_idx" ON "smartmail_templates" USING btree ("organization_id","project_id","type","deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "smartmail_templates_org_project_name_type_unique" ON "smartmail_templates" USING btree ("organization_id","project_id","name","type");--> statement-breakpoint
ALTER TABLE "smartmail_threads" ADD CONSTRAINT "smartmail_threads_account_id_smartmail_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."smartmail_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "smartmail_accounts_org_status_idx" ON "smartmail_accounts" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "smartmail_accounts_org_sync_idx" ON "smartmail_accounts" USING btree ("organization_id","auto_sync_enabled","last_sync_at");--> statement-breakpoint
CREATE INDEX "smartmail_messages_thread_sent_idx" ON "smartmail_messages" USING btree ("thread_id","sent_at");--> statement-breakpoint
CREATE INDEX "smartmail_messages_link_idx" ON "smartmail_messages" USING btree ("linked_entity_type","linked_entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "smartmail_messages_org_external_message_unique" ON "smartmail_messages" USING btree ("organization_id","external_message_id");--> statement-breakpoint
CREATE INDEX "smartmail_threads_org_account_idx" ON "smartmail_threads" USING btree ("organization_id","account_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "smartmail_threads_org_account_external_thread_unique" ON "smartmail_threads" USING btree ("organization_id","account_id","external_thread_id");