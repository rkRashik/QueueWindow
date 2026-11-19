# QueueWindow

A single-counter queue for service desks. Staff manage one FIFO line. Visitors can take a ticket from a QR sign or a shared kiosk and follow their turn on a private page. The waiting room has a separate public display.

## Run locally

Use Node.js 22 or newer.

1. Run `npm ci`.
2. Copy `.env.example` to `.env.local`. Generate an `APP_SECRET`, then run `npm run password` to hash a staff password of at least 12 characters. End input with Ctrl+Z then Enter on Windows, or Ctrl+D on macOS/Linux. Store the printed hash in `STAFF_PASSWORD_HASH`.
3. Run `npm run dev` and open http://127.0.0.1:3000/login. The local queue is persisted in `data/queuewindow.db`.

## Set up a venue

1. In **Settings**, enter the venue and counter names. Under **Visitor access**, allow self-service, then save. Open **Visitor access** in the staff header to print the QR sign or open the shared kiosk.
2. Use a publicly reachable HTTPS origin before printing a sign for visitors. A localhost link is only usable on the host computer. Test the posted QR on venue Wi-Fi and mobile data. Visitors can switch between Bangla and English.
3. Open **Public display** on a TV or monitor. Choose the display language, theme, upcoming count and chime in Settings. Chimes are off by default. If enabled, press **Call sound** on the TV once after loading it. The settings preview lets staff audition each sound.
4. At the kiosk, choose **Get a ticket** and **Print ticket**. Select the installed printer in the browser dialog. Configure the paper width and test the receipt and QR on the actual printer. For unattended printing, a managed kiosk browser and preconfigured printer are needed. Visitors can also scan the receipt QR without printing. **Done** clears the shared screen, and the screen clears automatically after 90 seconds.
5. Staff can keep timing off, show elapsed time, or add a service target. The target bar is staff-only. Pausing blocks new staff and self-service tickets while leaving existing tickets available to serve.

If a connection drops during issuance, retry from the same tab. Its request key lets the server return the original ticket. The kiosk also needs a working connection to issue tickets. During an outage, direct visitors to staff and use the venue's paper fallback until the queue is reachable again.

## Checks

```sh
npm test
npm run lint
npm run build
npm run typecheck
npx playwright install chromium
npm run test:e2e
```

Browser tests use an isolated database and an explicit test-only workspace fixture. Set `QW_TEST_PORT` to use a different port and `PLAYWRIGHT_CHROMIUM_EXECUTABLE` for an existing Chromium installation. Production staff sign-in requires credentials.

See [architecture](docs/ARCHITECTURE.md), [deployment](docs/DEPLOYMENT.md), and [product scope](docs/PRODUCT_BRIEF.md). The app does not collect visitor names, phone numbers, or medical information.
