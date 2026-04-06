import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

interface Preset {
  label: string;
  value: number;
}

interface NumberWithUnitProps {
  value: number;
  onChange: (value: number) => void;
  unit: string;
  presets?: Preset[];
  min?: number;
  max?: number;
  step?: number;
  id?: string;
  "data-testid"?: string;
}

export function NumberWithUnit({
  value,
  onChange,
  unit,
  presets,
  min,
  max,
  step,
  id,
  ...rest
}: NumberWithUnitProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-24">
        <Input
          id={id}
          type="number"
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            if (!Number.isNaN(n)) onChange(n);
          }}
          min={min}
          max={max}
          step={step}
          className="pr-7"
          data-testid={rest["data-testid"]}
        />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
          {unit}
        </span>
      </div>
      {presets && presets.length > 0 && (
        <div className="flex gap-1">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange(p.value)}
              className={cn(
                "rounded-sm border border-border px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                value === p.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "text-muted-foreground hover:border-ring hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
