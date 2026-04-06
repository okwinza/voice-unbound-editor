import { describe, it, expect } from "vitest";
import {
  validateDocument,
  validateWavPairing,
  validateWavDurationHint,
} from "../validator";

describe("validateDocument", () => {
  it("passes for a minimal valid doc", () => {
    const r = validateDocument({ event: "TESHitEvent" });
    expect(r.ok).toBe(true);
    expect(r.issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });

  it("emits warning + one-click fix for typo'd event", () => {
    const r = validateDocument({ event: "TesCombatEvent" });
    const eventIssue = r.issues.find((i) => i.path === "event");
    expect(eventIssue?.severity).toBe("warning");
    expect(eventIssue?.fix?.label).toBe("Fix: TESCombatEvent");
  });

  it("warns on unknown filter keys", () => {
    const r = validateDocument({
      event: "TESHitEvent",
      event_filter: { banana: "player" },
    });
    expect(
      r.issues.some(
        (i) =>
          i.severity === "warning" && i.path === "event_filter.banana",
      ),
    ).toBe(true);
  });

  it("warns on enum value out of range", () => {
    const r = validateDocument({
      event: "TESCombatEvent",
      event_filter: { actor: "player", new_state: "fighting" },
    });
    expect(
      r.issues.some(
        (i) => i.path === "event_filter.new_state" && i.severity === "warning",
      ),
    ).toBe(true);
  });

  it("warns when AnimationEvent omits event_filter.tag", () => {
    const r = validateDocument({ event: "AnimationEvent" });
    expect(
      r.issues.some(
        (i) => i.path === "event_filter.tag" && i.severity === "warning",
      ),
    ).toBe(true);
  });

  it("accepts AnimationEvent with tag set", () => {
    const r = validateDocument({
      event: "AnimationEvent",
      event_filter: { tag: "JumpUp" },
    });
    expect(
      r.issues.some((i) => i.path === "event_filter.tag"),
    ).toBe(false);
  });

  it("accepts AnimationEvent with tag array", () => {
    const r = validateDocument({
      event: "AnimationEvent",
      event_filter: { tag: ["JumpLand", "JumpLandDirectional"] },
    });
    expect(
      r.issues.some((i) => i.path === "event_filter.tag"),
    ).toBe(false);
  });

  it("errors on malformed form-ref", () => {
    const r = validateDocument({
      event: "TESPlayerBowShotEvent",
      event_filter: { weapon: "not a form ref" },
    });
    expect(
      r.issues.some(
        (i) => i.path === "event_filter.weapon" && i.severity === "error",
      ),
    ).toBe(true);
  });

  it("accepts actor filter with form-ref value", () => {
    const r = validateDocument({
      event: "TESHitEvent",
      event_filter: { target: "Skyrim.esm|0x7" },
    });
    expect(r.ok).toBe(true);
  });

  it("emits info on important+exclusive combo", () => {
    const r = validateDocument({
      event: "TESHitEvent",
      important: true,
      exclusive: true,
    });
    expect(
      r.issues.some((i) => i.severity === "info" && i.path === "exclusive"),
    ).toBe(true);
  });

  it("errors on chance > 1", () => {
    const r = validateDocument({ event: "TESHitEvent", chance: 1.5 });
    expect(r.ok).toBe(false);
  });
});

describe("validateWavPairing", () => {
  it("errors on silent line with no subtitle", () => {
    const issues = validateWavPairing({ event: "TESHitEvent" }, false);
    expect(issues.some((i) => i.path === "subtitle.text")).toBe(true);
  });

  it("errors on silent line with 0 duration", () => {
    const issues = validateWavPairing(
      {
        event: "TESHitEvent",
        subtitle: { text: "Hello", duration_ms: 0 },
      },
      false,
    );
    expect(
      issues.some((i) => i.path === "subtitle.duration_ms"),
    ).toBe(true);
  });

  it("passes on non-silent line regardless of subtitle", () => {
    const issues = validateWavPairing({ event: "TESHitEvent" }, true);
    expect(issues).toHaveLength(0);
  });
});

describe("validateWavDurationHint", () => {
  it("returns null for matching durations", () => {
    expect(validateWavDurationHint(3000, 3000)).toBeNull();
  });

  it("returns null for 0 wav duration", () => {
    expect(validateWavDurationHint(3000, 0)).toBeNull();
  });

  it("warns on > 25% mismatch", () => {
    const r = validateWavDurationHint(3000, 1000);
    expect(r?.severity).toBe("info");
  });

  it("accepts within 25%", () => {
    expect(validateWavDurationHint(3000, 2500)).toBeNull();
    expect(validateWavDurationHint(3000, 3700)).toBeNull();
  });
});
