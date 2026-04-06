import { test, expect } from "@playwright/test";
import { loadDemoWorkspace, openFile, LOW_HP_PATH } from "./_helpers";

test.describe("workspace + tree + tabs", () => {
  test("load demo workspace populates the tree with 9 files", async ({ page }) => {
    await loadDemoWorkspace(page);
    await expect(page.getByTestId("status-file-count")).toHaveText("9 files");
    // 3 folders + 9 files visible
    await expect(
      page.locator('[data-testid^="tree-node-"]'),
    ).toHaveCount(12);
  });

  test("clicking a file opens a tab and shows the form", async ({ page }) => {
    await loadDemoWorkspace(page);
    await openFile(page, LOW_HP_PATH);
    await expect(page.getByTestId("hero-filename")).toHaveText("okw_low_hp_01");
    await expect(page.getByTestId(`tab-${LOW_HP_PATH}`)).toBeVisible();
    // All 4 sections rendered
    for (const id of ["section-general", "section-filters", "section-conditions", "section-audio"]) {
      await expect(page.getByTestId(id)).toBeVisible();
    }
  });

  test("theme toggle flips primary color token", async ({ page }) => {
    await loadDemoWorkspace(page);
    const root = page.locator("html");
    // Skyrim (amber) is default.
    await expect(root).not.toHaveClass(/theme-neutral/);
    await page.getByTestId("menu-toggle-theme").click();
    await expect(root).toHaveClass(/theme-neutral/);
  });
});
