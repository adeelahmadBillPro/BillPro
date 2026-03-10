"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { t, formatPKR } from "@/lib/i18n";
import type { Language } from "@/types";

interface OverdueInvoice {
  id: string;
  invoice_number: string;
  total: number;
  due_date: string;
  customer: { name_en: string; name_ur: string } | null;
}

interface OverdueAlertsProps {
  invoices: OverdueInvoice[];
  lang: Language;
}

function daysOverdue(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();
  return Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

export default function OverdueAlerts({ invoices, lang }: OverdueAlertsProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-danger" />
        <h3 className={`text-lg font-semibold text-gray-900 ${lang === "ur" ? "font-urdu" : ""}`}>
          {t("dash_overdue_alerts", lang)}
        </h3>
      </div>
      {invoices.length === 0 ? (
        <p className="text-muted text-sm">{t("dash_no_overdue", lang)}</p>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => {
            const days = daysOverdue(inv.due_date);
            return (
              <Link
                key={inv.id}
                href={`/invoices/${inv.id}`}
                className="flex items-center justify-between p-3 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{inv.invoice_number}</p>
                  <p className={`text-xs text-muted ${lang === "ur" ? "font-urdu" : ""}`}>
                    {lang === "ur"
                      ? inv.customer?.name_ur || inv.customer?.name_en || "—"
                      : inv.customer?.name_en || "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-danger">{formatPKR(Number(inv.total))}</p>
                  <p className="text-xs text-danger">
                    {days} {t("dash_days_overdue", lang)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
