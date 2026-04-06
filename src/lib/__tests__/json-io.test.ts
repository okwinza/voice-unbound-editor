import { describe, it, expect } from "vitest";
import { serialize, parseJsonSafe } from "../json-io";
import { OKW_LOW_HP_01 } from "./fixtures";

describe("serialize", () => {
  it("reorders keys into canonical order", () => {
    const input = {
      conditions: [],
      important: true,
      event: "TESHitEvent",
      subtitle: "test",
    };
    const output = serialize(input);
    const keys = Object.keys(JSON.parse(output));
    expect(keys).toEqual(["event", "subtitle", "important", "conditions"]);
  });

  it("places unknown keys alphabetically after known keys", () => {
    const input = {
      zebra: 1,
      event: "TESHitEvent",
      apple: 2,
      chance: 0.5,
    };
    const output = serialize(input);
    const keys = Object.keys(JSON.parse(output));
    expect(keys).toEqual(["event", "chance", "apple", "zebra"]);
  });

  it("preserves nested objects + arrays", () => {
    const input = {
      event: "TESHitEvent",
      conditions: [
        {
          type: "ConditionGroup",
          conditions: [{ type: "IsInCombat" }],
          logic: "OR",
        },
      ],
    };
    const output = JSON.parse(serialize(input));
    expect(output.conditions[0].logic).toBe("OR");
    expect(output.conditions[0].conditions[0].type).toBe("IsInCombat");
  });

  it("emits trailing newline", () => {
    const output = serialize({ event: "TESHitEvent" });
    expect(output.endsWith("\n")).toBe(true);
  });

  it("uses 2-space indent by default", () => {
    const output = serialize({ event: "TESHitEvent", chance: 0.5 });
    expect(output).toContain('\n  "chance"');
  });

  it("round-trips okw_low_hp_01 losslessly (content-wise)", () => {
    const serialized = serialize(OKW_LOW_HP_01);
    const parsed = JSON.parse(serialized);
    expect(parsed).toEqual(OKW_LOW_HP_01);
  });
});

describe("parseJsonSafe", () => {
  it("parses valid JSON", () => {
    const r = parseJsonSafe('{"event":"TESHitEvent"}');
    expect(r.ok).toBe(true);
  });

  it("returns error with location for malformed JSON", () => {
    const r = parseJsonSafe('{"event": "TESHitEvent",}');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBeTruthy();
    }
  });
});
