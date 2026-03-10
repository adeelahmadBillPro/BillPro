"use client";

import { t, formatPKR } from "@/lib/i18n";
import type { Language } from "@/types";

interface TopCustomer {
  customer_id: string;
  name_en: string;
  name_ur: string;
  total: number;
}

interface TopCustomersCardProps {
  customers: TopCustomer[];
  lang: Language;
}

export default function TopCustomersCard({ customers, lang }: TopCustomersCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h3 className={`text-lg font-semibold text-gray-900 mb-4 ${lang === "ur" ? "font-urdu" : ""}`}>
        {t("dash_top_customers", lang)}
      </h3>
      {customers.length === 0 ? (
        <p className="text-muted text-sm">{t("common_no_data", lang)}</p>
      ) : (
        <div className="space-y-3">
          {customers.map((cust, i) => (
            <div key={cust.customer_id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className={`text-sm font-medium text-gray-900 ${lang === "ur" ? "font-urdu" : ""}`}>
                  {lang === "ur" ? cust.name_ur || cust.name_en : cust.name_en}
                </span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {formatPKR(cust.total)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
