import en from "@/locales/en";
import ur from "@/locales/ur";
import type { Language } from "@/types";

const translations = { en, ur };

export function t(key: string, lang: Language = "en"): string {
  const dict = translations[lang];
  return (dict as Record<string, string>)[key] ?? key;
}

export function getDirection(lang: Language): "ltr" | "rtl" {
  return lang === "ur" ? "rtl" : "ltr";
}

export function formatPKR(amount: number): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string, lang: Language = "en"): string {
  const locale = lang === "ur" ? "ur-PK" : "en-PK";
  return new Date(date).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
