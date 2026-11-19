import { Pool } from "@neondatabase/serverless";
import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const database = process.env.QW_E2E_DATABASE_URL;

test("demo connects the staff desk, visitor ticket, and bilingual TV", async ({
  page,
  browser,
  baseURL,
}) => {
  test.skip(!database, "Set QW_E2E_DATABASE_URL to a test database.");
  test.setTimeout(70_000);

  const pool = new Pool({ connectionString: database });
  const visitor = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const guard = await pool.query(
    "select 1 from organizations where slug = $1",
    ["demo-clinic"],
  );
  if (guard.rowCount) {
    await visitor.close();
    await pool.end();
    throw new Error(
      "Use an isolated test database without a preexisting demo-clinic.",
    );
  }

  try {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "waiting room",
    );
    await page
      .getByRole("button", { name: "Try Live Demo", exact: true })
      .first()
      .click();
    await expect(page).toHaveURL(/\/desk$/);
    await expect(page.getByText("Live demo", { exact: true })).toBeVisible();

    const guest = await visitor.newPage();
    await guest.goto("/join/demo-clinic");
    await expect(
      guest.getByRole("button", { name: "EN", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await guest.route(
      "**/api/public/demo-clinic/join",
      async (route) => {
        expect((await route.fetch()).status()).toBe(201);
        await route.abort("connectionreset");
      },
      { times: 1 },
    );
    await guest.getByRole("button", { name: /Counter 1.*Reception/ }).click();
    await expect(guest.getByRole("main").getByRole("alert")).toContainText(
      "Try the same counter again.",
    );
    await guest.reload();
    await guest.getByRole("button", { name: /Counter 1.*Reception/ }).click();
    await expect(guest).toHaveURL(/\/join\/demo-clinic\/ticket\/[a-f0-9-]+$/);
    const ticket = guest.getByRole("region", { name: "Your ticket" });
    await expect(ticket.getByText("A-04", { exact: true })).toBeVisible();
    expect(
      (
        await new AxeBuilder({ page: guest })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);

    const tv = await visitor.newPage();
    await tv.setViewportSize({ width: 1280, height: 800 });
    await tv.goto("/display/demo-clinic");
    await tv.getByRole("button", { name: "Both", exact: true }).click();
    await expect(
      tv.getByText("এখন ডাকছেন", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      tv.getByText("NOW SERVING", { exact: true }).first(),
    ).toBeVisible();
    const reception = tv.getByRole("region", { name: /Counter 1.*Reception/ });
    await expect(reception.getByTestId("tv-called-token")).toHaveText("A-01");

    const desk = page.getByRole("region", { name: "Now serving" });
    for (const token of ["A-02", "A-03", "A-04"]) {
      await page.getByRole("button", { name: "Call next" }).click();
      await expect(
        desk.getByText(token, { exact: true }).first(),
      ).toBeVisible();
    }
    await expect(reception.getByTestId("tv-called-token")).toHaveText("A-04");
    await expect(
      ticket.getByText("It’s your turn!", { exact: true }),
    ).toBeVisible();

    const print = await visitor.newPage();
    await print.goto("/print/demo-clinic/qr");
    await expect(
      print.getByRole("img", { name: "Join queue QR code" }),
    ).toBeVisible();
    await print.emulateMedia({ media: "print" });
    await expect(
      print.getByRole("button", { name: "Print QR sign" }),
    ).toBeHidden();

    const kiosk = await visitor.newPage();
    await kiosk.clock.install();
    await kiosk.goto("/kiosk/demo-clinic");
    await kiosk.getByRole("button", { name: "EN", exact: true }).click();
    await kiosk.getByRole("button", { name: /Counter 1.*Reception/ }).click();
    await expect(
      kiosk.getByRole("img", { name: "Track this ticket QR code" }),
    ).toBeVisible();
    await kiosk.emulateMedia({ media: "print" });
    await expect(
      kiosk.getByRole("button", { name: "Print receipt" }),
    ).toBeHidden();
    await kiosk.emulateMedia({ media: "screen" });
    await kiosk.getByRole("button", { name: "Done", exact: true }).click();
    await expect(
      kiosk.getByRole("button", { name: /Counter 1.*Reception/ }),
    ).toBeVisible();
    await kiosk.getByRole("button", { name: /Counter 1.*Reception/ }).click();
    await expect(
      kiosk.getByRole("img", { name: "Track this ticket QR code" }),
    ).toBeVisible();
    await kiosk.clock.fastForward(30_100);
    await expect(
      kiosk.getByRole("button", { name: /Counter 1.*Reception/ }),
    ).toBeVisible();
  } finally {
    await visitor.close();
    try {
      await pool.query(
        "delete from organizations where slug = $1 and plan = 'DEMO'",
        ["demo-clinic"],
      );
    } finally {
      await pool.end();
    }
  }
});
