# SaaS architecture

QueueWindow uses Next.js App Router, TypeScript, Drizzle ORM, and a Neon WebSocket Pool for interactive PostgreSQL transactions. The schema lives in `src/db/schema.ts`. SQL migrations live in `drizzle/`.

## Identity and tenant boundaries

Signup creates an organization, its owner, and Counter 1 in one transaction. Owners require email. Staff may sign in with just a username and password. Usernames and emails are globally unique and stored in lowercase.

The HTTP-only `qw_session` cookie carries a signed 24-hour JWT. Next.js Proxy redirects unauthenticated page requests. Desk and admin APIs look up the current user and organization together, and admin APIs require the current database role to be `OWNER`. Authenticated POST, PATCH, and DELETE requests require a matching Origin. Public requests resolve tenant membership through the organization slug. Cross-tenant resources return 404.

## Queue rules and analytics

- The business day starts at midnight in `Asia/Dhaka`. Numbering starts from 1 separately for each counter and business day. Existing waiting and called tickets remain in the queue across midnight.
- Issuance and staff transitions lock the counter row. PostgreSQL enforces one called ticket per counter, one sequence per counter and day, and a matching organization on every ticket and counter.
- Idempotency keys are scoped to organization, counter, and issuance source. Replay returns the original ticket even after the business day changes or new issuance is blocked. New issuance returns 402 for expired organizations and 409 for paused counters. Staff can still finish existing tickets.
- Call next serves the active ticket and calls the oldest waiting ticket. If the waiting list is empty, it leaves the active ticket in place. Recall changes the display timestamp and keeps the first-call time for analytics. Counter deletion requires all waiting and called tickets to be resolved and cascades to its ticket history.
- Daily analytics use the tickets issued that business day. Average wait uses first call minus issuance. Average service uses completion minus first call for served tickets. Averages are weighted across counters and return null without samples. Visitor position includes the called ticket. The estimated wait uses today's completed service average and any remaining active service, with a fallback of five minutes per waiting ticket ahead.

## API surface

| Method and path | Behavior |
| --- | --- |
| `GET, POST /api/admin/counters` | List or create counters. Prefixes are one or two uppercase letters or digits and unique within the organization. |
| `PATCH, DELETE /api/admin/counters/[id]` | Edit name, prefix, or status, or delete a counter. |
| `GET, POST /api/admin/staff` and `DELETE /api/admin/staff/[id]` | List, create, or remove staff. Owner accounts are protected. |
| `PATCH /api/admin/organization` | Update name, hex primary color, and optional HTTPS logo URL. |
| `GET /api/admin/analytics` | Return daily organization totals and a per-counter breakdown. |
| `GET /api/desk/state?counterId=…` | List counters and return the selected queue and daily stats. Omitting the ID selects the first counter. |
| `POST /api/desk/action` | Send `action` and `counterId`. `ISSUE_WALKIN` also takes an idempotency key. `COMPLETE`, `SKIP`, and `RECALL` take a ticket ID. |
| `GET /api/public/[orgSlug]/display` | Read branding, the called token, the waiting count, and up to three waiting tokens per counter. |
| `POST /api/public/[orgSlug]/join` | Send `counterId` and a UUID v4 `idempotencyKey`. Keep the key for retries of the same request. |
| `GET /api/public/[orgSlug]/ticket/[ticketId]` | Read status, counter name, people ahead, and estimated wait using the ticket ID returned on admission. |
| `GET /api/public/[orgSlug]/stream` | Receive an SSE `snapshot` immediately, followed by `update` events when display data changes. |

Public display data contains ticket numbers and excludes private ticket IDs. Public admission allows 10 new tickets per organization and client IP in a 60-second window. PostgreSQL enforces the shared limit across counters and instances. The app stores a keyed IP digest, and retries do not use another slot.

The stream polls an indexed PostgreSQL snapshot every two seconds without holding a transaction open. It closes after 25 seconds and sends `retry: 2000` for automatic reconnection.

Phase 3A adds the staff desk, owner administration, and auth screens. The desk refreshes its authenticated snapshot on SSE events and polls while visible as a fallback. The public TV, visitor, and landing screens are planned for Phase 3B. The original single-counter release is available in Git history.
