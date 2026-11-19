# QueueWindow

A small, working queue application with a staff desk, private visitor tickets, and a large-screen public display. Visitors need no account. Demo sessions have isolated, persistent queues and expire after 24 hours.

## Run locally

Use Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000 and choose **Try the demo**. Local SQLite storage is created in `data/queuewindow.db`; it survives restarts. No cloud credentials are needed for the demo.

The interface is English-first. The homepage has an interactive queue preview; **Call next** demonstrates how a visitor is notified. In the actual demo workspace, open a ticket and the public display in separate tabs to see persistent queue updates.

For owner sign-in, copy `.env.example` to `.env.local`, generate `APP_SECRET`, and set `STAFF_PASSWORD_HASH`. Run `npm run password`, type a password of at least 12 characters on stdin, then end input (Ctrl+Z then Enter on Windows). Store the printed hash, not the password. Restart the server after changing environment variables.

## Checks

```sh
npm test
npm run typecheck
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

Browser tests default to localhost port 3000. Set `QW_TEST_PORT` to use another port. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` only if using an existing Chromium installation. Do not run a build while changing source or running browser tests against the development server.

## How it works

Next.js serves the UI and authenticated HTTP endpoints. libSQL transactions allocate ticket numbers, validate transitions, record commands, and enforce one active ticket per queue. Visitors use an unguessable private capability in the URL fragment. Clients poll every five seconds while visible and refetch after staff actions. No websocket service is required.

See [architecture](docs/ARCHITECTURE.md), [deployment](docs/DEPLOYMENT.md), and [product scope](docs/PRODUCT_BRIEF.md). This is a portfolio application, not a medical records system. No patient information should be entered.
