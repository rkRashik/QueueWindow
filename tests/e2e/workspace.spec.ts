import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const database = process.env.QW_E2E_DATABASE_URL;

async function withWorkspace(
  page: Page,
  origin: string,
  action: (slug: string) => Promise<void>,
) {
  const key = randomUUID().replaceAll("-", "");
  const owner = {
    orgName: `Phase 3A test ${key}`,
    fullName: "Test Owner",
    username: `qa${key.slice(0, 20)}`,
    email: `qa-${key}@example.com`,
    password: randomUUID(),
  };
  const pool = new Pool({ connectionString: database });
  try {
    const response = await page.request.post("/api/auth/signup", {
      data: owner,
      headers: { Origin: origin },
    });
    expect(response.status()).toBe(201);
    const identity = await (await page.request.get("/api/auth/me")).json();
    await action(identity.organization.slug);
  } finally {
    try {
      await pool.query(
        "delete from organizations o where o.name = $1 and exists (select 1 from users u where u.org_id = o.id and u.username = $2)",
        [owner.orgName, owner.username],
      );
    } finally {
      await pool.end();
    }
  }
}

test.describe("authenticated workspaces", () => {
  test.skip(
    !database,
    "Set QW_E2E_DATABASE_URL to run isolated Neon fixture tests.",
  );

  test("only Pro workspaces show a saved custom venue logo", async ({ page, baseURL }) => {
    await withWorkspace(page, baseURL!, async (slug) => {
      const url = "https://example.com/venue.svg";
      const pool = new Pool({ connectionString: database });
      try {
        await pool.query("update organizations set logo_url = $1 where slug = $2", [url, slug]);
        await page.route(url, (route) => route.fulfill({
          contentType: "image/svg+xml",
          body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12"/></svg>',
        }));
        await page.goto(`/join/${slug}`);
        await expect(page.locator(".visitor-head svg.venue-mark")).toBeVisible();
        await expect(page.locator(".visitor-head img.venue-mark")).toHaveCount(0);

        await pool.query("update organizations set plan = 'PRO' where slug = $1", [slug]);
        await page.reload();
        await expect(page.locator(".visitor-head img.venue-mark")).toHaveAttribute("src", url);
        await page.goto("/desk");
        await expect(page.locator(".desk-bar img.workspace-mark")).toHaveAttribute("src", url);
        await page.goto("/admin?section=branding");
        await expect(page.getByLabel("Logo URL")).toBeEnabled();
        await expect(page.locator(".ws-head img.workspace-mark")).toHaveAttribute("src", url);

        await page.unroute(url);
        await page.route(url, (route) => route.abort());
        await page.goto(`/join/${slug}`);
        await expect(page.locator(".visitor-head svg.venue-mark")).toBeVisible();
      } finally {
        await pool.end();
      }
    });
  });

  test("desk stays in sync with a fourth visitor and works by keyboard", async ({
    page,
    baseURL,
    context,
  }) => {
    await withWorkspace(page, baseURL!, async (slug) => {
      await page.goto("/desk");
      await expect(
        page.getByRole("heading", { name: "Service desk" }),
      ).toBeVisible();
      const counters = await (await page.request.get("/api/desk/state")).json();
      const counterId = counters.selectedCounterId;
      await expect(
        page.getByRole("button", { name: /Walk-in/ }),
      ).toBeEnabled();
      await page.keyboard.press("n");
      const waiting = page.getByRole("list", { name: /^Waiting/ });
      await expect(waiting.getByText("A-01")).toBeVisible();
      for (let index = 0; index < 3; index++) {
        const result = await page.request.post(`/api/public/${slug}/join`, {
          data: { counterId, idempotencyKey: randomUUID() },
        });
        expect(result.status()).toBe(201);
        if (index === 1) await expect(waiting.getByText("A-03")).toBeVisible();
      }
      await expect(waiting.getByText("A-04")).toBeVisible({ timeout: 6_000 });
      await expect(
        page.getByRole("button", { name: /^Call next/ }),
      ).toBeEnabled();
      await page.keyboard.press("Space");
      const active = page.locator(".desk-now");
      await expect(active.locator(".drum .sr-only")).toHaveText("A-01");
      await expect(page.getByRole("button", { name: "Recall", exact: true })).toBeEnabled();
      await page.keyboard.press("r");
      await expect(
        page.getByRole("status").filter({ hasText: "Ticket recalled." }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Complete", exact: true }),
      ).toBeEnabled();
      await page.keyboard.press("c");
      await expect(active.getByText("No one at the counter")).toBeVisible();

      await context.setOffline(true);
      try {
        await expect(
          page.getByText("You’re offline", { exact: true }),
        ).toBeVisible();
        await expect(waiting.getByText("A-02")).toBeVisible();
        await expect(
          page.getByRole("button", { name: /^Call next/ }),
        ).toBeDisabled();
      } finally {
        await context.setOffline(false);
      }
      await expect(
        page.getByRole("button", { name: /^Call next/ }),
      ).toBeEnabled();
      await page.getByRole("button", { name: "বাংলা", exact: true }).click();
      await page.reload();
      await expect(
        page.getByRole("heading", { name: "সেবা ডেস্ক" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "EN", exact: true }).click();
      await page.setViewportSize({ width: 390, height: 844 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(390);
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
    });
  });

  test("owner configures a counter and staff, then staff is redirected away from admin", async ({
    page,
    baseURL,
    context,
  }) => {
    await withWorkspace(page, baseURL!, async () => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.goto("/admin");
      await expect(
        page.getByRole("heading", { name: "Overview" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Counter performance" }),
      ).toBeVisible();
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);

      await page.getByRole("link", { name: "Counters", exact: true }).click();
      const newCounter = page.getByRole("button", { name: "New counter" });
      await newCounter.click();
      const modal = page.getByRole("dialog");
      await expect(modal).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(newCounter).toBeFocused();
      await newCounter.click();
      await modal.getByLabel("Counter name").fill("Records desk");
      await modal.getByLabel("Prefix").fill("B");
      await modal.getByRole("button", { name: "Create counter" }).click();
      const counter = page.getByRole("row", { name: /Records desk/ });
      await expect(counter).toBeVisible();
      await counter.getByRole("button", { name: "Pause" }).click();
      await expect(counter.getByText("Paused", { exact: true })).toBeVisible();

      await page.getByRole("link", { name: "Team", exact: true }).click();
      await page.getByRole("button", { name: "Add staff" }).click();
      const username = `qa${randomUUID().replaceAll("-", "").slice(0, 20)}`;
      const password = randomUUID();
      await modal.getByLabel("Full name").fill("Desk Operator");
      await modal.getByLabel("Username").fill(username);
      await modal.getByLabel("Password", { exact: true }).fill(password);
      await modal.getByRole("button", { name: "Create staff account" }).click();
      await page.getByRole("button", { name: "Copy login details" }).click();
      await expect(
        page.getByText("Login details copied.", { exact: true }),
      ).toBeVisible();

      await page
        .getByRole("link", { name: "Branding & plan", exact: true })
        .click();
      // New workspaces are free and never expire unless QW_TRIAL_DAYS is set.
      await expect(page.getByRole("heading", { name: "Plan", exact: true })).toBeVisible();
      await expect(page.getByText("Free", { exact: true })).toBeVisible();
      await expect(page.getByLabel("Logo URL")).toBeDisabled();
      await expect(page.getByText(/Custom venue logo is available on the Pro plan/)).toBeVisible();
      await page.getByRole("button", { name: "Audio & Voice" }).click();
      await page.getByLabel("Chime sound").selectOption("clinic");
      await expect(page.getByRole("link", { name: "TV display" })).toHaveAttribute(
        "href", /chime=clinic/,
      );

      await page.request.post("/api/auth/logout", {
        headers: { Origin: baseURL! },
      });
      const staff = await page.request.post("/api/auth/login", {
        data: { identifier: username, password },
        headers: { Origin: baseURL! },
      });
      expect(staff.status()).toBe(200);
      await page.goto("/admin");
      await expect(page).toHaveURL(/\/desk$/);
      await expect(
        page.getByRole("heading", { name: "Service desk" }),
      ).toBeVisible();
    });
  });
});
