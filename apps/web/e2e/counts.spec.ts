import { expect, type Page, test } from "@playwright/test";

const TEXT =
  "She looked at the river. He looks back, looking for the ferry. They look and look again.";

/** Highlights the first occurrence of `word` in the editor, as a writer's drag would. */
async function highlight(page: Page, word: string): Promise<void> {
  await page.evaluate((target) => {
    const prose = document.querySelector(".prose");
    const walker = document.createTreeWalker(prose ?? document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const start = node.textContent?.search(new RegExp(`\\b${target}\\b`)) ?? -1;
      if (start === -1) continue;
      const range = document.createRange();
      range.setStart(node, start);
      range.setEnd(node, start + target.length);
      document.getSelection()?.removeAllRanges();
      document.getSelection()?.addRange(range);
      return;
    }
  }, word);
}

test.describe("word counts and reading level", () => {
  test("counts the piece, the selection and each form of a highlighted word", async ({ page }) => {
    await page.goto("/");
    await page.locator(".prose").click();
    await page.keyboard.type(TEXT);
    await page.getByRole("button", { name: "Writing details" }).click();
    const header = page.locator(".header__details");
    await expect(header).toContainText("17 words");
    await expect(header).toContainText("17 in project");
    await expect(header).toContainText("4th grade or lower");

    await highlight(page, "looked");
    await expect(header).toContainText("1 of 17 words");
    await expect(page.getByLabel("Forms of the highlighted word")).toHaveText(
      "look 2 · looked 1 · looking 1 · looks 1",
    );
  });
});
