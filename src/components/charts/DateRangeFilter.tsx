"use client";

import { t } from "@/lib/i18n";
import type { Language } from "@/types";

export type DatePreset = "this_month" | "last_3_months" | "this_year" | "custom";

interface DateRangeFilterProps {
  lang: Language;
  preset: DatePreset;
  startDate: string;
  endDate: string;
  onPresetChange: (preset: DatePreset) => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

export function getDateRange(preset: DatePreset): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().split("T")[0];

  switch (preset) {
    case "this_month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      return { start, end };
    }
    case "last_3_months": {
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split("T")[0];
      return { start, end };
    }
    case "this_year": {
      const start = `${now.getFullYear()}-01-01`;
      return { start, end };
    }
    default:
      return { start: end, end };
  }
}

const presets: { key: DatePreset; labelKey: string }[] = [
  { key: "this_month", labelKey: "dash_this_month" },
  { key: "last_3_months", labelKey: "dash_last_3_months" },
  { key: "this_year", labelKey: "dash_this_year" },
  { key: "custom", labelKey: "dash_custom" },
];

export default function DateRangeFilter({
  lang,
  preset,
  startDate,
  endDate,
  onPresetChange,
  onStartDateChange,
  onEndDateChange,
}: DateRangeFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex rounded-xl overflow-hidden bg-white/15 backdrop-blur-sm">
        {presets.map((p) => (
          <button
            key={p.key}
            onClick={() => onPresetChange(p.key)}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              preset === p.key
                ? "bg-white text-primary-dark"
                : "text-white/80 hover:text-white hover:bg-white/10"
            }`}
          >
            <span className={lang === "ur" ? "font-urdu" : ""}>{t(p.labelKey, lang)}</span>
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <div className="flex items-center gap-2">
          <label className="text-sm text-white/60">{t("dash_from", lang)}</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="border border-white/20 bg-white/10 text-white rounded-lg px-3 py-1.5 text-sm"
          />
          <label className="text-sm text-white/60">{t("dash_to", lang)}</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="border border-white/20 bg-white/10 text-white rounded-lg px-3 py-1.5 text-sm"
          />
        </div>
      )}
    </div>
  );
}
