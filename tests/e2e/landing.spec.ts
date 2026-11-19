import { expect, test } from "@playwright/test";

test("the laptop hero shows the full interactive queue preview", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/");

  const preview = page.getByRole("region", {
    name: "Three screens, one queue",
  });
  await expect(preview).toBeInViewport({ ratio: 1 });

  const advance = preview.getByRole("button", { name: "Call next in preview" });
  await expect(
    preview.getByText("3 ahead of you", { exact: true }),
  ).toBeVisible();
  for (const nextStatus of [
    "2 ahead of you",
    "1 ahead of you",
    "It’s your turn",
  ]) {
    await advance.click();
    await expect(preview.getByText(nextStatus, { exact: true })).toBeVisible();
  }
  await expect(
    preview
      .getByRole("article")
      .filter({ hasText: "Waiting room TV" })
      .getByText("A-10", { exact: true }),
  ).toBeVisible();
});

test("a failed demo request keeps the CTAs together at 320px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 768 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await page.route("**/api/auth/demo", (route) =>
    route.fulfill({ status: 503, json: { error: "Unavailable" } }),
  );

  const main = page.getByRole("main");
  const demo = main.getByRole("button", { name: "Try Live Demo" });
  const trial = main.getByRole("link", { name: "Start Free Trial" });
  const before = (await trial.boundingBox())!;

  await demo.click();
  const error = main.getByRole("alert");
  await expect(error).toBeVisible();

  const [demoBox, trialBox, errorBox] = await Promise.all([
    demo.boundingBox(),
    trial.boundingBox(),
    error.boundingBox(),
  ]);
  expect(trialBox!.x).toBe(before.x);
  expect(trialBox!.x - (demoBox!.x + demoBox!.width)).toBeCloseTo(12);
  expect(trialBox!.y).toBe(demoBox!.y);
  expect(errorBox!.y).toBeGreaterThanOrEqual(demoBox!.y + demoBox!.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  );
});
