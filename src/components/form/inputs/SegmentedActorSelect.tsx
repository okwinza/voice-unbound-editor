import { useEffect, useMemo, useState } from "react";
import { FormRefInput } from "./FormRefInput";
import { cn } from "@/lib/cn";

/**
 * Three-mode segmented control for actor filter keys (target, aggressor,
 * killer, victim, actor, caster).
 *
 * - "player"  → stores literal string "player"
 * - "npc"     → stores literal string "npc"
 * - "formref" → swaps in the FormRefInput (Plugin.esm|0xHEX)
 *
 * Mode is inferred from the value but can be overridden locally — clicking
 * "form ref" on an empty cell enters form-ref mode even though the value
 * is still undefined, so the FormRefInput renders and the user can fill it.
 */

type Mode = "player" | "npc" | "formref" | null;

interface SegmentedActorSelectProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  allowNpc?: boolean;
  plugins?: readonly string[];
  "data-testid"?: string;
}

function detectMode(value: string | undefined): Mode {
  if (value === undefined) return null;
  if (value === "player") return "player";
  if (value === "npc") return "npc";
  if (value.includes("|")) return "formref";
  return null;
}

export function SegmentedActorSelect({
  value,
  onChange,
  allowNpc = true,
  plugins = [],
  ...rest
}: SegmentedActorSelectProps) {
  const derivedMode = useMemo(() => detectMode(value), [value]);
  const [localOverride, setLocalOverride] = useState<Mode>(null);

  // If the external value changes to something concrete, drop the override
  // so the UI re-syncs.
  useEffect(() => {
    if (derivedMode !== null) setLocalOverride(null);
  }, [derivedMode]);

  const mode: Mode = localOverride ?? derivedMode;

  const select = (next: Mode) => {
    if (next === "player") {
      setLocalOverride(null);
      onChange("player");
    } else if (next === "npc") {
      setLocalOverride(null);
      onChange("npc");
    } else if (next === "formref") {
      // Enter form-ref mode even when the value is empty; FormRefInput
      // manages its own state and will emit a value once both plugin + hex
      // are filled. We clear any existing "player"/"npc" literal so the
      // downstream input doesn't misread it as a form-ref.
      setLocalOverride("formref");
      if (value === "player" || value === "npc") onChange(undefined);
    } else {
      setLocalOverride(null);
      onChange(undefined);
    }
  };

  return (
    <div className="space-y-1.5" data-testid={rest["data-testid"]}>
      <div
        className="inline-flex h-7 rounded-sm border border-border bg-input p-[2px]"
        role="radiogroup"
        aria-label="Actor value type"
      >
        <SegButton
          active={mode === "player"}
          onClick={() => select("player")}
          label="player"
        />
        {allowNpc && (
          <SegButton
            active={mode === "npc"}
            onClick={() => select("npc")}
            label="npc"
          />
        )}
        <SegButton
          active={mode === "formref"}
          onClick={() => select("formref")}
          label="form ref"
        />
      </div>
      {mode === "formref" && (
        <FormRefInput
          value={value}
          onChange={onChange}
          plugins={plugins}
          data-testid={`${rest["data-testid"] ?? "actor"}-formref`}
        />
      )}
    </div>
  );
}

function SegButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "mono cursor-pointer rounded-sm px-2 text-[10px] transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
