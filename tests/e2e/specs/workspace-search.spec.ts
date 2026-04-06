import { test, expect } from "@playwright/test";
import { loadDemoWorkspace } from "./_helpers";

test.describe("workspace search", () => {
  test("Ctrl+Shift+F opens panel, typing highlights matches", async ({
    page,
  }) => {
    await loadDemoWorkspace(page);
    await page.keyboard.press("Control+Shift+F");
    await expect(page.getByTestId("workspace-search-panel")).toBeVisible();

    await page.getByTestId("workspace-search-input").fill("combat");
    // Wait for the debounce + results to render.
    await expect(page.getByTestId("workspace-search-results")).toContainText(
      /matches in \d+ files?/,
    );
    // First match line snippet should contain the event line.
    await expect(
      page.locator('[data-testid^="search-match-"]').first(),
    ).toContainText("TESCombatEvent");
  });

  test("clicking a result opens the file and closes the panel", async ({
    page,
  }) => {
    await loadDemoWorkspace(page);
    await page.keyboard.press("Control+Shift+F");
    await page.getByTestId("workspace-search-input").fill("picked the wrong");
    // Debounce.
    await expect(page.locator('[data-testid^="search-file-"]')).toHaveCount(1);
    await page.locator('[data-testid^="search-file-"]').first().click();
    await expect(page.getByTestId("workspace-search-panel")).not.toBeVisible();
    await expect(page.getByTestId("hero-filename")).toBeVisible();
  });

  test("empty query shows placeholder, no-match shows empty state", async ({
    page,
  }) => {
    await loadDemoWorkspace(page);
    await page.keyboard.press("Control+Shift+F");
    await expect(page.getByTestId("workspace-search-results")).toContainText(
      "Search workspace",
    );
    await page.getByTestId("workspace-search-input").fill("zzzzzzzz-no-match");
    await expect(page.getByTestId("workspace-search-results")).toContainText(
      "No matches",
    );
  });

  test("Escape closes the panel", async ({ page }) => {
    await loadDemoWorkspace(page);
    await page.keyboard.press("Control+Shift+F");
    await expect(page.getByTestId("workspace-search-panel")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("workspace-search-panel")).not.toBeVisible();
  });
});
