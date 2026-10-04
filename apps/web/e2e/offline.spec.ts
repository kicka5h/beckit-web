import { expect, type Page, test } from "@playwright/test";

const SENTENCE = "Written at thirty thousand feet, with the window shade down.";

/** Waits until the service worker has cached the app, so it can open with no network. */
async function waitForOfflineReady(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
}

test.describe("offline writing", () => {
  test("keeps a chapter written in airplane mode after the tab is closed", async ({
    context,
    page,
  }) => {
    await page.goto("/");
    await waitForOfflineReady(page);
    await context.setOffline(true);

    await page.reload();
    await page.locator(".prose").click();
    await page.keyboard.type(SENTENCE);
    await expect(page.getByRole("status")).toHaveText("Saved on this device");
    await page.close();

    const reopened = await context.newPage();
    await reopened.goto("/");
    await expect(reopened.locator(".prose")).toHaveText(SENTENCE);
  });

  test("opens the same piece with the cursor where the writer left it", async ({ page }) => {
    await page.goto("/");
    await page.locator(".prose").click();
    await page.keyboard.type("First line.");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Second line.");
    await page.keyboard.press("ArrowUp");
    await expect(page.getByRole("status")).toHaveText("Saved on this device");

    await page.reload();
    await expect(page.locator(".prose")).toBeFocused();
    await page.keyboard.type(" Added");
    await expect(page.locator(".prose p")).toHaveText(["First line. Added", "Second line."]);
  });
});
