import { test, expect } from "@playwright/test";
import { loadDemoWorkspace } from "./_helpers";

test.describe("bulk edit drawer", () => {
  test("opens via command palette, scope 'all files' previews every doc", async ({
    page,
  }) => {
    await loadDemoWorkspace(page);
    await page.keyboard.press("Control+K");
    await page.getByTestId("command-palette-input").fill("bulk edit");
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("bulk-edit-drawer")).toBeVisible();

    // Default scope is an event. Switch to "all files".
    await page.getByTestId("bulk-edit-scope").selectOption("all");
    const previews = page.locator('[data-testid^="bulk-edit-preview-"]');
    const count = await previews.count();
    expect(count).toBeGreaterThan(0);
  });

  test("setting chance=1 across all files writes the changes", async ({
    page,
  }) => {
    await loadDemoWorkspace(page);
    await page.keyboard.press("Control+K");
    await page.getByTestId("command-palette-input").fill("bulk edit");
    await page.keyboard.press("Enter");

    await page.getByTestId("bulk-edit-scope").selectOption("all");
    await page.getByTestId("bulk-edit-field").selectOption("chance");
    await page.getByTestId("bulk-edit-value").fill("1");

    const summary = page.getByTestId("bulk-edit-summary");
    await expect(summary).toContainText(/\d+ of \d+ will change/);
    const beforeText = await summary.textContent();
    // Expect at least one file to need changing (demo has non-1 chances).
    expect(beforeText).toMatch(/[1-9]\d* of /);

    await page.getByTestId("bulk-edit-apply").click();
    await expect(summary).toContainText(/\d+ updated · \d+ unchanged/);
  });

  test("by-event scope restricts to files matching that event", async ({
    page,
  }) => {
    await loadDemoWorkspace(page);
    await page.keyboard.press("Control+K");
    await page.getByTestId("command-palette-input").fill("bulk edit");
    await page.keyboard.press("Enter");

    await page.getByTestId("bulk-edit-scope").selectOption("TESCombatEvent");
    const previews = page.locator('[data-testid^="bulk-edit-preview-"]');
    const combatCount = await previews.count();

    await page.getByTestId("bulk-edit-scope").selectOption("all");
    const allCount = await previews.count();

    expect(allCount).toBeGreaterThan(combatCount);
  });

  test("Escape closes the drawer", async ({ page }) => {
    await loadDemoWorkspace(page);
    await page.keyboard.press("Control+K");
    await page.getByTestId("command-palette-input").fill("bulk edit");
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("bulk-edit-drawer")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("bulk-edit-drawer")).not.toBeVisible();
  });
});
