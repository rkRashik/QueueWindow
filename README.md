# QueueWindow

QueueWindow is rebuilding its service queue as a multi-tenant application. Phase 1 provides organization signup, staff sign-in, and authenticated entry points for the desk and owner administration.

## Run locally

1. Use Node.js 22 or newer and run `npm ci`.
2. Copy `.env.example` to `.env.local`. Set `DATABASE_URL` to a Neon PostgreSQL connection string and generate a random `JWT_SECRET` using the command in the example.
3. Run `npx drizzle-kit push`. Review the proposed schema changes before applying them to the configured database.
4. Run `npm run dev` and open [Create a workspace](http://127.0.0.1:3000/signup). Signup creates an owner and one counter. Sign in with the owner's email or username.

## Checks

```sh
npm test
npm run lint
npm run build
npm run typecheck
npm run test:e2e
```

Browser checks can use an existing Chromium binary via `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Set `QW_TEST_PORT` to change the local test port.

See [architecture](docs/ARCHITECTURE.md), [environment setup](docs/DEPLOYMENT.md), and [verification](docs/VERIFICATION.md). The previous single-counter release is available in the history of `main`.
