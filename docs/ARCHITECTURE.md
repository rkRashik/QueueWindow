# Architecture

## Decision

One Next.js 16 application, React, TypeScript, CSS, and libSQL. Local development uses a persistent SQLite file; Vercel must use a remote Turso database. The server refuses file-based production storage on Vercel. This replaces the earlier Supabase/realtime proposal: five-second polling is sufficient for one desk and avoids an additional authentication/realtime system.

## Data and consistency

Tables: queues, tickets, commands, sessions, rate_limits, and events. Queue ownership comes from the server-side session, never a client-supplied queue ID. Ticket numbers are unique within each queue; a partial unique index permits only one called or serving ticket. Write transactions include number allocation, lifecycle validation, version increments, audit events, and idempotency records. Stale versions return a conflict. A process-local write scheduler avoids synchronous SQLite lock contention; database transactions and constraints remain the cross-instance boundary. Remote Turso concurrency still needs a deployment smoke test.

Read transactions keep tickets and versions consistent. Browser snapshots cannot overwrite a newer version. Lost mutation responses retain the same command key for a safe retry. Local concurrency and reopening tests use actual SQLite files.

## Security

One owner password is stored as a salted scrypt hash in server configuration. Random, hashed session tokens are stored in the database; cookies are HttpOnly, SameSite=Lax, and Secure in production. Sessions expire after 24 hours. Server checks protect every staff operation. Writes require the correct Origin. Login and writes have database-backed rate limits.

Visitor capabilities are HMAC-SHA256 values derived from a random ticket UUID and APP_SECRET. Only hashes are indexed in storage. The raw capability travels in a URL fragment and Authorization header, not a query string. Links expire after 24 hours and are invalidated when tickets are cleared. Anyone holding a link can view that ticket. No individual-link rotation UI is included.

Public display IDs intentionally grant read-only access to ticket numbers, desk details, and aggregate progress. They expose no private ticket IDs or visitor tokens. All dynamic API responses are no-store. Security headers restrict framing, referrers, and resource origins. CSP allows inline scripts for Next.js hydration; nonce-based CSP is a future hardening option.

## Limits

Five-second visible-page polling is not instantaneous delivery. Demo queues expire after a day and are cleaned on later demo creation; cleanup is lazy. A session is capped at 500 tickets. Owner history remains until starting a new day; audit and command retention need an operational cleanup policy before real use. Single shared owner credentials intentionally omit invitations, password recovery, and role management. Hosted credentials and deployment are not verified locally.

## Counter timing and preferences

The queue snapshot reads call, recall and service-start times from ticket events. Older active tickets without a matching call event show no call timer until called again. Display and print preferences use a queue-owned record with defaults for existing queues. Preference changes and repeat calls use the same versioned transactions as other staff actions.
