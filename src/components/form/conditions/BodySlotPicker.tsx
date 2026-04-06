import { cn } from "@/lib/cn";
import type { ArmorSlot } from "@/lib/enums";

/**
 * Mannequin SVG for the IsSlotEmpty condition. Click regions toggle slots;
 * selected slots are highlighted in the primary (amber) tone.
 *
 * Slots from plan D12 + Conditions.cpp:73-85: head, hair, body, hands,
 * amulet, ring, feet, shield, circlet.
 */

interface BodySlotPickerProps {
  slots: readonly ArmorSlot[];
  onChange: (slots: ArmorSlot[]) => void;
  "data-testid"?: string;
}

type SlotRegion = {
  slot: ArmorSlot;
  cx: number;
  cy: number;
  r: number;
  label: string;
};

// Coordinates laid out over a stylized 90×140 mannequin.
const REGIONS: SlotRegion[] = [
  { slot: "head",    cx: 45, cy: 12,  r: 9,  label: "Head" },
  { slot: "hair",    cx: 45, cy: 5,   r: 5,  label: "Hair" },
  { slot: "circlet", cx: 58, cy: 10,  r: 4,  label: "Circlet" },
  { slot: "amulet",  cx: 45, cy: 26,  r: 4,  label: "Amulet" },
  { slot: "body",    cx: 45, cy: 48,  r: 13, label: "Body" },
  { slot: "hands",   cx: 22, cy: 60,  r: 6,  label: "Hands" },
  { slot: "ring",    cx: 16, cy: 68,  r: 4,  label: "Ring" },
  { slot: "shield",  cx: 72, cy: 58,  r: 7,  label: "Shield" },
  { slot: "feet",    cx: 45, cy: 118, r: 8,  label: "Feet" },
];

export function BodySlotPicker({ slots, onChange, ...rest }: BodySlotPickerProps) {
  const selected = new Set(slots);

  const toggle = (slot: ArmorSlot) => {
    const next = new Set(selected);
    if (next.has(slot)) next.delete(slot);
    else next.add(slot);
    onChange([...next]);
  };

  return (
    <div className="flex items-start gap-3" data-testid={rest["data-testid"]}>
      <svg
        viewBox="0 0 90 140"
        width={90}
        height={140}
        className="shrink-0"
        role="img"
        aria-label="Armor slot picker"
      >
        {/* Stylized silhouette — simple geometric forms, not photoreal. */}
        <g
          className="fill-muted/40 stroke-border"
          strokeWidth={0.5}
          aria-hidden
        >
          {/* Head */}
          <ellipse cx={45} cy={12} rx={8} ry={10} />
          {/* Neck */}
          <rect x={42} y={20} width={6} height={4} />
          {/* Torso */}
          <path d="M 30 26 L 60 26 L 62 70 L 28 70 Z" />
          {/* Arms */}
          <path d="M 30 28 L 20 66 L 24 68 L 32 32 Z" />
          <path d="M 60 28 L 70 66 L 66 68 L 58 32 Z" />
          {/* Legs */}
          <path d="M 32 70 L 30 120 L 38 120 L 42 70 Z" />
          <path d="M 58 70 L 60 120 L 52 120 L 48 70 Z" />
          {/* Feet */}
          <ellipse cx={34} cy={122} rx={6} ry={3} />
          <ellipse cx={56} cy={122} rx={6} ry={3} />
        </g>

        {/* Hit targets + selection rings */}
        {REGIONS.map((r) => {
          const isSelected = selected.has(r.slot);
          return (
            <g key={r.slot}>
              <circle
                cx={r.cx}
                cy={r.cy}
                r={r.r}
                className={cn(
                  "cursor-pointer transition-all",
                  isSelected
                    ? "fill-primary/30 stroke-primary"
                    : "fill-transparent stroke-muted-foreground/30 hover:stroke-foreground/60",
                )}
                strokeWidth={isSelected ? 1.5 : 0.75}
                onClick={() => toggle(r.slot)}
                data-testid={`slot-${r.slot}`}
              >
                <title>{r.label}</title>
              </circle>
              {isSelected && (
                <circle
                  cx={r.cx}
                  cy={r.cy}
                  r={1.4}
                  className="pointer-events-none fill-primary"
                />
              )}
            </g>
          );
        })}
      </svg>

      <div className="flex flex-1 flex-wrap content-start gap-1 pt-1">
        {REGIONS.map((r) => {
          const isSelected = selected.has(r.slot);
          return (
            <button
              key={r.slot}
              type="button"
              onClick={() => toggle(r.slot)}
              className={cn(
                "mono rounded-sm border px-1.5 py-[2px] text-[10px] transition-colors",
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-ring hover:text-foreground",
              )}
              data-testid={`slot-chip-${r.slot}`}
            >
              {r.slot}
            </button>
          );
        })}
      </div>
    </div>
  );
}
