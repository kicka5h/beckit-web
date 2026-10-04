import { expect, test } from "@playwright/test";
import { appendFile, readFile, writeFile } from "node:fs/promises";

// The service worker the preview server serves; changing it is what a deploy looks like.
const SERVICE_WORKER = new URL("../dist/sw.js", import.meta.url);

test.describe("app updates", () => {
  test("offers a newer version and reloads into it, keeping what was written", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.locator(".prose").click();
    await page.keyboard.type("Written before the update.");

    const original = await readFile(SERVICE_WORKER, "utf8");
    try {
      await appendFile(SERVICE_WORKER, "\n// a newer version\n");
      await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.ready;
        await registration.update();
      });
      await page.getByRole("button", { name: "Reload" }).click();
      await expect(page.getByRole("button", { name: "Reload" })).toBeHidden();
      await expect(page.locator(".prose")).toHaveText("Written before the update.");
    } finally {
      await writeFile(SERVICE_WORKER, original);
    }
  });
});
