"use client";

import { useState, useEffect, useCallback } from "react";
import type { Language } from "@/types";

const LANG_KEY = "billpro_lang";

export function useLanguage() {
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    const saved = localStorage.getItem(LANG_KEY) as Language | null;
    if (saved === "en" || saved === "ur") {
      setLangState(saved);
    }
  }, []);

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem(LANG_KEY, newLang);
    document.documentElement.dir = newLang === "ur" ? "rtl" : "ltr";
    document.documentElement.lang = newLang;
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === "en" ? "ur" : "en");
  }, [lang, setLang]);

  return { lang, setLang, toggleLang };
}
