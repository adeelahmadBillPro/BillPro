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

export const CURRENCIES = [
  { code: "PKR", symbol: "Rs.", name: "Pakistani Rupee", locale: "en-PK" },
  { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US" },
  { code: "EUR", symbol: "€", name: "Euro", locale: "de-DE" },
  { code: "GBP", symbol: "£", name: "British Pound", locale: "en-GB" },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal", locale: "ar-SA" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham", locale: "ar-AE" },
  { code: "INR", symbol: "₹", name: "Indian Rupee", locale: "en-IN" },
] as const;

export function formatPKR(amount: number): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrency(amount: number, currencyCode: string = "PKR"): string {
  const curr = CURRENCIES.find((c) => c.code === currencyCode) || CURRENCIES[0];
  return new Intl.NumberFormat(curr.locale, {
    style: "currency",
    currency: curr.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: curr.code === "PKR" || curr.code === "INR" ? 0 : 2,
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
