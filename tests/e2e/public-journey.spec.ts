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
    await tv.goto("/display/demo-clinic");
    await expect(tv.locator("main.board")).toHaveClass(/surface-dark/);
    await tv.mouse.move(400, 300);
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

    // Controls fade after 3 s idle and never sit on top of the board.
    await expect(tv.locator(".board")).toHaveAttribute("data-awake", "false", { timeout: 6_000 });
    const dock = (await tv.locator(".board-controls").boundingBox())!;
    const firstRow = (await tv.locator(".board-row").first().boundingBox())!;
    expect(dock.y + dock.height).toBeLessThanOrEqual(firstRow.y);
    await tv.mouse.move(500, 400);
    await tv.getByRole("button", { name: "Light board" }).click();
    await expect(tv.locator("main.board")).not.toHaveClass(/surface-dark/);

    const print = await visitor.newPage();
    await print.goto("/print/demo-clinic/qr");
    await expect(print.getByRole("img", { name: "Join queue QR code" })).toBeVisible();
    await print.emulateMedia({ media: "print" });
    await expect(print.getByRole("button", { name: "Print sign" })).toBeHidden();

    const kiosk = await visitor.newPage();
    await kiosk.clock.install();
    await kiosk.goto("/kiosk/demo-clinic");
    await kiosk.getByRole("button", { name: "EN", exact: true }).click();
    await kiosk.getByRole("button", { name: /Reception/ }).click();
    await expect(kiosk.getByRole("img", { name: "Track this ticket QR code" })).toBeVisible();
    await kiosk.emulateMedia({ media: "print" });
    await expect(kiosk.getByRole("button", { name: "Print receipt" })).toBeHidden();
    await kiosk.emulateMedia({ media: "screen" });
    await kiosk.getByRole("button", { name: "Done", exact: true }).click();
    await expect(kiosk.getByRole("button", { name: /Reception/ })).toBeVisible();
    await kiosk.getByRole("button", { name: /Reception/ }).click();
    await expect(kiosk.getByRole("img", { name: "Track this ticket QR code" })).toBeVisible();
    await kiosk.clock.fastForward(30_100);
    await expect(kiosk.getByRole("button", { name: /Reception/ })).toBeVisible();
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
