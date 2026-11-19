# QueueWindow

QueueWindow is a multi-tenant service queue. Phase 2 adds multi-counter issuance and desk actions, owner administration and analytics, public admission and ticket status, and the TV display API and event stream.

## Run locally

1. Use Node.js 22 or newer and run `npm ci`.
2. Copy `.env.example` to `.env.local`. Set `DATABASE_URL` to a Neon PostgreSQL connection string and generate a random `JWT_SECRET` using the command in the example.
3. Follow the [database setup](docs/DEPLOYMENT.md) for a fresh database or an existing Phase 1 database.
4. Run `npm run dev` and open [Create a workspace](http://127.0.0.1:3000/signup). Signup creates an owner and one counter. Sign in with the owner's email or username.

See the [architecture and API routes](docs/ARCHITECTURE.md) and [verification record](docs/VERIFICATION.md).

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Set `QW_TEST_DATABASE_URL` to a disposable loopback PostgreSQL database before `npm test` to include the integration suite. The test database user needs permission to create and drop a temporary schema. Tests apply both SQL migrations inside that schema.

Browser checks can use an existing Chromium binary via `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Set `QW_TEST_PORT` to change the local test port.
