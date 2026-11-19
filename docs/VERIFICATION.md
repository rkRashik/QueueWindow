# Verification

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
