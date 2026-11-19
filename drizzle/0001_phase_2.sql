CREATE TABLE "public_join_limits" (
	"org_id" uuid NOT NULL,
	"client_hash" text NOT NULL,
	"window_ends_at" timestamp with time zone NOT NULL,
	"hits" integer NOT NULL,
	CONSTRAINT "public_join_limits_org_id_client_hash_pk" PRIMARY KEY("org_id","client_hash")
);
--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "business_date" date GENERATED ALWAYS AS (("issued_at" AT TIME ZONE 'Asia/Dhaka')::date) STORED NOT NULL;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "first_called_at" timestamp with time zone;--> statement-breakpoint
UPDATE "tickets" SET "first_called_at" = "called_at" WHERE "called_at" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "public_join_limits" ADD CONSTRAINT "public_join_limits_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "public_join_limits_expiry_idx" ON "public_join_limits" USING btree ("org_id","window_ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tickets_counter_called_key" ON "tickets" USING btree ("org_id","counter_id") WHERE "tickets"."status" = 'CALLED';--> statement-breakpoint
CREATE INDEX "tickets_counter_waiting_idx" ON "tickets" USING btree ("org_id","counter_id","issued_at","sequence","id") WHERE "tickets"."status" = 'WAITING';--> statement-breakpoint
ALTER TABLE "counters" ADD CONSTRAINT "counters_org_prefix_key" UNIQUE("org_id","prefix");--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_counter_day_sequence_key" UNIQUE("org_id","counter_id","business_date","sequence");--> statement-breakpoint
ALTER TABLE "counters" ADD CONSTRAINT "counters_status_check" CHECK ("counters"."status" in ('OPEN', 'PAUSED'));
