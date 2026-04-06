import type { Page } from "@playwright/test";

/** Path to okw_low_hp_01 in the demo workspace. */
export const LOW_HP_PATH = "/Data/Sound/fx/VoiceUnbound/okw_combat/okw_low_hp_01.json";
export const HURT_PATH = "/Data/Sound/fx/VoiceUnbound/okw_combat/okw_hurt_01.json";
export const BATTLECRY_PATH = "/Data/Sound/fx/VoiceUnbound/okw_combat/okw_battlecry_01.json";

/**
 * Load the demo workspace (browser-mode fixture). Safe to call at the
 * start of every spec — BrowserHost resets when seedWorkspace is called.
 */
export async function loadDemoWorkspace(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByTestId("menu-load-demo").click();
  // Wait until the tree has rendered at least one file row.
  await page.waitForSelector('[data-testid^="tree-node-"][data-testid$=".json"]');
}

export async function openFile(page: Page, path: string): Promise<void> {
  await page.getByTestId(`tree-node-${path}`).click();
  // Wait for the form shell to render.
  await page.getByTestId("form-shell").waitFor();
}

/**
 * Shape of the in-memory BrowserHost exposed on `window.__browserHost`
 * during browser-mode dev — only the methods tests actually call are
 * listed. Keeps specs from reimporting the full BrowserHost type.
 */
export interface BrowserHostProbe {
  snapshot(): Record<string, string>;
  writeTextFile(path: string, contents: string): Promise<void>;
}

/**
 * Simulates an external file edit by re-writing a voice-line's
 * subtitle.text through the browser-host directly, bypassing the
 * workspace store. Fires the host's watcher events, so the editor's
 * workspace-watcher reacts as if the file changed on disk out-of-band.
 */
export async function simulateExternalSubtitle(
  page: Page,
  filePath: string,
  nextSubtitleText: string,
): Promise<void> {
  await page.evaluate(
    ({ path, text }) => {
      const host = (
        window as unknown as { __browserHost: BrowserHostProbe }
      ).__browserHost;
      const parsed = JSON.parse(host.snapshot()[path]) as {
        subtitle?: { text?: string };
      };
      parsed.subtitle = { ...parsed.subtitle, text };
      return host.writeTextFile(path, JSON.stringify(parsed, null, 2) + "\n");
    },
    { path: filePath, text: nextSubtitleText },
  );
}

/** Direct read of the browser-host's snapshot for a given path. */
export async function readViaHost(
  page: Page,
  filePath: string,
): Promise<string> {
  return page.evaluate(
    (path) =>
      (window as unknown as { __browserHost: BrowserHostProbe }).__browserHost.snapshot()[
        path
      ],
    filePath,
  );
}

/** Inspect backup slots for a given file stem. Returns
 *  `[{slot, subtitle}]` sorted by slot number ascending. */
export async function readBackupSlots(
  page: Page,
  stem: string,
): Promise<{ slot: string; subtitle: string }[]> {
  return page.evaluate((s) => {
    const host = (
      window as unknown as { __browserHost: BrowserHostProbe }
    ).__browserHost;
    const snap = host.snapshot();
    const stemEsc = s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`${stemEsc}\\.(\\d)\\.json$`);
    return Object.entries(snap)
      .filter(([k]) => k.includes("/.voice-unbound-editor/backups/"))
      .map(([k, v]) => {
        const m = k.match(re);
        if (!m) return null;
        const parsed = JSON.parse(v) as { subtitle?: { text?: string } };
        return { slot: m[1], subtitle: parsed.subtitle?.text ?? "" };
      })
      .filter((x): x is { slot: string; subtitle: string } => x !== null)
      .sort((a, b) => a.slot.localeCompare(b.slot));
  }, stem);
}
