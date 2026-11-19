import { Pool } from "pg";
import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const database = process.env.QW_E2E_DATABASE_URL;

test("demo connects the staff desk, visitor ticket, and bilingual TV", async ({
  page,
  browser,
  baseURL,
}) => {
  test.skip(!database, "Set QW_E2E_DATABASE_URL to a loopback test database.");
  test.setTimeout(90_000);
  if (!["127.0.0.1", "localhost"].includes(new URL(database!).hostname))
    throw new Error("The public journey resets demo-clinic; use a loopback database.");

  const pool = new Pool({ connectionString: database });
  // Start from a fresh seed so token numbers are known.
  await pool.query("delete from organizations where slug = $1 and plan = 'DEMO'", [
    "demo-clinic",
  ]);
  const visitor = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });

  try {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Every screen.");
    await page.getByRole("button", { name: "Open live demo" }).click();
    await expect(page).toHaveURL(/\/desk$/);
    await expect(page.getByText("· Live demo")).toBeVisible();

    const guest = await visitor.newPage();
    await guest.goto("/join/demo-clinic");
    await expect(guest.locator(".visitor-head svg.venue-mark")).toBeVisible();
    await expect(guest.getByRole("button", { name: "EN", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    // Wait estimates never contradict themselves.
    await expect(guest.getByRole("main")).not.toContainText(/No wait.*min/);
    await guest.route(
      "**/api/public/demo-clinic/join",
      async (route) => {
        expect((await route.fetch()).status()).toBe(201);
        await route.abort("connectionreset");
      },
      { times: 1 },
    );
    await guest.getByRole("button", { name: /Reception/ }).click();
    await expect(guest.getByRole("main").getByRole("alert")).toContainText(
      "Try the same counter again.",
    );
    await guest.reload();
    await guest.getByRole("button", { name: /Reception/ }).click();
    await expect(guest).toHaveURL(/\/join\/demo-clinic\/ticket\/[a-f0-9-]+$/);
    const ticket = guest.getByRole("region", { name: "Your ticket" });
    // Seed: A-05 at the counter, A-06..A-08 waiting, so the retried join is A-09.
    await expect(ticket.getByText("A-09", { exact: true })).toBeVisible();
    expect(
      (await new AxeBuilder({ page: guest }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
        .violations,
    ).toEqual([]);

    const tv = await visitor.newPage();
    await tv.setViewportSize({ width: 1280, height: 800 });
    await tv.addInitScript(() => {
      const createOscillator = AudioContext.prototype.createOscillator;
      AudioContext.prototype.createOscillator = function () {
        const oscillator = createOscillator.call(this);
        const start = oscillator.start.bind(oscillator);
        oscillator.start = (when) => {
          const root = document.documentElement;
          root.dataset.chimeTones = [root.dataset.chimeTones, oscillator.frequency.value]
            .filter(Boolean).join(",");
          start(when);
        };
        return oscillator;
      };
      window.speechSynthesis.speak = (utterance) => {
        document.documentElement.dataset.announcement = `${utterance.rate.toFixed(2)} ${utterance.text}`;
      };
    });
    await tv.goto("/display/demo-clinic");
    await expect(tv.locator("main.board")).toHaveClass(/surface-dark/);
    await expect(tv.locator(".board-venue svg.venue-mark")).toBeVisible();
    const controls = tv.getByRole("group", { name: "Display controls" });
    await expect(controls).toHaveCSS("opacity", "0");
    await tv.mouse.move(400, 300);
    await expect(controls).toHaveCSS("opacity", "0");
    await tv.keyboard.press("Tab");
    await tv.keyboard.press("Tab");
    await expect(tv.getByRole("button", { name: "Fullscreen (F)" })).toBeFocused();
    await expect(controls).toHaveCSS("opacity", "1");
    await tv.mouse.move(400, 35);
    await tv.getByRole("button", { name: "Both", exact: true }).click();
    await expect(tv.getByText("এখন ডাকছেন", { exact: true }).first()).toBeVisible();
    await expect(tv.getByText("Now serving", { exact: true }).first()).toBeVisible();
    const reception = tv.locator(".board-row", { hasText: "Reception" });
    const shown = reception.locator(".drum .sr-only");
    await expect(shown).toHaveText("A-05");

    const now = page.locator(".desk-now");
    for (const token of ["A-06", "A-07", "A-08", "A-09"]) {
      await page.getByRole("button", { name: /^Call next/ }).click();
      await expect(now.locator(".drum .sr-only")).toHaveText(token);
    }
    await expect(shown).toHaveText("A-09");
    await expect(reception).toHaveAttribute("data-calling", "true");
    await expect(ticket.getByText("It’s your turn!", { exact: true })).toBeVisible();

    // Pointer activity below the header leaves the idle controls hidden.
    await expect(tv.locator(".board")).toHaveAttribute("data-awake", "false", { timeout: 6_000 });
    const dock = (await tv.locator(".board-controls").boundingBox())!;
    const firstRow = (await tv.locator(".board-row").first().boundingBox())!;
    expect(dock.y + dock.height).toBeLessThanOrEqual(firstRow.y);
    await tv.mouse.move(500, 400);
    await expect(controls).toHaveCSS("opacity", "0");
    await tv.mouse.move(500, 35);
    await tv.getByRole("button", { name: "Light board" }).click();
    await expect(tv.locator("main.board")).not.toHaveClass(/surface-dark/);
    await tv.getByRole("button", { name: "Audio & Voice" }).click();
    const chime = tv.getByLabel("Chime sound");
    await expect(chime).toHaveValue("airport");
    await chime.selectOption("marimba");
    await tv.getByLabel("Voice announcements").check();
    await tv.getByLabel("Speech language").selectOption("bn");
    await tv.getByLabel("Speech speed").selectOption("1.15");
    await tv.locator("html").evaluate((root) => delete root.dataset.chimeTones);
    await tv.getByRole("button", { name: "Test sound" }).click();
    await expect(tv.locator("html")).toHaveAttribute("data-chime-tones", /^392,523\.25,659\.2/);
    await expect(tv.locator("html")).toHaveAttribute("data-announcement", /^1\.15 টিকিট A 01/);
    await tv.keyboard.press("Escape");
    await expect(tv.getByRole("button", { name: "Audio & Voice" })).toBeFocused();
    await tv.reload();
    await tv.mouse.move(510, 35);
    await tv.getByRole("button", { name: "Audio & Voice" }).click();
    await expect(chime).toHaveValue("marimba");
    await expect(tv.getByLabel("Speech language")).toHaveValue("bn");
    const panel = (await tv.locator(".board-audio-panel").boundingBox())!;
    const stage = (await tv.locator(".board-stage").boundingBox())!;
    expect(panel.y + panel.height).toBeLessThanOrEqual(stage.y);

    const touch = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, hasTouch: true });
    try {
      const display = await touch.newPage();
      await display.goto("/display/demo-clinic?chime=bell&voice=on&speechLang=en&speechRate=0.85");
      const dock = display.getByRole("group", { name: "Display controls" });
      await expect(dock).toHaveCSS("opacity", "0");
      await display.touchscreen.tap(180, 400);
      await expect(dock).toHaveCSS("opacity", "1");
      await display.getByRole("button", { name: "Audio & Voice" }).tap();
      await expect(display.getByLabel("Chime sound")).toHaveValue("bell");
      await expect(display.getByLabel("Speech speed")).toHaveValue("0.85");
      expect(await display.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    } finally {
      await touch.close();
    }

    const print = await visitor.newPage();
    await print.goto("/print/demo-clinic/qr");
    await expect(print.locator(".poster-venue svg.venue-mark")).toBeVisible();
    await expect(print.getByRole("img", { name: "Join queue QR code" })).toBeVisible();
    await print.emulateMedia({ media: "print" });
    await expect(print.getByRole("button", { name: "Print sign" })).toBeHidden();

    const kiosk = await visitor.newPage();
    await kiosk.clock.install();
    await kiosk.goto("/kiosk/demo-clinic");
    await kiosk.getByRole("button", { name: "EN", exact: true }).click();
    await kiosk.getByRole("button", { name: /Reception/ }).click();
    await expect(kiosk.getByRole("img", { name: "Track this ticket QR code" })).toBeVisible();
    await expect(kiosk.locator(".receipt svg.venue-mark")).toBeVisible();
    await expect(kiosk.locator(".receipt time")).toBeVisible();
    await expect(kiosk.getByRole("button", { name: "80 mm" })).toHaveAttribute("aria-pressed", "true");
    for (const width of [80, 58]) {
      await kiosk.getByRole("button", { name: `${width} mm` }).click();
      const pdf = (await kiosk.pdf({ preferCSSPageSize: true })).toString("latin1");
      expect(pdf.match(/\/Type\s*\/Page\b/g)).toHaveLength(1);
      const printWidth = Number(pdf.match(/\/MediaBox\s*\[0 0 ([\d.]+)/)?.[1]);
      expect(Math.abs(printWidth - (width / 25.4) * 72)).toBeLessThan(1);
    }
    await kiosk.emulateMedia({ media: "print" });
    await expect(kiosk.getByRole("button", { name: "Print receipt" })).toBeHidden();
    await kiosk.emulateMedia({ media: "screen" });
    await kiosk.getByRole("button", { name: "Done", exact: true }).click();
    await expect(kiosk.getByRole("button", { name: /Reception/ })).toBeVisible();

    const longName = "W".repeat(100);
    const venue = await pool.query<{ id: string }>(
      "update organizations set name = $1 where slug = 'demo-clinic' and plan = 'DEMO' returning id",
      [longName],
    );
    await pool.query("update counters set name = $1 where org_id = $2 and prefix = 'A'", [longName, venue.rows[0].id]);
    await kiosk.route("**/api/public/demo-clinic/join", async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, json: { ...await response.json(), tokenNumber: "WW-2147483647" } });
    }, { times: 1 });
    await kiosk.reload();
    await kiosk.getByRole("button", { name: "Both", exact: true }).click();
    await kiosk.getByRole("button", { name: new RegExp(longName) }).click();
    await expect(kiosk.getByRole("img", { name: "Track this ticket QR code" })).toBeVisible();
    await expect(kiosk.getByRole("button", { name: "58 mm" })).toHaveAttribute("aria-pressed", "true");
    await expect(kiosk.locator(".receipt-token")).toHaveText("WW-2147483647");
    await expect(kiosk.locator(".receipt")).toHaveAttribute("data-long", "true");
    await kiosk.emulateMedia({ media: "print" });
    await expect(kiosk.locator(".receipt")).toHaveCSS("print-color-adjust", "exact");
    const longReceipt = (await kiosk.pdf({ preferCSSPageSize: true })).toString("latin1");
    expect(longReceipt.match(/\/Type\s*\/Page\b/g)).toHaveLength(1);
    const [, pageWidth, pageHeight] = longReceipt.match(/\/MediaBox\s*\[0 0 ([\d.]+) ([\d.]+)/)!.map(Number);
    expect(Math.abs(pageWidth - (58 / 25.4) * 72)).toBeLessThan(1);
    const printHeight = Math.floor((pageHeight / 72) * 96);
    await kiosk.setViewportSize({ width: 219, height: printHeight });
    await kiosk.emulateMedia({ media: "print" });
    await expect(kiosk.locator(".receipt")).toHaveCSS("print-color-adjust", "exact");
    const printed = await kiosk.locator(".receipt").evaluate((receipt) => {
      const { width, height } = receipt.getBoundingClientRect();
      return { width, height };
    });
    expect(printed.height).toBeLessThanOrEqual(printHeight);
    expect(printed.width).toBeLessThanOrEqual(219);
    await kiosk.emulateMedia({ media: "screen" });
    await kiosk.setViewportSize({ width: 390, height: 844 });
    await kiosk.clock.fastForward(30_100);
    await expect(kiosk.getByRole("button", { name: new RegExp(longName) })).toBeVisible();
  } finally {
    await visitor.close();
    try {
      await pool.query("delete from organizations where slug = $1 and plan = 'DEMO'", [
        "demo-clinic",
      ]);
    } finally {
      await pool.end();
    }
  }
});
