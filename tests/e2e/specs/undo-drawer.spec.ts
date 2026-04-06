import { test, expect } from "@playwright/test";
import { loadDemoWorkspace, openFile, BATTLECRY_PATH } from "./_helpers";

test.describe("workspace undo drawer", () => {
  test("autosave records an entry; undo rolls back content", async ({
    page,
  }) => {
    await loadDemoWorkspace(page);
    await openFile(page, BATTLECRY_PATH);

    const original = await page.getByTestId("field-subtitle").inputValue();
    expect(original.length).toBeGreaterThan(0);

    // Edit the subtitle and wait past the 2s autosave debounce.
    await page.getByTestId("field-subtitle").fill("Undo drawer test line");
    // Dirty marker appears immediately.
    await expect(page.getByTestId("hero-dirty")).toBeVisible();
    // Autosave fires after 2s — give it a margin.
    await expect(page.getByTestId("hero-dirty")).not.toBeVisible({
      timeout: 4000,
    });

    // Open undo drawer and verify an entry is present.
    await page.keyboard.press("Control+Shift+Z");
    await expect(page.getByTestId("workspace-undo-drawer")).toBeVisible();
    const rows = page.locator('[data-testid^="workspace-undo-row-"]');
    await expect(rows.first()).toBeVisible();
    await expect(rows.first()).toContainText("okw_battlecry_01");

    // Undo the entry.
    await page.locator('[data-testid^="workspace-undo-apply-"]').first().click();

    // The subtitle should be back to the original.
    await expect(page.getByTestId("field-subtitle")).toHaveValue(original);
  });

  test("Escape closes the drawer", async ({ page }) => {
    await loadDemoWorkspace(page);
    await page.keyboard.press("Control+Shift+Z");
    await expect(page.getByTestId("workspace-undo-drawer")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("workspace-undo-drawer")).not.toBeVisible();
  });

  test("empty drawer shows placeholder", async ({ page }) => {
    await loadDemoWorkspace(page);
    await page.keyboard.press("Control+Shift+Z");
    await expect(page.getByTestId("workspace-undo-drawer")).toContainText(
      "No recent saves",
    );
  });
});
