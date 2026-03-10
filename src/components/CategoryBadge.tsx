"use client";

import type { Language } from "@/types";
import { t } from "@/lib/i18n";

interface CategoryBadgeProps {
  nameEn: string;
  nameUr: string;
  color: string;
  lang: Language;
}

export default function CategoryBadge({ nameEn, nameUr, color, lang }: CategoryBadgeProps) {
  const name = lang === "ur" ? nameUr || nameEn : nameEn;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${lang === "ur" ? "font-urdu" : ""}`}
      style={{ backgroundColor: `${color}15`, color }}
    >
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      {name || t("exp_no_category", lang)}
    </span>
  );
}
