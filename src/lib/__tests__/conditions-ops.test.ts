import { describe, it, expect } from "vitest";
import {
  getAt,
  updateAt,
  insertAt,
  removeAt,
  wrapInGroup,
  extractToParent,
  countConditions,
} from "../conditions-ops";
import type { Condition } from "../schema";

const TREE: Condition[] = [
  { type: "IsInCombat" },
  {
    type: "ConditionGroup",
    logic: "OR",
    conditions: [
      { type: "IsSneaking" },
      {
        type: "ConditionGroup",
        logic: "AND",
        conditions: [
          { type: "IsWeaponDrawn" },
          { type: "IsInCombat" },
        ],
      },
    ],
  },
];

describe("getAt", () => {
  it("returns root-level node", () => {
    expect(getAt(TREE, [0])?.type).toBe("IsInCombat");
  });
  it("returns nested node", () => {
    expect(getAt(TREE, [1, 0])?.type).toBe("IsSneaking");
  });
  it("returns deeply nested node", () => {
    expect(getAt(TREE, [1, 1, 0])?.type).toBe("IsWeaponDrawn");
    expect(getAt(TREE, [1, 1, 1])?.type).toBe("IsInCombat");
  });
  it("returns null for invalid path", () => {
    expect(getAt(TREE, [5])).toBe(null);
    expect(getAt(TREE, [0, 0])).toBe(null); // non-group
    expect(getAt(TREE, [])).toBe(null);
  });
});

describe("updateAt", () => {
  it("replaces root node", () => {
    const out = updateAt(TREE, [0], { type: "IsSneaking" });
    expect(out[0].type).toBe("IsSneaking");
    expect(out[1]).toBe(TREE[1]); // sibling untouched
  });
  it("replaces deeply nested node immutably", () => {
    const out = updateAt(TREE, [1, 1, 0], { type: "IsSneaking" });
    expect(getAt(out, [1, 1, 0])?.type).toBe("IsSneaking");
    // Original unchanged
    expect(getAt(TREE, [1, 1, 0])?.type).toBe("IsWeaponDrawn");
  });
});

describe("insertAt", () => {
  it("appends to root with empty path", () => {
    const out = insertAt(TREE, [], { type: "IsSneaking" });
    expect(out).toHaveLength(3);
    expect(out[2].type).toBe("IsSneaking");
  });
  it("appends into a group by path-to-group", () => {
    const out = insertAt(TREE, [1], { type: "IsWeaponDrawn" });
    const group = out[1] as Extract<Condition, { type: "ConditionGroup" }>;
    expect(group.conditions).toHaveLength(3);
    expect(group.conditions?.[2].type).toBe("IsWeaponDrawn");
  });
});

describe("removeAt", () => {
  it("removes root node", () => {
    const out = removeAt(TREE, [0]);
    expect(out).toHaveLength(1);
    expect(out[0].type).toBe("ConditionGroup");
  });
  it("removes nested node", () => {
    const out = removeAt(TREE, [1, 0]);
    const group = out[1] as Extract<Condition, { type: "ConditionGroup" }>;
    expect(group.conditions).toHaveLength(1);
    expect(group.conditions?.[0].type).toBe("ConditionGroup");
  });
});

describe("wrapInGroup", () => {
  it("wraps a leaf into a new group", () => {
    const out = wrapInGroup(TREE, [0], "AND");
    const wrapped = out[0] as Extract<Condition, { type: "ConditionGroup" }>;
    expect(wrapped.type).toBe("ConditionGroup");
    expect(wrapped.logic).toBe("AND");
    expect(wrapped.conditions?.[0].type).toBe("IsInCombat");
  });
});

describe("extractToParent", () => {
  it("lifts a nested node to its parent's slot", () => {
    const out = extractToParent(TREE, [1, 0]);
    // Sibling at [1] was a group; extracting [1,0] replaces the group with IsSneaking
    expect(out[1].type).toBe("IsSneaking");
  });
  it("no-ops for root-level nodes (can't lift)", () => {
    const out = extractToParent(TREE, [0]);
    expect(out).toEqual(TREE);
  });
});

describe("countConditions", () => {
  it("counts all nodes including nested", () => {
    // TREE: IsInCombat + Group(2 children, one nested Group with 2) = 1 + 1 + 1 + 1 + 1 + 1 = 6
    expect(countConditions(TREE)).toBe(6);
  });
  it("returns 0 for empty", () => {
    expect(countConditions([])).toBe(0);
  });
});
