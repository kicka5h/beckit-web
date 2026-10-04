import { expect, type Page, test } from "@playwright/test";

/** The piece title in the header, which opens and closes the outline. */
function headerTitle(page: Page): ReturnType<Page["locator"]> {
  return page.locator(".header__title");
}

function outline(page: Page): ReturnType<Page["getByRole"]> {
  return page.getByRole("navigation", { name: "Project outline" });
}

/** Opens the outline from the title in the header. */
async function openOutline(page: Page): Promise<void> {
  await headerTitle(page).click();
  await expect(outline(page)).toBeVisible();
}

/** Starts a new project from the format whose name begins with `format`. */
async function startProject(page: Page, format: string): Promise<void> {
  await outline(page).getByRole("button", { name: "New project" }).click();
  await outline(page)
    .getByRole("button", { name: new RegExp(`^${format}`) })
    .click();
}

test.describe("project outline", () => {
  test("starts a chapter book with its front and back matter, and opens on chapter 1", async ({
    page,
  }) => {
    await page.goto("/");
    await openOutline(page);
    await startProject(page, "Chapter book");

    await expect(headerTitle(page)).toHaveText("Chapter 1");
    const rows = outline(page).locator(".row__title");
    await expect(rows).toContainText(["Half title", "Dedication", "Contents", "Chapter 1"]);
    await expect(rows).toContainText(["About the author"]);
  });

  test("adds a chapter, writes in it, and lists it on the contents page", async ({ page }) => {
    await page.goto("/");
    await openOutline(page);
    await startProject(page, "Chapter book");

    await outline(page).getByRole("button", { name: "Add chapter" }).click();
    await expect(headerTitle(page)).toHaveText("Chapter 2");
    await page.locator(".prose").click();
    await page.keyboard.type("The second chapter begins.");
    await expect(page.getByRole("status")).toHaveText("Saved on this device");

    await outline(page).getByRole("button", { name: "Contents", exact: true }).click();
    await expect(page.locator(".contents")).toContainText("Chapter 2");
    await page.locator(".contents").getByRole("button", { name: "Chapter 2" }).click();
    await expect(page.locator(".prose")).toHaveText("The second chapter begins.");
  });

  test("renames and reorders pieces from the row menu", async ({ page }) => {
    await page.goto("/");
    await openOutline(page);
    await outline(page).getByRole("button", { name: "Add piece" }).click();
    await outline(page).getByRole("button", { name: "Actions for Piece 2" }).click();
    await outline(page).getByRole("menuitem", { name: "Move up" }).click();
    const body = outline(page).locator(".part").nth(1).locator(".row__title");
    await expect(body).toHaveText(["Piece 2", "Untitled"]);

    await outline(page).getByRole("button", { name: "Actions for Piece 2" }).click();
    await outline(page).getByRole("menuitem", { name: "Rename" }).click();
    await page.keyboard.type("The Crossing");
    await page.keyboard.press("Enter");
    await expect(body).toHaveText(["The Crossing", "Untitled"]);
  });
});
