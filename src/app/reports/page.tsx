"use client";

import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { useLanguage } from "@/lib/store";
import { t } from "@/lib/i18n";
import {
  FileText,
  CreditCard,
  Users,
  TrendingUp,
  Wallet,
  BarChart3,
} from "lucide-react";

const REPORTS = [
  {
    type: "invoice-register",
    titleKey: "rpt_invoice_register",
    descKey: "rpt_invoice_register_desc",
    icon: FileText,
    color: "#3b82f6",
  },
  {
    type: "payment-register",
    titleKey: "rpt_payment_register",
    descKey: "rpt_payment_register_desc",
    icon: CreditCard,
    color: "#10b981",
  },
  {
    type: "customer-statement",
    titleKey: "rpt_customer_statement",
    descKey: "rpt_customer_statement_desc",
    icon: Users,
    color: "#8b5cf6",
  },
  {
    type: "monthly-revenue",
    titleKey: "rpt_monthly_revenue",
    descKey: "rpt_monthly_revenue_desc",
    icon: TrendingUp,
    color: "#f59e0b",
  },
  {
    type: "expense-report",
    titleKey: "rpt_expense_report",
    descKey: "rpt_expense_report_desc",
    icon: Wallet,
    color: "#ef4444",
  },
  {
    type: "profit-loss",
    titleKey: "rpt_profit_loss",
    descKey: "rpt_profit_loss_desc",
    icon: BarChart3,
    color: "#0f766e",
  },
];

export default function ReportsPage() {
  const { lang } = useLanguage();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className={`text-2xl font-bold text-gray-900 ${lang === "ur" ? "font-urdu" : ""}`}>
          {t("rpt_title", lang)}
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {REPORTS.map((report) => (
            <Link
              key={report.type}
              href={`/reports/${report.type}`}
              className="group bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md hover:border-gray-300 transition-all"
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${report.color}15` }}
                >
                  <report.icon className="w-6 h-6" style={{ color: report.color }} />
                </div>
                <div>
                  <h3 className={`font-semibold text-gray-900 group-hover:text-primary transition-colors ${lang === "ur" ? "font-urdu" : ""}`}>
                    {t(report.titleKey, lang)}
                  </h3>
                  <p className={`text-sm text-muted mt-1 ${lang === "ur" ? "font-urdu" : ""}`}>
                    {t(report.descKey, lang)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
