import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("protected routes and identity checks reject guests", async ({
  request,
  baseURL,
}) => {
  for (const path of ["/desk", "/desk/nested", "/admin", "/admin/nested"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(new URL(response.headers().location, baseURL).pathname).toBe(
      "/login",
    );
  }

  const unauthenticated = await request.get("/api/auth/me");
  expect(unauthenticated.status()).toBe(401);
  expect(unauthenticated.headers()["cache-control"]).toBe("no-store");
});

test("auth POSTs reject foreign origins and malformed input", async ({
  request,
  baseURL,
}) => {
  for (const action of ["signup", "login", "logout"]) {
    const response = await request.post(`/api/auth/${action}`, {
      headers: { Origin: "https://example.com" },
      data: {},
    });
    expect(response.status()).toBe(403);
    expect((await response.json()).requestId).toEqual(expect.any(String));
  }

  const invalid = await request.post("/api/auth/signup", {
    headers: { Origin: baseURL! },
    data: {},
  });
  expect(invalid.status()).toBe(400);
});

test("keyboard users can operate the sign-in form and find submission feedback", async ({
  page,
}) => {
  await page.goto("/login");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const identifier = page.getByRole("textbox", { name: "Email or username" });
  await expect(identifier).toBeFocused();
  await identifier.fill("???");
  const password = page.getByLabel("Password", { exact: true });
  await page.keyboard.press("Tab");
  await expect(password).toBeFocused();
  await password.fill("an invalid demo credential");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Show password" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(password).toHaveAttribute("type", "text");
  await expect(
    page.getByRole("button", { name: "Hide password" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "Enter a valid email or username and password.",
  );
});

for (const path of ["/login", "/signup"]) {
  test(`${path} exposes form names and fits mobile and 200% zoom layouts`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(path);
    const tree = await page.getByRole("main").ariaSnapshot();
    expect(tree).toContain(
      path === "/login" ? "Email or username" : "Organization name",
    );

    const fits = () =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      );
    expect(await fits()).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);

    await page.setViewportSize({ width: 1280, height: 900 });
    expect(await fits()).toBe(true);
    await page.evaluate(() => {
      document.documentElement.style.zoom = "2";
    });
    expect(await fits()).toBe(true);
  });
}

test("same-origin form submission can sign out and redirect to login", async ({
  page,
}) => {
  await page.goto("/login");
  const logout = page.waitForResponse(
    (response) => new URL(response.url()).pathname === "/api/auth/logout",
  );
  await page.evaluate(() => {
    const form = document.createElement("form");
    form.method = "post";
    form.action = "/api/auth/logout";
    document.body.append(form);
    form.requestSubmit();
  });
  expect((await logout).status()).toBe(303);
  await expect(page).toHaveURL(/\/login$/);
});
