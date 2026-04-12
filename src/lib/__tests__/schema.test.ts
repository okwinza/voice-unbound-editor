import { describe, it, expect } from "vitest";
import { VoiceLineSchema, emptyVoiceLine, emptyCondition, emptyClip } from "../schema";
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

  it("rejects TimeOfDay with neither min nor max", () => {
    expect(
      VoiceLineSchema.safeParse({
        event: "TESHitEvent",
        conditions: [{ type: "TimeOfDay" }],
      }).success,
    ).toBe(false);
  });

  it("rejects WeatherIs without kind", () => {
    expect(
      VoiceLineSchema.safeParse({
        event: "TESHitEvent",
        conditions: [{ type: "WeatherIs" }],
      }).success,
    ).toBe(false);
  });

  it("rejects QuestStage without formID", () => {
    expect(
      VoiceLineSchema.safeParse({
        event: "TESHitEvent",
        conditions: [{ type: "QuestStage" }],
      }).success,
    ).toBe(false);
  });

  it("rejects EquippedWeaponType without kind", () => {
    expect(
      VoiceLineSchema.safeParse({
        event: "TESHitEvent",
        conditions: [{ type: "EquippedWeaponType" }],
      }).success,
    ).toBe(false);
  });

  it("accepts HasActiveEffect with keyword only", () => {
    const result = VoiceLineSchema.safeParse({
      event: "TESHitEvent",
      conditions: [{ type: "HasActiveEffect", keyword: "MagicDamageFire" }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts play_once boolean", () => {
    expect(
      VoiceLineSchema.safeParse({ event: "TESHitEvent", play_once: true }).success,
    ).toBe(true);
    expect(
      VoiceLineSchema.safeParse({ event: "TESHitEvent", play_once: false }).success,
    ).toBe(true);
  });

  it("rejects play_once non-boolean", () => {
    expect(
      VoiceLineSchema.safeParse({ event: "TESHitEvent", play_once: "yes" }).success,
    ).toBe(false);
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

  it("accepts clips array with wav", () => {
    expect(
      VoiceLineSchema.safeParse({
        event: "periodic",
        clips: [{ wav: "intro.wav" }],
      }).success,
    ).toBe(true);
  });

  it("accepts clips array with subtitle only (silent clip)", () => {
    expect(
      VoiceLineSchema.safeParse({
        event: "periodic",
        clips: [{ subtitle: { text: "Hello" } }],
      }).success,
    ).toBe(true);
  });

  it("rejects empty clips array", () => {
    expect(
      VoiceLineSchema.safeParse({
        event: "periodic",
        clips: [],
      }).success,
    ).toBe(false);
  });

  it("accepts speaker as form-ref string", () => {
    expect(
      VoiceLineSchema.safeParse({
        event: "TESHitEvent",
        speaker: "Skyrim.esm|0x0001A69C",
      }).success,
    ).toBe(true);
  });

  it("rejects empty speaker string", () => {
    expect(
      VoiceLineSchema.safeParse({
        event: "TESHitEvent",
        speaker: "",
      }).success,
    ).toBe(false);
  });

  it("accepts condition with reference field", () => {
    expect(
      VoiceLineSchema.safeParse({
        event: "TESHitEvent",
        conditions: [{ type: "IsInCombat", reference: "speaker" }],
      }).success,
    ).toBe(true);
    expect(
      VoiceLineSchema.safeParse({
        event: "TESHitEvent",
        conditions: [{ type: "IsInCombat", reference: "aggressor" }],
      }).success,
    ).toBe(true);
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
  it("emptyClip produces valid ClipSchema output", () => {
    const clip = emptyClip();
    const result = VoiceLineSchema.safeParse({
      event: "periodic",
      clips: [clip],
    });
    expect(result.success).toBe(true);
  });

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
    // Same for IsInFaction, IsInWorldspace, IsCurrentWeather, QuestStage, QuestState.
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
      "IsRunning",
      "IsSprinting",
      "IsWalking",
      "IsBlocking",
      "IsBleedingOut",
      "IsOnMount",
      "IsFlying",
      "IsTrespassing",
      "PlayerLevel",
      "GoldAmount",
      "TimeOfDay",
      "WeatherIs",
      "EquippedWeaponType",
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
