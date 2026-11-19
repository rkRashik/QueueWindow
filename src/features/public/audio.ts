"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useChime() {
  const context = useRef<AudioContext | null>(null);
  const [status, setStatus] = useState<"locked" | "ready" | "unavailable">(
    "locked",
  );

  const unlock = useCallback(async () => {
    try {
      context.current ??= new AudioContext();
      await context.current.resume();
      if (context.current.state !== "running")
        throw new Error("Audio is suspended");
      setStatus("ready");
      return true;
    } catch {
      setStatus("unavailable");
      return false;
    }
  }, []);

  const play = useCallback(() => {
    const audio = context.current;
    if (!audio || audio.state !== "running") return;
    const start = audio.currentTime;
    for (const [tone, offset] of [
      [660, 0],
      [880, 0.14],
    ]) {
      const oscillator = audio.createOscillator();
      const volume = audio.createGain();
      const at = start + offset;
      oscillator.type = "sine";
      oscillator.frequency.value = tone;
      volume.gain.setValueAtTime(0.001, at);
      volume.gain.linearRampToValueAtTime(0.075, at + 0.025);
      volume.gain.exponentialRampToValueAtTime(0.001, at + 0.24);
      oscillator.connect(volume).connect(audio.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.25);
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

export function announce(token: string, counter: string) {
  if (typeof window.speechSynthesis === "undefined") return;
  const voices = window.speechSynthesis.getVoices();
  const bangla = voices.find((voice) =>
    voice.lang.toLowerCase().startsWith("bn"),
  );
  const displayToken = token.replace(/-/g, " ");
  const speech = new SpeechSynthesisUtterance(
    bangla
      ? `টিকিট ${displayToken}। ${counter} কাউন্টারে আসুন।`
      : `Ticket ${displayToken}. Please go to ${counter}.`,
  );
  speech.lang = bangla?.lang ?? "en";
  speech.voice =
    bangla ?? voices.find((voice) => voice.lang.startsWith("en")) ?? null;
  speech.rate = 0.9;
  window.speechSynthesis.speak(speech);
}
