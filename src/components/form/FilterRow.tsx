import { X } from "lucide-react";
import { BooleanFilterToggle } from "./inputs/BooleanFilterToggle";
import { ChipInput } from "./inputs/ChipInput";
import { EnumPillGroup } from "./inputs/EnumPillGroup";
import { FormRefInput } from "./inputs/FormRefInput";
import { NumberChipInput } from "./inputs/NumberChipInput";
import { SegmentedActorSelect } from "./inputs/SegmentedActorSelect";
import { cn } from "@/lib/cn";
import type { FilterKeySpec, FilterValue } from "@/lib/enums";

/**
 * One row in §Filters. Dispatches to the correct widget based on the
 * FilterKeySpec.kind. Empty rows are shown muted with "(optional)" — filled
 * rows become prominent. Users never add filters from a dropdown; every
 * allowed key is pre-rendered.
 */
interface FilterRowProps {
  spec: FilterKeySpec;
  value: FilterValue | undefined;
  onChange: (value: FilterValue | undefined) => void;
  plugins?: readonly string[];
}

export function FilterRow({ spec, value, onChange, plugins = [] }: FilterRowProps) {
  const filled = value !== undefined;

  return (
    <div
      className={cn(
        "grid grid-cols-[110px_1fr_auto] items-start gap-3 py-1.5 transition-opacity",
        !filled && "opacity-60 hover:opacity-100",
      )}
      data-testid={`filter-row-${spec.key}`}
    >
      <div className="pt-1">
        <div className="mono text-[11px] font-medium text-foreground">{spec.key}</div>
        {!filled && (
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground/60">
            optional
          </div>
        )}
      </div>

      <div className="min-w-0">
        <FilterWidget spec={spec} value={value} onChange={onChange} plugins={plugins} />
        <p className="mt-1 text-[10px] text-muted-foreground/70">{spec.description}</p>
      </div>

      {filled && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="mt-1 flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
          title="Clear filter"
          aria-label={`Clear ${spec.key}`}
          data-testid={`filter-clear-${spec.key}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function FilterWidget({
  spec,
  value,
  onChange,
  plugins,
}: {
  spec: FilterKeySpec;
  value: FilterValue | undefined;
  onChange: (value: FilterValue | undefined) => void;
  plugins: readonly string[];
}) {
  switch (spec.kind) {
    case "actor": {
      const strValue = coerceStringValue(value);
      const current = Array.isArray(strValue) ? strValue[0] : strValue;
      const allowNpc = (spec.values as readonly string[]).includes("npc");
      return (
        <SegmentedActorSelect
          value={current}
          onChange={(v) => onChange(v)}
          allowNpc={allowNpc}
          plugins={plugins}
          data-testid={`filter-actor-${spec.key}`}
        />
      );
    }
    case "formRef": {
      const strValue = coerceStringValue(value);
      const current = Array.isArray(strValue) ? strValue[0] : strValue;
      return (
        <FormRefInput
          value={current}
          onChange={(v) => onChange(v)}
          plugins={plugins}
          data-testid={`filter-formref-${spec.key}`}
        />
      );
    }
    // "true" OR "false" matches everything → single-value tri-state.
    case "boolString":
      return (
        <BooleanFilterToggle
          value={coerceStringValue(value)}
          onChange={(v) => onChange(v)}
          data-testid={`filter-bool-${spec.key}`}
        />
      );
    case "enum":
      return (
        <EnumPillGroup
          value={coerceStringValue(value)}
          options={spec.values}
          onChange={onChange}
          data-testid={`filter-enum-${spec.key}`}
        />
      );
    case "stringList":
      return (
        <ChipInput
          value={coerceStringValue(value)}
          onChange={onChange}
          placeholder={stringListPlaceholder(spec.key)}
          allowed={spec.values.length > 0 ? spec.values : undefined}
          data-testid={`filter-stringlist-${spec.key}`}
        />
      );
    case "numberList":
      return (
        <NumberChipInput
          value={coerceNumberArray(value)}
          onChange={(v) => onChange(emitScalarOrArray(v))}
          integer={false}
          min={0}
          placeholder="1.0, 2.5, 5"
          data-testid={`filter-numberlist-${spec.key}`}
        />
      );
  }
}

function coerceStringValue(v: FilterValue | undefined): string | string[] | undefined {
  if (v === undefined) return undefined;
  if (typeof v === "string") return v;
  if (Array.isArray(v) && v.every((x) => typeof x === "string")) return v as string[];
  return undefined;
}

function coerceNumberArray(v: FilterValue | undefined): number[] | undefined {
  if (v === undefined) return undefined;
  if (typeof v === "number") return [v];
  if (Array.isArray(v) && v.every((x) => typeof x === "number")) return v as number[];
  return undefined;
}

/** NumberChipInput emits a bare array; collapse singletons to scalar. */
function emitScalarOrArray(v: number[] | undefined): FilterValue | undefined {
  if (!v || v.length === 0) return undefined;
  if (v.length === 1) return v[0];
  return v;
}

function stringListPlaceholder(key: string): string {
  switch (key) {
    case "tag": return "JumpUp, attackStart, …";
    case "skill": return "OneHanded, Sneak, …";
    case "new_level": return "10, 25, 50";
    default: return "add value";
  }
}
