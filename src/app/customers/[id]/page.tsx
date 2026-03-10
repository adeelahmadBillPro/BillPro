"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { useLanguage } from "@/lib/store";
import { useAuth } from "@/lib/hooks/useAuth";
import { getCustomer, getCustomerLedger } from "@/lib/supabase/database";
import { t, formatPKR, formatDate } from "@/lib/i18n";
import {
  ArrowLeft,
  FileText,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  Download,
  FileDown,
  Loader2,
} from "lucide-react";
import type { Customer } from "@/types";

type LedgerEntry = {
  id: string;
  date: string;
  type: "invoice" | "payment";
  description: string;
  debit: number;
  credit: number;
  ref: string;
  status?: string;
};

export default function CustomerLedgerPage() {
  const { lang } = useLanguage();
  const { business } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  const customerId = params.id as string;

  const loadData = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    const [custRes, ledger] = await Promise.all([
      getCustomer(customerId),
      getCustomerLedger(customerId),
    ]);
    setCustomer(custRes.data);
    setEntries(ledger);
    setLoading(false);
  }, [customerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate running balance
  let runningBalance = 0;
  const entriesWithBalance = entries.map((e) => {
    runningBalance += e.debit - e.credit;
    return { ...e, balance: runningBalance };
  });

  const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
  const finalBalance = totalDebit - totalCredit;

  const handleExportExcel = async () => {
    const { exportToExcel } = await import("@/lib/reports/excel");
    exportToExcel(
      entriesWithBalance.map((e) => ({
        date: e.date,
        description: e.description,
        ref: e.ref,
        debit: e.debit || "",
        credit: e.credit || "",
        balance: e.balance,
      })),
      [
        { key: "date", header: "Date", width: 12 },
        { key: "description", header: "Description", width: 30 },
        { key: "ref", header: "Reference", width: 18 },
        { key: "debit", header: "Debit (PKR)", width: 15 },
        { key: "credit", header: "Credit (PKR)", width: 15 },
        { key: "balance", header: "Balance (PKR)", width: 15 },
      ],
      `Ledger-${customer?.name_en || "Customer"}`,
      "Ledger"
    );
  };

  const handleDownloadPDF = async () => {
    if (!customer || !business) return;
    setPdfLoading(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { default: StatementPDF } = await import("@/lib/pdf/StatementPDF");
      const blob = await pdf(
        <StatementPDF
          customer={customer}
          entries={entriesWithBalance.map((e) => ({
            date: e.date,
            description: e.description,
            ref: e.ref,
            debit: e.debit,
            credit: e.credit,
            balance: e.balance,
          }))}
          totalDebit={totalDebit}
          totalCredit={totalCredit}
          finalBalance={finalBalance}
          business={business}
          lang={lang}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Statement-${customer.name_en || "Customer"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation failed:", err);
    }
    setPdfLoading(false);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-muted">{t("common_loading", lang)}</div>
      </DashboardLayout>
    );
  }

  if (!customer) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-muted">Customer not found</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/customers")}
              className="p-2 text-muted hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{customer.name_en}</h1>
              {customer.name_ur && (
                <p className="text-sm font-urdu text-muted" dir="rtl">{customer.name_ur}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={pdfLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-60"
            >
              {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              {t("ledger_download_pdf", lang)}
            </button>
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              {t("ledger_export", lang)}
            </button>
          </div>
        </div>

        {/* Customer Info + Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Customer Details */}
          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              {t("ledger_details", lang)}
            </h3>
            <div className="space-y-2 text-sm">
              {customer.phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-3.5 h-3.5 text-muted" />
                  <span>{customer.phone}</span>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-3.5 h-3.5 text-muted" />
                  <span>{customer.email}</span>
                </div>
              )}
              {(customer.city_en || customer.address_en) && (
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-3.5 h-3.5 text-muted" />
                  <span>{customer.city_en}{customer.address_en ? `, ${customer.address_en}` : ""}</span>
                </div>
              )}
            </div>
          </div>

          {/* Total Invoiced */}
          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-primary" />
              <p className={`text-sm text-muted ${lang === "ur" ? "font-urdu" : ""}`}>
                {t("ledger_total_invoiced", lang)}
              </p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatPKR(totalDebit)}</p>
            <p className="text-xs text-muted mt-1">
              {entries.filter((e) => e.type === "invoice").length} {t("ledger_invoices", lang)}
            </p>
          </div>

          {/* Total Paid */}
          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4 text-success" />
              <p className={`text-sm text-muted ${lang === "ur" ? "font-urdu" : ""}`}>
                {t("ledger_total_paid", lang)}
              </p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatPKR(totalCredit)}</p>
            <p className="text-xs text-muted mt-1">
              {entries.filter((e) => e.type === "payment").length} {t("ledger_payments", lang)}
            </p>
          </div>
        </div>

        {/* Balance Card */}
        <div className={`rounded-2xl border shadow-sm p-5 ${
          finalBalance > 0 ? "bg-red-50 border-red-200/60" : finalBalance < 0 ? "bg-green-50 border-green-200/60" : "bg-gray-50 border-gray-200/60"
        }`}>
          <div className="flex items-center justify-between">
            <p className={`text-sm font-medium ${lang === "ur" ? "font-urdu" : ""} ${
              finalBalance > 0 ? "text-red-700" : finalBalance < 0 ? "text-green-700" : "text-gray-700"
            }`}>
              {t("ledger_balance", lang)}
            </p>
            <p className={`text-2xl font-bold ${
              finalBalance > 0 ? "text-red-700" : finalBalance < 0 ? "text-green-700" : "text-gray-900"
            }`}>
              {formatPKR(Math.abs(finalBalance))}
              {finalBalance > 0 && (
                <span className="text-sm font-medium ml-2">
                  {lang === "ur" ? "(واجب الادا)" : "(Due)"}
                </span>
              )}
              {finalBalance < 0 && (
                <span className="text-sm font-medium ml-2">
                  {lang === "ur" ? "(زیادہ ادائیگی)" : "(Overpaid)"}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-start p-4 text-sm font-medium text-muted">{t("ledger_date", lang)}</th>
                <th className="text-start p-4 text-sm font-medium text-muted">{t("ledger_description", lang)}</th>
                <th className="text-start p-4 text-sm font-medium text-muted">{t("ledger_ref", lang)}</th>
                <th className="text-end p-4 text-sm font-medium text-muted">{t("ledger_debit", lang)}</th>
                <th className="text-end p-4 text-sm font-medium text-muted">{t("ledger_credit", lang)}</th>
                <th className="text-end p-4 text-sm font-medium text-muted">{t("ledger_balance", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {entriesWithBalance.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted text-sm">
                    {t("common_no_data", lang)}
                  </td>
                </tr>
              ) : (
                entriesWithBalance.map((entry) => (
                  <tr key={`${entry.type}-${entry.id}`} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm text-muted">{formatDate(entry.date, lang)}</td>
                    <td className="p-4 text-sm">
                      <div className="flex items-center gap-2">
                        {entry.type === "invoice" ? (
                          <span className="inline-flex items-center gap-1 text-primary">
                            <FileText className="w-3.5 h-3.5" />
                            <Link href={`/invoices/${entry.id}`} className="font-medium hover:underline">
                              {entry.description}
                            </Link>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-green-600">
                            <CreditCard className="w-3.5 h-3.5" />
                            <span className="font-medium">{entry.description}</span>
                          </span>
                        )}
                        {entry.status && entry.status !== "paid" && (
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            entry.status === "overdue" ? "bg-red-100 text-red-700" :
                            entry.status === "sent" ? "bg-blue-100 text-blue-700" :
                            "bg-gray-100 text-gray-600"
                          }`}>
                            {entry.status}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-muted">{entry.ref}</td>
                    <td className="p-4 text-sm text-end font-medium">
                      {entry.debit > 0 ? (
                        <span className="text-red-600">{formatPKR(entry.debit)}</span>
                      ) : "—"}
                    </td>
                    <td className="p-4 text-sm text-end font-medium">
                      {entry.credit > 0 ? (
                        <span className="text-green-600">{formatPKR(entry.credit)}</span>
                      ) : "—"}
                    </td>
                    <td className={`p-4 text-sm text-end font-semibold ${
                      entry.balance > 0 ? "text-red-600" : entry.balance < 0 ? "text-green-600" : "text-gray-900"
                    }`}>
                      {formatPKR(Math.abs(entry.balance))}
                      {entry.balance < 0 && <span className="text-xs ml-1">CR</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {entriesWithBalance.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={3} className="p-4 text-sm font-semibold text-gray-900">
                    {t("ledger_totals", lang)}
                  </td>
                  <td className="p-4 text-sm text-end font-bold text-red-600">
                    {formatPKR(totalDebit)}
                  </td>
                  <td className="p-4 text-sm text-end font-bold text-green-600">
                    {formatPKR(totalCredit)}
                  </td>
                  <td className={`p-4 text-sm text-end font-bold ${
                    finalBalance > 0 ? "text-red-600" : finalBalance < 0 ? "text-green-600" : "text-gray-900"
                  }`}>
                    {formatPKR(Math.abs(finalBalance))}
                    {finalBalance < 0 && <span className="text-xs ml-1">CR</span>}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
