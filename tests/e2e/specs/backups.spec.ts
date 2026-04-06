import { test, expect } from "@playwright/test";
import {
  loadDemoWorkspace,
  openFile,
  readBackupSlots,
  BATTLECRY_PATH,
} from "./_helpers";

test.describe("rolling backups", () => {
  test("autosave rolls previous content into .voice-unbound-editor/backups/", async ({
    page,
  }) => {
    await loadDemoWorkspace(page);
    await openFile(page, BATTLECRY_PATH);

    // Three consecutive edits, each waits past the 2s autosave debounce
    // so a save + backup roll fires between them.
    for (const text of ["FIRST EDIT", "SECOND EDIT", "THIRD EDIT"]) {
      await page.getByTestId("field-subtitle").fill(text);
      await expect(page.getByTestId("hero-dirty")).not.toBeVisible({
        timeout: 4000,
      });
    }

    const backups = await readBackupSlots(page, "okw_battlecry_01");

    // 3 saves → 3 backup slots. .1 = newest pre-save baseline.
    expect(backups).toEqual([
      { slot: "1", subtitle: "SECOND EDIT" },
      { slot: "2", subtitle: "FIRST EDIT" },
      { slot: "3", subtitle: "You picked the wrong fight!" },
    ]);
  });
});
