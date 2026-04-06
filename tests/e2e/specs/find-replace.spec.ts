import { test, expect } from "@playwright/test";
import { loadDemoWorkspace } from "./_helpers";

test.describe("find & replace", () => {
  test("Ctrl+Shift+H opens dialog, shows live match count", async ({
    page,
  }) => {
    await loadDemoWorkspace(page);
    await page.keyboard.press("Control+Shift+H");
    await expect(page.getByTestId("find-replace-dialog")).toBeVisible();

    await page.getByTestId("find-replace-find").fill("TESCombatEvent");
    await expect(page.getByTestId("find-replace-count")).toContainText(
      /\d+ matches? in \d+ files?/,
    );
  });

  test("Replace all writes changes + creates undo entries", async ({
    page,
  }) => {
    await loadDemoWorkspace(page);
    await page.keyboard.press("Control+Shift+H");

    await page.getByTestId("find-replace-find").fill("picked the wrong");
    await page.getByTestId("find-replace-replace").fill("chose the bad");
    await expect(page.getByTestId("find-replace-count")).toContainText(
      /1 match in 1 file/,
    );
    await page.getByTestId("find-replace-apply").click();

    // Result summary.
    await expect(page.getByTestId("find-replace-dialog")).toContainText(
      /Replaced 1 occurrence across 1 file/,
    );

    // Close dialog + verify the undo drawer has the new entry.
    await page.keyboard.press("Escape");
    await page.keyboard.press("Control+Shift+Z");
    await expect(
      page.locator('[data-testid^="workspace-undo-row-"]').first(),
    ).toBeVisible();
  });

  test("No matches disables Replace all", async ({ page }) => {
    await loadDemoWorkspace(page);
    await page.keyboard.press("Control+Shift+H");
    await page.getByTestId("find-replace-find").fill("zzzz-never-in-any-file");
    await expect(page.getByTestId("find-replace-dialog")).toContainText(
      "No matches",
    );
    await expect(page.getByTestId("find-replace-apply")).toBeDisabled();
  });

  test("Case-sensitive toggle narrows matches", async ({ page }) => {
    await loadDemoWorkspace(page);
    await page.keyboard.press("Control+Shift+H");

    await page.getByTestId("find-replace-find").fill("event");
    const insensitiveText = await page
      .getByTestId("find-replace-count")
      .textContent();
    await page.getByTestId("find-replace-case").check();
    const sensitiveText = await page
      .getByTestId("find-replace-count")
      .textContent();
    // Case-sensitive "event" won't match "Event" — count must be smaller.
    expect(sensitiveText).not.toBe(insensitiveText);
  });
});
