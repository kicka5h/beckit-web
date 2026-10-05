import { expect, test } from "@playwright/test";

test.describe("header", () => {
  test("stays above the writing as it scrolls under", async ({ page }) => {
    await page.goto("/");
    await page.locator(".prose").click();
    for (let count = 0; count < 30; count++) {
      await page.keyboard.type("A line long enough to fill the page as it scrolls.");
      await page.keyboard.press("Enter");
    }
    await page.mouse.wheel(0, 600);
    const header = page.locator(".header");
    const box = await header.boundingBox();
    const isOnTop = await page.evaluate(
      ({ x, y }) => document.elementFromPoint(x, y)?.closest(".header") !== null,
      { x: (box?.width ?? 0) / 2, y: (box?.height ?? 0) / 2 },
    );
    expect(isOnTop).toBe(true);
  });
});
