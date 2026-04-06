import { useSyncExternalStore } from "react";
import { AudioPlayer, type AudioState } from "@/lib/audio";

const EMPTY: AudioState = {
  playingPath: null,
  durationMs: 0,
  isPlaying: false,
};

export function useAudioState(): AudioState {
  return useSyncExternalStore(
    (fn) => AudioPlayer.subscribe(fn),
    () => AudioPlayer.getState(),
    () => EMPTY,
  );
}
