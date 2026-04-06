import { useMemo } from "react";
import { Trash2 } from "lucide-react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { SectionHeader } from "@/components/form/SectionHeader";
import { ConditionTree } from "@/components/form/conditions/ConditionTree";
import {
  getAt,
  updateAt,
  insertAt,
  removeAt,
  wrapInGroup,
  extractToParent,
  reorderAt,
  countConditions,
  type ConditionPath,
} from "@/lib/conditions-ops";
import { emptyCondition, type Condition } from "@/lib/schema";
import { AddConditionMenu } from "@/components/form/conditions/AddConditionMenu";
import type { ConditionType } from "@/lib/enums";

interface ConditionsSectionProps {
  path: string;
}

export function ConditionsSection({ path }: ConditionsSectionProps) {
  const patchDom = useWorkspaceStore((s) => s.patchDom);
  const doc = useWorkspaceStore((s) => s.documents.get(path));

  const conditions = useMemo<Condition[]>(() => {
    if (!doc || typeof doc.dom !== "object" || doc.dom === null) return [];
    const c = (doc.dom as Record<string, unknown>).conditions;
    return Array.isArray(c) ? (c as Condition[]) : [];
  }, [doc]);

  const total = useMemo(() => countConditions(conditions), [conditions]);

  const writeBack = (next: Condition[]) => {
    patchDom(path, { conditions: next.length > 0 ? next : undefined });
  };

  const handleChangeAt = (p: ConditionPath, next: Condition) => {
    // Validate: the target must exist.
    if (!getAt(conditions, p)) return;
    writeBack(updateAt(conditions, p, next));
  };
  const handleRemoveAt = (p: ConditionPath) => {
    writeBack(removeAt(conditions, p));
  };
  const handleAddAt = (p: ConditionPath, item: Condition) => {
    writeBack(insertAt(conditions, p, item));
  };
  const handleWrapAt = (p: ConditionPath) => {
    writeBack(wrapInGroup(conditions, p, "AND"));
  };
  const handleExtractAt = (p: ConditionPath) => {
    writeBack(extractToParent(conditions, p));
  };
  const handleReorderAt = (
    containerPath: ConditionPath,
    fromIdx: number,
    toIdx: number,
  ) => {
    writeBack(reorderAt(conditions, containerPath, fromIdx, toIdx));
  };
  const handleClearAll = () => {
    const plural = total === 1 ? "condition" : "conditions";
    if (!confirm(`Remove all ${total} ${plural}?`)) return;
    writeBack([]);
  };

  return (
    <section
      id="section-conditions"
      data-section="conditions"
      data-testid="section-conditions"
    >
      <div className="relative">
        <SectionHeader numeral="III" title="Conditions" count={total} />
        {total > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="mono absolute right-0 top-0 flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
            title="Remove all conditions"
            data-testid="conditions-clear-all"
          >
            <Trash2 className="h-3 w-3" />
            Clear all
          </button>
        )}
      </div>

      {conditions.length === 0 ? (
        <EmptyState
          onAdd={(item) => writeBack([item])}
        />
      ) : (
        <ConditionTree
          conditions={conditions}
          path={[]}
          onChangeAt={handleChangeAt}
          onRemoveAt={handleRemoveAt}
          onAddAt={handleAddAt}
          onWrapAt={handleWrapAt}
          onExtractAt={handleExtractAt}
          onReorderAt={handleReorderAt}
        />
      )}

      <p className="mt-3 text-[11px] text-muted-foreground/70">
        All conditions must pass for the line to be eligible. Use
        <span className="mono mx-1 text-foreground">ConditionGroup</span>
        with AND/OR logic to combine checks.
      </p>
    </section>
  );
}

function EmptyState({ onAdd }: { onAdd: (c: Condition) => void }) {
  return (
    <div className="rounded border border-dashed border-border/60 px-4 py-6 text-center">
      <p className="text-[12px] text-muted-foreground/70">
        No conditions — this line will match whenever its event-filter passes.
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <QuickAddButton label="ActorValue" onClick={() => onAdd(emptyCondition("ActorValue"))} />
        <QuickAddButton label="IsInCombat" onClick={() => onAdd(emptyCondition("IsInCombat"))} />
        <QuickAddButton label="IsSneaking" onClick={() => onAdd(emptyCondition("IsSneaking"))} />
        <QuickAddButton label="HasActiveEffect" onClick={() => onAdd(emptyCondition("HasActiveEffect"))} />
        <QuickAddButton label="Group" onClick={() => onAdd(emptyCondition("ConditionGroup"))} />
      </div>
      <div className="mt-2 flex justify-center">
        <AddConditionMenu
          onAdd={(t: ConditionType) => onAdd(emptyCondition(t))}
          data-testid="empty-add-menu"
        />
      </div>
    </div>
  );
}

function QuickAddButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mono rounded-sm border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
      data-testid={`empty-add-${label}`}
    >
      + {label}
    </button>
  );
}
