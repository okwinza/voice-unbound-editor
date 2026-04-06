import { test, expect } from "@playwright/test";
import { loadDemoWorkspace, openFile, LOW_HP_PATH, HURT_PATH } from "./_helpers";

test.describe("flags + dispatch route", () => {
  test("important+exclusive fixture shows the 'safe to remove' readout", async ({ page }) => {
    await loadDemoWorkspace(page);
    await openFile(page, LOW_HP_PATH);
    await expect(page.getByTestId("flag-important")).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(page.getByTestId("flag-exclusive")).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(page.getByTestId("flags-readout")).toContainText(
      "safe to remove",
    );
  });

  test("clicking dispatch lanes sets both flags", async ({ page }) => {
    await loadDemoWorkspace(page);
    await openFile(page, HURT_PATH);
    // hurt starts with neither flag → PASS 2 / normal.
    await expect(
      page.getByTestId("dispatch-lane-normal"),
    ).toHaveAttribute("aria-current", "true");

    await page.getByTestId("dispatch-lane-important").click();
    await expect(page.getByTestId("flag-important")).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(page.getByTestId("flag-exclusive")).toHaveAttribute(
      "aria-checked",
      "false",
    );

    await page.getByTestId("dispatch-lane-exclusive").click();
    await expect(page.getByTestId("flag-important")).toHaveAttribute(
      "aria-checked",
      "false",
    );
    await expect(page.getByTestId("flag-exclusive")).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  test("toggling a flag updates readout live", async ({ page }) => {
    await loadDemoWorkspace(page);
    await openFile(page, HURT_PATH);
    await expect(page.getByTestId("flags-readout")).toContainText("Normal line");
    await page.getByTestId("flag-important").click();
    await expect(page.getByTestId("flags-readout")).toContainText(
      "Bypasses global cooldown",
    );
  });
});
