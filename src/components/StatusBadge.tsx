"use client";

import type { InvoiceStatus, Language } from "@/types";
import { t } from "@/lib/i18n";

interface StatusBadgeProps {
  status: InvoiceStatus;
  lang: Language;
}

const statusStyles: Record<InvoiceStatus, string> = {
  draft: "bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600",
  sent: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30",
  paid: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30",
  overdue: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30",
  cancelled: "bg-orange-50 text-orange-600 border border-orange-200 dark:bg-orange-500/15 dark:text-orange-400 dark:border-orange-500/30",
};

const statusDots: Record<InvoiceStatus, string> = {
  draft: "bg-gray-400 dark:bg-gray-500",
  sent: "bg-blue-500 dark:bg-blue-400",
  paid: "bg-emerald-500 dark:bg-emerald-400",
  overdue: "bg-red-500 dark:bg-red-400",
  cancelled: "bg-orange-500 dark:bg-orange-400",
};

export default function StatusBadge({ status, lang }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${statusStyles[status]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${statusDots[status]}`} />
      {t(`status_${status}`, lang)}
    </span>
  );
}
