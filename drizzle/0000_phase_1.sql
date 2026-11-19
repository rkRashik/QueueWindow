CREATE TABLE "counters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"prefix" text NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "counters_org_id_key" UNIQUE("org_id","id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo_url" text,
	"primary_color" text DEFAULT '#0F172A' NOT NULL,
	"plan" text DEFAULT 'TRIAL' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"counter_id" uuid NOT NULL,
	"token_number" text NOT NULL,
	"sequence" integer NOT NULL,
	"status" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"called_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	CONSTRAINT "tickets_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "tickets_status_check" CHECK ("tickets"."status" in ('WAITING', 'CALLED', 'SERVED', 'SKIPPED'))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"username" text NOT NULL,
	"email" text,
	"password_hash" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_role_check" CHECK ("users"."role" in ('OWNER', 'STAFF')),
	CONSTRAINT "users_owner_email_check" CHECK ("users"."role" <> 'OWNER' or "users"."email" is not null),
	CONSTRAINT "users_email_check" CHECK ("users"."email" = lower("users"."email") and "users"."email" = btrim("users"."email") and position('@' in "users"."email") > 1),
	CONSTRAINT "users_username_check" CHECK ("users"."username" ~ '^[a-z0-9][a-z0-9._-]{2,31}$')
);
--> statement-breakpoint
ALTER TABLE "counters" ADD CONSTRAINT "counters_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_org_counter_fk" FOREIGN KEY ("org_id","counter_id") REFERENCES "public"."counters"("org_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "counters_org_status_idx" ON "counters" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "tickets_org_status_idx" ON "tickets" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "tickets_org_counter_issued_idx" ON "tickets" USING btree ("org_id","counter_id","issued_at");--> statement-breakpoint
CREATE INDEX "users_org_idx" ON "users" USING btree ("org_id");