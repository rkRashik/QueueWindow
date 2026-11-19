# Phase 1 architecture

QueueWindow uses one Next.js App Router application, TypeScript, Tailwind CSS, and Drizzle ORM. The server uses a Neon WebSocket Pool so signup can run an interactive PostgreSQL transaction. The schema is defined in `src/db/schema.ts` with a baseline in `drizzle/`.

## Tenant data

Each user, counter, and ticket belongs to an organization. PostgreSQL rejects a ticket whose organization differs from its counter's organization. Deleting an organization cascades through its users, counters, and tickets. Ticket lookup indexes support tenant status and counter history queries.

Usernames and emails are globally unique and stored in lowercase. Usernames cannot contain an at-sign, so sign-in selects an unambiguous lookup. Owners require email. Staff may use a username alone.

## Authentication

Signup creates an organization, an owner, and Counter 1 in one transaction. The trial expiry is 14 days after signup. Slugs combine a normalized organization name with a random UUID and have a unique database constraint. Passwords use bcrypt with cost 12. Input is capped at bcrypt's 72-byte boundary.

The HTTP-only `qw_session` cookie carries a signed 24-hour HS256 JWT with SameSite=Lax and Secure in production. Middleware redirects unauthenticated desk and admin requests. Server rendering and `/api/auth/me` verify the user and organization together against PostgreSQL. The admin page checks the current database role. Auth POSTs require the expected Origin. Error responses carry a request ID and omit credentials, tokens, and database errors.

## Phase boundary

Phase 1 establishes tenant ownership, auth, and schema. Enforcing trial expiry, public auth rate limiting, account recovery, session revocation, staff account management, queue operations, and the dashboard and TV surfaces remain future work. Any future data access must scope queries by the server-verified organization ID. The v1 queue sources and tests are retained in `legacy/v1` for reference and the complete v1 release is in Git history.
