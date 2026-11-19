"use client";

import { motion } from "framer-motion";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { dictionary, type Language } from "@/lib/i18n";

const key = "qw-language";
let temporaryLanguage: Language = "en";

function subscribe(change: () => void) {
  window.addEventListener("storage", change);
  window.addEventListener(key, change);
  return () => {
    window.removeEventListener("storage", change);
    window.removeEventListener(key, change);
  };
}

function current(): Language {
  try {
    return localStorage.getItem(key) === "bn" ? "bn" : "en";
  } catch {
    return temporaryLanguage;
  }
}

function select(language: Language) {
  temporaryLanguage = language;
  try {
    localStorage.setItem(key, language);
  } catch {
    /* Keep the in-memory preference. */
  }
  window.dispatchEvent(new Event(key));
}

const Locale = createContext<Language>("en");

export function LocaleProvider({ children }: { children: ReactNode }) {
  const language = useSyncExternalStore<Language>(
    subscribe,
    current,
    () => "en",
  );
  useEffect(() => {
    const original = document.documentElement.lang;
    document.documentElement.lang = language;
    return () => {
      document.documentElement.lang = original;
    };
  }, [language]);
  return <Locale.Provider value={language}>{children}</Locale.Provider>;
}

export function useLocale() {
  const language = useContext(Locale);
  return { language, t: dictionary[language] };
}

export function LanguageSwitch() {
  const { language, t } = useLocale();
  const pill = useId();
  return (
    <div
      role="group"
      aria-label={t.language}
      className="inline-flex shrink-0 gap-0.5 rounded-full border border-line bg-slate-100 p-0.5"
    >
      {(
        [
          ["en", "EN"],
          ["bn", "বাংলা"],
        ] as const
      ).map(([code, label]) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-pressed={language === code}
          className={`relative min-h-8 rounded-full px-2.5 text-xs font-extrabold ${language === code ? "text-ink" : "text-muted hover:text-ink"}`}
          onClick={() => select(code)}
        >
          {language === code && (
            <motion.span
              layoutId={pill}
              className="absolute inset-0 rounded-full bg-white shadow-[0_1px_3px_rgba(15,23,42,0.15)]"
              transition={{ type: "spring", stiffness: 500, damping: 36 }}
            />
          )}
          <span className="relative">{label}</span>
        </button>
      ))}
    </div>
  );
}
