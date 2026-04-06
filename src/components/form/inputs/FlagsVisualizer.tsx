import { cn } from "@/lib/cn";

interface FlagsVisualizerProps {
  important: boolean;
  exclusive: boolean;
  /** Click a lane to set flags directly. */
  onSelectLane?: (target: { important: boolean; exclusive: boolean }) => void;
}

/**
 * Dispatch-pass routing diagram.
 *
 *   Pass 1 / important  → bypasses global cooldown + chance roll
 *   Pass 2 / exclusive  → priority in normal pool
 *   Pass 2 / normal     → subject to global cooldown + chance
 *
 * Each lane is a button: clicking it sets `important` and `exclusive`
 * to the combination that routes the current line into that lane.
 */
export function FlagsVisualizer({
  important,
  exclusive,
  onSelectLane,
}: FlagsVisualizerProps) {
  const inPass1 = important;
  const inExclusive = !important && exclusive;
  const inNormal = !important && !exclusive;

  return (
    <div
      className="rounded-md border border-border bg-card/50 p-4"
      data-testid="flags-visualizer"
    >
      <div className="mb-3 flex items-baseline justify-between">
        <span className="font-display text-[11px] text-muted-foreground">
          Dispatch Route
        </span>
        <span className="mono text-[10px] text-muted-foreground/60">
          click a lane to route here
        </span>
      </div>

      <div className="flex items-stretch gap-2">
        <Lane
          label="Pass 1"
          sublabel="important"
          caption="bypasses cooldown + chance roll"
          active={inPass1}
          onClick={
            onSelectLane
              ? () => onSelectLane({ important: true, exclusive: false })
              : undefined
          }
        />
        <Connector />
        <Lane
          label="Pass 2"
          sublabel="exclusive"
          caption="priority in normal pool"
          active={inExclusive}
          onClick={
            onSelectLane
              ? () => onSelectLane({ important: false, exclusive: true })
              : undefined
          }
        />
        <Connector dashed />
        <Lane
          label="Pass 2"
          sublabel="normal"
          caption="subject to cooldown + chance roll"
          active={inNormal}
          onClick={
            onSelectLane
              ? () => onSelectLane({ important: false, exclusive: false })
              : undefined
          }
        />
      </div>
    </div>
  );
}

function Lane({
  label,
  sublabel,
  caption,
  active,
  onClick,
}: {
  label: string;
  sublabel: string;
  caption: string;
  active: boolean;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col gap-1 rounded-sm border p-3 text-left transition-all duration-200",
        active
          ? "border-primary bg-primary/10 shadow-[inset_0_0_0_1px] shadow-primary/40"
          : "border-border bg-transparent opacity-55",
        onClick &&
          !active &&
          "cursor-pointer hover:border-primary/60 hover:bg-accent/30 hover:opacity-90",
        onClick && active && "cursor-default",
      )}
      aria-current={active}
      aria-pressed={active}
      data-testid={`dispatch-lane-${sublabel}`}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "font-display text-[10px]",
            active ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {label}
        </span>
        {active && (
          <span
            className="inline-block h-2 w-2 rounded-full bg-primary animate-[scriptorium-rise_300ms_ease-out]"
            aria-label="current line"
          />
        )}
      </div>
      <span
        className={cn(
          "mono text-[12px] font-medium leading-tight",
          active ? "text-primary" : "text-muted-foreground",
        )}
      >
        {sublabel}
      </span>
      <span
        className={cn(
          "text-[10px] leading-snug",
          active ? "text-muted-foreground" : "text-muted-foreground/60",
        )}
      >
        {caption}
      </span>
    </Tag>
  );
}

function Connector({ dashed }: { dashed?: boolean }) {
  return (
    <div className="flex shrink-0 items-center" aria-hidden>
      <svg width="14" height="18" viewBox="0 0 14 18" className="text-border">
        <line
          x1="0"
          y1="9"
          x2="14"
          y2="9"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray={dashed ? "2 2" : undefined}
        />
        <polyline
          points="9,4 14,9 9,14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}
