import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { Plus, ChevronDown } from "lucide-react";
import { type ConditionType } from "@/lib/enums";
import { cn } from "@/lib/cn";

interface AddConditionMenuProps {
  onAdd: (type: ConditionType) => void;
  /** When true, show a compact "+ child" button instead of the full one. */
  compact?: boolean;
  "data-testid"?: string;
}

const TYPE_DESCRIPTIONS: Record<ConditionType, string> = {
  ActorValue: "health / stamina / magicka check",
  IsInCombat: "player in combat",
  IsWeaponDrawn: "weapon is drawn",
  IsSneaking: "player sneaking",
  IsSleeping: "during sleep animations",
  IsInterior: "player in an interior cell",
  IsSwimming: "player in water",
  IsFemale: "female player character",
  IsRace: "match race by ID or formID",
  HasActiveEffect: "magic effect by keyword / formID",
  HasPerk: "player has a perk",
  HasSpell: "player knows a spell",
  IsSlotEmpty: "armor slot(s) empty",
  LocationHasKeyword: "location keyword check",
  PlayerName: "match character name",
  NPCsNearby: "living NPCs within radius",
  IsLocation: "match named location / formID",
  ConditionGroup: "nest with AND / OR logic",
};

interface MenuGroup {
  label: string;
  types: ConditionType[];
}

const MENU_GROUPS: MenuGroup[] = [
  {
    label: "State",
    types: ["IsInCombat", "IsWeaponDrawn", "IsSneaking", "IsSleeping", "IsInterior", "IsSwimming"],
  },
  {
    label: "Character",
    types: ["IsFemale", "IsRace", "PlayerName"],
  },
  {
    label: "Knowledge",
    types: ["HasActiveEffect", "HasPerk", "HasSpell"],
  },
  {
    label: "World",
    types: ["ActorValue", "IsSlotEmpty", "LocationHasKeyword", "IsLocation", "NPCsNearby"],
  },
  {
    label: "Logic",
    types: ["ConditionGroup"],
  },
];

const VIEWPORT_PAD = 8;

interface MenuPos {
  top: number;
  left: number;
  maxHeight: number;
}

export function AddConditionMenu({ onAdd, compact, ...rest }: AddConditionMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node) &&
          !menuRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);

  // Position: open to the right of the button.
  // Vertically: try to vertically center the menu on the button,
  // then clamp so it stays within the viewport.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !menuRef.current) return;

    const btn = triggerRef.current.getBoundingClientRect();
    const menu = menuRef.current;
    const menuH = menu.scrollHeight;
    const vpH = window.innerHeight;

    // Horizontal: to the right of the button, 4px gap
    const left = btn.right + 4;

    // Vertical: center menu on button midpoint, then clamp to viewport
    const btnMid = btn.top + btn.height / 2;
    let top = btnMid - menuH / 2;

    // Clamp within viewport
    top = Math.max(VIEWPORT_PAD, Math.min(top, vpH - menuH - VIEWPORT_PAD));

    const maxHeight = vpH - VIEWPORT_PAD * 2;

    setPos({ top, left, maxHeight });
  }, [open]);

  return (
    <div ref={containerRef} className="relative" data-testid={rest["data-testid"]}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((s) => !s)}
        className={cn(
          "flex items-center gap-1 rounded-sm border border-dashed border-border px-2 transition-colors",
          "hover:border-primary hover:bg-primary/10 hover:text-primary",
          compact ? "h-6 text-[11px]" : "h-7 text-[12px]",
        )}
        data-testid={`${rest["data-testid"] ?? "add-condition"}-trigger`}
      >
        <Plus className="h-3.5 w-3.5" />
        <span>{compact ? "child" : "Add condition"}</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[280px] overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-lg"
          style={pos ? {
            top: pos.top,
            left: pos.left,
            maxHeight: pos.maxHeight,
          } : {
            visibility: "hidden",
          }}
          role="menu"
        >
          {MENU_GROUPS.map((group, gi) => (
            <div key={group.label}>
              {gi > 0 && <div className="my-1 h-px bg-border" />}
              <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
                {group.label}
              </div>
              {group.types.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onAdd(t);
                    setOpen(false);
                  }}
                  className="block w-full rounded-sm px-2 py-1.5 text-left text-[12px] hover:bg-accent hover:text-accent-foreground"
                  data-testid={`add-condition-${t}`}
                >
                  <span className="mono font-medium">{t}</span>
                  {TYPE_DESCRIPTIONS[t] && (
                    <span className="ml-2 text-[11px] text-muted-foreground">
                      {TYPE_DESCRIPTIONS[t]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
