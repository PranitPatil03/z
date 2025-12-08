CREATE TYPE "public"."stripe_webhook_processing_status" AS ENUM('processing', 'processed', 'failed');--> statement-breakpoint
CREATE TABLE "stripe_webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"stripe_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"processing_status" "stripe_webhook_processing_status" DEFAULT 'processing' NOT NULL,
	"payload" jsonb,
	"error" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "stripe_webhook_events_event_id_unique" ON "stripe_webhook_events" USING btree ("stripe_event_id");--> statement-breakpoint
CREATE INDEX "stripe_webhook_events_status_created_idx" ON "stripe_webhook_events" USING btree ("processing_status","created_at");