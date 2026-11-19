# Phase 1 environment setup

Use a configured Neon PostgreSQL database. Put the connection string in `DATABASE_URL` and a randomly generated signing key of at least 32 bytes in `JWT_SECRET`. Keep both server-side. Set `APP_URL` to the exact HTTPS origin when hosting the app.

Drizzle Kit loads `.env.local` and honors an existing process-level `DATABASE_URL`. Confirm the target and review the proposed SQL when running `npx drizzle-kit push`. Use a separate database for development and production. The baseline SQL is for fresh databases. Use one schema application method per environment so the baseline is not applied twice. Phase 1 does not migrate records from the previous SQLite release.

Deployment requires separate approval. Before opening public access, add auth abuse controls and verify email recovery, session revocation, and database backups and restoration.
