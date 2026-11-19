# Environment setup

Use a configured Neon PostgreSQL database. Set `DATABASE_URL` and a random `JWT_SECRET` of at least 32 bytes in `.env.local`. Use the exact public HTTPS origin in `APP_URL` when hosting.

## Database upgrade

For an empty database, apply `drizzle/0000_phase_1.sql` followed by `drizzle/0001_phase_2.sql`. For the existing Phase 1 Neon database that was initialized with Drizzle Kit push, apply only `drizzle/0001_phase_2.sql` once, in a single transaction. The migration backfills first-call timestamps as well as adding the Phase 2 constraints. Use a separate development database and check the target before applying SQL.

## Public admission and stream

Vercel supplies the client IP header used by public admission. On another host, set `TRUSTED_CLIENT_IP_HEADER` only to a header your reverse proxy overwrites with a single verified client IP. Requests with no trusted IP share one admission bucket per organization. [Vercel request headers](https://vercel.com/docs/headers/request-headers)

The SSE route uses a 30-second function limit and closes streams after 25 seconds. Configure any reverse proxy to forward SSE without buffering. [Vercel Functions limits](https://vercel.com/docs/functions/limitations)

Deployment requires separate approval. Before opening public access, verify auth abuse controls, email recovery, session revocation, and database backup and restoration.
