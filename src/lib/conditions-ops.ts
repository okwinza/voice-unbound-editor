/**
 * Pure tree-mutation helpers for the recursive Condition[] structure.
 *
 * A ConditionPath is an array of indices walking from the root conditions
 * array into nested ConditionGroup.conditions arrays:
 *   [0]       → root conditions[0]
 *   [0, 2]    → root conditions[0].conditions[2]
 *   [0, 1, 4] → root conditions[0].conditions[1].conditions[4]
 *
 * All helpers return a NEW array — we never mutate in place, so the store's
 * undo/dirty tracking sees changes correctly.
 */

import type { Condition } from "./schema";

export type ConditionPath = number[];

function isGroup(c: Condition): c is Extract<Condition, { type: "ConditionGroup" }> {
  return c.type === "ConditionGroup";
}

export function getAt(
  conditions: readonly Condition[],
  path: ConditionPath,
): Condition | null {
  if (path.length === 0) return null;
  let cursor: readonly Condition[] = conditions;
  let result: Condition | null = null;
  for (let i = 0; i < path.length; i++) {
    const idx = path[i];
    const node = cursor[idx];
    if (!node) return null;
    result = node;
    if (i < path.length - 1) {
      if (!isGroup(node)) return null;
      cursor = node.conditions ?? [];
    }
  }
  return result;
}

export function updateAt(
  conditions: readonly Condition[],
  path: ConditionPath,
  next: Condition,
): Condition[] {
  if (path.length === 0) return [...conditions];
  const [head, ...rest] = path;
  const out = [...conditions];
  const target = out[head];
  if (!target) return out;
  if (rest.length === 0) {
    out[head] = next;
    return out;
  }
  if (!isGroup(target)) return out;
  out[head] = {
    ...target,
    conditions: updateAt(target.conditions ?? [], rest, next),
  };
  return out;
}

export function insertAt(
  conditions: readonly Condition[],
  path: ConditionPath,
  item: Condition,
): Condition[] {
  if (path.length === 0) return [...conditions, item];
  const [head, ...rest] = path;
  const out = [...conditions];
  if (rest.length === 0) {
    // Insert INTO the group at index `head`.
    const target = out[head];
    if (!target || !isGroup(target)) return out;
    out[head] = {
      ...target,
      conditions: [...(target.conditions ?? []), item],
    };
    return out;
  }
  const target = out[head];
  if (!target || !isGroup(target)) return out;
  out[head] = {
    ...target,
    conditions: insertAt(target.conditions ?? [], rest, item),
  };
  return out;
}

export function removeAt(
  conditions: readonly Condition[],
  path: ConditionPath,
): Condition[] {
  if (path.length === 0) return [...conditions];
  const [head, ...rest] = path;
  if (rest.length === 0) {
    return conditions.filter((_, i) => i !== head);
  }
  const out = [...conditions];
  const target = out[head];
  if (!target || !isGroup(target)) return out;
  out[head] = {
    ...target,
    conditions: removeAt(target.conditions ?? [], rest),
  };
  return out;
}

/** Wrap the node at `path` in a new ConditionGroup of the given logic. */
export function wrapInGroup(
  conditions: readonly Condition[],
  path: ConditionPath,
  logic: "AND" | "OR",
): Condition[] {
  const node = getAt(conditions, path);
  if (!node) return [...conditions];
  const group: Condition = {
    type: "ConditionGroup",
    logic,
    conditions: [node],
  };
  return updateAt(conditions, path, group);
}

/** Lift the node at `path` up one level, replacing its parent group. */
export function extractToParent(
  conditions: readonly Condition[],
  path: ConditionPath,
): Condition[] {
  if (path.length < 2) return [...conditions];
  const parentPath = path.slice(0, -1);
  const self = getAt(conditions, path);
  if (!self) return [...conditions];
  return updateAt(conditions, parentPath, self);
}

/**
 * Move a sibling within its container from `fromIdx` to `toIdx`.
 * `containerPath` is the path TO the container (empty array = root
 * conditions, `[0]` = the group at root[0], etc.).
 */
export function reorderAt(
  conditions: readonly Condition[],
  containerPath: ConditionPath,
  fromIdx: number,
  toIdx: number,
): Condition[] {
  const move = (arr: readonly Condition[]): Condition[] => {
    if (fromIdx === toIdx) return [...arr];
    if (fromIdx < 0 || fromIdx >= arr.length) return [...arr];
    if (toIdx < 0 || toIdx >= arr.length) return [...arr];
    const next = [...arr];
    const [spliced] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, spliced);
    return next;
  };

  if (containerPath.length === 0) return move(conditions);

  const container = getAt(conditions, containerPath);
  if (!container || !isGroup(container)) return [...conditions];
  return updateAt(conditions, containerPath, {
    ...container,
    conditions: move(container.conditions ?? []),
  });
}

/** Total node count including nested groups (for section header badge). */
export function countConditions(conditions: readonly Condition[]): number {
  let n = conditions.length;
  for (const c of conditions) {
    if (isGroup(c)) n += countConditions(c.conditions ?? []);
  }
  return n;
}
