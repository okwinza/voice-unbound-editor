import { describe, it, expect } from "vitest";
import { VoiceLineSchema, emptyVoiceLine, emptyCondition } from "../schema";
import { OKW_LOW_HP_01 } from "./fixtures";

describe("VoiceLineSchema", () => {
  it("accepts the minimum required shape", () => {
    const result = VoiceLineSchema.safeParse({ event: "TESHitEvent" });
    expect(result.success).toBe(true);
  });

  it("rejects unknown events", () => {
    const result = VoiceLineSchema.safeParse({ event: "TesCombatEvent" });
    expect(result.success).toBe(false);
  });

  it("round-trips the real okw_low_hp_01 file", () => {
    const result = VoiceLineSchema.safeParse(OKW_LOW_HP_01);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.important).toBe(true);
      expect(result.data.exclusive).toBe(true);
    }
  });

  it("accepts nested ConditionGroup", () => {
    const file = {
      event: "periodic",
      conditions: [
        {
          type: "ConditionGroup",
          logic: "OR",
          conditions: [
            { type: "IsInCombat" },
            {
              type: "ConditionGroup",
              logic: "AND",
              conditions: [
                { type: "IsSneaking" },
                { type: "IsWeaponDrawn" },
              ],
            },
          ],
        },
      ],
    };
    const result = VoiceLineSchema.safeParse(file);
    expect(result.success).toBe(true);
  });

  it("rejects chance > 1", () => {
    const result = VoiceLineSchema.safeParse({
      event: "TESHitEvent",
      chance: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects HasActiveEffect with neither keyword nor formID", () => {
    const result = VoiceLineSchema.safeParse({
      event: "TESHitEvent",
      conditions: [{ type: "HasActiveEffect" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects IsLocation with neither location nor formID", () => {
    const result = VoiceLineSchema.safeParse({
      event: "TESHitEvent",
      conditions: [{ type: "IsLocation" }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts IsLocation with location only", () => {
    const result = VoiceLineSchema.safeParse({
      event: "TESHitEvent",
      conditions: [{ type: "IsLocation", location: "WhiterunLocation" }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts HasActiveEffect with keyword only", () => {
    const result = VoiceLineSchema.safeParse({
      event: "TESHitEvent",
      conditions: [{ type: "HasActiveEffect", keyword: "MagicDamageFire" }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts suppress_subtypes as uint16 array", () => {
    expect(
      VoiceLineSchema.safeParse({
        event: "TESHitEvent",
        suppress_subtypes: [12, 318, 65535],
      }).success,
    ).toBe(true);
    // Empty array is fine too.
    expect(
      VoiceLineSchema.safeParse({
        event: "TESHitEvent",
        suppress_subtypes: [],
      }).success,
    ).toBe(true);
  });

  it("rejects suppress_subtypes with out-of-range values", () => {
    expect(
      VoiceLineSchema.safeParse({
        event: "TESHitEvent",
        suppress_subtypes: [-1],
      }).success,
    ).toBe(false);
    expect(
      VoiceLineSchema.safeParse({
        event: "TESHitEvent",
        suppress_subtypes: [65536],
      }).success,
    ).toBe(false);
    expect(
      VoiceLineSchema.safeParse({
        event: "TESHitEvent",
        suppress_subtypes: [1.5],
      }).success,
    ).toBe(false);
  });

  it("accepts filter values as string or array", () => {
    const scalar = VoiceLineSchema.safeParse({
      event: "TESHitEvent",
      event_filter: { target: "player" },
    });
    const arr = VoiceLineSchema.safeParse({
      event: "TESHitEvent",
      event_filter: { target: ["player", "npc"] },
    });
    expect(scalar.success).toBe(true);
    expect(arr.success).toBe(true);
  });

  it("accepts FallEvent with numeric after_seconds (scalar + array)", () => {
    const scalar = VoiceLineSchema.safeParse({
      event: "FallEvent",
      event_filter: { after_seconds: 1.0 },
    });
    const arr = VoiceLineSchema.safeParse({
      event: "FallEvent",
      event_filter: { after_seconds: [2.0, 5.0] },
    });
    expect(scalar.success).toBe(true);
    expect(arr.success).toBe(true);
  });

  it("accepts LevelUpEvent + SkillIncreaseEvent", () => {
    expect(
      VoiceLineSchema.safeParse({
        event: "LevelUpEvent",
        event_filter: { new_level: "10" },
      }).success,
    ).toBe(true);
    expect(
      VoiceLineSchema.safeParse({
        event: "SkillIncreaseEvent",
        event_filter: { skill: ["OneHanded", "Sneak"] },
      }).success,
    ).toBe(true);
  });
});

describe("factories", () => {
  it("emptyVoiceLine defaults to TESHitEvent with sane values", () => {
    const line = emptyVoiceLine();
    expect(line.event).toBe("TESHitEvent");
    expect(line.chance).toBe(1.0);
    expect(line.cooldown_seconds).toBe(30);
    expect(line.subtitle?.duration_ms).toBe(3000);
    expect(line.subtitle?.text).toBe("");
  });

  it("emptyCondition produces schema-valid nodes for every type", () => {
    // HasPerk, HasSpell, PlayerName are excluded — their factories return
    // intentionally empty placeholders (formID:"", name:"") that fail min(1)
    // validation until the user fills them in.
    for (const type of [
      "ActorValue",
      "IsInCombat",
      "IsWeaponDrawn",
      "IsSneaking",
      "IsSleeping",
      "IsInterior",
      "IsSwimming",
      "IsFemale",
      "IsRace",
      "HasActiveEffect",
      "IsSlotEmpty",
      "LocationHasKeyword",
      "NPCsNearby",
      "IsLocation",
      "ConditionGroup",
    ] as const) {
      const cond = emptyCondition(type);
      const result = VoiceLineSchema.safeParse({
        event: "TESHitEvent",
        conditions: [cond],
      });
      expect(result.success, `empty ${type} should parse`).toBe(true);
    }
  });
});
