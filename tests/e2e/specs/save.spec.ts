import { test, expect } from "@playwright/test";
import { loadDemoWorkspace, openFile, HURT_PATH } from "./_helpers";

test.describe("save + dirty tracking", () => {
  test("editing subtitle marks the tab dirty and save clears it", async ({
    page,
  }) => {
    await loadDemoWorkspace(page);
    await openFile(page, HURT_PATH);

    const tab = page.getByTestId(`tab-${HURT_PATH}`);
    // Not dirty initially.
    await expect(tab).not.toContainText("●");
    await expect(page.getByTestId("hero-save")).toBeDisabled();

    // Type into subtitle.
    await page
      .getByTestId("field-subtitle")
      .fill("Argh... that one hurt more than expected!");
    await expect(tab).toContainText("●");
    await expect(page.getByTestId("hero-dirty")).toBeVisible();
    await expect(page.getByTestId("hero-save")).toBeEnabled();

    // Save and verify dirty cleared.
    await page.getByTestId("hero-save").click();
    await expect(page.getByTestId("hero-dirty")).not.toBeVisible();
  });

  test("saved content is readable through the Inspector JSON tab", async ({
    page,
  }) => {
    await loadDemoWorkspace(page);
    await openFile(page, HURT_PATH);
    await page.getByTestId("field-subtitle").fill("e2e probe value");
    await page.getByTestId("hero-save").click();

    await page.keyboard.press("Control+J");
    await expect(page.getByTestId("inspector-sheet")).toBeVisible();
    await page.getByTestId("inspector-tab-json").click();
    await expect(page.getByTestId("inspector-json")).toContainText(
      "e2e probe value",
    );
  });
});
