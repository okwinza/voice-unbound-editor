import { useEffect, useMemo, useState } from "react";
import {
  FileAudio,
  CircleAlert,
  MessageSquare,
  VolumeX,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
} from "lucide-react";
import { SectionHeader } from "@/components/form/SectionHeader";
import { useWorkspaceStore } from "@/stores/workspace-store";
import {
  useNumberArrayField,
  useIsMultiClip,
  useNestedStringField,
  useNestedNumberField,
} from "@/stores/use-document-field";
import { useAudioState } from "@/stores/use-audio";
import { NumberChipInput } from "@/components/form/inputs/NumberChipInput";
import { SubtypePresets } from "@/components/form/inputs/SubtypePresets";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { AudioPlayer } from "@/lib/audio";
import { getHost } from "@/lib/host";
import { basename, wavPathFor } from "@/lib/paths";
import { emptyClip } from "@/lib/schema";
import type { Clip } from "@/lib/schema";
import { cn } from "@/lib/cn";

interface AudioSectionProps {
  path: string;
}

export function AudioSection({ path }: AudioSectionProps) {
  const patchDom = useWorkspaceStore((s) => s.patchDom);
  const suppressSubtypes = useNumberArrayField(path, "suppress_subtypes");
  const isMultiClip = useIsMultiClip(path);
  const topSubtitle = useNestedStringField(path, "subtitle", "text", "");
  const topSubtitleMs = useNestedNumberField(path, "subtitle", "duration_ms", 3000);

  // Read clips array from dom (only used when isMultiClip)
  const doc = useWorkspaceStore((s) => s.documents.get(path));
  const clips = useMemo<Clip[] | null>(() => {
    if (!doc || typeof doc.dom !== "object" || doc.dom === null) return null;
    const c = (doc.dom as Record<string, unknown>).clips;
    return Array.isArray(c) ? (c as Clip[]) : null;
  }, [doc]);

  return (
    <section
      id="section-audio"
      data-section="audio"
      data-testid="section-audio"
    >
      <SectionHeader numeral="IV" title="Audio" />

      <div className="space-y-4">
        {isMultiClip && clips ? (
          <MultiClipEditor path={path} clips={clips} patchDom={patchDom} />
        ) : (
          <SingleClipView
            path={path}
            subtitle={topSubtitle}
            subtitleMs={topSubtitleMs}
            patchDom={patchDom}
          />
        )}

        {/* Convert toggle */}
        {!isMultiClip && (
          <button
            type="button"
            onClick={() => {
              const clip: Clip = {
                subtitle: { text: topSubtitle, duration_ms: topSubtitleMs },
              };
              patchDom(path, {
                clips: [clip],
                subtitle: undefined,
                lipsync: undefined,
              });
            }}
            className="text-[11px] text-muted-foreground hover:text-primary"
            data-testid="audio-convert-multiclip"
          >
            Convert to multi-clip sequence
          </button>
        )}
        {isMultiClip && clips && clips.length === 1 && (
          <button
            type="button"
            onClick={() => {
              const clip = clips[0];
              patchDom(path, {
                clips: undefined,
                subtitle: clip.subtitle,
                lipsync: clip.lipsync,
              });
            }}
            className="text-[11px] text-muted-foreground hover:text-primary"
            data-testid="audio-flatten-single"
          >
            Flatten to single clip
          </button>
        )}

        {/* Voice-subtype suppression (shared across modes) */}
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

// ---------- Single-clip view (original behavior) ----------

function SingleClipView({
  path,
  subtitle,
  subtitleMs,
  patchDom,
}: {
  path: string;
  subtitle: string;
  subtitleMs: number;
  patchDom: (path: string, patch: Record<string, unknown>) => void;
}) {
  const audio = useAudioState();
  const wavPath = wavPathFor(path);
  const [wavExists, setWavExists] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    getHost()
      .readAudioBlob(wavPath)
      .then(() => { if (!cancelled) setWavExists(true); })
      .catch(() => { if (!cancelled) setWavExists(false); });
    return () => { cancelled = true; };
  }, [wavPath]);

  const wavDurationMs =
    audio.playingPath === wavPath ? audio.durationMs : 0;
  const suggestedMs = wavDurationMs > 0 ? wavDurationMs + 500 : 0;
  const canSuggest =
    suggestedMs > 0 && Math.abs(subtitleMs - suggestedMs) > 100;
  const durationMismatch =
    wavDurationMs > 0 && Math.abs(subtitleMs - wavDurationMs) / wavDurationMs > 0.25;
  const isSilent = wavExists === false && subtitle.length > 0;

  return (
    <>
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
    </>
  );
}

// ---------- Multi-clip editor ----------

function MultiClipEditor({
  path,
  clips,
  patchDom,
}: {
  path: string;
  clips: Clip[];
  patchDom: (path: string, patch: Record<string, unknown>) => void;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set([0]));

  const toggle = (i: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });

  const patchClip = (index: number, patch: Partial<Clip>) => {
    const next = clips.map((c, i) => (i === index ? { ...c, ...patch } : c));
    patchDom(path, { clips: next });
  };

  const removeClip = (index: number) => {
    const next = clips.filter((_, i) => i !== index);
    patchDom(path, { clips: next.length > 0 ? next : undefined });
    // Remap expanded indices: remove the deleted index, shift higher ones down.
    setExpanded((prev) => {
      const remapped = new Set<number>();
      for (const idx of prev) {
        if (idx < index) remapped.add(idx);
        else if (idx > index) remapped.add(idx - 1);
      }
      return remapped;
    });
  };

  const addClip = () => {
    const next = [...clips, emptyClip()];
    patchDom(path, { clips: next });
    setExpanded((prev) => new Set(prev).add(next.length - 1));
  };

  return (
    <div className="space-y-2" data-testid="audio-multiclip">
      {clips.map((clip, i) => {
        const isOpen = expanded.has(i);
        const preview =
          clip.subtitle?.text?.slice(0, 40) || clip.wav || "(empty clip)";
        return (
          <div
            key={`${i}-${clip.wav ?? ""}-${clip.subtitle?.text?.slice(0, 10) ?? ""}`}
            className="rounded border border-border bg-card/30"
            data-testid={`clip-${i}`}
          >
            {/* Header row */}
            <div
              className="group flex cursor-pointer items-center gap-2 px-3 py-1.5"
              onClick={() => toggle(i)}
            >
              {isOpen ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className="mono rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                #{i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
                {preview}
              </span>
              {clips.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeClip(i);
                  }}
                  className="flex h-5 w-5 items-center justify-center rounded opacity-0 transition-opacity hover:bg-destructive/20 hover:text-destructive group-hover:opacity-100"
                  title="Remove clip"
                  data-testid={`clip-${i}-remove`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Expanded content */}
            {isOpen && (
              <div className="space-y-2 border-t border-border px-3 py-2">
                <div>
                  <label className="mb-0.5 block text-[10px] text-muted-foreground">
                    WAV filename
                  </label>
                  <Input
                    value={clip.wav ?? ""}
                    onChange={(e) =>
                      patchClip(i, { wav: e.target.value || undefined })
                    }
                    placeholder="clip.wav (relative to json)"
                    className="mono"
                    data-testid={`clip-${i}-wav`}
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[10px] text-muted-foreground">
                    Subtitle
                  </label>
                  <Textarea
                    value={clip.subtitle?.text ?? ""}
                    onChange={(e) =>
                      patchClip(i, {
                        subtitle: {
                          ...clip.subtitle,
                          text: e.target.value,
                        },
                      })
                    }
                    placeholder="What the speaker says…"
                    data-testid={`clip-${i}-subtitle`}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-muted-foreground">
                    Duration
                  </label>
                  <Input
                    type="number"
                    value={clip.subtitle?.duration_ms ?? 3000}
                    onChange={(e) =>
                      patchClip(i, {
                        subtitle: {
                          ...clip.subtitle,
                          duration_ms: parseInt(e.target.value, 10) || 3000,
                        },
                      })
                    }
                    step={100}
                    min={0}
                    max={60000}
                    className="w-24"
                    data-testid={`clip-${i}-duration`}
                  />
                  <span className="text-[10px] text-muted-foreground">ms</span>
                  <label className="ml-4 flex items-center gap-1.5 text-[10px]">
                    <input
                      type="checkbox"
                      checked={clip.lipsync?.enabled !== false}
                      onChange={(e) =>
                        patchClip(i, {
                          lipsync: e.target.checked
                            ? undefined
                            : { ...clip.lipsync, enabled: false },
                        })
                      }
                      className="h-3 w-3 accent-primary"
                      data-testid={`clip-${i}-lipsync`}
                    />
                    <span className="text-muted-foreground">lipsync</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={addClip}
        className="flex items-center gap-1 rounded-sm border border-dashed border-border px-2 py-1 text-[12px] transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
        data-testid="audio-add-clip"
      >
        <Plus className="h-3.5 w-3.5" />
        <span>Add clip</span>
      </button>
    </div>
  );
}
