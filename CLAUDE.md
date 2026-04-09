# Voice Unbound Editor

Visual editor for Voice Unbound SKSE plugin JSON config files. Tauri 2 desktop app with React frontend; also runs in browser mode for development.

## Quick Reference

```bash
npm run dev:browser      # Dev server at http://127.0.0.1:1420 (in-memory fs)
npm run tauri:dev        # Desktop dev (native fs via Tauri)
npm run build            # tsc + vite build
npm run lint             # ESLint
npm run typecheck        # tsc --noEmit
npm run test             # Vitest unit tests
npm run test:watch       # Vitest watch mode
npm run test:coverage    # Vitest with v8 coverage (80% threshold)
npm run test:e2e         # Playwright e2e (starts dev:browser automatically)
```

## Tech Stack

- **React 19** + **TypeScript 5.9** (strict, ES2023 target)
- **Vite 8** (build), **Tauri 2** (desktop shell, Rust backend)
- **Tailwind CSS v4** (via `@tailwindcss/vite` plugin, no PostCSS)
- **Zustand** (state), **Zod 4** (validation), **react-hook-form**
- **react-arborist** + **@dnd-kit** (tree + drag-drop)
- **wavesurfer.js** (audio waveform), **fuse.js** (fuzzy search)
- **Vitest** (unit, jsdom), **Playwright** (e2e, Chromium)

## Path Alias

`@` resolves to `./src` — use consistently in all imports:
```ts
import { cn } from "@/lib/cn";
import { ChipInput } from "@/components/form/inputs/ChipInput";
```

No barrel files. Imports are always explicit to the file.

## Project Structure

```
src/
  components/
    form/             # Voice-line form editor
      Sections/       # GeneralSection, FiltersSection, ConditionsSection, AudioSection
      conditions/     # Recursive condition tree (ConditionTree, ConditionRow, etc.)
      inputs/         # Typed input widgets (ChipInput, EnumPillGroup, FormRefInput, etc.)
      FormShell.tsx   # Main form container
      HeroRow.tsx     # Sticky header with play/waveform/save
    tree/             # File tree sidebar (react-arborist)
    tabs/             # Tab bar
    inspector/        # Right panel: JSON preview, diff, schema, file info
    layout/           # MenuBar, StatusBar, CommandPalette, FindReplace, BulkEdit, etc.
    ui/               # Reusable primitives (Button, Input, Select, Sheet, etc.)
  stores/
    workspace-store.ts   # Core: documents, tabs, undo/redo, file ops, validation
    ui-store.ts          # Theme, density, panel visibility (persisted to localStorage)
    use-document-field.ts # Field reader hooks (useStringField, useNumberField, etc.)
    use-autosave.ts      # 2s idle debounce, valid-doc guard
    use-global-shortcuts.ts
    use-workspace-watcher.ts  # File system watch + conflict detection
  lib/
    host/             # Filesystem abstraction (HostBackend interface)
      tauri-host.ts   # Native fs (production)
      browser-host.ts # In-memory fs (dev/test)
    schema.ts         # Zod schemas (VoiceLine, Condition discriminated union)
    enums.ts          # Events, filter keys, condition types, field ordering (single source of truth)
    validator.ts      # Semantic validation beyond Zod (typos, filter whitelists, form-refs)
    conditions-ops.ts # Immutable condition tree operations (insert, remove, wrap, reorder)
    json-io.ts        # Stable-ordered JSON serializer (canonical field order for git-friendly diffs)
    event-meta.ts     # Per-event colors, descriptions
    audio.ts          # WaveSurfer singleton
    form-refs.ts      # Form reference validation (Plugin.esp|0xHEX format)
src-tauri/            # Rust backend (Tauri 2)
tests/e2e/            # Playwright specs (13 test files)
```

## Architecture

### Host Abstraction

All filesystem calls go through `HostBackend` (`src/lib/host/types.ts`). Selected at startup based on `VITE_BROWSER_MODE` env var:
- **TauriHost**: Real filesystem via Tauri plugins (production)
- **BrowserHost**: In-memory Map + optional File System Access API (dev/test)

### State Management

Two Zustand stores:
- **`useWorkspaceStore`** — documents (Map<path, Document>), open tabs, file tree, undo/redo stacks, recent saves, validation state
- **`useUiStore`** — theme, density, panel visibility (persisted to localStorage)

**Document update flow:**
1. User edits field -> `patchDom(path, patch)` merges into `dom`, sets `dirty: true`
2. `validateDocument(dom)` runs -> updates `issues`
3. Zustand notifies subscribers -> re-render
4. After 2s idle + no errors -> autosave writes to disk

**Undo:** Per-document stacks (50 items). Workspace-level undo tracks last 50 saves across all files.

### Validation

Two-phase:
1. **Parse-time (Zod)** in `schema.ts` — structure, types, enum literals
2. **Semantic** in `validator.ts` — filter-key whitelists per event, form-ref syntax, typo detection, redundancy hints

`VoiceLinePermissiveSchema` allows any string for `event` to preserve hand-edited files; the semantic validator flags unknown events.

### JSON Serialization

`json-io.ts` enforces `CANONICAL_FIELD_ORDER` (from `enums.ts`) for stable diffs. Unknown fields are preserved (appended alphabetically) for forward compatibility with plugin changes.

## Domain Model

**VoiceLine** — a player voice line triggered by a Skyrim event:
- `event`: one of 12 known events (TESHitEvent, TESCombatEvent, periodic, etc.)
- `event_filter`: typed per-event filters (actor, weapon formRef, combat state, etc.)
- `subtitle`: `{ text, duration_ms }` nested object
- `conditions`: recursive AND/OR tree of 15 condition types
- `chance`, `cooldown_seconds`, `exclusive`, `important`, `lipsync`, `suppress_subtypes`

**Conditions** — discriminated union on `type` field. Universal flags: `negated`, `disabled`. Types include: ActorValue, IsInCombat, IsRace, HasPerk, ConditionGroup (recursive), etc.

**Filter keys** — defined per event in `FILTER_KEYS_PER_EVENT` (`enums.ts`). Each has a `kind` that determines the UI widget (actor, enum, formRef, stringList, numberList, boolString).

Schema source of truth: Voice Unbound plugin C++ source (ConfigScanner.cpp, Conditions.cpp, EVENTS.md).

## Conventions

### File Naming
- Components: **PascalCase** (`ConditionRow.tsx`, `FormRefInput.tsx`)
- Lib modules: **kebab-case** (`conditions-ops.ts`, `event-meta.ts`)
- Test files: colocated as `*.test.ts(x)` in `src/lib/__tests__/`

### Styling
- Tailwind utility classes only — no component CSS files
- Custom theme tokens in `src/index.css` (fonts, event colors, typography scale)
- Fonts: Fraunces (display), IBM Plex Sans (body), IBM Plex Mono (data/code)
- Light theme (parchment) + dark theme via `.dark` variant

### State
- Update `dom` directly via `patchDom()` or `updateDom()` — validation and dirty flags are derived
- Field hooks (`useStringField`, `useNumberField`, etc.) for reading document fields in components
- All condition tree mutations are immutable (return new arrays via `conditions-ops.ts`)

## Key Gotchas

1. **Self-write suppression** — After writing a file, the watcher ignores events for 300ms (`lastSelfWriteAt` map) to prevent false conflict dialogs.

2. **Filter keys are whitelisted** — Don't add filter keys in components. The allowed keys per event are defined in `FILTER_KEYS_PER_EVENT` in `enums.ts`.

3. **Canonical field order** — `CANONICAL_FIELD_ORDER` in `enums.ts` must stay in sync with the plugin schema. This controls JSON output order for stable diffs.

4. **Permissive parsing** — Files are parsed with `VoiceLinePermissiveSchema` (any string for event), then the semantic validator in `validator.ts` flags unknown events with typo suggestions.

5. **Form ref format** — `Plugin.esp|0xHEX`. Validated syntactically; plugin resolution deferred to runtime.

6. **Subtitle is a nested object** — Not a flat string. The plugin no longer accepts `subtitle: "text"` — it must be `subtitle: { text, duration_ms }`.

## Testing

- **Unit tests** (`npm run test`): jsdom environment. Coverage scoped to `src/lib/**` at 80% lines/functions/statements, 75% branches.
- **E2E tests** (`npm run test:e2e`): Playwright against `dev:browser` server. Desktop Chromium, 1280x800 viewport. Auto-starts server. CI: 1 worker + 2 retries; local: parallel + reuse server.
- Test fixtures in `src/lib/fixtures/demo-workspace.ts` and `tests/e2e/fixtures/`.
