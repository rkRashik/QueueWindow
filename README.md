# QueueWindow

QueueWindow is a multi-tenant, multi-counter queue management SaaS for clinics, banks, and service desks. Staff and visitors can use it in Bangla or English, and tickets collect no visitor names, contact details, or other personal information.

## Key features

- Organization-scoped queues, staff accounts, and owner controls.
- Keyboard-first staff desk for issuing, calling, recalling, skipping, and completing tickets.
- Bilingual TV display grid with live updates over Server-Sent Events (SSE).
- Mobile live ticket with queue position and estimated wait.
- Printable A4 QR signs and kiosk receipts for 58 mm and 80 mm thermal printers.
- One-click live demo with a shared queue.

## Tech stack

- Application · Next.js App Router and TypeScript
- Database · PostgreSQL on Neon
- Schema and migrations · Drizzle ORM and Drizzle Kit
- Styling and motion · Tailwind CSS and Framer Motion
- Testing · Vitest and Playwright

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing page and live demo entry |
| `/login` | Owner and staff sign-in |
| `/signup` | Create an organization and owner account |
| `/desk` | Staff queue operations |
| `/admin` | Owner dashboard for counters, staff, branding, and analytics |
| `/display/[orgSlug]` | Public TV display |
| `/join/[orgSlug]` | Mobile self-service ticket issuance |
| `/join/[orgSlug]/ticket/[ticketId]` | Private live ticket and wait estimate |
| `/kiosk/[orgSlug]` | On-site ticket issuance and receipt printing |
| `/print/[orgSlug]/qr` | Printable venue QR sign |

## Local development

Use Node.js 22 and a Neon PostgreSQL database for development. From the repository root, install dependencies, copy the environment template, and generate a signing key.

```sh
npm ci
cp .env.example .env.local
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Edit `.env.local`. Replace the `DATABASE_URL` value with your Neon connection string and set `JWT_SECRET` to the generated key. Leave `APP_URL` empty for local development.

```sh
npx drizzle-kit migrate
npm run dev
```

Open <http://127.0.0.1:3000> and sign up or select **Try Live Demo**.

## Testing and checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

- Set `QW_TEST_DATABASE_URL` in your shell to a disposable PostgreSQL database on localhost to include the Vitest integration suite. It applies migrations in a temporary schema. GitHub Actions provides PostgreSQL 16 for this suite.
- Set `QW_E2E_DATABASE_URL` in your shell to an isolated, migrated Neon test database without an existing `demo-clinic` organization to run all Playwright journeys. Playwright starts the production build locally.

## Deployment

Import the repository as a Next.js project on Vercel. Set `DATABASE_URL` to the production Neon connection string, generate a separate `JWT_SECRET`, and set `APP_URL` to the public HTTPS origin. Run `npx drizzle-kit migrate` against the production database before serving traffic. Configure preview deployments with a separate database and their own origin settings. [Vercel environment variables](https://vercel.com/docs/environment-variables)
