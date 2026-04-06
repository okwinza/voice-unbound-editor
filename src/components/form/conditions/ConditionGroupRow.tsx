import type { ReactNode } from "react";
import { CornerLeftUp, X, Ban, EyeOff } from "lucide-react";
import { ConditionTree, type ConditionTreeOps } from "./ConditionTree";
import type { Condition } from "@/lib/schema";
import type { ConditionPath } from "@/lib/conditions-ops";
import { cn } from "@/lib/cn";

/**
 * Group wrapper with a colored left gutter marking the AND/OR scope.
 * Children indent 16px; the gutter line sits at 6px so the hierarchy reads
 * as a visual bracket.
 */
interface ConditionGroupRowProps extends ConditionTreeOps {
  group: Extract<Condition, { type: "ConditionGroup" }>;
  path: ConditionPath;
  canExtract: boolean;
  dragHandle?: ReactNode;
}

export function ConditionGroupRow({
  group,
  path,
  canExtract,
  dragHandle,
  ...ops
}: ConditionGroupRowProps) {
  const logic = group.logic ?? "AND";
  const pathKey = path.join("-");
  const isAnd = logic === "AND";
  const isNegated = group.negated === true;
  const isDisabled = group.disabled === true;

  const gutterColor = isAnd
    ? "bg-[color:var(--color-logic-and)]"
    : "bg-[color:var(--color-logic-or)]";
  const badgeColor = isNegated
    ? "border-destructive/50 bg-destructive/15 text-destructive"
    : isAnd
      ? "border-[color:var(--color-logic-and)] bg-[color:var(--color-logic-and)]/15 text-[color:var(--color-logic-and)]"
      : "border-[color:var(--color-logic-or)] bg-[color:var(--color-logic-or)]/15 text-[color:var(--color-logic-or)]";

  const toggleLogic = () =>
    ops.onChangeAt(path, { ...group, logic: isAnd ? "OR" : "AND" });

  const toggleNegated = () => {
    ops.onChangeAt(path, { ...group, negated: isNegated ? undefined : true });
  };

  const toggleDisabled = () => {
    ops.onChangeAt(path, { ...group, disabled: isDisabled ? undefined : true });
  };

  return (
    <div
      className={cn(
        "group/groupnode relative rounded-sm py-1",
        isDisabled && "opacity-40",
      )}
      data-testid={`group-${pathKey}`}
    >
      {/* Colored gutter line — spans header + children */}
      <div
        className={cn(
          "absolute left-[6px] top-[24px] bottom-[36px] w-[2px] rounded-full",
          gutterColor,
        )}
        aria-hidden
      />

      {/* Group header: drag handle + flags + logic pill + count + actions */}
      <div className="flex items-center gap-2 pl-6">
        {dragHandle && (
          <div className="-ml-5 opacity-0 transition-opacity group-hover/groupnode:opacity-100">
            {dragHandle}
          </div>
        )}
        {isDisabled && (
          <button
            type="button"
            onClick={toggleDisabled}
            className="mono rounded-sm bg-muted px-1 py-0.5 text-[10px] text-muted-foreground hover:bg-accent"
            title="Re-enable group"
            data-testid={`group-${pathKey}-off-badge`}
          >
            OFF
          </button>
        )}
        <button
          type="button"
          onClick={toggleLogic}
          className={cn(
            "mono rounded-sm border px-2 py-0.5 text-[11px] font-semibold transition-colors",
            badgeColor,
          )}
          title="Toggle AND/OR"
          data-testid={`group-${pathKey}-logic`}
        >
          {isNegated ? `NOT ${logic}` : logic}
        </button>
        <span className="text-[11px] text-muted-foreground">
          {group.conditions?.length ?? 0} condition
          {group.conditions?.length === 1 ? "" : "s"}
        </span>
        <div className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover/groupnode:opacity-100 group-focus-within/groupnode:opacity-100">
          <button
            type="button"
            onClick={toggleNegated}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded transition-colors",
              isNegated
                ? "text-destructive"
                : "text-muted-foreground/60 hover:bg-accent hover:text-accent-foreground",
            )}
            title={isNegated ? "Remove negation" : "Negate group"}
            aria-label="Toggle negation"
            data-testid={`group-${pathKey}-negate`}
          >
            <Ban className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={toggleDisabled}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded transition-colors",
              isDisabled
                ? "text-muted-foreground"
                : "text-muted-foreground/60 hover:bg-accent hover:text-accent-foreground",
            )}
            title={isDisabled ? "Re-enable group" : "Disable group"}
            aria-label="Toggle disabled"
            data-testid={`group-${pathKey}-disable`}
          >
            <EyeOff className="h-3.5 w-3.5" />
          </button>
          {canExtract && (
            <button
              type="button"
              onClick={() => ops.onExtractAt(path)}
              className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/60 hover:bg-accent hover:text-accent-foreground"
              title="Extract to parent"
              aria-label="Extract group to parent"
              data-testid={`group-${pathKey}-extract`}
            >
              <CornerLeftUp className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => ops.onRemoveAt(path)}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/60 hover:bg-destructive/20 hover:text-destructive"
            title="Remove group"
            aria-label="Remove group"
            data-testid={`group-${pathKey}-remove`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Children tree */}
      <div className="mt-1 pl-6">
        <ConditionTree
          conditions={group.conditions ?? []}
          path={path}
          {...ops}
        />
      </div>
    </div>
  );
}
