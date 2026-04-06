CREATE TYPE "public"."budget_entry_source_type" AS ENUM('change_order', 'purchase_order', 'invoice', 'payment_application', 'manual', 'other');--> statement-breakpoint
CREATE TYPE "public"."budget_entry_type" AS ENUM('committed', 'actual', 'billed');--> statement-breakpoint
CREATE TABLE "budget_cost_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"cost_code_id" text NOT NULL,
	"entry_type" "budget_entry_type" NOT NULL,
	"source_type" "budget_entry_source_type" NOT NULL,
	"source_id" text,
	"source_ref" text,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"metadata" jsonb,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_project_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"alert_threshold_bps" integer DEFAULT 500 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "budget_cost_entries" ADD CONSTRAINT "budget_cost_entries_cost_code_id_budget_cost_codes_id_fk" FOREIGN KEY ("cost_code_id") REFERENCES "public"."budget_cost_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "budget_cost_entries_org_project_idx" ON "budget_cost_entries" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "budget_cost_entries_cost_code_idx" ON "budget_cost_entries" USING btree ("cost_code_id","created_at");--> statement-breakpoint
CREATE INDEX "budget_cost_entries_source_idx" ON "budget_cost_entries" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "budget_project_settings_org_project_unique" ON "budget_project_settings" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "budget_project_settings_org_project_idx" ON "budget_project_settings" USING btree ("organization_id","project_id");