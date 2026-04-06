/**
 * Keyboard event helpers shared by global shortcut hooks.
 */

/** True if a keydown's target is an editable element — typing shouldn't be hijacked. */
export function isEditableTarget(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  if (t.isContentEditable) return true;
  return t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT";
}
