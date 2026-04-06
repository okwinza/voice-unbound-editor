import { describe, it, expect } from "vitest";
import { levenshtein, suggestEventName } from "../event-typos";

describe("levenshtein", () => {
  it("returns 0 for identical strings", () => {
    expect(levenshtein("TESHitEvent", "TESHitEvent")).toBe(0);
  });

  it("returns 1 for a single substitution", () => {
    expect(levenshtein("cat", "bat")).toBe(1);
  });

  it("handles empty strings", () => {
    expect(levenshtein("", "hello")).toBe(5);
    expect(levenshtein("hello", "")).toBe(5);
    expect(levenshtein("", "")).toBe(0);
  });
});

describe("suggestEventName", () => {
  it("corrects single-char typos", () => {
    expect(suggestEventName("TesCombatEvent")).toBe("TESCombatEvent");
    expect(suggestEventName("TESHiyEvent")).toBe("TESHitEvent");
  });

  it("suggests correct event case-insensitively", () => {
    expect(suggestEventName("teshitevent")).toBe("TESHitEvent");
  });

  it("returns null for completely unrelated strings", () => {
    expect(suggestEventName("foobarbazqux")).toBe(null);
  });

  it("corrects 'Periodic' to 'periodic'", () => {
    expect(suggestEventName("Periodic")).toBe("periodic");
  });
});
