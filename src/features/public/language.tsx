"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Language } from "@/lib/i18n";

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
};

const words = { bn, en };
const key = "qw-visitor-language";
const Locale = createContext<Language>("bn");
let fallback: Language = "bn";

function subscribe(change: () => void) {
  window.addEventListener(key, change);
  window.addEventListener("storage", change);
  return () => {
    window.removeEventListener(key, change);
    window.removeEventListener("storage", change);
  };
}

function read(): Language {
  try {
    return localStorage.getItem(key) === "en" ? "en" : "bn";
  } catch {
    return fallback;
  }
}

function choose(language: Language) {
  fallback = language;
  try {
    localStorage.setItem(key, language);
  } catch {
    /* Continue with the current session. */
  }
  window.dispatchEvent(new Event(key));
}

export function PublicLocale({ children }: { children: ReactNode }) {
  const language = useSyncExternalStore<Language>(subscribe, read, () => "bn");
  return <Locale.Provider value={language}>{children}</Locale.Provider>;
}

export function usePublicLocale() {
  const language = useContext(Locale);
  return { language, t: words[language] };
}

export function PublicLanguage() {
  const { language, t } = usePublicLocale();
  return (
    <div className="visitor-language" role="group" aria-label={t.language}>
      {(
        [
          ["bn", "বাংলা"],
          ["en", "EN"],
        ] as const
      ).map(([code, label]) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-pressed={code === language}
          onClick={() => choose(code)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
