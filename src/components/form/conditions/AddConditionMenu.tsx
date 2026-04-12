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
  IsRunning: "player is running",
  IsSprinting: "player is sprinting",
  IsWalking: "player is walking (not running)",
  IsBlocking: "player is blocking",
  IsBleedingOut: "player is bleeding out",
  IsOnMount: "player on horseback",
  IsFlying: "vampire lord flight form",
  IsTrespassing: "player is trespassing",
  PlayerLevel: "check player level",
  GoldAmount: "check gold carried",
  TimeOfDay: "game-time hour range",
  IsInFaction: "player in faction (formID)",
  IsInWorldspace: "player in worldspace (formID)",
  WeatherIs: "current weather kind",
  IsCurrentWeather: "specific weather form active",
  QuestStage: "quest progress by stage number",
  QuestState: "quest running / completed / stopped",
  EquippedWeaponType: "weapon type in hand",
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
    label: "Movement",
    types: ["IsRunning", "IsSprinting", "IsWalking", "IsBlocking", "IsBleedingOut", "IsOnMount", "IsFlying", "IsTrespassing"],
  },
  {
    label: "Character",
    types: ["IsFemale", "IsRace", "PlayerName", "ActorValue", "PlayerLevel", "GoldAmount"],
  },
  {
    label: "Knowledge",
    types: ["HasActiveEffect", "HasPerk", "HasSpell"],
  },
  {
    label: "Equipment",
    types: ["IsSlotEmpty", "EquippedWeaponType"],
  },
  {
    label: "Quest",
    types: ["QuestStage", "QuestState"],
  },
  {
    label: "World",
    types: ["LocationHasKeyword", "IsLocation", "NPCsNearby", "IsInFaction", "IsInWorldspace", "WeatherIs", "IsCurrentWeather", "TimeOfDay"],
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
  const [filter, setFilter] = useState("");
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
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter..."
            className="mono mb-1 w-full rounded-sm border border-border bg-input px-2 py-1 text-[12px] text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-ring"
            autoFocus
            data-testid="add-condition-filter"
          />
          {MENU_GROUPS.map((group, gi) => {
            const lc = filter.toLowerCase();
            const filtered = lc
              ? group.types.filter(
                  (t) =>
                    t.toLowerCase().includes(lc) ||
                    TYPE_DESCRIPTIONS[t].toLowerCase().includes(lc),
                )
              : group.types;
            if (filtered.length === 0) return null;
            return (
              <div key={group.label}>
                {gi > 0 && <div className="my-1 h-px bg-border" />}
                <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
                  {group.label}
                </div>
                {filtered.map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onAdd(t);
                      setOpen(false);
                      setFilter("");
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
            );
          })}
        </div>
      )}
    </div>
  );
}
