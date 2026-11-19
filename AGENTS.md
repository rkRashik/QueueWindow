# QueueWindow development rules

## Scope and workflow
- Read the four documents in `docs/` before work. Phase 0 contains proposals, not approved implementation decisions.
- Confirmed scope: a fully functional portfolio application first, $0 initial development/hosting budget, Bangladesh context, about 100 demo tickets/day, one location/desk, FIFO, and no sensitive visitor data. Real clinic deployment is a later readiness decision.
- The latest brief authorizes local implementation, dependencies, testing, and independent design decisions. Do not create paid resources, push, or deploy without approval.
- Inspect existing files and Git status before editing. Preserve unrelated changes and local settings.
- Prefer small, reviewable changes. Use strict TypeScript where appropriate and pin dependencies with a lockfile after setup is authorized.

## Engineering
- Keep queue rules independent of React, HTTP, and database clients. Use feature modules with thin transport handlers and explicit transaction boundaries.
- Validate input on the server. Authenticate and authorize every staff operation; never trust browser-supplied business membership.
- Enforce queue invariants in libSQL transactions and constraints. Test concurrent requests and retries. Never use browser state as the queue authority.
- Use lightweight polling with visibility and offline handling. Design mobile-first, including a separate large-screen public display.
- Keep secrets and visitor link tokens out of logs, analytics, source control, and client bundles. Return safe errors with request IDs.
- Use semantic HTML, visible focus, accessible names, clear errors, and reduced motion. Never communicate queue state through color alone.

## Skills
- Read only skills relevant to the current task. User scope and instructions take precedence over skill defaults.
- Use `grilling` for unresolved decisions and `domain-modeling` for vocabulary and state rules. Ask focused rounds; record assumptions explicitly.
- Use `frontend-design`, `ui-ux-pro-max`, and `impeccable` for direction; `emil-design-eng` for interaction polish. Do not run all design skills for every edit.
- Use `vercel-react-best-practices` for React work and `web-design-guidelines` for UI review; use accessibility skills when a working surface exists.
- Use `test-driven-development` for important logic, `systematic-debugging` for failures, and `verification-before-completion` before success claims. Use Supabase and security skills when relevant.
- Do not install tools merely to satisfy a skill. Explain unavailable tooling and use a permitted fallback.

## Tests and documentation
- Test state transitions, ordering, authorization, token boundaries, transactions, and idempotency. Use real SQLite/libSQL for database behavior.
- Require type checking, linting, relevant automated tests, and production build before calling an implementation complete. Record exact results; never invent coverage or benchmarks.
- Review UI on mobile and desktop with keyboard, screen reader, zoom, and automated accessibility checks. Automation alone does not prove accessibility.
- Keep English documentation short and concrete. Update docs with behavior changes; distinguish proposals, approved decisions, and verified results.
- Keep proposed vocabulary in the product brief; create `GLOSSARY.md` when terms are approved. Use ADRs only for consequential trade-offs that need lasting explanation.
