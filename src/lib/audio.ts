/**
 * Global audio player singleton — one wav plays at a time across the whole
 * app (hero row waveform, tree-row play buttons, keyboard shortcut all
 * share it).
 *
 * Layering:
 *   - `AudioPlayer.play(path)` starts playback and (optionally) binds a
 *      WaveSurfer instance to a container for waveform rendering.
 *   - Subscribe to state changes via `AudioPlayer.subscribe(...)` — returns
 *      an unsubscribe fn. The state is {playingPath, durationMs, isPlaying}.
 *   - Components that just need a play button read the singleton directly.
 */

import WaveSurfer from "wavesurfer.js";
import { getHost } from "./host";
import { synthesizeForName } from "./synth-wav";
import { basename } from "./paths";

// Synth-tone cache: wav bytes are deterministic per filename, so cache
// them once. Keeps walking-auditioner fast.
const synthCache = new Map<string, Blob>();
function synthBlob(path: string): Blob {
  const name = basename(path) || "unnamed";
  let blob = synthCache.get(name);
  if (!blob) {
    blob = new Blob([synthesizeForName(name)], { type: "audio/wav" });
    synthCache.set(name, blob);
  }
  return blob;
}

/**
 * Probe a wav blob's duration in milliseconds via a throwaway HTMLAudioElement.
 * Resolves to 0 if the browser can't decode the blob or stalls past the timeout.
 */
export function probeBlobDuration(blob: Blob, timeoutMs = 4000): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    let done = false;
    const finish = (ms: number) => {
      if (done) return;
      done = true;
      URL.revokeObjectURL(url);
      resolve(ms);
    };
    audio.addEventListener("loadedmetadata", () => {
      const ms = Math.round(audio.duration * 1000);
      finish(Number.isFinite(ms) && ms > 0 ? ms : 0);
    });
    audio.addEventListener("error", () => finish(0));
    setTimeout(() => finish(0), timeoutMs);
  });
}

export interface AudioState {
  playingPath: string | null;
  durationMs: number;
  isPlaying: boolean;
}

type Listener = (state: AudioState) => void;

class AudioPlayerImpl {
  private ws: WaveSurfer | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private currentPath: string | null = null;
  private state: AudioState = {
    playingPath: null,
    durationMs: 0,
    isPlaying: false,
  };
  private listeners = new Set<Listener>();

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  getState(): AudioState {
    return this.state;
  }

  /**
   * Attach a WaveSurfer instance to a container DOM node. Returns a cleanup
   * function that destroys the instance. Called by the HeroRow on mount.
   */
  attachWaveform(container: HTMLElement): () => void {
    // Destroy any existing instance first (e.g. hot-reload).
    if (this.ws) {
      this.ws.destroy();
      this.ws = null;
    }

    const styles = getComputedStyle(document.documentElement);
    const primary = styles.getPropertyValue("--primary").trim() || "#d89b4a";
    const muted =
      styles.getPropertyValue("--muted-foreground").trim() || "#8a8070";

    this.ws = WaveSurfer.create({
      container,
      height: 28,
      barWidth: 2,
      barGap: 1,
      barRadius: 1,
      waveColor: `oklch(${muted} / 0.45)`,
      progressColor: `oklch(${primary})`,
      cursorColor: `oklch(${primary})`,
      cursorWidth: 1,
      normalize: true,
      interact: true,
    });

    this.ws.on("finish", () => {
      this.updateState({ isPlaying: false });
    });
    this.ws.on("play", () => {
      this.updateState({ isPlaying: true });
    });
    this.ws.on("pause", () => {
      this.updateState({ isPlaying: false });
    });
    this.ws.on("ready", (duration) => {
      this.updateState({ durationMs: Math.round(duration * 1000) });
    });

    // If something was loaded before the waveform attached, re-bind it.
    if (this.currentPath) {
      void this.loadIntoWaveform(this.currentPath);
    }

    return () => {
      if (this.ws) {
        this.ws.destroy();
        this.ws = null;
      }
    };
  }

  /**
   * Play a .wav at the given path. Stops any currently-playing line first.
   * If a WaveSurfer is attached, it takes ownership of the playback;
   * otherwise we fall back to a plain <audio> element.
   */
  async play(path: string): Promise<void> {
    this.stop();
    this.currentPath = path;

    let blob: Blob;
    try {
      blob = await getHost().readAudioBlob(path);
      if (blob.size === 0) blob = synthBlob(path);
    } catch {
      this.updateState({ playingPath: path, isPlaying: false, durationMs: 0 });
      return;
    }

    this.updateState({ playingPath: path, isPlaying: true });

    if (this.ws) {
      await this.loadIntoWaveform(path, blob);
      await this.ws.play();
    } else {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.addEventListener("ended", () => {
        this.updateState({ isPlaying: false });
        URL.revokeObjectURL(url);
      });
      audio.addEventListener("loadedmetadata", () => {
        this.updateState({ durationMs: Math.round(audio.duration * 1000) });
      });
      this.currentAudio = audio;
      await audio.play();
    }
  }

  stop(): void {
    if (this.ws?.isPlaying()) this.ws.stop();
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.updateState({ isPlaying: false });
  }

  /** Toggle play/stop for a given path. */
  async toggle(path: string): Promise<void> {
    if (this.state.playingPath === path && this.state.isPlaying) {
      this.stop();
    } else {
      await this.play(path);
    }
  }

  /**
   * Load a wav into the attached waveform without playing — used after
   * drop-to-attach to refresh the visualization from the bytes we just
   * wrote, avoiding a pointless re-read through the host backend.
   */
  async preload(path: string, blob?: Blob): Promise<void> {
    this.currentPath = path;
    await this.loadIntoWaveform(path, blob);
  }

  private async loadIntoWaveform(path: string, blob?: Blob): Promise<void> {
    if (!this.ws) return;
    let data = blob;
    if (!data) {
      try {
        data = await getHost().readAudioBlob(path);
        if (data.size === 0) data = synthBlob(path);
      } catch {
        return;
      }
    }
    await this.ws.loadBlob(data);
  }

  private updateState(patch: Partial<AudioState>): void {
    this.state = { ...this.state, ...patch };
    for (const fn of this.listeners) fn(this.state);
  }
}

export const AudioPlayer = new AudioPlayerImpl();
