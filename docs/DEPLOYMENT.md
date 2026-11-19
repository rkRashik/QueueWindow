# Environment setup

Use a configured Neon PostgreSQL database. Set `DATABASE_URL` and a random `JWT_SECRET` of at least 32 bytes in `.env.local`. Use the exact public HTTPS origin in `APP_URL` when hosting.

## Database upgrade

Run `npx drizzle-kit migrate` for new databases and databases with Drizzle's migration ledger. The configured Neon database was originally initialized with Drizzle Kit push. Its existing Phase 1 schema was verified and registered as a baseline before applying Phase 2 with migrate. Check the target before applying migrations.

## Public admission and stream

Vercel supplies the client IP header used by public admission. On another host, set `TRUSTED_CLIENT_IP_HEADER` only to a header your reverse proxy overwrites with a single verified client IP. Requests with no trusted IP share one admission bucket per organization. [Vercel request headers](https://vercel.com/docs/headers/request-headers)

The SSE route uses a 30-second function limit and closes streams after 25 seconds. Configure any reverse proxy to forward SSE without buffering. [Vercel Functions limits](https://vercel.com/docs/functions/limitations)

## QR signs and receipts

Set `APP_URL` to the public origin before printing a sign or issuing kiosk receipts. Visitors' phones must be able to reach that origin. Use A4 for the venue sign. Select 58 mm or 80 mm in the kiosk and match the width in the printer dialog. Browser print headers and footers can be turned off in the dialog.

Deployment requires separate approval. Before opening public access, verify auth abuse controls, email recovery, session revocation, and database backup and restoration.
