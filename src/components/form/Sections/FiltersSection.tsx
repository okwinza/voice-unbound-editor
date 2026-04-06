import { useMemo } from "react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useStringField } from "@/stores/use-document-field";
import { SectionHeader } from "@/components/form/SectionHeader";
import { FilterRow } from "@/components/form/FilterRow";
import {
  FILTER_KEYS_PER_EVENT,
  isKnownEvent,
  type EventName,
  type FilterValue,
} from "@/lib/enums";

interface FiltersSectionProps {
  path: string;
}

export function FiltersSection({ path }: FiltersSectionProps) {
  const patchDom = useWorkspaceStore((s) => s.patchDom);
  const doc = useWorkspaceStore((s) => s.documents.get(path));
  const eventName = useStringField(path, "event", "TESHitEvent");

  const eventFilter = useMemo<Record<string, FilterValue>>(() => {
    if (!doc || typeof doc.dom !== "object" || doc.dom === null) return {};
    const f = (doc.dom as Record<string, unknown>).event_filter;
    return f && typeof f === "object" ? (f as Record<string, FilterValue>) : {};
  }, [doc]);

  const event: EventName = isKnownEvent(eventName) ? eventName : "TESHitEvent";
  const specs = FILTER_KEYS_PER_EVENT[event];
  const allowedKeys = useMemo(() => new Set(specs.map((s) => s.key)), [specs]);

  const staleKeys = useMemo(
    () => Object.keys(eventFilter).filter((k) => !allowedKeys.has(k)),
    [eventFilter, allowedKeys],
  );

  const filledCount = specs.filter((s) => eventFilter[s.key] !== undefined).length;

  const setFilter = (key: string, value: FilterValue | undefined) => {
    const next = { ...eventFilter };
    if (value === undefined) delete next[key];
    else next[key] = value;
    patchDom(path, {
      event_filter: Object.keys(next).length > 0 ? next : undefined,
    });
  };

  const dropStaleKeys = () => {
    const next: Record<string, FilterValue> = {};
    for (const k of Object.keys(eventFilter)) {
      if (allowedKeys.has(k)) next[k] = eventFilter[k];
    }
    patchDom(path, {
      event_filter: Object.keys(next).length > 0 ? next : undefined,
    });
  };

  return (
    <section
      id="section-filters"
      data-section="filters"
      className="space-y-1"
      data-testid="section-filters"
    >
      <SectionHeader numeral="II" title="Filters" count={filledCount} />

      {specs.length === 0 ? (
        <p className="text-[11px] text-muted-foreground/70">
          This event does not expose any filter keys.
        </p>
      ) : (
        <div className="divide-y divide-border/40">
          {specs.map((spec) => (
            <FilterRow
              key={spec.key}
              spec={spec}
              value={eventFilter[spec.key]}
              onChange={(v) => setFilter(spec.key, v)}
            />
          ))}
        </div>
      )}

      {staleKeys.length > 0 && (
        <div
          className="mt-3 rounded border border-warning/40 bg-warning/5 p-2.5"
          data-testid="stale-filters"
        >
          <div className="mb-1.5 flex items-center justify-between">
            <span className="font-display text-[9px] text-warning">
              Stale keys · will drop on save
            </span>
            <button
              type="button"
              onClick={dropStaleKeys}
              className="mono text-[10px] text-warning hover:underline"
              data-testid="stale-filters-drop"
            >
              drop now
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {staleKeys.map((k) => (
              <span
                key={k}
                className="mono rounded-sm border border-warning/40 bg-warning/10 px-1.5 py-[1px] text-[10px] text-warning line-through"
              >
                {k}
              </span>
            ))}
          </div>
          <p className="mt-1 text-[9px] text-muted-foreground/70">
            These keys are not valid for <span className="mono">{event}</span>.
          </p>
        </div>
      )}
    </section>
  );
}
