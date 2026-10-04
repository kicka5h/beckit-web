import { expect, test } from "@playwright/test";

test.describe("facts marquee", () => {
  test("shows a new fact each time the app opens", async ({ page }) => {
    await page.goto("/");
    const fact = page.locator(".marquee__fact");
    await expect(fact).toContainText(/\w/);
    const first = await fact.textContent();

    await page.reload();
    await expect(fact).toContainText(/\w/);
    expect(await fact.textContent()).not.toBe(first);
  });
});
