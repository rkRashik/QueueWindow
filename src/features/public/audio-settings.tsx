"use client";

import { useEffect, useState } from "react";
import type { Language } from "@/lib/i18n";
import { useStoredChoice } from "@/lib/stored";
import { announce, useChime } from "./audio";
import { chimes, defaultAudio, speechLanguages, speechSpeeds, voiceModes, type AudioPreferences } from "./audio-preferences";

export function useAudioPreferences(initial?: Partial<AudioPreferences>) {
  const [overrides, setOverrides] = useState(initial);
  const [chime, setChime] = useStoredChoice("qw-tv-chime", defaultAudio.chime, chimes);
  const [voice, setVoice] = useStoredChoice("qw-tv-voice", defaultAudio.voice, voiceModes);
  const [speechLang, setSpeechLang] = useStoredChoice("qw-tv-speech-lang", defaultAudio.speechLang, speechLanguages);
  const [speechRate, setSpeechRate] = useStoredChoice("qw-tv-speech-rate", defaultAudio.speechRate, speechSpeeds);
  const [voiceId, setVoiceId] = useStoredChoice<string>("qw-tv-voice-id", defaultAudio.voiceId);
  const settings = {
    chime: overrides?.chime ?? chime,
    voice: overrides?.voice ?? voice,
    speechLang: overrides?.speechLang ?? speechLang,
    speechRate: overrides?.speechRate ?? speechRate,
    voiceId: overrides?.voiceId ?? voiceId,
  };
  const setters: { [Key in keyof AudioPreferences]: (value: AudioPreferences[Key]) => void } = {
    chime: setChime,
    voice: setVoice,
    speechLang: setSpeechLang,
    speechRate: setSpeechRate,
    voiceId: setVoiceId,
  };

  function change<Key extends keyof AudioPreferences>(key: Key, value: AudioPreferences[Key]) {
    setOverrides((current) => current?.[key] === undefined ? current : { ...current, [key]: undefined });
    setters[key](value);
    if (key === "voice" && value === "off") window.speechSynthesis?.cancel();
  }

  return { settings, change };
}

const chimeNames = {
  airport: "Airport Ding-Dong",
  clinic: "Soft Clinic",
  bell: "Crisp Bell",
  marimba: "Warm Marimba",
  mute: "Mute",
};

export function AudioVoiceSettings({ settings, change, displayLanguage, sound }: {
  settings: AudioPreferences;
  change: ReturnType<typeof useAudioPreferences>["change"];
  displayLanguage: Language;
  sound: ReturnType<typeof useChime>;
}) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [notice, setNotice] = useState("");
  const language = settings.speechLang === "display" ? displayLanguage : settings.speechLang;
  const voiceId = voices.some((voice) => voice.voiceURI === settings.voiceId) ? settings.voiceId : "";

  useEffect(() => {
    const synthesis = window.speechSynthesis;
    if (!synthesis) return;
    const update = () => setVoices(synthesis.getVoices());
    update();
    synthesis.addEventListener("voiceschanged", update);
    return () => synthesis.removeEventListener("voiceschanged", update);
  }, []);

  async function preview() {
    const chimeReady = settings.chime === "mute" ? true : sound.unlock();
    const canSpeak = "speechSynthesis" in window;
    if (settings.voice === "on" && canSpeak) {
      window.speechSynthesis.cancel();
      announce("A-01", language === "bn" ? "রিসেপশন" : "Reception", settings, displayLanguage);
    }
    const ready = await chimeReady;
    if (ready) sound.play(settings.chime);
    setNotice(!ready ? "Sound is unavailable on this device." : settings.voice === "on" && !canSpeak
      ? "Voice is unavailable on this device."
      : "");
  }

  return (
    <div className="audio-fields">
      <label>
        <span className="field-label">Chime sound</span>
        <select className="field" value={settings.chime} onChange={(event) => change("chime", event.currentTarget.value as AudioPreferences["chime"])}>
          {chimes.map((chime) => <option key={chime} value={chime}>{chimeNames[chime]}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-2 font-bold">
        <input type="checkbox" checked={settings.voice === "on"} onChange={(event) => change("voice", event.currentTarget.checked ? "on" : "off")} />
        Voice announcements
      </label>
      {settings.voice === "on" && (
        <>
          <div className="audio-speech-fields">
            <label>
              <span className="field-label">Speech language</span>
              <select className="field" value={settings.speechLang} onChange={(event) => change("speechLang", event.currentTarget.value as AudioPreferences["speechLang"])}>
                <option value="display">Match display</option>
                <option value="en">English</option>
                <option value="bn" lang="bn">বাংলা</option>
              </select>
            </label>
            <label>
              <span className="field-label">Speech speed</span>
              <select className="field" value={settings.speechRate} onChange={(event) => change("speechRate", event.currentTarget.value as AudioPreferences["speechRate"])}>
                {speechSpeeds.map((rate) => <option key={rate} value={rate}>{rate}x</option>)}
              </select>
            </label>
          </div>
          {voices.length > 0 && (
            <label>
              <span className="field-label">Browser voice</span>
              <select className="field" value={voiceId} onChange={(event) => change("voiceId", event.currentTarget.value)}>
                <option value="">Automatic</option>
                {voices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang})</option>
                ))}
              </select>
            </label>
          )}
        </>
      )}
      <button className="key key-sm justify-self-start" type="button" disabled={settings.chime === "mute" && settings.voice === "off"} onClick={() => void preview()}>
        Test sound
      </button>
      {notice && <p className="field-help" role="status">{notice}</p>}
    </div>
  );
}
