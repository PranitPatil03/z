ALTER TABLE "billing_records" ADD COLUMN "stripe_payment_intent_id" text;--> statement-breakpoint
ALTER TABLE "billing_records" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "billing_records" ADD COLUMN "subscription_id" text;--> statement-breakpoint
ALTER TABLE "subcontractors" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "subcontractors" ADD COLUMN "portal_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "subcontractors" ADD COLUMN "last_portal_login_at" timestamp with time zone;