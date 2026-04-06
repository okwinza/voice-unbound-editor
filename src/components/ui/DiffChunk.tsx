import type { Change } from "diff";
import { cn } from "@/lib/cn";

/**
 * Renders one chunk returned by `diffLines(a, b)` — added (green +),
 * removed (red −), or unchanged (muted). Shared between the Inspector's
 * Diff tab and the FileConflictDialog's external-diff pane.
 */
export function DiffChunk({ change }: { change: Change }) {
  const lines = change.value.replace(/\n$/, "").split("\n");
  const marker = change.added ? "+" : change.removed ? "−" : " ";
  const cls = change.added
    ? "bg-success/10 text-success"
    : change.removed
      ? "bg-destructive/10 text-destructive"
      : "text-muted-foreground/70";
  return (
    <>
      {lines.map((line, i) => (
        <div key={i} className={cn("flex px-3", cls)}>
          <span className="w-4 shrink-0 select-none opacity-60">{marker}</span>
          <span className="whitespace-pre-wrap break-all">{line}</span>
        </div>
      ))}
    </>
  );
}
