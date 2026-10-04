import { expect, type Locator, type Page, test } from "@playwright/test";

function factOf(page: Page): Locator {
  return page.locator(".marquee__fact");
}

/** The marquee's fact, once one is showing. */
async function shownFactOf(page: Page): Promise<string> {
  const fact = factOf(page);
  await expect(fact).toContainText(/\w/);
  return (await fact.textContent()) ?? "";
}

test.describe("facts marquee", () => {
  test("shows a new fact each time the app opens", async ({ page }) => {
    await page.goto("/");
    const first = await shownFactOf(page);

    await page.reload();
    expect(await shownFactOf(page)).not.toBe(first);
  });

  test("moves on every 20 seconds online and holds still offline", async ({ context, page }) => {
    await page.clock.install();
    await page.goto("/");
    const first = await shownFactOf(page);

    await page.clock.fastForward(20_000);
    await expect(factOf(page)).not.toHaveText(first);
    const second = await shownFactOf(page);

    await context.setOffline(true);
    await page.clock.fastForward(60_000);
    await expect(factOf(page)).toHaveText(second);
  });
});
