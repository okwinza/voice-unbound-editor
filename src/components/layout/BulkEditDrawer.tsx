import { useEffect, useMemo, useState } from "react";
import { X, Layers, Check } from "lucide-react";
import { useUiStore } from "@/stores/ui-store";
import {
  useWorkspaceStore,
  type BulkEditResult,
} from "@/stores/workspace-store";
import { KNOWN_EVENTS, type EventName } from "@/lib/enums";
import { EVENT_META } from "@/lib/event-meta";
import { basename, stemOf } from "@/lib/paths";
import { extractEventName } from "@/lib/dom-accessors";
import { readDotPath } from "@/lib/dot-path";
import { cn } from "@/lib/cn";

/**
 * Bulk-edit drawer. Pick a scope (all files or by event), a field, and
 * a value — the drawer shows an inline preview of every file that
 * would change (old → new) and writes them in one batch on Apply.
 * Each changed file lands in the workspace undo drawer independently.
 */

type Scope =
  | { kind: "all" }
  | { kind: "event"; event: EventName };

type FieldSpec =
  | { key: "chance"; kind: "number"; label: string; min: 0; max: 1; step: 0.05 }
  | { key: "cooldown_seconds"; kind: "number"; label: string; min: 0; step: 1 }
  | { key: "subtitle.duration_ms"; kind: "number"; label: string; min: 0; max: 60000; step: 100 }
  | { key: "exclusive"; kind: "boolean"; label: string }
  | { key: "important"; kind: "boolean"; label: string }
  | { key: "lipsync.enabled"; kind: "boolean"; label: string };

const FIELDS: readonly FieldSpec[] = [
  { key: "chance", kind: "number", label: "Chance (0–1)", min: 0, max: 1, step: 0.05 },
  { key: "cooldown_seconds", kind: "number", label: "Cooldown (seconds)", min: 0, step: 1 },
  {
    key: "subtitle.duration_ms",
    kind: "number",
    label: "Subtitle duration (ms)",
    min: 0,
    max: 60000,
    step: 100,
  },
  { key: "exclusive", kind: "boolean", label: "exclusive" },
  { key: "important", kind: "boolean", label: "important" },
  { key: "lipsync.enabled", kind: "boolean", label: "lipsync.enabled" },
];


export function BulkEditDrawer() {
  const open = useUiStore((s) => s.bulkEditOpen);
  const close = useUiStore((s) => s.closeBulkEdit);
  const documents = useWorkspaceStore((s) => s.documents);
  const applyBulkEdit = useWorkspaceStore((s) => s.applyBulkEdit);

  const [scope, setScope] = useState<Scope>({ kind: "event", event: "TESCombatEvent" });
  const [field, setField] = useState<FieldSpec>(FIELDS[0]);
  const [numberValue, setNumberValue] = useState<string>("1");
  const [boolValue, setBoolValue] = useState<boolean>(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BulkEditResult | null>(null);

  useEffect(() => {
    if (!open) return;
    setResult(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const nextValue: string | number | boolean | undefined =
    field.kind === "number"
      ? (numberValue.trim() === "" ? undefined : Number(numberValue))
      : boolValue;

  const matchingPaths = useMemo<string[]>(() => {
    const out: string[] = [];
    for (const [path, doc] of documents) {
      if (scope.kind === "event") {
        const evt = extractEventName(doc.dom);
        if (evt !== scope.event) continue;
      }
      out.push(path);
    }
    return out;
  }, [documents, scope]);

  const previews = useMemo(() => {
    if (
      field.kind === "number" &&
      (nextValue === undefined || Number.isNaN(nextValue))
    ) {
      return [];
    }
    return matchingPaths.map((path) => {
      const doc = documents.get(path);
      const current = readDotPath(doc?.dom, field.key);
      return { path, currentValue: current, willChange: current !== nextValue };
    });
  }, [matchingPaths, documents, field.key, nextValue, field.kind]);

  const changeCount = previews.filter((p) => p.willChange).length;

  const runApply = async () => {
    if (busy || changeCount === 0 || nextValue === undefined) return;
    setBusy(true);
    try {
      const paths = previews.filter((p) => p.willChange).map((p) => p.path);
      const r = await applyBulkEdit(paths, field.key, nextValue);
      setResult(r);
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60]"
      onClick={close}
      data-testid="bulk-edit-backdrop"
    >
      <div
        className="absolute inset-y-0 right-0 flex w-[420px] flex-col border-l border-border bg-popover shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Bulk edit"
        data-testid="bulk-edit-drawer"
      >
        <header className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
          <div className="flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-display text-[12px] text-foreground">
              Bulk edit
            </span>
          </div>
          <button
            type="button"
            onClick={close}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label="Close"
            data-testid="bulk-edit-close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="space-y-3 border-b border-border px-3 py-3">
          <Control label="Scope">
            <select
              value={scope.kind === "all" ? "all" : scope.event}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "all") setScope({ kind: "all" });
                else setScope({ kind: "event", event: v as EventName });
              }}
              className="mono h-7 w-full rounded-sm border border-border bg-input px-2 text-[11px] outline-none focus:border-ring"
              data-testid="bulk-edit-scope"
            >
              <option value="all">All files</option>
              {KNOWN_EVENTS.map((e) => (
                <option key={e} value={e}>
                  {e} ({EVENT_META[e].label})
                </option>
              ))}
            </select>
          </Control>

          <Control label="Field">
            <select
              value={field.key}
              onChange={(e) => {
                const next = FIELDS.find((f) => f.key === e.target.value);
                if (next) setField(next);
              }}
              className="mono h-7 w-full rounded-sm border border-border bg-input px-2 text-[11px] outline-none focus:border-ring"
              data-testid="bulk-edit-field"
            >
              {FIELDS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </Control>

          <Control label="New value">
            {field.kind === "number" ? (
              <input
                type="number"
                value={numberValue}
                onChange={(e) => setNumberValue(e.target.value)}
                min={field.min}
                max={"max" in field ? field.max : undefined}
                step={field.step}
                className="mono h-7 w-full rounded-sm border border-border bg-input px-2 text-[11px] outline-none focus:border-ring"
                data-testid="bulk-edit-value"
              />
            ) : (
              <label className="flex h-7 items-center gap-2 px-1 text-[11px] text-foreground">
                <input
                  type="checkbox"
                  checked={boolValue}
                  onChange={(e) => setBoolValue(e.target.checked)}
                  className="h-3.5 w-3.5 accent-primary"
                  data-testid="bulk-edit-value"
                />
                <span className="mono">{boolValue ? "true" : "false"}</span>
              </label>
            )}
          </Control>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {result ? (
            <ResultSummary result={result} />
          ) : (
            <PreviewList previews={previews} field={field} nextValue={nextValue} />
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-border px-3 py-2">
          <span
            className="text-[10px] text-muted-foreground"
            data-testid="bulk-edit-summary"
          >
            {result
              ? `${result.changedPaths.length} updated · ${result.unchangedPaths.length} unchanged`
              : `${changeCount} of ${matchingPaths.length} will change`}
          </span>
          <div className="flex items-center gap-1.5">
            {result && (
              <button
                type="button"
                onClick={() => setResult(null)}
                className="rounded-sm border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary hover:text-primary"
              >
                New edit
              </button>
            )}
            <button
              type="button"
              onClick={() => void runApply()}
              disabled={
                busy ||
                !!result ||
                changeCount === 0 ||
                nextValue === undefined ||
                (field.kind === "number" && Number.isNaN(nextValue))
              }
              className={cn(
                "flex items-center gap-1 rounded-sm px-2.5 py-1 text-[11px] font-medium",
                "bg-primary text-primary-foreground",
                "hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none",
              )}
              data-testid="bulk-edit-apply"
            >
              <Check className="h-3 w-3" />
              {busy ? "Applying…" : "Apply"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Control({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block font-display text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function PreviewList({
  previews,
  field,
  nextValue,
}: {
  previews: { path: string; currentValue: unknown; willChange: boolean }[];
  field: FieldSpec;
  nextValue: string | number | boolean | undefined;
}) {
  if (previews.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 p-6 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          No files in scope
        </p>
        <p className="text-xs text-muted-foreground/70">
          Widen the scope or pick a different event.
        </p>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-border/40">
      {previews.map((p) => (
        <li
          key={p.path}
          className={cn(
            "flex items-baseline gap-2 px-3 py-1.5 text-[10px]",
            !p.willChange && "opacity-50",
          )}
          data-testid={`bulk-edit-preview-${p.path}`}
        >
          <span className="mono flex-1 truncate text-foreground">
            {stemOf(basename(p.path))}
          </span>
          <span className="mono text-muted-foreground">
            {formatValue(p.currentValue, field)}
            <span className="mx-1 text-muted-foreground/50">→</span>
            <span className={p.willChange ? "text-primary" : "text-muted-foreground/50"}>
              {formatValue(nextValue, field)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function formatValue(v: unknown, field: FieldSpec): string {
  if (v === undefined || v === null) return "—";
  if (field.kind === "boolean") return v === true ? "true" : "false";
  return String(v);
}

function ResultSummary({ result }: { result: BulkEditResult }) {
  return (
    <div className="space-y-2 p-3 text-[11px]">
      <p className="text-foreground">
        Updated {result.changedPaths.length}{" "}
        {result.changedPaths.length === 1 ? "file" : "files"}.
        {result.unchangedPaths.length > 0 &&
          ` ${result.unchangedPaths.length} already at target value.`}
      </p>
      {result.skippedPaths.length > 0 && (
        <p className="text-warning">
          Skipped {result.skippedPaths.length} with invalid JSON structure.
        </p>
      )}
      <p className="text-[10px] text-muted-foreground">
        Rollback individual files from the workspace undo drawer (Ctrl+Shift+Z).
      </p>
    </div>
  );
}
