import { cn } from "@/lib/cn";

/**
 * Tri-state toggle for boolean-string filters: "true" / "false" / any.
 * "any" means the filter is cleared (no value in the event_filter object).
 */
interface BooleanFilterToggleProps {
  value: string | string[] | undefined;
  onChange: (value: string | undefined) => void;
  "data-testid"?: string;
}

export function BooleanFilterToggle({
  value,
  onChange,
  ...rest
}: BooleanFilterToggleProps) {
  const current =
    Array.isArray(value) ? value[0] : value === "true" || value === "false" ? value : undefined;

  const options: { label: string; val: string | undefined }[] = [
    { label: "true", val: "true" },
    { label: "false", val: "false" },
    { label: "any", val: undefined },
  ];

  return (
    <div
      className="inline-flex h-7 rounded-sm border border-border bg-input p-[2px]"
      role="radiogroup"
      aria-label="Boolean filter"
      data-testid={rest["data-testid"]}
    >
      {options.map((o) => {
        const active = o.val === current;
        return (
          <button
            key={o.label}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.val)}
            className={cn(
              "mono cursor-pointer rounded-sm px-2.5 text-[11px] transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
              o.val === undefined && !active && "italic opacity-70",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
