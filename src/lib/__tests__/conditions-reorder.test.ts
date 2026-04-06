import { describe, it, expect } from "vitest";
import { reorderAt, type ConditionPath } from "../conditions-ops";
import type { Condition } from "../schema";

const TREE: Condition[] = [
  { type: "IsInCombat" },
  { type: "IsSneaking" },
  {
    type: "ConditionGroup",
    logic: "AND",
    conditions: [
      { type: "IsWeaponDrawn" },
      { type: "IsInCombat" },
      { type: "IsSneaking" },
    ],
  },
];

describe("reorderAt", () => {
  it("reorders siblings at the root", () => {
    const out = reorderAt(TREE, [] as ConditionPath, 0, 2);
    expect(out.map((c) => c.type)).toEqual([
      "IsSneaking",
      "ConditionGroup",
      "IsInCombat",
    ]);
  });

  it("reorders siblings inside a group", () => {
    const out = reorderAt(TREE, [2], 0, 2);
    const group = out[2] as Extract<Condition, { type: "ConditionGroup" }>;
    expect(group.conditions?.map((c) => c.type)).toEqual([
      "IsInCombat",
      "IsSneaking",
      "IsWeaponDrawn",
    ]);
  });

  it("returns unchanged when indices are equal", () => {
    const out = reorderAt(TREE, [], 1, 1);
    expect(out).toEqual(TREE);
  });

  it("returns unchanged when indices are out of bounds", () => {
    const out = reorderAt(TREE, [], 0, 99);
    expect(out).toEqual(TREE);
  });

  it("is immutable", () => {
    const original = [...TREE];
    reorderAt(TREE, [], 0, 2);
    expect(TREE).toEqual(original);
  });
});
