# Vercel deployment

Deployment is not performed yet. The intended free combination is Vercel Hobby for a personal noncommercial portfolio and Turso Free for persistent storage. Recheck terms and quotas before publishing: [Vercel pricing](https://vercel.com/pricing), [Turso pricing](https://turso.tech/pricing).

## Database

Create a free Turso account and install its CLI using the official instructions. Do not select paid capacity.

```sh
turso auth login
turso db create queuewindow
turso db show queuewindow --url
turso db tokens create queuewindow
```

Save the URL and token as TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in `.env.local`. Use a libsql:// remote URL. Generate a random APP_SECRET of at least 32 characters, and optionally configure STAFF_PASSWORD_HASH for owner sign-in. Run `npm run db:setup` to initialize the remote schema. This command writes to whichever database you configure; check its target first. Never commit `.env.local`.

## Vercel

After approval, import the project using the Next.js preset. Use `npm ci` and `npm run build`. Set TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, APP_SECRET, STAFF_PASSWORD_HASH, and APP_URL (the exact HTTPS origin). Do not expose these as NEXT_PUBLIC variables. Set Node.js 22 or newer. Use separate databases for preview and production; never use local SQLite or JSON files on Vercel.

Smoke-test owner login, QR admission, kiosk receipt printing, two simultaneous issuance requests, competing Call next actions, visitor expiry, public display, and persistence after redeployment. Confirm Secure cookies and cross-origin rejection over HTTPS. Monitor requests and database rows read/written; stop or restrict public admission traffic at quota limits rather than enabling paid upgrades.

## Known operational gaps

Hosted behavior, backups/restoration, email recovery, and production incident handling have not been verified. Real clinic use needs individual staff accounts, a retention/cleanup policy, monitored recovery, suitable commercial hosting, and privacy review. Do not treat the free portfolio configuration as a clinic deployment.
