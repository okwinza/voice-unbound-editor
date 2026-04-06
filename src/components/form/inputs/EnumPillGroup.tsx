import { cn } from "@/lib/cn";

/**
 * Multi-selectable toggle pills for enum filters. Empty selection =
 * undefined (no filter). Single = scalar string. Multi = string[].
 * Serializer picks shape from count.
 */
interface EnumPillGroupProps {
  value: string | string[] | undefined;
  options: readonly string[];
  onChange: (value: string | string[] | undefined) => void;
  "data-testid"?: string;
}

export function EnumPillGroup({
  value,
  options,
  onChange,
  ...rest
}: EnumPillGroupProps) {
  const selected = value === undefined ? [] : Array.isArray(value) ? value : [value];
  const selectedSet = new Set(selected);

  const toggle = (opt: string) => {
    const next = selectedSet.has(opt)
      ? selected.filter((v) => v !== opt)
      : [...selected, opt];
    if (next.length === 0) onChange(undefined);
    else if (next.length === 1) onChange(next[0]);
    else onChange(next);
  };

  return (
    <div
      className="inline-flex flex-wrap gap-1"
      role="group"
      aria-label="Filter values"
      data-testid={rest["data-testid"]}
    >
      {options.map((o) => {
        const active = selectedSet.has(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(o)}
            className={cn(
              "mono rounded-sm border px-2 py-0.5 text-[11px] transition-colors",
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-ring hover:text-foreground",
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}
