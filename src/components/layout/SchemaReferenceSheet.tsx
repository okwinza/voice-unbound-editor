import { Sheet } from "@/components/ui/Sheet";
import { useUiStore } from "@/stores/ui-store";
import {
  FILTER_KEYS_PER_EVENT,
  KNOWN_EVENTS,
  CONDITION_TYPES,
  type EventName,
  type ConditionType,
  type FilterKeySpec,
} from "@/lib/enums";
import { EVENT_META } from "@/lib/event-meta";
import { cn } from "@/lib/cn";

const CONDITION_META: Record<ConditionType, { summary: string }> = {
  ActorValue: {
    summary:
      "Compare an actor value (Health, Stamina, Archery, …) via 12 comparison operators (below, above, equals, !=, >=, <=, and percent variants).",
  },
  IsInCombat: { summary: "Passes when the player is currently in combat." },
  IsWeaponDrawn: { summary: "Passes when the player has a weapon drawn." },
  IsSneaking: { summary: "Passes when the player is sneaking." },
  IsSleeping: { summary: "Passes during sleep animations (lie-down / wake-up)." },
  IsInterior: { summary: "Passes when the player is in an interior cell." },
  IsSwimming: { summary: "Passes when the player is swimming." },
  IsFemale: { summary: "Passes when the player character is female. Use negated for male-only." },
  IsRace: { summary: "Match the player's race by editor ID or form reference." },
  HasActiveEffect: {
    summary:
      "Passes when the player has a magic effect with a matching keyword or formID.",
  },
  HasPerk: { summary: "Passes when the player has a specific perk (by formID)." },
  HasSpell: { summary: "Passes when the player knows a specific spell (by formID)." },
  IsSlotEmpty: {
    summary:
      "Passes when the listed equipment slots are all empty (head, hair, body, hands, amulet, ring, feet, shield, circlet).",
  },
  LocationHasKeyword: {
    summary:
      "Passes when the player's current BGSLocation has the given keyword (e.g. LocTypeDungeon).",
  },
  PlayerName: {
    summary:
      "Matches the player's display name (set at character creation). Exact case-sensitive compare.",
  },
  NPCsNearby: {
    summary:
      "Counts living, loaded NPCs within a radius of the player. Supports all comparison operators (>=, ==, <, etc.).",
  },
  IsLocation: {
    summary:
      "Matches the player's current BGSLocation by editor ID or form reference. Traverses the parent-location chain.",
  },
  ConditionGroup: {
    summary:
      "Recursive AND/OR combinator. Nests child conditions arbitrarily deep. Supports negated (NAND/NOR).",
  },
};

const DISPATCH_ROUTES: {
  flags: string;
  behavior: string;
  kind: "neutral" | "primary" | "warning";
}[] = [
  {
    flags: "neither",
    behavior:
      "Normal line — subject to global cooldown + chance roll, drops if an exclusive line is eligible.",
    kind: "neutral",
  },
  {
    flags: "exclusive",
    behavior:
      "Prioritized in the normal pool — still subject to global cooldown + chance roll.",
    kind: "primary",
  },
  {
    flags: "important",
    behavior:
      "Bypasses global cooldown + chance roll — always considered if eligible.",
    kind: "primary",
  },
  {
    flags: "important + exclusive",
    behavior:
      "Bypasses global cooldown + chance roll. `exclusive` has no effect when `important` is set.",
    kind: "warning",
  },
];

export function SchemaReferenceSheet() {
  const open = useUiStore((s) => s.showSchemaSheet);
  const close = useUiStore((s) => s.toggleSchemaSheet);

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Schema reference"
      width={480}
      data-testid="schema-reference-sheet"
    >
      <div className="h-full overflow-auto">
        <Section title="Events">
          <ul className="divide-y divide-border/40">
            {KNOWN_EVENTS.map((e) => (
              <EventRow key={e} event={e} />
            ))}
          </ul>
        </Section>

        <Section title="Dispatch routing">
          <p className="mb-2 text-[10px] text-muted-foreground/80">
            `important` and `exclusive` are independent flags. Both can be
            set on the same line.
          </p>
          <ul className="space-y-1.5">
            {DISPATCH_ROUTES.map((r) => (
              <li
                key={r.flags}
                className={cn(
                  "rounded border-l-2 px-2 py-1.5 text-[10px]",
                  r.kind === "primary"
                    ? "border-primary bg-primary/5"
                    : r.kind === "warning"
                      ? "border-warning bg-warning/5"
                      : "border-border bg-muted/20",
                )}
              >
                <div className="mono mb-0.5 text-[10px] font-medium text-foreground">
                  {r.flags}
                </div>
                <div className="text-muted-foreground">{r.behavior}</div>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Condition types">
          <ul className="divide-y divide-border/40">
            {CONDITION_TYPES.map((t) => (
              <li key={t} className="px-3 py-1.5">
                <div className="mono text-[11px] font-medium text-foreground">
                  {t}
                </div>
                <p className="mt-0.5 text-[10px] text-muted-foreground/80">
                  {CONDITION_META[t].summary}
                </p>
              </li>
            ))}
          </ul>
        </Section>

        <footer className="border-t border-border px-3 py-2 text-[9px] text-muted-foreground">
          Source: EVENTS.md + src/lib/enums.ts. The editor's schema is
          re-generated from these — stay out of sync at your peril.
        </footer>
      </div>
    </Sheet>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-border">
      <h3 className="sticky top-0 z-10 bg-card/95 px-3 py-1.5 font-display text-[10px] uppercase tracking-wider text-muted-foreground backdrop-blur">
        {title}
      </h3>
      <div className="px-0 pb-2">{children}</div>
    </section>
  );
}

function EventRow({ event }: { event: EventName }) {
  const meta = EVENT_META[event];
  const specs = FILTER_KEYS_PER_EVENT[event];
  return (
    <li
      className="px-3 py-2"
      data-testid={`schema-event-${event}`}
    >
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "rounded-sm px-1.5 py-[1px] text-[9px] font-medium text-white/90",
            meta.bgClass,
          )}
        >
          {meta.label}
        </span>
        <span className="mono text-[11px] font-medium text-foreground">
          {event}
        </span>
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground/80">
        {meta.summary}
      </p>
      {specs.length > 0 && (
        <ul className="mt-1.5 space-y-0.5 border-l border-border pl-2">
          {specs.map((spec) => (
            <FilterSpecRow key={spec.key} spec={spec} />
          ))}
        </ul>
      )}
    </li>
  );
}

function FilterSpecRow({ spec }: { spec: FilterKeySpec }) {
  const valueHint =
    spec.kind === "enum" || spec.kind === "boolString"
      ? spec.values.join(" | ")
      : spec.kind === "formRef"
        ? "Plugin.esp|0xHEX"
        : spec.kind === "actor"
          ? "player | npc | Plugin.esp|0xHEX"
          : "string or string[]";
  return (
    <li className="text-[10px]">
      <div className="flex items-baseline gap-2">
        <span className="mono font-medium text-foreground">{spec.key}</span>
        <span className="text-muted-foreground/60">· {valueHint}</span>
      </div>
      <p className="text-muted-foreground/70">{spec.description}</p>
    </li>
  );
}
