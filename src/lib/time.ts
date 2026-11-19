import { formatNumber, type Language } from "./i18n";

const zone = "Asia/Dhaka";

function locale(language: Language) {
  return language === "bn" ? "bn-BD" : "en-US";
}

/** 12-hour clock with AM/PM, e.g. "8:12 PM". */
export function formatClock(date: Date, language: Language = "en") {
  return new Intl.DateTimeFormat(locale(language), {
    timeZone: zone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/** Short day/date, e.g. "Thu, 19 Nov". */
export function formatDay(date: Date, language: Language = "en") {
  return new Intl.DateTimeFormat(locale(language), {
    timeZone: zone,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

/** Never shows raw decimals: "< 1 min", "23 min". */
export function formatWait(minutes: number | null, language: Language = "en") {
  if (minutes === null || !Number.isFinite(minutes)) return "—";
  const unit = language === "bn" ? "মিনিট" : "min";
  if (minutes < 1)
    return `< ${formatNumber(1, language)} ${unit}`;
  return `${formatNumber(Math.round(minutes), language)} ${unit}`;
}

/** Default target service time per ticket, in seconds. */
export const targetSeconds = 600;

export type Pace = { ratio: number; color: string; level: "good" | "warn" | "late" };

/** Teal while on pace, amber approaching the target, rose beyond it. */
export function pace(seconds: number, target = targetSeconds): Pace {
  const ratio = target > 0 ? seconds / target : 0;
  if (ratio < 0.7) return { ratio, color: "#0D9488", level: "good" };
  if (ratio < 1) return { ratio, color: "#D97706", level: "warn" };
  return { ratio, color: "#E11D48", level: "late" };
}
