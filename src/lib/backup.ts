/**
 * Rolling backups for the last 5 on-disk versions of each voice-line
 * JSON. Lives alongside the workspace at
 * `<workspaceRoot>/.voice-unbound-editor/backups/<stem>.<N>.json`
 * where N=1 is the most recent and N=5 is the oldest.
 *
 * Called before every saveDocument so if a save corrupts or overwrites
 * work the modder wanted to keep, the previous content is recoverable.
 */

import type { HostBackend } from "./host";
import { basename, stemOf } from "./paths";

/** Sibling dotfile directory for editor metadata (backups, etc.). */
export const DOT_DIR = ".voice-unbound-editor";
const BACKUP_DIR_SEGMENT = `${DOT_DIR}/backups`;
const BACKUP_SLOTS = 5;

/**
 * Cycles `previousContent` into the backup slot chain for a file.
 * Non-blocking semantics — errors are logged + swallowed so a broken
 * backup system never blocks a save.
 */
export async function rollBackup(
  host: HostBackend,
  workspaceRoot: string,
  filePath: string,
  previousContent: string,
): Promise<void> {
  if (!previousContent) return;
  const dir = `${workspaceRoot}/${BACKUP_DIR_SEGMENT}`;
  const stem = stemOf(basename(filePath));
  const slotPath = (n: number) => `${dir}/${stem}.${n}.json`;

  try {
    await host.mkdir(dir);
  } catch {
    // mkdir on an existing dir typically throws — swallow. If it's a
    // real permission problem the subsequent write will fail loudly.
  }

  // Rotate slots oldest→newest (.4→.5, .3→.4, …) so nothing overwrites
  // an in-use slot. Try-rename; a missing source (fresh workspace, <5
  // saves deep) just throws and we move on to the next slot.
  for (let from = BACKUP_SLOTS - 1; from >= 1; from--) {
    try {
      await host.rename(slotPath(from), slotPath(from + 1));
    } catch {
      // Source doesn't exist yet — expected until the chain is warm.
    }
  }

  try {
    await host.writeTextFile(slotPath(1), previousContent);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[backup] write ${slotPath(1)} failed:`, err);
  }
}
