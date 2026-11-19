"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Language } from "@/lib/i18n";
import { defaultAudio, type AudioPreferences, type Chime } from "./audio-preferences";

const presets = {
  airport: { tones: [[660, 0], [880, 0.14]], type: "sine", duration: 0.25, gain: 0.075 },
  clinic: { tones: [[523.25, 0], [659.25, 0.19]], type: "sine", duration: 0.38, gain: 0.045 },
  bell: { tones: [[1046.5, 0], [1567.98, 0.025], [1318.51, 0.16]], type: "triangle", duration: 0.2, gain: 0.038 },
  marimba: { tones: [[392, 0], [523.25, 0.09], [659.25, 0.18]], type: "triangle", duration: 0.18, gain: 0.06 },
} as const;

export function useChime() {
  const context = useRef<AudioContext | null>(null);
  const [status, setStatus] = useState<"locked" | "ready" | "unavailable">(
    "locked",
  );

  const unlock = useCallback(async () => {
    try {
      context.current ??= new AudioContext();
      if (context.current.state !== "running") await context.current.resume();
      if (context.current.state !== "running")
        throw new Error("Audio is suspended");
      setStatus("ready");
      return true;
    } catch {
      setStatus("unavailable");
      return false;
    }
  }, []);

  const play = useCallback((chime: Chime = defaultAudio.chime) => {
    const audio = context.current;
    if (chime === "mute" || !audio || audio.state !== "running") return;
    const preset = presets[chime];
    const start = audio.currentTime;
    for (const [tone, offset] of preset.tones) {
      const oscillator = audio.createOscillator();
      const volume = audio.createGain();
      const at = start + offset;
      oscillator.type = preset.type;
      oscillator.frequency.value = tone;
      volume.gain.setValueAtTime(0.001, at);
      volume.gain.linearRampToValueAtTime(preset.gain, at + 0.025);
      volume.gain.exponentialRampToValueAtTime(0.001, at + preset.duration - 0.01);
      oscillator.connect(volume).connect(audio.destination);
      oscillator.start(at);
      oscillator.stop(at + preset.duration);
    }
  }, []);

  useEffect(
    () => () => {
      void context.current?.close().catch(() => undefined);
      context.current = null;
    },
    [],
  );

  return { status, unlock, play };
}

function voiceMatches(voice: SpeechSynthesisVoice, language: Language) {
  return voice.lang.split(/[-_]/)[0].toLowerCase() === language;
}

export function announce(token: string, counter: string, settings: AudioPreferences, displayLanguage: Language) {
  if (!("speechSynthesis" in window)) return;
  const language = settings.speechLang === "display" ? displayLanguage : settings.speechLang;
  const voices = window.speechSynthesis.getVoices();
  const matching = voices.filter((voice) => voiceMatches(voice, language));
  const voice = voices.find((voice) => voice.voiceURI === settings.voiceId)
    ?? matching.find((voice) => voice.default)
    ?? matching[0];
  const displayToken = token.replace(/-/g, " ");
  const speech = new SpeechSynthesisUtterance(
    language === "bn"
      ? `টিকিট ${displayToken}। ${counter} কাউন্টারে আসুন।`
      : `Ticket ${displayToken}. Please go to ${counter}.`,
  );
  speech.lang = voice && voiceMatches(voice, language) ? voice.lang : language === "bn" ? "bn-BD" : "en";
  speech.voice = voice ?? null;
  speech.rate = Number(settings.speechRate);
  window.speechSynthesis.speak(speech);
}
