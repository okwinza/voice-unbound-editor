import { useEffect, useRef, useState, type DragEvent } from "react";
import { Save, RotateCcw, Play, Pause, Upload } from "lucide-react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useNestedPatcher } from "@/stores/use-document-field";
import { useAudioState } from "@/stores/use-audio";
import { AudioPlayer, probeBlobDuration } from "@/lib/audio";
import { getHost } from "@/lib/host";
import { basename, folderOf, stemOf, wavPathFor } from "@/lib/paths";
import { cn } from "@/lib/cn";

export function HeroRow({ path }: { path: string }) {
  const doc = useWorkspaceStore((s) => s.documents.get(path));
  const saveDocument = useWorkspaceStore((s) => s.saveDocument);
  const revertDocument = useWorkspaceStore((s) => s.revertDocument);
  const dirty = doc?.dirty ?? false;
  const name = basename(path);
  const folder = folderOf(path);

  return (
    <div
      className="hero-wash sticky top-0 z-10 border-b border-border"
      data-testid="hero-row"
    >
      <div className="flex items-center gap-3 px-4 py-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="mono truncate text-sm font-semibold" data-testid="hero-filename">
              {stemOf(name)}
            </span>
            {dirty && (
              <span
                className="text-warning"
                title="unsaved"
                aria-label="unsaved"
                data-testid="hero-dirty"
              >
                ●
              </span>
            )}
          </div>
          <p className="mono truncate text-[10px] text-muted-foreground">{folder}</p>
        </div>
        <button
          type="button"
          onClick={() => void revertDocument(path)}
          disabled={!dirty}
          className={cn(
            "flex items-center gap-1 rounded px-2 py-1 text-xs font-medium",
            "hover:bg-accent hover:text-accent-foreground disabled:opacity-30 disabled:pointer-events-none",
          )}
          title="Revert (Ctrl+Z to undo)"
          data-testid="hero-revert"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Revert
        </button>
        <button
          type="button"
          onClick={() => void saveDocument(path)}
          disabled={!dirty}
          className={cn(
            "flex items-center gap-1 rounded bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground",
            "hover:brightness-110 disabled:opacity-30 disabled:pointer-events-none",
          )}
          title="Save (Ctrl+S)"
          data-testid="hero-save"
        >
          <Save className="h-3.5 w-3.5" />
          Save
        </button>
      </div>
      <AudioStrip jsonPath={path} wavPath={wavPathFor(path)} />
    </div>
  );
}

function AudioStrip({ jsonPath, wavPath }: { jsonPath: string; wavPath: string }) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const audio = useAudioState();
  const patchSubtitle = useNestedPatcher(jsonPath, "subtitle");
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const messageTimeoutRef = useRef<number | null>(null);
  const isCurrent = audio.playingPath === wavPath;
  const isPlaying = isCurrent && audio.isPlaying;

  useEffect(() => {
    if (!waveformRef.current) return;
    return AudioPlayer.attachWaveform(waveformRef.current);
  }, []);

  const flashMessage = (msg: string, ms = 2400) => {
    if (messageTimeoutRef.current != null) {
      window.clearTimeout(messageTimeoutRef.current);
    }
    setMessage(msg);
    messageTimeoutRef.current = window.setTimeout(() => {
      setMessage(null);
      messageTimeoutRef.current = null;
    }, ms);
  };

  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current != null) {
        window.clearTimeout(messageTimeoutRef.current);
      }
    };
  }, []);

  const handleClick = () => {
    void AudioPlayer.toggle(wavPath);
  };

  const durationSec = audio.durationMs > 0 ? (audio.durationMs / 1000).toFixed(1) : null;

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    const items = e.dataTransfer.items;
    if (items.length === 0 || items[0].kind !== "file") return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (!dragging) setDragging(true);
  };
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
  };
  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = Array.from(e.dataTransfer.files).find((f) =>
      /\.wav$/i.test(f.name),
    );
    if (!file) {
      flashMessage("Drop a .wav file", 2000);
      return;
    }
    try {
      const bytes = await file.arrayBuffer();
      await getHost().writeBinaryFile(wavPath, bytes);
      const durationMs = await probeBlobDuration(file);
      if (durationMs > 0) {
        patchSubtitle("duration_ms", durationMs + 500);
      }
      flashMessage(
        `Attached ${file.name}${durationMs ? ` (${(durationMs / 1000).toFixed(1)}s)` : ""}`,
      );
      // Refresh the waveform from the bytes we just wrote — avoids a
      // round-trip through the host backend for the file we already have.
      void AudioPlayer.preload(wavPath, new Blob([bytes], { type: "audio/wav" }));
    } catch (err) {
      flashMessage(`Attach failed: ${(err as Error).message ?? "unknown error"}`, 3000);
    }
  };

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 border-t border-border/50 px-4 py-1.5 transition-colors",
        dragging && "bg-primary/10",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-testid="hero-audio-strip"
    >
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
          isPlaying
            ? "bg-primary text-primary-foreground"
            : "bg-muted/40 text-muted-foreground hover:bg-primary/20 hover:text-primary",
        )}
        title={isPlaying ? "Stop (Space)" : "Play wav (Space)"}
        aria-label={isPlaying ? "Stop" : "Play wav"}
        data-testid="hero-play"
      >
        {isPlaying ? (
          <Pause className="h-3.5 w-3.5" />
        ) : (
          <Play className="h-3.5 w-3.5 translate-x-[1px]" />
        )}
      </button>
      <div
        ref={waveformRef}
        className="flex-1 overflow-hidden"
        data-testid="hero-waveform"
      />
      <span className="mono w-12 shrink-0 text-right text-[10px] text-muted-foreground">
        {isCurrent && durationSec ? `${durationSec}s` : "— s"}
      </span>
      <span
        className={cn(
          "flex items-center gap-1 text-[10px] transition-colors",
          dragging ? "text-primary" : "text-muted-foreground/60",
        )}
      >
        <Upload className="h-3 w-3" />
        {dragging ? "drop to attach" : "drop .wav"}
      </span>
      {message && (
        <div
          className="absolute inset-x-4 -bottom-5 z-10 mono text-[10px] text-muted-foreground"
          data-testid="hero-drop-message"
        >
          {message}
        </div>
      )}
    </div>
  );
}
