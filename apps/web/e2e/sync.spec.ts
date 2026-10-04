import { type Browser, expect, type Page, test } from "@playwright/test";

const SYNC_WAIT = { timeout: 20_000 };
const LAPTOP_TEXT = "Written on the laptop.";

/** The writing surface of a device's open piece. */
function proseOf(page: Page): ReturnType<Page["locator"]> {
  return page.locator(".prose");
}

/** Opens the app on a fresh device: a browser context with nothing stored. */
async function openDevice(browser: Browser): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/");
  return page;
}

async function expectSynced(page: Page): Promise<void> {
  await expect(page.getByRole("status")).toHaveText(/^Synced \d/, SYNC_WAIT);
}

test.describe("sync", () => {
  test("carries writing to a second device and edits from either side back", async ({
    browser,
  }) => {
    const laptop = await openDevice(browser);
    await proseOf(laptop).click();
    await laptop.keyboard.type(LAPTOP_TEXT);
    await expectSynced(laptop);

    // A new device signs in, adopts the writer's library and opens their project.
    const phone = await openDevice(browser);
    await expect(proseOf(phone)).toHaveText(LAPTOP_TEXT, SYNC_WAIT);

    await proseOf(phone).click();
    await phone.keyboard.press("End");
    await phone.keyboard.type(" Then on the phone.");
    await expectSynced(phone);
    await expect(proseOf(laptop)).toHaveText(`${LAPTOP_TEXT} Then on the phone.`, SYNC_WAIT);
  });

  test("keeps both sides' writing when two devices edit offline at once", async ({ browser }) => {
    const laptop = await openDevice(browser);
    const phone = await openDevice(browser);
    await expect(proseOf(phone)).toContainText(LAPTOP_TEXT, SYNC_WAIT);

    await laptop.context().setOffline(true);
    await phone.context().setOffline(true);
    await proseOf(laptop).click();
    await laptop.keyboard.press("Control+End");
    await laptop.keyboard.press("Enter");
    await laptop.keyboard.type("A new paragraph from the laptop, offline.");
    await proseOf(phone).click();
    await phone.keyboard.press("Control+Home");
    await phone.keyboard.type("Phone, offline: ");
    await expect(laptop.getByRole("status")).toHaveText(/^Offline/);

    await laptop.context().setOffline(false);
    await phone.context().setOffline(false);
    for (const page of [laptop, phone]) {
      await expect(proseOf(page)).toContainText(`Phone, offline: ${LAPTOP_TEXT}`, SYNC_WAIT);
      await expect(proseOf(page)).toContainText("A new paragraph from the laptop, offline.");
    }
  });
});
