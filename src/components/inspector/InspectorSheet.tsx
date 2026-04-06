import { useMemo } from "react";
import { Copy } from "lucide-react";
import { diffLines, type Change } from "diff";
import { Sheet } from "@/components/ui/Sheet";
import { DiffChunk } from "@/components/ui/DiffChunk";
import { useWorkspaceStore, type Document } from "@/stores/workspace-store";
import { useUiStore, type InspectorTab } from "@/stores/ui-store";
import { basename } from "@/lib/paths";
import { cn } from "@/lib/cn";

const TABS: { id: InspectorTab; label: string }[] = [
  { id: "json", label: "JSON" },
  { id: "diff", label: "Diff" },
  { id: "schema", label: "Schema" },
  { id: "info", label: "File" },
];

export function InspectorSheet() {
  const open = useUiStore((s) => s.inspectorOpen);
  const toggle = useUiStore((s) => s.toggleInspector);
  const tab = useUiStore((s) => s.inspectorTab);
  const setTab = useUiStore((s) => s.setInspectorTab);
  const activeTab = useWorkspaceStore((s) => s.activeTab);
  const doc = useWorkspaceStore((s) =>
    activeTab ? s.documents.get(activeTab) : undefined,
  );

  return (
    <Sheet
      open={open}
      onClose={toggle}
      title={
        <span>
          Inspector
          {activeTab && (
            <span className="mono ml-2 text-[10px] text-muted-foreground">
              {basename(activeTab)}
            </span>
          )}
        </span>
      }
      width={460}
      data-testid="inspector-sheet"
    >
      <div className="flex h-full min-h-0 flex-col">
        <nav
          className="flex shrink-0 border-b border-border"
          role="tablist"
          aria-label="Inspector tabs"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 border-b-2 px-3 py-1.5 text-[11px] font-medium transition-colors",
                tab === t.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
              data-testid={`inspector-tab-${t.id}`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="min-h-0 flex-1 overflow-auto">
          {!activeTab || !doc ? (
            <EmptyState />
          ) : tab === "json" ? (
            <JsonTab rawJson={doc.rawJson} />
          ) : tab === "diff" ? (
            <DiffTab doc={doc} />
          ) : tab === "schema" ? (
            <SchemaTab />
          ) : (
            <InfoTab path={activeTab} doc={doc} />
          )}
        </div>
      </div>
    </Sheet>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center p-6 text-center">
      <p className="text-[11px] text-muted-foreground">
        No file open. Select a voice line from the tree.
      </p>
    </div>
  );
}

function JsonTab({ rawJson }: { rawJson: string }) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void navigator.clipboard.writeText(rawJson)}
        className="absolute right-2 top-2 flex items-center gap-1 rounded border border-border bg-card/80 px-2 py-0.5 text-[10px] text-muted-foreground backdrop-blur hover:border-ring hover:text-foreground"
        title="Copy to clipboard"
        data-testid="inspector-json-copy"
      >
        <Copy className="h-3 w-3" />
        Copy
      </button>
      <pre
        className="mono whitespace-pre-wrap p-3 text-[11px] leading-relaxed text-foreground/90"
        data-testid="inspector-json"
      >
        {rawJson}
      </pre>
    </div>
  );
}

function DiffTab({ doc }: { doc: Document }) {
  const changes = useMemo<Change[]>(
    () => (doc.dirty ? diffLines(doc.baseline, doc.rawJson) : []),
    [doc.dirty, doc.baseline, doc.rawJson],
  );

  if (!doc.dirty) {
    return (
      <div className="p-3" data-testid="inspector-diff">
        <p className="text-[11px] text-muted-foreground">
          No unsaved changes — in sync with disk.
        </p>
      </div>
    );
  }

  const added = changes.reduce(
    (n, c) => (c.added ? n + (c.count ?? 0) : n),
    0,
  );
  const removed = changes.reduce(
    (n, c) => (c.removed ? n + (c.count ?? 0) : n),
    0,
  );

  return (
    <div className="flex h-full flex-col" data-testid="inspector-diff">
      <div className="flex items-center gap-3 border-b border-border px-3 py-1.5 text-[10px]">
        <span className="text-warning">● Unsaved vs disk</span>
        <span className="text-success">+{added}</span>
        <span className="text-destructive">−{removed}</span>
      </div>
      <pre
        className="mono flex-1 overflow-auto p-0 text-[11px] leading-relaxed"
        data-testid="inspector-diff-body"
      >
        {changes.map((change, i) => (
          <DiffChunk key={i} change={change} />
        ))}
      </pre>
    </div>
  );
}


function SchemaTab() {
  return (
    <div className="space-y-3 p-3" data-testid="inspector-schema">
      <div>
        <p className="font-display text-[10px] text-muted-foreground">
          Top-level fields
        </p>
        <ul className="mt-1 space-y-0.5 text-[11px]">
          <SchemaField
            name="event"
            type="string (enum)"
            help="One of 8 known Skyrim events."
          />
          <SchemaField
            name="event_filter"
            type="object?"
            help="Key/value pairs matched against event context. Values can be strings or arrays."
          />
          <SchemaField
            name="subtitle"
            type="{ text, duration_ms }?"
            help="Nested object: what the player speaks and how long the HUD shows it."
          />
          <SchemaField
            name="chance"
            type="float? (0..1)"
            help="Weight in the weighted-random selection pool."
          />
          <SchemaField
            name="cooldown_seconds"
            type="float?"
            help="Per-line cooldown after play."
          />
          <SchemaField
            name="exclusive"
            type="bool?"
            help="Prioritized in the normal pool."
          />
          <SchemaField
            name="important"
            type="bool?"
            help="Bypasses global cooldown + chance roll."
          />
          <SchemaField
            name="lipsync"
            type="{ enabled, intensity }?"
            help="Nested object: disable mouth animation or override the INI intensity for this line."
          />
          <SchemaField
            name="conditions"
            type="Condition[]?"
            help="All must pass for the line to be eligible."
          />
        </ul>
      </div>
    </div>
  );
}

function SchemaField({
  name,
  type,
  help,
}: {
  name: string;
  type: string;
  help: string;
}) {
  return (
    <li className="border-l-2 border-border pl-2">
      <div className="flex items-baseline gap-2">
        <span className="mono font-medium text-foreground">{name}</span>
        <span className="text-[10px] text-muted-foreground">{type}</span>
      </div>
      <p className="text-[10px] text-muted-foreground/80">{help}</p>
    </li>
  );
}

function InfoTab({
  path,
  doc,
}: {
  path: string;
  doc: Document;
}) {
  const size = doc.rawJson.length;
  const issues = doc.issues;

  return (
    <div className="space-y-3 p-3" data-testid="inspector-info">
      <div>
        <p className="font-display text-[10px] text-muted-foreground">Path</p>
        <p className="mono break-all text-[11px] text-foreground">{path}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 text-[11px]">
        <InfoStat label="Size" value={`${size} B`} />
        <InfoStat label="Dirty" value={doc.dirty ? "yes" : "no"} />
        <InfoStat label="Issues" value={String(issues.length)} />
        <InfoStat
          label="Undo depth"
          value={String(doc.undoStack.length)}
        />
      </div>
      {issues.length > 0 && (
        <div>
          <p className="font-display text-[10px] text-muted-foreground">
            Validation
          </p>
          <ul className="mt-1 space-y-1 text-[11px]">
            {issues.map((i, idx) => (
              <li
                key={idx}
                className={cn(
                  "border-l-2 pl-2",
                  i.severity === "error"
                    ? "border-destructive text-destructive"
                    : i.severity === "warning"
                      ? "border-warning text-warning"
                      : "border-border text-muted-foreground",
                )}
              >
                <span className="mono text-[10px] opacity-70">
                  {i.path || "(root)"}
                </span>{" "}
                {i.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function InfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display text-[9px] text-muted-foreground">{label}</p>
      <p className="mono text-[12px] text-foreground">{value}</p>
    </div>
  );
}

