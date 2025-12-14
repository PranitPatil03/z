CREATE TYPE "public"."access_role_scope" AS ENUM('organization', 'project');--> statement-breakpoint
CREATE TABLE "permission_catalog" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"module" text NOT NULL,
	"action" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "permission_catalog_key_unique" ON "permission_catalog" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "permission_catalog_module_action_unique" ON "permission_catalog" USING btree ("module", "action");--> statement-breakpoint
CREATE INDEX "permission_catalog_module_idx" ON "permission_catalog" USING btree ("module");--> statement-breakpoint
CREATE TABLE "access_roles" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"scope" "access_role_scope" DEFAULT 'organization' NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "access_role_permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"role_id" text NOT NULL,
	"permission_key" text NOT NULL,
	"granted" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "access_role_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text,
	"user_id" text NOT NULL,
	"role_id" text NOT NULL,
	"assigned_by_user_id" text NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "access_roles" ADD CONSTRAINT "access_roles_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_roles" ADD CONSTRAINT "access_roles_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_role_permissions" ADD CONSTRAINT "access_role_permissions_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_role_permissions" ADD CONSTRAINT "access_role_permissions_role_id_access_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."access_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_role_permissions" ADD CONSTRAINT "access_role_permissions_permission_key_permission_catalog_key_fk" FOREIGN KEY ("permission_key") REFERENCES "public"."permission_catalog"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_role_assignments" ADD CONSTRAINT "access_role_assignments_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_role_assignments" ADD CONSTRAINT "access_role_assignments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_role_assignments" ADD CONSTRAINT "access_role_assignments_role_id_access_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."access_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_role_assignments" ADD CONSTRAINT "access_role_assignments_assigned_by_user_id_user_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "access_roles_org_scope_code_unique" ON "access_roles" USING btree ("organization_id", "scope", "code");--> statement-breakpoint
CREATE INDEX "access_roles_org_scope_idx" ON "access_roles" USING btree ("organization_id", "scope");--> statement-breakpoint
CREATE UNIQUE INDEX "access_role_permissions_role_permission_unique" ON "access_role_permissions" USING btree ("role_id", "permission_key");--> statement-breakpoint
CREATE INDEX "access_role_permissions_org_permission_idx" ON "access_role_permissions" USING btree ("organization_id", "permission_key");--> statement-breakpoint
CREATE UNIQUE INDEX "access_role_assignments_org_project_user_role_unique" ON "access_role_assignments" USING btree ("organization_id", "project_id", "user_id", "role_id");--> statement-breakpoint
CREATE INDEX "access_role_assignments_org_user_idx" ON "access_role_assignments" USING btree ("organization_id", "user_id");--> statement-breakpoint
CREATE INDEX "access_role_assignments_org_project_user_idx" ON "access_role_assignments" USING btree ("organization_id", "project_id", "user_id");--> statement-breakpoint
CREATE INDEX "access_role_assignments_role_idx" ON "access_role_assignments" USING btree ("role_id");