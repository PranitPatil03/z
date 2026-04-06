CREATE TYPE "public"."file_asset_status" AS ENUM('pending', 'uploaded', 'failed', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."subscription_plan" AS ENUM('starter', 'growth', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'grace', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."usage_event_type" AS ENUM('ai_generation');--> statement-breakpoint
CREATE TABLE "file_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"uploaded_by_user_id" text NOT NULL,
	"bucket" text NOT NULL,
	"storage_key" text NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer DEFAULT 0 NOT NULL,
	"status" "file_asset_status" DEFAULT 'pending' NOT NULL,
	"etag" text,
	"metadata" jsonb,
	"uploaded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "organization_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"plan" "subscription_plan" DEFAULT 'starter' NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"ai_credits_included" integer DEFAULT 1500 NOT NULL,
	"ai_credits_used" integer DEFAULT 0 NOT NULL,
	"allow_overage" boolean DEFAULT false NOT NULL,
	"overage_price_cents" integer DEFAULT 0 NOT NULL,
	"cycle_start_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cycle_end_at" timestamp with time zone DEFAULT (now() + interval '30 days') NOT NULL,
	"grace_ends_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_events" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"subscription_id" text,
	"event_type" "usage_event_type" NOT NULL,
	"feature" text NOT NULL,
	"units" integer NOT NULL,
	"source" text NOT NULL,
	"model" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "file_assets_org_entity_idx" ON "file_assets" USING btree ("organization_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "file_assets_org_status_idx" ON "file_assets" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "file_assets_org_project_idx" ON "file_assets" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "file_assets_bucket_key_unique" ON "file_assets" USING btree ("bucket","storage_key");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_subscriptions_org_unique" ON "organization_subscriptions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organization_subscriptions_org_status_idx" ON "organization_subscriptions" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "organization_subscriptions_cycle_end_idx" ON "organization_subscriptions" USING btree ("cycle_end_at");--> statement-breakpoint
CREATE INDEX "usage_events_org_created_idx" ON "usage_events" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "usage_events_subscription_idx" ON "usage_events" USING btree ("subscription_id");