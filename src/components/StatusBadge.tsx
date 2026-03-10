"use client";

import type { InvoiceStatus, Language } from "@/types";
import { t } from "@/lib/i18n";

interface StatusBadgeProps {
  status: InvoiceStatus;
  lang: Language;
}

const statusStyles: Record<InvoiceStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-orange-100 text-orange-700",
};

export default function StatusBadge({ status, lang }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status]}`}
    >
      {t(`status_${status}`, lang)}
    </span>
  );
}
