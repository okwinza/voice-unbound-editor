import { test, expect } from "@playwright/test";
import { loadDemoWorkspace, openFile, HURT_PATH, LOW_HP_PATH } from "./_helpers";

test.describe("conditions editor", () => {
  test("existing ActorValue condition renders with comparison + threshold", async ({
    page,
  }) => {
    await loadDemoWorkspace(page);
    await openFile(page, LOW_HP_PATH);
    await expect(page.getByTestId("section-conditions")).toContainText(
      "ActorValue",
    );
    await expect(
      page.getByTestId("condition-editor-0-value"),
    ).toHaveValue("Health");
  });

  test("add → wrap → extract round-trip", async ({ page }) => {
    await loadDemoWorkspace(page);
    await openFile(page, HURT_PATH);

    // Start with 1 condition (ActorValue).
    await expect(page.getByTestId("condition-row-0")).toBeVisible();

    // Add IsInCombat at root.
    await page.getByTestId("add-at-root-trigger").click();
    await page.getByTestId("add-condition-IsInCombat").click();
    await expect(page.getByTestId("condition-row-1")).toBeVisible();

    // Wrap condition-row-0 into a group → row moves to 0-0.
    await page.getByTestId("condition-row-0-wrap").click();
    await expect(page.getByTestId("group-0")).toBeVisible();
    await expect(page.getByTestId("condition-row-0-0")).toBeVisible();

    // Extract back to parent → group gone, row back at 0.
    await page.getByTestId("condition-row-0-0-extract").click();
    await expect(page.getByTestId("condition-row-0")).toBeVisible();
    await expect(page.getByTestId("group-0")).not.toBeVisible();
  });

  test("toggling group logic flips AND ↔ OR", async ({ page }) => {
    await loadDemoWorkspace(page);
    await openFile(page, HURT_PATH);
    // Wrap the existing condition
    await page.getByTestId("condition-row-0-wrap").click();
    const logicBtn = page.getByTestId("group-0-logic");
    await expect(logicBtn).toHaveText("AND");
    await logicBtn.click();
    await expect(logicBtn).toHaveText("OR");
  });
});
