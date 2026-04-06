import { useEffect, useState } from "react";
import { FileAudio, CircleAlert, MessageSquare, VolumeX } from "lucide-react";
import { SectionHeader } from "@/components/form/SectionHeader";
import { useWorkspaceStore } from "@/stores/workspace-store";
import {
  useStringField,
  useNumberField,
  useNumberArrayField,
} from "@/stores/use-document-field";
import { useAudioState } from "@/stores/use-audio";
import { NumberChipInput } from "@/components/form/inputs/NumberChipInput";
import { SubtypePresets } from "@/components/form/inputs/SubtypePresets";
import { AudioPlayer } from "@/lib/audio";
import { getHost } from "@/lib/host";
import { basename, wavPathFor } from "@/lib/paths";
import { cn } from "@/lib/cn";

interface AudioSectionProps {
  path: string;
}

export function AudioSection({ path }: AudioSectionProps) {
  const patchDom = useWorkspaceStore((s) => s.patchDom);
  const subtitle = useStringField(path, "subtitle", "");
  const subtitleMs = useNumberField(path, "subtitle_duration_ms", 3000);
  const suppressSubtypes = useNumberArrayField(path, "suppress_subtypes");
  const audio = useAudioState();
  const wavPath = wavPathFor(path);
  const [wavExists, setWavExists] = useState<boolean | null>(null);

  // Probe the wav by attempting a read — avoids a separate exists() check
  // plus read() roundtrip (TOCTOU). Empty blobs still count as "exists":
  // BrowserHost returns an empty blob for fixture entries that have no
  // audio data, and the AudioPlayer synthesizes a tone on play.
  useEffect(() => {
    let cancelled = false;
    getHost()
      .readAudioBlob(wavPath)
      .then(() => { if (!cancelled) setWavExists(true); })
      .catch(() => { if (!cancelled) setWavExists(false); });
    return () => { cancelled = true; };
  }, [wavPath]);

  // Sync duration suggestion: when audio finishes loading and we don't
  // yet have a subtitle_duration_ms matching it, offer a one-click snap.
  const wavDurationMs =
    audio.playingPath === wavPath ? audio.durationMs : 0;
  const suggestedMs = wavDurationMs > 0 ? wavDurationMs + 500 : 0;
  const canSuggest =
    suggestedMs > 0 && Math.abs(subtitleMs - suggestedMs) > 100;
  const durationMismatch =
    wavDurationMs > 0 && Math.abs(subtitleMs - wavDurationMs) / wavDurationMs > 0.25;

  const isSilent = wavExists === false && subtitle.length > 0;

  return (
    <section
      id="section-audio"
      data-section="audio"
      data-testid="section-audio"
    >
      <SectionHeader numeral="IV" title="Audio" />

      <div className="space-y-4">
        {/* WAV status card */}
        <div
          className={cn(
            "flex items-start gap-3 rounded border p-3",
            wavExists === true && "border-border bg-card/30",
            wavExists === false && !isSilent && "border-warning/40 bg-warning/5",
            isSilent && "border-border bg-card/30",
            wavExists === null && "border-border bg-card/30",
          )}
          data-testid="audio-wav-status"
        >
          {wavExists === true && (
            <>
              <FileAudio className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="flex-1 text-[12px]">
                <p className="font-medium text-foreground">
                  {basename(wavPath)}
                </p>
                <p className="mono text-[10px] text-muted-foreground">{wavPath}</p>
                <button
                  type="button"
                  onClick={() => void AudioPlayer.toggle(wavPath)}
                  className="mt-2 rounded-sm border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:border-ring hover:text-foreground"
                  data-testid="audio-preview-play"
                >
                  {audio.playingPath === wavPath && audio.isPlaying
                    ? "Stop"
                    : "Preview"}
                </button>
              </div>
            </>
          )}
          {wavExists === false && !isSilent && (
            <>
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <div className="flex-1 text-[12px]">
                <p className="font-medium text-warning">No matching .wav</p>
                <p className="mono text-[10px] text-muted-foreground">
                  expected: {wavPath}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground/80">
                  Add a subtitle to make this a silent line, or drop a wav
                  into the hero strip above.
                </p>
              </div>
            </>
          )}
          {isSilent && (
            <>
              <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 text-[12px]">
                <p className="font-medium text-foreground">Silent line</p>
                <p className="text-[11px] text-muted-foreground/80">
                  No wav required — displays subtitle only for{" "}
                  <span className="mono text-foreground">{subtitleMs}ms</span>.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Duration mismatch warning */}
        {durationMismatch && (
          <div
            className="flex items-start gap-3 rounded border border-warning/40 bg-warning/5 p-3"
            data-testid="audio-duration-mismatch"
          >
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div className="flex-1 text-[12px]">
              <p className="font-medium text-warning">
                Subtitle duration differs from wav length
              </p>
              <p className="text-[11px] text-muted-foreground/80">
                subtitle_duration_ms is{" "}
                <span className="mono text-foreground">{subtitleMs}ms</span>
                , wav is{" "}
                <span className="mono text-foreground">
                  {Math.round(wavDurationMs)}ms
                </span>
                .
              </p>
              {canSuggest && (
                <button
                  type="button"
                  onClick={() =>
                    patchDom(path, { subtitle_duration_ms: suggestedMs })
                  }
                  className="mt-2 rounded-sm border border-warning/40 bg-warning/10 px-2 py-0.5 text-[11px] text-warning hover:bg-warning/20"
                  data-testid="audio-snap-duration"
                >
                  Snap to {suggestedMs}ms
                </button>
              )}
            </div>
          </div>
        )}

        {/* Voice-subtype suppression (optional per-line) */}
        <div
          className="rounded border border-border bg-card/30 p-3"
          data-testid="audio-suppress-subtypes"
        >
          <div className="mb-2 flex items-start gap-2">
            <VolumeX className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-foreground">
                Suppress subtypes
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground/80">
                Voice-subtype IDs to silence while this line plays — unioned
                with the global gated set. Integers 0–65535.
              </p>
            </div>
          </div>
          <NumberChipInput
            value={suppressSubtypes}
            onChange={(next) => patchDom(path, { suppress_subtypes: next })}
            min={0}
            max={65535}
            placeholder="e.g. 26 29 33"
            data-testid="audio-suppress-subtypes-input"
          />
          <SubtypePresets
            selected={suppressSubtypes ?? []}
            onToggle={(id) => {
              const current = suppressSubtypes ?? [];
              const next = current.includes(id)
                ? current.filter((n) => n !== id)
                : [...current, id].sort((a, b) => a - b);
              patchDom(path, { suppress_subtypes: next.length > 0 ? next : undefined });
            }}
            data-testid="audio-suppress-presets"
          />
        </div>
      </div>
    </section>
  );
}
