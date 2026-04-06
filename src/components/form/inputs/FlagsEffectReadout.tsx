interface FlagsEffectReadoutProps {
  important: boolean;
  exclusive: boolean;
}

/**
 * Live one-sentence summary of what the flag combination does at dispatch
 * time. Mirrors the 4-case table in plan D21.
 */
export function FlagsEffectReadout({ important, exclusive }: FlagsEffectReadoutProps) {
  let text: string;
  if (important && exclusive) {
    text =
      "Bypasses global cooldown + chance roll. `exclusive` has no effect when `important` is set — safe to remove.";
  } else if (important) {
    text = "Bypasses global cooldown + chance roll — always considered if eligible.";
  } else if (exclusive) {
    text =
      "Prioritized in the normal pool — still subject to global cooldown + chance roll.";
  } else {
    text =
      "Normal line — subject to global cooldown + chance roll, drops if an exclusive line is eligible.";
  }
  return (
    <p
      className="flex-1 text-[11px] leading-relaxed text-muted-foreground"
      data-testid="flags-readout"
    >
      {text}
    </p>
  );
}
