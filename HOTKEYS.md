# Voice Unbound Editor — Hotkeys

All shortcuts work with `Cmd` on Mac in place of `Ctrl`. Press `?`
anywhere outside a text input to see this map in-app.

## File

| Shortcut | Action |
|---|---|
| `Ctrl+O` | Open folder |
| `Ctrl+S` | Save active tab |
| `Ctrl+Shift+S` | Save all dirty tabs |
| `Ctrl+D` | Duplicate current file (auto-increments `_NN`) |
| `F2` | Rename selected tree file (or active tab) |
| `F5` | Reload workspace |

Autosave fires 2 seconds after the last edit when the document is
valid — manual save is rarely needed.

## Navigation

| Shortcut | Action |
|---|---|
| `Ctrl+K` | Command palette (fuzzy search over files + actions) |
| `Ctrl+Shift+F` | Workspace search panel (full-text) |
| `Ctrl+Shift+H` | Find & replace (workspace-wide) |
| `Ctrl+Shift+Z` | Workspace undo drawer (cross-file save history) |
| `Ctrl+J` | Toggle Inspector sheet (JSON / Diff / Schema / File) |
| `?` | This shortcut map |
| `Esc` | Close any open sheet, dialog, drawer, or overlay |

## Audio

| Shortcut | Action |
|---|---|
| `Space` | Play / stop the focused tree row's `.wav` |
| `Shift+Space` | Play the next line in the folder (walking auditioner) |

Only one line plays at a time across the whole app. Lines without a
paired `.wav` show a muted play icon and synthesize a tone.

## Conditions

| Gesture | Action |
|---|---|
| Drag the handle in a condition row's gutter | Reorder within the containing group |
| Hover row → **Wrap** | Wrap in an AND group |
| Hover row → **Extract** | Lift the condition to its parent |
| `Delete` (when selected) | Remove the condition row |
| `Ctrl+G` | Wrap selected conditions in a group |

## Discovery

Anything without a shortcut is in the **command palette** (`Ctrl+K`):

- Bulk edit — set one scalar field across N files at once
- Save all, Toggle Inspector, Toggle theme, Density presets
- Search workspace, Find & replace, Undo across files
- Stop playback
