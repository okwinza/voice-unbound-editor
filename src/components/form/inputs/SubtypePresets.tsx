import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  VOICE_SUBTYPES,
  GROUP_LABELS,
  type SubtypeGroup,
} from "@/lib/voice-subtypes";
import { cn } from "@/lib/cn";

interface SubtypePresetsProps {
  selected: readonly number[];
  onToggle: (id: number) => void;
  "data-testid"?: string;
}

const GROUP_ORDER: SubtypeGroup[] = [
  "attacks",
  "state",
  "transitions",
  "casting",
  "breath",
  "movement",
];

export function SubtypePresets({ selected, onToggle, ...rest }: SubtypePresetsProps) {
  const [open, setOpen] = useState(false);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const groups = useMemo(() => {
    const map: Record<SubtypeGroup, typeof VOICE_SUBTYPES> = {
      attacks: [], state: [], transitions: [], casting: [], breath: [], movement: [],
    };
    for (const s of VOICE_SUBTYPES) map[s.group].push(s);
    return map;
  }, []);

  return (
    <div className="mt-2" data-testid={rest["data-testid"]}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        data-testid="subtype-presets-toggle"
      >
        {open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        Common presets
        <span className="mono text-[10px] text-muted-foreground/60">
          ({VOICE_SUBTYPES.length})
        </span>
      </button>
      {open && (
        <div className="mt-2 space-y-2.5 rounded-sm border border-border/60 bg-card/20 p-2.5">
          {GROUP_ORDER.map((g) => (
            <div key={g}>
              <p className="font-display mb-1 text-[9px] text-muted-foreground">
                {GROUP_LABELS[g]}
              </p>
              <div className="flex flex-wrap gap-1">
                {groups[g].map((s) => {
                  const isSelected = selectedSet.has(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onToggle(s.id)}
                      title={s.hint ?? s.name}
                      className={cn(
                        "mono group flex items-center gap-1 rounded-sm border px-1.5 py-[1px] text-[10px] transition-colors",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-ring hover:text-foreground",
                      )}
                      data-testid={`subtype-preset-${s.id}`}
                    >
                      <span className="tabular-nums text-[9px] opacity-70">
                        {s.id}
                      </span>
                      <span>{s.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
