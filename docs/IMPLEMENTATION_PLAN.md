# Implementation record

Phase 1 on the SaaS rebuild branch replaces the v1 application runtime with the Neon schema and organization authentication. See [Phase 1 architecture](ARCHITECTURE.md) for current behavior.

The latest brief authorizes local implementation and independent art direction. Paid resources, GitHub pushes, and deployment remain separate approval steps.

## Delivered locally

- Next.js application and libSQL schema with local persistent storage.
- Transactional queue rules and capability-based visitor access.
- Staff authentication, server authorization, and isolated browser-test fixtures.
- Staff, visitor, public display, QR/print, and business customization interfaces.
- Unit/database tests and browser journeys with accessibility checks.

## Review and release checks

Run unit tests, type checking, lint, browser tests, and production build. Resolve failures and record actual results in the final handoff. Hosted Turso and Vercel remain unverified until credentials and deployment are approved. See DEPLOYMENT.md for setup and smoke tests.

The workspace has a local Git history.

## English frontend replacement

The rejected counter visual module and stylesheet were removed. The active interface now lives in `src/features/workspace`, with English copy, Manrope typography, an interactive entry preview, an open staff station, a visitor status page, and a blue public display. Existing request, authorization, polling, and queue behavior remain intact. Verified local checks are recorded in VERIFICATION.md.

## Self-service release

The same queue accepts requests from the staff desk, a posted QR sign, and the kiosk. Staff enable visitor access explicitly. Host the app on a publicly reachable HTTPS origin, then verify mobile data, signage, and the selected printer at the venue before opening admission.
