import type { Preferences } from "@/lib/domain";

const presets = {
  bell: { notes: [659.25, 880], spacing: 0.17, length: 0.68, partial: 2.76 },
  marimba: {
    notes: [523.25, 659.25, 783.99],
    spacing: 0.115,
    length: 0.32,
    partial: 4,
  },
  soft: { notes: [440, 587.33], spacing: 0.2, length: 0.55, partial: 2 },
};

export async function enableSound(context: AudioContext | null) {
  const audio = context ?? new AudioContext();
  await audio.resume();
  return audio;
}

export function playChime(
  audio: AudioContext,
  style: Preferences["chimeStyle"],
) {
  if (audio.state !== "running") return;
  const { notes, spacing, length, partial } = presets[style];
  const start = audio.currentTime + 0.015;
  for (const [index, frequency] of notes.entries()) {
    const at = start + index * spacing;
    for (const [ratio, volume, duration] of [
      [1, 0.09, length],
      [partial, 0.012, length / 2],
    ]) {
      const tone = audio.createOscillator();
      const gain = audio.createGain();
      tone.frequency.value = frequency * ratio;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(volume, at + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
      tone.connect(gain).connect(audio.destination);
      tone.start(at);
      tone.stop(at + duration);
    }
  }
}
