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
  await page.goto("/");
  await press(page, "Try the demo").click();
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
  await press(page, "Start service").click();
  await press(page, "Finish service").click();
  await expect(
    visitor.getByRole("heading", { name: "4 people ahead" }),
  ).toBeVisible({ timeout: 12000 });
  await press(page, "Call next").click();
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
  await press(page, "Save changes").click();
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
