import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").notNull().default("#0F172A"),
  plan: text("plan").notNull().default("TRIAL"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    username: text("username").notNull().unique(),
    email: text("email").unique(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: ["OWNER", "STAFF"] }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("users_org_idx").on(table.orgId),
    check("users_role_check", sql`${table.role} in ('OWNER', 'STAFF')`),
    check(
      "users_owner_email_check",
      sql`${table.role} <> 'OWNER' or ${table.email} is not null`,
    ),
    check(
      "users_email_check",
      sql`${table.email} = lower(${table.email}) and ${table.email} = btrim(${table.email}) and position('@' in ${table.email}) > 1`,
    ),
    check(
      "users_username_check",
      sql`${table.username} ~ '^[a-z0-9][a-z0-9._-]{2,31}$'`,
    ),
  ],
);

export const counters = pgTable(
  "counters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    prefix: text("prefix").notNull(),
    status: text("status").notNull().default("OPEN"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("counters_org_id_key").on(table.orgId, table.id),
    index("counters_org_status_idx").on(table.orgId, table.status),
  ],
);

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    counterId: uuid("counter_id").notNull(),
    tokenNumber: text("token_number").notNull(),
    sequence: integer("sequence").notNull(),
    status: text("status", {
      enum: ["WAITING", "CALLED", "SERVED", "SKIPPED"],
    }).notNull(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    issuedAt: timestamp("issued_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    calledAt: timestamp("called_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      name: "tickets_org_counter_fk",
      columns: [table.orgId, table.counterId],
      foreignColumns: [counters.orgId, counters.id],
    }).onDelete("cascade"),
    check(
      "tickets_status_check",
      sql`${table.status} in ('WAITING', 'CALLED', 'SERVED', 'SKIPPED')`,
    ),
    index("tickets_org_status_idx").on(table.orgId, table.status),
    index("tickets_org_counter_issued_idx").on(
      table.orgId,
      table.counterId,
      table.issuedAt,
    ),
  ],
);
