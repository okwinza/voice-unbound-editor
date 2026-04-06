/**
 * Shared fixtures used across unit, component, and E2E tests.
 * These mirror the real files under VoiceUnbound/release/Sound/fx/VoiceUnbound/.
 */

export const OKW_LOW_HP_01 = {
  event: "TESHitEvent",
  event_filter: { target: "player" },
  subtitle: { text: "I can't take much more of this...", duration_ms: 3000 },
  chance: 1.0,
  cooldown_seconds: 45,
  important: true,
  exclusive: true,
  conditions: [
    {
      type: "ActorValue",
      value: "Health",
      comparison: "percentBelow",
      threshold: 0.2,
    },
  ],
} as const;

export const OKW_BATTLECRY_01 = {
  event: "TESCombatEvent",
  event_filter: { actor: "player", new_state: "combat" },
  subtitle: { text: "You picked the wrong fight!", duration_ms: 2000 },
  chance: 1.0,
  cooldown_seconds: 60,
} as const;

export const OKW_WARCRY_01 = {
  event: "TESHitEvent",
  event_filter: { aggressor: "player", target: "npc" },
  subtitle: { text: "Take that!", duration_ms: 1500 },
  chance: 0.5,
  cooldown_seconds: 15,
} as const;
