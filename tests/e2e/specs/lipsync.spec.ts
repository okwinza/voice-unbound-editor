import { test, expect } from "@playwright/test";
import { loadDemoWorkspace, openFile, HURT_PATH } from "./_helpers";

test.describe("lipsync controls", () => {
  test("defaults: enabled=true, readout=baseline, no lipsync key in JSON", async ({
    page,
  }) => {
    await loadDemoWorkspace(page);
    await openFile(page, HURT_PATH);

    await expect(page.getByTestId("field-lipsync-enabled")).toBeChecked();
    await expect(page.getByTestId("lipsync-intensity-readout")).toHaveText(
      "baseline",
    );

    await page.keyboard.press("Control+J");
    await page.getByTestId("inspector-tab-json").click();
    await expect(page.getByTestId("inspector-json")).not.toContainText(
      "lipsync",
    );
  });

  test("disabling writes lipsync.enabled=false into the JSON", async ({
    page,
  }) => {
    await loadDemoWorkspace(page);
    await openFile(page, HURT_PATH);

    await page.getByTestId("field-lipsync-enabled").uncheck();

    await page.keyboard.press("Control+J");
    await page.getByTestId("inspector-tab-json").click();
    await expect(page.getByTestId("inspector-json")).toContainText(
      /"lipsync":\s*\{\s*"enabled":\s*false/,
    );
  });

  test("re-enabling drops the override entirely", async ({ page }) => {
    await loadDemoWorkspace(page);
    await openFile(page, HURT_PATH);

    await page.getByTestId("field-lipsync-enabled").uncheck();
    await page.getByTestId("field-lipsync-enabled").check();

    await page.keyboard.press("Control+J");
    await page.getByTestId("inspector-tab-json").click();
    await expect(page.getByTestId("inspector-json")).not.toContainText(
      "lipsync",
    );
  });

  test("intensity slider sets an override; clear removes it", async ({
    page,
  }) => {
    await loadDemoWorkspace(page);
    await openFile(page, HURT_PATH);

    // Range input — fill accepts string values.
    await page.getByTestId("field-lipsync-intensity").fill("1.5");
    await expect(page.getByTestId("lipsync-intensity-readout")).toHaveText(
      "1.50",
    );

    await page.keyboard.press("Control+J");
    await page.getByTestId("inspector-tab-json").click();
    await expect(page.getByTestId("inspector-json")).toContainText(
      /"intensity":\s*1\.5/,
    );

    // Clear reverts to baseline. The inspector sheet's backdrop
    // intercepts pointer events on the underlying form area, so click
    // through via dispatch rather than Playwright's pointer path.
    await page
      .getByTestId("field-lipsync-intensity-clear")
      .evaluate((el) => (el as HTMLElement).click());
    await expect(page.getByTestId("lipsync-intensity-readout")).toHaveText(
      "baseline",
    );
    await expect(page.getByTestId("inspector-json")).not.toContainText(
      "lipsync",
    );
  });
});
