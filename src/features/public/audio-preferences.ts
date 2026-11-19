export const chimes = ["airport", "clinic", "bell", "marimba", "mute"] as const;
export const speechLanguages = ["display", "en", "bn"] as const;
export const speechSpeeds = ["0.85", "1.0", "1.15"] as const;
export const voiceModes = ["off", "on"] as const;

export type Chime = (typeof chimes)[number];
type AudioSearch = Record<string, string | string[] | undefined>;

export type AudioPreferences = {
  chime: Chime;
  voice: (typeof voiceModes)[number];
  speechLang: (typeof speechLanguages)[number];
  speechRate: (typeof speechSpeeds)[number];
  voiceId: string;
};

export const defaultAudio: AudioPreferences = {
  chime: "airport",
  voice: "off",
  speechLang: "display",
  speechRate: "1.0",
  voiceId: "",
};

export function parseAudioPreferences(params: AudioSearch): Partial<AudioPreferences> {
  return {
    chime: chimes.find((value) => value === params.chime),
    voice: voiceModes.find((value) => value === params.voice),
    speechLang: speechLanguages.find((value) => value === params.speechLang),
    speechRate: speechSpeeds.find((value) => value === params.speechRate),
    voiceId: typeof params.voiceId === "string" && params.voiceId.length <= 512 ? params.voiceId : undefined,
  };
}
