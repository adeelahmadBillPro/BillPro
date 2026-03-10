"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { useLanguage } from "@/lib/store";
import { useAuth } from "@/lib/hooks/useAuth";
import { getCustomers } from "@/lib/supabase/database";
import { t, formatPKR } from "@/lib/i18n";
import { generateReport, type ReportType, type ReportResult } from "@/lib/reports/generators";
import { exportToExcel } from "@/lib/reports/excel";
import { ArrowLeft, Download, Printer } from "lucide-react";
import type { Customer } from "@/types";

export default function ReportViewerPage() {
  const params = useParams();
  const reportType = params.type as ReportType;
  const { lang } = useLanguage();
  const { business, loading: authLoading } = useAuth();

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const today = now.toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [customerId, setCustomerId] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [report, setReport] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);

  const needsCustomer = reportType === "customer-statement";

  // Load customers for customer statement
  useEffect(() => {
    if (!business || !needsCustomer) return;
    getCustomers(business.id).then(({ data }) => {
      setCustomers(data || []);
      if (data && data.length > 0) setCustomerId(data[0].id);
    });
  }, [business, needsCustomer]);

  async function handleGenerate() {
    if (!business) return;
    if (needsCustomer && !customerId) return;
    setLoading(true);
    const result = await generateReport(
      reportType,
      business.id,
      startDate,
      endDate,
      lang,
      customerId || undefined
    );
    setReport(result);
    setLoading(false);
  }

  function handleExcelExport() {
    if (!report) return;
    const fileName = `${reportType}_${startDate}_${endDate}`;
    exportToExcel(report.rows, report.columns, fileName, report.title);
  }

  function handlePrint() {
    window.print();
  }

  // Report title mapping
  const titleKeys: Record<string, string> = {
    "invoice-register": "rpt_invoice_register",
    "payment-register": "rpt_payment_register",
    "customer-statement": "rpt_customer_statement",
    "monthly-revenue": "rpt_monthly_revenue",
    "expense-report": "rpt_expense_report",
    "profit-loss": "rpt_profit_loss",
  };

  // Determine which columns show PKR values for display formatting
  const pkrColumns = new Set(["amount", "paid", "pending", "total", "revenue", "expenses", "profit", "debit", "credit", "balance"]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/reports"
            className="p-2 text-muted hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className={`text-2xl font-bold text-gray-900 ${lang === "ur" ? "font-urdu" : ""}`}>
            {t(titleKeys[reportType] || "rpt_title", lang)}
          </h1>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("dash_from", lang)}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("dash_to", lang)}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            {needsCustomer && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("rpt_select_customer", lang)}
                </label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[200px]"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {lang === "ur" ? c.name_ur || c.name_en : c.name_en}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={handleGenerate}
              disabled={loading || authLoading || !business}
              className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {loading ? t("common_loading", lang) : t("rpt_generate", lang)}
            </button>
          </div>
        </div>

        {/* Export buttons */}
        {report && report.rows.length > 0 && (
          <div className="flex gap-3 print:hidden">
            <button
              onClick={handleExcelExport}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              {t("rpt_export_excel", lang)}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Printer className="w-4 h-4" />
              {t("rpt_export_pdf", lang)}
            </button>
          </div>
        )}

        {/* Report Table */}
        {report && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto" id="report-table">
            {report.rows.length === 0 ? (
              <div className="p-8 text-center text-muted text-sm">
                {t("rpt_no_data", lang)}
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    {report.columns.map((col) => (
                      <th
                        key={col.key}
                        className={`text-start p-4 text-sm font-medium text-muted ${
                          pkrColumns.has(col.key) ? "text-end" : ""
                        }`}
                      >
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      {report.columns.map((col) => {
                        const isPKR = pkrColumns.has(col.key);
                        const displayValue = isPKR && row[`${col.key}_display`]
                          ? row[`${col.key}_display`]
                          : isPKR && typeof row[col.key] === "number"
                          ? formatPKR(row[col.key])
                          : row[col.key];

                        return (
                          <td
                            key={col.key}
                            className={`p-4 text-sm ${
                              isPKR
                                ? "text-end font-semibold text-gray-900"
                                : "text-gray-700"
                            }`}
                          >
                            {displayValue}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                {/* Totals row for PKR columns */}
                <tfoot>
                  <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                    {report.columns.map((col, ci) => {
                      if (ci === 0) {
                        return (
                          <td key={col.key} className="p-4 text-sm font-bold text-gray-900">
                            Total
                          </td>
                        );
                      }
                      if (pkrColumns.has(col.key)) {
                        const total = report.rows.reduce(
                          (sum, row) => sum + (typeof row[col.key] === "number" ? row[col.key] : 0),
                          0
                        );
                        return (
                          <td key={col.key} className="p-4 text-sm text-end font-bold text-gray-900">
                            {formatPKR(total)}
                          </td>
                        );
                      }
                      return <td key={col.key} className="p-4" />;
                    })}
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
