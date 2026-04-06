# Voice Unbound Editor

Standalone visual editor for Voice Unbound voice-line
configs — the `.json` files under
`Data/Sound/fx/VoiceUnbound/**/*.json` that drive the player voice
lines for the Skyrim SKSE plugin.

The plugin reads a strict JSON schema per line (event, filters,
subtitle, conditions, dispatch flags). Hand-writing these files is
tedious and produces silent runtime warnings. This editor replaces
that workflow: browse the workspace, edit with live validation +
dropdowns + inline audio, save back with stable field ordering. It's
built to scale to a few hundred lines across themed subfolders.

## Stack

Tauri 2 + React 19 + TypeScript + Vite 8 + Tailwind v4 + Zustand +
Zod + react-hook-form + wavesurfer.js + react-arborist + @dnd-kit +
fuse.js. Ships as a portable Windows `.exe` (~13 MB, bundles the
webview via WebView2 Runtime). The same frontend runs as a plain
web app in browser mode for dev + E2E.

## Getting started

```bash
npm install
npm run dev:browser       # Vite dev server at http://localhost:1420
npm run test              # Vitest unit + component tests
npm run test:e2e          # Playwright against the dev server
```

Open a workspace via **Open Folder** in the top bar (uses the File
System Access API in Chrome/Edge), or click **Load Demo** to seed an
in-memory fixture with a handful of `okw_*` voice lines.

## Editing

- **Tree (left sidebar)** — browse files by folder. Each row shows
  the event badge, a play button for the paired `.wav`, and a status
  shape (● clean, ◐ warnings, ✕ errors, ○ unsaved).
- **Form (center)** — sections for General / Event / Filters /
  Conditions / Audio. Event is a strict Select; filter keys are
  pre-rendered per event with typed widgets (chip input, segmented
  actor picker, form-ref combobox, boolean tri-state).
- **Inspector (Ctrl+J)** — right-side sheet with JSON preview, diff
  vs disk, schema reference, file info.
- **Hero row** — sticky header above the form with play button,
  waveform, save/revert, and a drop-zone for attaching a `.wav`
  (auto-fills `subtitle_duration_ms` from probed duration + 500ms).

Saves are **atomic** (via the host backend) with **autosave** after
2 seconds of idle when the document is valid. Every save is recorded
in a cross-file **undo drawer** (Ctrl+Shift+Z, last 50 entries) so
you can cherry-pick rollbacks.

## Bulk workflows

- **Workspace search (Ctrl+Shift+F)** — full-text search across
  filenames + raw JSON with highlighted line snippets.
- **Find & replace (Ctrl+Shift+H)** — substring replace across all
  files, skips replacements that would break JSON, writes the
  successful ones and lands each one in the undo drawer.
- **Bulk edit** (command palette: "Bulk edit") — scope by event,
  set a scalar field (chance, cooldown, duration, exclusive,
  important) across every matching file in one batch.
- **Command palette (Ctrl+K)** — fuzzy search over files +
  workspace actions (fuse.js).

## Shortcuts

See [HOTKEYS.md](./HOTKEYS.md) for the full list, or press `?` in
the app.

## Architecture

```
src/
  components/  React UI — form sections, tree, inspector, overlays
  stores/      Zustand stores: workspace (documents, undo, recentSaves)
               + ui (theme, density, panel visibility)
  lib/
    host/      HostBackend abstraction — BrowserHost (in-memory +
               File System Access API) and TauriHost (fs plugin)
    schema.ts  Zod schemas for VoiceLine + recursive Condition union
    enums.ts   Single source of truth for events, filter keys,
               condition types, slot names, field ordering
    validator.ts         Cross-file + single-file validation
    event-meta.ts        Per-event colors + descriptions
    audio.ts             WaveSurfer singleton
    json-io.ts           Stable-ordered serializer
```

The **HostBackend** interface is the testability seam: every fs call
(pickFolder, readDir, readTextFile, writeTextFile, writeBinaryFile,
etc.) goes through it, and unit tests / Playwright tests wire a
seedable in-memory BrowserHost instead of touching real disk.

## Schema reference

The canonical event/filter/condition schema lives in the Voice Unbound
plugin repo. The editor's `src/lib/enums.ts` mirrors it with source
citations per field. If the plugin adds a new event, update `enums.ts` +
`event-meta.ts` and everything else (dropdowns, filters, templates,
validation) flows through automatically.

## Building the .exe

Prerequisites:
- Rust toolchain (`rustup`, stable) — install via [`rustup.rs`](https://rustup.rs) or `winget install Rustlang.Rustup`
- MSVC Build Tools 2019+ (installed with Visual Studio Build Tools; provides `cl.exe` + Windows SDK)
- WebView2 Runtime — pre-installed on Windows 11, shipped with most Windows 10 updates

```bash
npm install
npm run tauri:build
```

Output: `src-tauri/target/release/voice-unbound-editor.exe` — a single
~13 MB portable binary with no install step required. Double-click
to launch.

For Tauri dev (HMR into a native webview):

```bash
npm run tauri:dev
```
