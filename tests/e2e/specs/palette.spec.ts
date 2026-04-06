import { test, expect } from "@playwright/test";
import { loadDemoWorkspace } from "./_helpers";

test.describe("command palette", () => {
  test("Ctrl+K opens palette, typing filters, Enter jumps to file", async ({
    page,
  }) => {
    await loadDemoWorkspace(page);
    await page.keyboard.press("Control+K");
    await expect(page.getByTestId("command-palette")).toBeVisible();
    await page.getByTestId("command-palette-input").fill("low hp");
    await expect(page.getByTestId("command-palette")).toContainText(
      "okw_low_hp_01",
    );
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("command-palette")).not.toBeVisible();
    await expect(page.getByTestId("hero-filename")).toHaveText("okw_low_hp_01");
  });

  test("Escape closes without running anything", async ({ page }) => {
    await loadDemoWorkspace(page);
    await page.keyboard.press("Control+K");
    await page.getByTestId("command-palette-input").fill("save all");
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("command-palette")).not.toBeVisible();
    // No unsaved badge should appear; we didn't run anything.
    await expect(page.locator('[data-testid="status-unsaved"]')).toHaveCount(0);
  });

  test("? opens shortcuts overlay", async ({ page }) => {
    await loadDemoWorkspace(page);
    await page.keyboard.press("?");
    await expect(page.getByTestId("shortcuts-overlay")).toBeVisible();
    await expect(page.getByTestId("shortcuts-overlay")).toContainText("File");
    await expect(page.getByTestId("shortcuts-overlay")).toContainText(
      "Navigation",
    );
  });
});
