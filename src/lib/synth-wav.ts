/**
 * Synthesize a short PCM WAV as a browser-mode stand-in for real voice
 * files. Each line gets a tone whose pitch is derived from the filename
 * hash so modders can hear that lines are distinct when auditioning.
 *
 * Not used in Tauri mode — TauriHost reads the real .wav files from disk.
 */

export interface SynthTone {
  /** Fundamental pitch in Hz. */
  hz: number;
  /** Duration in milliseconds. */
  durationMs: number;
  /** Sample rate. 22050 is fine for a stand-in. */
  sampleRate?: number;
  /** 0..1 peak amplitude. */
  amplitude?: number;
}

export function synthesizeWav(tone: SynthTone): ArrayBuffer {
  const sampleRate = tone.sampleRate ?? 22050;
  const amplitude = tone.amplitude ?? 0.3;
  const samples = Math.max(1, Math.floor((sampleRate * tone.durationMs) / 1000));
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  // RIFF header
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples * 2, true);
  writeStr(8, "WAVE");

  // fmt chunk
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);        // subchunk size
  view.setUint16(20, 1, true);          // PCM format
  view.setUint16(22, 1, true);          // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true);          // block align
  view.setUint16(34, 16, true);         // bits per sample

  // data chunk
  writeStr(36, "data");
  view.setUint32(40, samples * 2, true);

  // Sine wave with attack/release envelope so the tone doesn't click.
  const attackSec = 0.04;
  const releaseSec = 0.08;
  const durationSec = tone.durationMs / 1000;
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const attack = Math.min(1, t / attackSec);
    const release = Math.min(1, (durationSec - t) / releaseSec);
    const envelope = Math.max(0, Math.min(attack, release));
    const v = Math.sin(2 * Math.PI * tone.hz * t) * envelope * amplitude * 0x7fff;
    view.setInt16(44 + i * 2, v | 0, true);
  }
  return buffer;
}

/** Hash a string to a pleasant-sounding pitch between 220 Hz and 660 Hz. */
export function pitchForName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  const steps = 14;                          // pitches per octave-plus
  const step = Math.abs(h) % steps;
  // C4 (261.63) * 2^(step / steps) gives pitches across ~1.5 octaves.
  return 261.63 * Math.pow(2, step / 12);
}

/** Convenience: synthesize a tone keyed off a filename. */
export function synthesizeForName(name: string, durationMs = 600): ArrayBuffer {
  return synthesizeWav({ hz: pitchForName(name), durationMs });
}
