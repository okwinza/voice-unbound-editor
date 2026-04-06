import { test, expect } from "@playwright/test";
import {
  loadDemoWorkspace,
  openFile,
  readViaHost,
  simulateExternalSubtitle,
  BATTLECRY_PATH,
} from "./_helpers";

test.describe("external-edit conflict handling", () => {
  test("clean doc silently reloads on external write", async ({ page }) => {
    await loadDemoWorkspace(page);
    await openFile(page, BATTLECRY_PATH);

    const original = await page.getByTestId("field-subtitle").inputValue();
    expect(original).toBe("You picked the wrong fight!");

    await simulateExternalSubtitle(page, BATTLECRY_PATH, "RELOADED FROM DISK");

    await expect(page.getByTestId("field-subtitle")).toHaveValue(
      "RELOADED FROM DISK",
    );
    await expect(page.getByTestId("conflict-dialog")).not.toBeVisible();
  });

  test("dirty doc raises conflict dialog on save; reload adopts disk", async ({
    page,
  }) => {
    await loadDemoWorkspace(page);
    await openFile(page, BATTLECRY_PATH);

    await page.getByTestId("field-subtitle").fill("MY UNCOMMITTED EDIT");
    await expect(page.getByTestId("hero-dirty")).toBeVisible();

    await simulateExternalSubtitle(page, BATTLECRY_PATH, "EXTERNAL ZAP");

    // Dialog stays closed until the user hits save.
    await expect(page.getByTestId("conflict-dialog")).not.toBeVisible();
    await page.getByTestId("hero-save").click();
    await expect(page.getByTestId("conflict-dialog")).toBeVisible();

    await page.getByTestId("conflict-dialog-reload").click();
    await expect(page.getByTestId("conflict-dialog")).not.toBeVisible();
    await expect(page.getByTestId("field-subtitle")).toHaveValue("EXTERNAL ZAP");
    await expect(page.getByTestId("hero-dirty")).not.toBeVisible();
  });

  test("overwrite from conflict dialog persists user's version", async ({
    page,
  }) => {
    await loadDemoWorkspace(page);
    await openFile(page, BATTLECRY_PATH);

    await page.getByTestId("field-subtitle").fill("USER WINS");
    await simulateExternalSubtitle(page, BATTLECRY_PATH, "DISK LOSES");

    await page.getByTestId("hero-save").click();
    await page.getByTestId("conflict-dialog-overwrite").click();
    await expect(page.getByTestId("conflict-dialog")).not.toBeVisible();

    expect(await readViaHost(page, BATTLECRY_PATH)).toContain("USER WINS");
    await expect(page.getByTestId("field-subtitle")).toHaveValue("USER WINS");
    await expect(page.getByTestId("hero-dirty")).not.toBeVisible();
  });

  test("Show diff reveals external content vs. user edits", async ({
    page,
  }) => {
    await loadDemoWorkspace(page);
    await openFile(page, BATTLECRY_PATH);

    await page.getByTestId("field-subtitle").fill("DIFF LHS");
    await simulateExternalSubtitle(page, BATTLECRY_PATH, "DIFF RHS");

    await page.getByTestId("hero-save").click();
    await page.getByTestId("conflict-dialog-diff").click();

    const diffBody = page.getByTestId("conflict-diff-body");
    await expect(diffBody).toBeVisible();
    await expect(diffBody).toContainText("DIFF LHS");
    await expect(diffBody).toContainText("DIFF RHS");
  });
});
