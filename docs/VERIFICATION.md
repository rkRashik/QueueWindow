# Verification

## SaaS Phase 2 (19 November 2026)

- Typecheck, ESLint, the production build, and Drizzle migration validation passed. Next.js used the Proxy convention.
- Vitest passed all 20 tests across 4 files with a disposable local PostgreSQL 18 database. The tests applied both migrations and covered concurrent issuance, retries, daily reset, tenant isolation, role enforcement on every admin method, expiry, desk transitions, rate limiting, public ticket privacy, and SSE updates and closure.
- The production build passed all 6 Chromium regression tests, including protected page routes and account sign-out.
- Phase 2 SQL was verified locally. Hosted Neon still needs the Phase 2 migration, and hosted Vercel streaming remains unverified.


## SaaS Phase 1 (19 November 2026)

- Drizzle Kit applied the four-table schema to the configured Neon database.
- Typecheck, ESLint, seven Vitest tests, and the production build passed. Next.js emitted a deprecation warning for the requested middleware file convention.
- Six Chromium tests passed against the production build. They covered route protection, foreign Origin rejection, keyboard operation, accessible form names, sampled axe checks, mobile and desktop reflow, simulated 200% zoom, and form sign-out. Native screen readers remain untested.
- A live Neon smoke test passed simultaneous duplicate signup and rollback, the trial and default counter, cookie flags, browser signup and sign-out, owner and email-free staff access, email and username login, and PostgreSQL rejection of a cross-tenant ticket. Both synthetic organizations were removed.


## English frontend rebuild - 19 November 2026

- TypeScript check and ESLint passed.
- 11 unit/database tests passed.
- All four Chromium journeys passed against the local production build (27.3 seconds): queue lifecycle/persistence; settings, offline recovery and keyboard dialogs; authorization/isolation; and sampled accessibility, print, reflow and reduced-motion checks.
- `npm run build` passed. Local production testing used a randomly generated process-local APP_SECRET and a separate persistent database at `.artifacts/english-review-final.db`. No stored credentials or original database were changed.
- Earlier runs caught an invalid ARIA label on a decorative progress strip, exhausted the demo login rate limit through repeated test runs, and lacked APP_SECRET in production mode. The label was removed; final tests used correctly configured isolated review data. Security controls were not weakened.
- Render captures at 390, 768, 1440, and 1920 pixels are in `.artifacts/english-workspace`. The capture script checked horizontal overflow, live visitor calls, TV vertical fit, reduced motion, and page errors. WebM recordings are in its `recordings` subfolder.
- Visual review identified mobile header wrapping, a low-positioned preview control, inconsistent sample ticket sequencing, and small secondary staff labels. All four fixes were re-reviewed against fresh captures and resolved.
- Impeccable reported no primary detector findings. Advisory findings remain for secondary color and type values not enumerated in DESIGN.md. No detector ignores were added.

This is a sampled browser review, not a WCAG conformance claim. Native screen readers, physical touch devices, TV viewing distance, and real users have not been tested in this rebuild. Bangla localization is deferred. Hosted database behavior and Vercel deployment remain unverified.

The backend, database schema, authentication, and queue rules were preserved. No deployment or push was performed. Old rejected frontend screenshots were removed.

## Staff and display redesign

Production build, typecheck, lint, 11 unit and database tests, and four Chromium journeys passed. Browser journeys exercised repeat calls on the public display, the service timer, and saving display preferences. The capture run covered 390, 768, 1440 and 1920 pixel widths with isolated demo data. Physical TV audio and screen-reader behavior still need hands-on review.

## Self-service admission and settings

The production build, typecheck, lint, and 12 unit/database tests passed. All five Chromium journeys passed across the final suite and the targeted rerun of the phone and kiosk journey. The targeted run also simulated a lost successful response and retried without issuing a duplicate. The phone flow worked with newer browser UUID and timeout APIs removed. Screenshots cover authenticated staff settings, the venue QR sign, mobile admission, private ticket updates, kiosk receipts, and a Bangla TV display. Chromium exported a sample receipt PDF.

Deployment, scans over mobile carrier networks, thermal printers, and physical TV speakers were not tested. Review those on the intended venue hardware and network. The browser displays a print dialog unless the venue configures managed printing. Public admission requires access to the queue server.
