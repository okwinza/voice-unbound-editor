import type { ReactNode } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { ConditionRow } from "./ConditionRow";
import { ConditionGroupRow } from "./ConditionGroupRow";
import { AddConditionMenu } from "./AddConditionMenu";
import { emptyCondition, type Condition } from "@/lib/schema";
import type { ConditionType } from "@/lib/enums";
import type { ConditionPath } from "@/lib/conditions-ops";

export interface ConditionTreeOps {
  onChangeAt: (path: ConditionPath, next: Condition) => void;
  onRemoveAt: (path: ConditionPath) => void;
  onAddAt: (path: ConditionPath, item: Condition) => void;
  onWrapAt: (path: ConditionPath) => void;
  onExtractAt: (path: ConditionPath) => void;
  onReorderAt: (
    containerPath: ConditionPath,
    fromIdx: number,
    toIdx: number,
  ) => void;
}

export interface ConditionTreeProps extends ConditionTreeOps {
  conditions: readonly Condition[];
  path: ConditionPath;
}

/**
 * Recursive renderer. Each container level gets its own DndContext so
 * drag-reorder is scoped to siblings — you can't drag a leaf across
 * group boundaries in v1.
 */
export function ConditionTree({
  conditions,
  path,
  ...ops
}: ConditionTreeProps) {
  const pathKey = path.length === 0 ? "root" : path.join("-");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const ids = conditions.map((_, i) => `${pathKey}/${i}`);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIdx = ids.indexOf(active.id as string);
    const toIdx = ids.indexOf(over.id as string);
    if (fromIdx < 0 || toIdx < 0) return;
    ops.onReorderAt(path, fromIdx, toIdx);
  };

  return (
    <div className="space-y-0.5" data-testid={`tree-${pathKey}`}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {conditions.map((c, i) => {
            const childPath = [...path, i];
            const childKey = childPath.join("-");
            const sortId = `${pathKey}/${i}`;
            const canExtract = childPath.length >= 2;
            return (
              <SortableItem key={sortId} id={sortId}>
                {(dragHandle) =>
                  c.type === "ConditionGroup" ? (
                    <ConditionGroupRow
                      group={c}
                      path={childPath}
                      canExtract={canExtract}
                      dragHandle={dragHandle}
                      {...ops}
                    />
                  ) : (
                    <ConditionRow
                      condition={c}
                      pathKey={childKey}
                      dragHandle={dragHandle}
                      onChange={(next) => ops.onChangeAt(childPath, next)}
                      onRemove={() => ops.onRemoveAt(childPath)}
                      onWrap={() => ops.onWrapAt(childPath)}
                      onExtract={
                        canExtract ? () => ops.onExtractAt(childPath) : undefined
                      }
                    />
                  )
                }
              </SortableItem>
            );
          })}
        </SortableContext>
      </DndContext>
      <div className="pl-6 pt-1">
        <AddConditionMenu
          compact={path.length > 0}
          onAdd={(t: ConditionType) => ops.onAddAt(path, emptyCondition(t))}
          data-testid={`add-at-${pathKey}`}
        />
      </div>
    </div>
  );
}

/**
 * Sortable wrapper. Exposes the drag handle via render-prop so each child
 * can place its own grip (gutter for leaves, header for groups).
 */
function SortableItem({
  id,
  children,
}: {
  id: string;
  children: (dragHandle: ReactNode) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const handle = (
    <button
      type="button"
      {...attributes}
      {...listeners}
      className="flex h-5 w-4 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground/30 transition-colors hover:text-muted-foreground active:cursor-grabbing"
      aria-label="Drag to reorder"
      tabIndex={-1}
    >
      <GripVertical className="h-3.5 w-3.5" />
    </button>
  );

  return (
    <div ref={setNodeRef} style={style}>
      {children(handle)}
    </div>
  );
}
