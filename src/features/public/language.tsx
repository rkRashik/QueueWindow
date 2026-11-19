"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Language } from "@/lib/i18n";
import { useStoredChoice } from "@/lib/stored";

const en = {
  language: "Language",
  choose: "Choose a counter",
  select: "Select the service you need to take a ticket.",
  join: "Take a ticket",
  open: "Open",
  paused: "Paused",
  pending: "Getting your ticket…",
  noCounters: "No counters are available",
  noCountersDetail: "Please speak with reception.",
  offline: "Reconnecting…",
  offlineDetail: "Showing the last available update.",
  loading: "Loading the queue…",
  unavailable: "We couldn’t load the queue.",
  retry: "Try again",
  missingVenue: "This queue is unavailable.",
  missingTicket: "This ticket is unavailable.",
  joinError: "Your ticket couldn’t be confirmed. Try the same counter again.",
  limited: "Too many requests. Wait a minute and try again.",
  pausedError: "This counter is paused. Please choose an open counter.",
  expired: "Online ticketing is unavailable. Please speak with reception.",
  ticket: "Your ticket",
  counter: "Counter",
  wait: "Waiting for your turn",
  people: "People ahead",
  estimate: "Estimated wait",
  minutes: "min",
  approx: "Approximate",
  progress: "Queue progress",
  called: "It’s your turn!",
  calledDetail: "Please go to your counter.",
  served: "Thank you",
  servedDetail: "Your visit at this counter is complete.",
  skipped: "Please speak with staff",
  skippedDetail: "Staff can help you with the next step.",
  sound: "Enable sound",
  mute: "Mute sound",
  audioUnavailable: "Sound is unavailable on this device.",
  track: "Scan to track your ticket on your phone.",
  receipt: "Print receipt",
  done: "Done",
  paper: "Paper width",
  resets: "This screen clears automatically after 30 seconds.",
  receiptTitle: "Your queue receipt",
  kiosk: "Reception kiosk",
  nowServing: "Now serving",
  upNext: "Up next",
  live: "Live",
  nowCalling: "Now calling",
  waitingWord: "waiting",
  noWait: "No wait",
  stepJoined: "Joined",
  stepAlmost: "Almost ready",
  stepTurn: "Your turn",
  nothingYet: "Waiting for the first call",
  queueClear: "No one waiting",
  ahead: "ahead of you",
  soundOn: "Alerts on",
  ready: "Ready for next",
  closed: "Closed",
  aboutMin: "about",
  youreNext: "You’re next",
  tapCounter: "Tap a counter to take a ticket.",
  goTo: "Go to",
  stepSelect: "Select counter",
  stepToken: "Get your token",
  takeTicket: "Take ticket",
  pausedShort: "Not taking tickets right now",
};

const bn: typeof en = {
  language: "ভাষা",
  choose: "কাউন্টার বেছে নিন",
  select: "টিকিট নিতে যে সেবাটি প্রয়োজন, সেটি নির্বাচন করুন।",
  join: "টিকিট নিন",
  open: "খোলা",
  paused: "স্থগিত",
  pending: "টিকিট তৈরি হচ্ছে…",
  noCounters: "কোনো কাউন্টার পাওয়া যাচ্ছে না",
  noCountersDetail: "রিসেপশনে কথা বলুন।",
  offline: "আবার সংযোগ হচ্ছে…",
  offlineDetail: "সর্বশেষ তথ্য দেখানো হচ্ছে।",
  loading: "সারির তথ্য লোড হচ্ছে…",
  unavailable: "সারির তথ্য লোড করা যায়নি।",
  retry: "আবার চেষ্টা করুন",
  missingVenue: "এই সারিটি পাওয়া যাচ্ছে না।",
  missingTicket: "এই টিকিটটি পাওয়া যাচ্ছে না।",
  joinError: "টিকিট নিশ্চিত করা যায়নি। একই কাউন্টারে আবার চেষ্টা করুন।",
  limited: "অনেকবার অনুরোধ করা হয়েছে। এক মিনিট পর আবার চেষ্টা করুন।",
  pausedError: "এই কাউন্টারটি স্থগিত। খোলা কোনো কাউন্টার বেছে নিন।",
  expired: "অনলাইনে টিকিট নেওয়া যাচ্ছে না। রিসেপশনে কথা বলুন।",
  ticket: "আপনার টিকিট",
  counter: "কাউন্টার",
  wait: "আপনার পালার অপেক্ষায়",
  people: "আপনার আগে অপেক্ষায়",
  estimate: "আনুমানিক অপেক্ষা",
  minutes: "মিনিট",
  approx: "আনুমানিক",
  progress: "সারির অগ্রগতি",
  called: "আপনার পালা!",
  calledDetail: "কাউন্টারে আসুন।",
  served: "ধন্যবাদ",
  servedDetail: "এই কাউন্টারে আপনার সেবা সম্পন্ন হয়েছে।",
  skipped: "কর্মীদের সঙ্গে কথা বলুন",
  skippedDetail: "পরবর্তী ধাপে কর্মীরা আপনাকে সাহায্য করতে পারবেন।",
  sound: "শব্দ চালু করুন",
  mute: "শব্দ বন্ধ করুন",
  audioUnavailable: "এই ডিভাইসে শব্দ চালু করা যাচ্ছে না।",
  track: "মোবাইলে টিকিট অনুসরণ করতে স্ক্যান করুন।",
  receipt: "রসিদ প্রিন্ট করুন",
  done: "শেষ",
  paper: "কাগজের প্রস্থ",
  resets: "৩০ সেকেন্ড পর এই স্ক্রিন নিজে থেকে পরিষ্কার হবে।",
  receiptTitle: "আপনার টিকিটের রসিদ",
  kiosk: "রিসেপশন কিয়স্ক",
  nowServing: "এখন ডাকছেন",
  upNext: "পরবর্তী",
  live: "লাইভ",
  nowCalling: "এখন ডাকা হচ্ছে",
  waitingWord: "অপেক্ষায়",
  noWait: "অপেক্ষা নেই",
  stepJoined: "যুক্ত হয়েছেন",
  stepAlmost: "প্রায় প্রস্তুত",
  stepTurn: "আপনার পালা",
  nothingYet: "প্রথম ডাকের অপেক্ষায়",
  queueClear: "কেউ অপেক্ষায় নেই",
  ahead: "আপনার আগে",
  soundOn: "অ্যালার্ট চালু",
  ready: "পরবর্তীর জন্য প্রস্তুত",
  closed: "বন্ধ",
  aboutMin: "প্রায়",
  youreNext: "এরপর আপনি",
  tapCounter: "টিকিট নিতে একটি কাউন্টারে চাপুন।",
  goTo: "যান",
  stepSelect: "কাউন্টার বাছুন",
  stepToken: "টোকেন নিন",
  takeTicket: "টোকেন নিন",
  pausedShort: "এখন টিকিট দেওয়া হচ্ছে না",
};

const words = { bn, en };
export type PublicMode = "en" | "bn" | "both";
const modes = ["en", "bn", "both"] as const;
const storageKey = "qw-visitor-language";

type Locale = {
  mode: PublicMode;
  setMode: (mode: PublicMode) => void;
};
const LocaleContext = createContext<Locale>({ mode: "en", setMode: () => {} });

export function PublicLocale({ children }: { children: ReactNode }) {
  const [mode, setMode] = useStoredChoice<PublicMode>(storageKey, "en", modes);
  return (
    <LocaleContext.Provider value={{ mode, setMode }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function usePublicLocale() {
  const { mode, setMode } = useContext(LocaleContext);
  // `language` drives numerals, aria-labels and plain strings; "both" reads English first.
  const language: Language = mode === "bn" ? "bn" : "en";
  return { mode, setMode, language, t: words[language] };
}

/** Renders one language, or both (stacked, or inline with a divider) in "Both" mode. */
export function Dual({
  en: english,
  bn: bangla,
  inline = false,
}: {
  en: ReactNode;
  bn: ReactNode;
  inline?: boolean;
}) {
  const { mode } = usePublicLocale();
  if (mode === "en") return <span lang="en">{english}</span>;
  if (mode === "bn") return <span lang="bn">{bangla}</span>;
  return (
    <span className={inline ? "dual-inline" : "dual"}>
      <span lang="en">{english}</span>
      <span lang="bn" className="dual-sub">
        {bangla}
      </span>
    </span>
  );
}

export function Tx({ k, inline }: { k: keyof typeof en; inline?: boolean }) {
  return <Dual en={en[k]} bn={bn[k]} inline={inline} />;
}

export function PublicLanguage({ className = "" }: { className?: string }) {
  const { mode, setMode, t } = usePublicLocale();
  return (
    <div className={`seg ${className}`} role="group" aria-label={t.language}>
      {(
        [
          ["en", "EN"],
          ["bn", "বাংলা"],
          ["both", "Both"],
        ] as const
      ).map(([code, label]) => (
        <button
          key={code}
          type="button"
          lang={code === "bn" ? "bn" : "en"}
          aria-pressed={code === mode}
          onClick={() => setMode(code)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
