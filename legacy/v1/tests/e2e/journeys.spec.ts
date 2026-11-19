import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const origin = `http://127.0.0.1:${Number(process.env.QW_TEST_PORT || 3000)}`;
const press = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });

async function demo(page: Page) {
  const fixture = await page.request.post(origin + "/api/session", {
    headers: { origin },
    data: { mode: "demo" },
  });
  expect(fixture.ok()).toBeTruthy();
  await page.goto("/desk");
  await expect(press(page, "New ticket")).toBeVisible();
}
async function mutate(api: APIRequestContext, action: string, fields = {}) {
  const state = await (await api.get("/api/queue")).json();
  const result = await api.post("/api/queue", {
    headers: { origin },
    data: {
      action,
      key: crypto.randomUUID(),
      version: state.version,
      ...fields,
    },
  });
  expect(result.ok()).toBeTruthy();
}

test("staff issue, visitor progress, public display, completion, and persistence", async ({
  page,
  browser,
}) => {
  await demo(page);
  await press(page, "New ticket").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByAltText("Ticket QR code")).toBeVisible();
  const ticketUrl = await dialog
    .getByRole("link", { name: "Open ticket" })
    .getAttribute("href");
  await press(page, "Close").click();
  const visitor = await browser.newPage();
  await visitor.goto(ticketUrl!);
  await expect(
    visitor.getByRole("heading", { name: "5 people ahead" }),
  ).toBeVisible();
  const display = await browser.newPage();
  await display.goto(
    (await page
      .getByRole("link", { name: "Public display" })
      .getAttribute("href"))!,
  );
  await expect(display.locator(".boardNumber")).toHaveText("A001");
  const announcement = await display.locator(".boardNumber").elementHandle();
  await press(page, "Call again").click();
  await expect
    .poll(() => announcement!.evaluate((node) => node.isConnected), {
      timeout: 12000,
    })
    .toBe(false);
  await expect(display.locator(".boardNumber")).toHaveText("A001");
  await press(page, "Start service").click();
  await expect(page.getByText("Service time")).toHaveCount(0);
  await press(page, "Finish service").click();
  await expect(
    visitor.getByRole("heading", { name: "4 people ahead" }),
  ).toBeVisible({ timeout: 12000 });
  await press(page, "Call A002").click();
  await expect(display.locator(".boardNumber")).toHaveText("A002", {
    timeout: 12000,
  });
  for (let i = 2; i <= 6; i++) {
    const state = await (await page.request.get("/api/queue")).json();
    const current = state.tickets.find(
      (item: { state: string }) => item.state === "called",
    );
    await mutate(page.request, "start", { ticketId: current.id });
    await mutate(page.request, "complete", { ticketId: current.id });
    if (i < 6) await mutate(page.request, "call");
  }
  await expect(visitor.getByRole("heading", { name: "All done" })).toBeVisible({
    timeout: 12000,
  });
  await visitor.reload();
  await expect(
    visitor.getByRole("heading", { name: "All done" }),
  ).toBeVisible();
  await page.reload();
  await press(page, "History").click();
  await expect(page.locator(".queue li")).toHaveCount(6);
  await visitor.close();
  await display.close();
});

test("admission, cancellation, settings, offline recovery, and keyboard dialogs", async ({
  page,
}) => {
  await demo(page);
  const settingsButton = press(page, "Settings");
  const settings = page.getByRole("dialog", { name: "Settings" });
  await settingsButton.click();
  await settings.getByText("Queue controls", { exact: true }).click();
  await press(page, "Pause tickets").click();
  await expect(press(page, "Resume tickets")).toBeVisible();
  await press(page, "Close").click();
  await expect(press(page, "New ticket")).toBeDisabled();
  await settingsButton.click();
  await settings.getByText("Queue controls", { exact: true }).click();
  await press(page, "Resume tickets").click();
  await expect(press(page, "Pause tickets")).toBeVisible();
  await press(page, "Close").click();
  await expect(press(page, "New ticket")).toBeEnabled();
  const ticket = press(page, "A002 View ticket");
  await ticket.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(ticket).toBeFocused();
  await ticket.click();
  await press(page, "Cancel ticket").click();
  await press(page, "Confirm").click();
  await expect(ticket).not.toBeVisible();
  await settingsButton.click();
  await settings.getByLabel("Business name").fill("দিগন্ত সেবা কেন্দ্র");
  await settings.getByLabel("Desk name").fill("কাউন্টার ২");
  await settings.getByText("Display settings", { exact: true }).click();
  await settings.getByLabel("Display theme").selectOption("paper");
  await settings.getByLabel("Upcoming tickets").selectOption("2");
  await expect(settings.locator(".displaySample")).toHaveAttribute(
    "data-theme",
    "paper",
  );
  await press(page, "Save changes").click();
  await expect
    .poll(
      async () =>
        (await (await page.request.get("/api/queue")).json()).preferences.theme,
    )
    .toBe("paper");
  await expect(page.locator(".staffTop")).toContainText("দিগন্ত সেবা কেন্দ্র");
  await page.context().setOffline(true);
  await expect(
    page.getByText("Offline. Showing the last update."),
  ).toBeVisible();
  await expect(press(page, "New ticket")).toBeDisabled();
  await page.context().setOffline(false);
  await expect(press(page, "New ticket")).toBeEnabled({ timeout: 15000 });
});
test("server authorization, cross-origin rejection, and private workspace isolation", async ({
  page,
  browser,
}) => {
  await demo(page);
  const state = await (await page.request.get("/api/queue")).json();
  const other = await browser.newContext();
  const unauthorized = await other.request.get(origin + "/api/queue");
  expect(unauthorized.status()).toBe(401);
  const crossOrigin = await page.request.post("/api/queue", {
    headers: { origin: "https://attacker.example" },
    data: { action: "issue", key: crypto.randomUUID() },
  });
  expect(crossOrigin.status()).toBe(403);
  await other.request.post(origin + "/api/session", {
    headers: { origin },
    data: { mode: "demo" },
  });
  const otherState = await (
    await other.request.get(origin + "/api/queue")
  ).json();
  expect(otherState.id).not.toBe(state.id);
  const stolen = await other.request.post(origin + "/api/ticket", {
    headers: { origin },
    data: { ticketId: state.tickets[0].id },
  });
  expect(stolen.status()).toBe(404);
  const publicView = await (
    await other.request.get(origin + "/api/display/" + state.displayId)
  ).json();
  expect(JSON.stringify(publicView)).not.toContain(state.tickets[0].id);
  expect(JSON.stringify(publicView)).not.toContain("token");
  expect(
    (
      await other.request.get(origin + "/api/ticket", {
        headers: { authorization: "Bearer invalid" },
      })
    ).status(),
  ).toBe(404);
  await other.close();
});
test("phone QR link and shared kiosk issue real tickets in one queue", async ({
  page,
  browser,
}) => {
  await demo(page);
  await press(page, "Settings").click();
  const settings = page.getByRole("dialog", { name: "Settings" });
  await settings.getByText("Visitor access", { exact: true }).click();
  await settings.getByRole("checkbox", { name: /Allow visitors/ }).check();
  await settings.getByText("Timing", { exact: true }).click();
  await settings.getByRole("checkbox", { name: /Show wait/ }).check();
  await settings.getByLabel("Service target in minutes").fill("5");
  await press(page, "Save changes").click();
  await press(page, "Visitor access").click();
  const poster = page.getByRole("dialog", { name: "Visitor access" });
  await expect(
    poster.getByAltText("QR code for joining the queue"),
  ).toBeVisible();
  const joinPath = await poster.locator(".accessUrl").getAttribute("href");
  const kioskPath = await poster
    .getByRole("link", { name: "Open kiosk" })
    .getAttribute("href");
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 740 },
  });
  const mobile = await mobileContext.newPage();
  await mobile.addInitScript(() => {
    Object.defineProperty(window.crypto, "randomUUID", { value: undefined });
    Object.defineProperty(AbortSignal, "timeout", { value: undefined });
  });
  await mobile.goto(origin + joinPath);
  const joinAudit = await new AxeBuilder({ page: mobile })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(joinAudit.violations.map((item) => item.id)).toEqual([]);
  let droppedResponse = false;
  await mobile.route("**/api/join/**", async (route) => {
    if (route.request().method() === "POST" && !droppedResponse) {
      droppedResponse = true;
      const issued = await route.fetch();
      expect(issued.ok()).toBeTruthy();
      await route.abort();
      return;
    }
    await route.continue();
  });
  await press(mobile, "টোকেন নিন").click();
  await press(mobile, "আবার চেষ্টা করুন").click();
  await expect(mobile.locator(".passNumber")).toContainText("A006");
  await expect(mobile.locator("main")).toHaveAttribute("lang", "bn");
  const kiosk = await browser.newPage({
    viewport: { width: 768, height: 900 },
  });
  await kiosk.goto(origin + kioskPath);
  await press(kiosk, "English").click();
  await press(kiosk, "Get a ticket").click();
  await expect(kiosk.locator(".receiptNumber")).toHaveText("A007");
  await expect(kiosk.getByAltText("QR code for your ticket")).toBeVisible();
  await kiosk.emulateMedia({ media: "print" });
  await expect(kiosk.locator(".receiptNumber")).toBeVisible();
  await expect(press(kiosk, "Print ticket")).toBeHidden();
  await kiosk.emulateMedia({ media: "screen" });
  await press(kiosk, "Done").click();
  await expect(kiosk.locator(".receiptNumber")).toHaveCount(0);
  await press(page, "Close").click();
  await expect(press(page, "A007 View ticket")).toBeVisible({ timeout: 12000 });
  await press(page, "Start service").click();
  await expect(
    page.getByRole("progressbar", { name: "Service target" }),
  ).toBeVisible();
  await mobileContext.close();
  await kiosk.close();
});

test("sampled accessibility, mobile reflow, reduced motion, and printable ticket", async ({
  page,
  browser,
}) => {
  const scan = async (target: Page) => {
    const report = await new AxeBuilder({ page: target })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      report.violations.map((item) => [
        item.id,
        item.nodes.map((node) => node.target),
      ]),
    ).toEqual([]);
  };
  await page.goto("/");
  await scan(page);
  await demo(page);
  await scan(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await press(page, "New ticket").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByAltText("Ticket QR code")).toBeVisible();
  await scan(page);
  await page.emulateMedia({ media: "print" });
  await expect(dialog.locator(".actions")).toBeHidden();
  await expect(dialog.locator(".printUrl")).toBeVisible();
  await expect(dialog.getByAltText("Ticket QR code")).toBeVisible();
  await page.emulateMedia({ media: "screen", reducedMotion: "reduce" });
  const link = await dialog
    .getByRole("link", { name: "Open ticket" })
    .getAttribute("href");
  const visitorContext = await browser.newContext({
    viewport: { width: 320, height: 800 },
    reducedMotion: "reduce",
  });
  const visitor = await visitorContext.newPage();
  await visitor.goto(link!);
  await expect(visitor.locator(".passNumber .number")).toBeVisible();
  expect(
    await visitor.evaluate(() => document.documentElement.scrollWidth),
  ).toBe(320);
  await scan(visitor);
  await press(page, "Close").click();
  const displayContext = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    reducedMotion: "reduce",
  });
  const display = await displayContext.newPage();
  await display.goto(
    (await page
      .getByRole("link", { name: "Public display" })
      .getAttribute("href"))!,
  );
  await expect(display.locator(".boardNumber")).toBeVisible();
  expect(await display.evaluate(() => document.getAnimations().length)).toBe(0);
  await scan(display);
  await visitorContext.close();
  await displayContext.close();
});
