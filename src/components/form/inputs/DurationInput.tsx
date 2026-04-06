import { useState, useEffect } from "react";
import { Input } from "@/components/ui/Input";

/**
 * Numeric input paired with a sec/min unit dropdown. Value is ALWAYS stored
 * in seconds; the unit only affects how the user types/reads the number.
 *
 * Picking "min" scales the displayed number by 1/60 — so a stored 300
 * shows as "5" in min mode. Typing "2" in min mode writes 120 seconds.
 *
 * The unit preference auto-picks on mount: values >=120s default to min,
 * smaller values to sec.
 */
interface DurationInputProps {
  value: number;                    // seconds
  onChange: (seconds: number) => void;
  id?: string;
  "data-testid"?: string;
}

type Unit = "sec" | "min";

function pickUnit(seconds: number): Unit {
  return seconds >= 120 && seconds % 60 === 0 ? "min" : "sec";
}

export function DurationInput({ value, onChange, id, ...rest }: DurationInputProps) {
  const [unit, setUnit] = useState<Unit>(() => pickUnit(value));
  const [text, setText] = useState<string>(() =>
    unit === "min" ? String(value / 60) : String(value),
  );

  // Re-sync when the external value changes by a larger delta (e.g. user
  // clicked revert or undo). We don't re-sync on every keystroke because
  // that would fight the input's own state.
  useEffect(() => {
    const shown = unit === "min" ? value / 60 : value;
    const parsed = parseFloat(text);
    if (!Number.isFinite(parsed) || Math.abs(parsed - shown) > 0.001) {
      setText(String(shown));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const commitText = (raw: string) => {
    setText(raw);
    const n = parseFloat(raw);
    if (!Number.isFinite(n) || n < 0) return;
    const seconds = unit === "min" ? Math.round(n * 60) : Math.round(n);
    if (seconds !== value) onChange(seconds);
  };

  const switchUnit = (next: Unit) => {
    if (next === unit) return;
    setUnit(next);
    setText(next === "min" ? String(value / 60) : String(value));
  };

  return (
    <div className="flex items-center gap-1.5" data-testid={rest["data-testid"]}>
      <div className="w-28">
        <Input
          id={id}
          type="number"
          value={text}
          onChange={(e) => commitText(e.target.value)}
          min={0}
          step={unit === "min" ? 0.5 : 1}
          data-testid={`${rest["data-testid"] ?? "duration"}-input`}
        />
      </div>
      <div
        className="inline-flex h-7 rounded-sm border border-border bg-input p-[2px]"
        role="radiogroup"
        aria-label="Unit"
      >
        {(["sec", "min"] as const).map((u) => (
          <button
            key={u}
            type="button"
            role="radio"
            aria-checked={unit === u}
            onClick={() => switchUnit(u)}
            className={
              unit === u
                ? "mono cursor-pointer rounded-sm bg-primary px-2 text-[11px] text-primary-foreground"
                : "mono cursor-pointer rounded-sm px-2 text-[11px] text-muted-foreground hover:text-foreground"
            }
            data-testid={`${rest["data-testid"] ?? "duration"}-unit-${u}`}
          >
            {u}
          </button>
        ))}
      </div>
      {unit === "min" && value % 60 !== 0 && (
        <span className="mono text-[10px] text-muted-foreground/70">
          = {value}s
        </span>
      )}
    </div>
  );
}
