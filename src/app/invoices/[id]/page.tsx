"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { useLanguage } from "@/lib/store";
import { useAuth } from "@/lib/hooks/useAuth";
import { getInvoice, updateInvoiceStatus } from "@/lib/supabase/database";
import { t, formatPKR } from "@/lib/i18n";
import { ArrowLeft, Printer, CheckCircle, Send } from "lucide-react";

export default function InvoiceDetailPage() {
  const { lang } = useLanguage();
  const { business } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadInvoice = useCallback(async () => {
    if (!params.id) return;
    setLoading(true);
    const { data } = await getInvoice(params.id as string);
    setInvoice(data);
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  const handleStatusChange = async (status: "sent" | "paid") => {
    if (!invoice) return;
    await updateInvoiceStatus(invoice.id, status);
    loadInvoice();
  };

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-muted">{t("common_loading", lang)}</div>
      </DashboardLayout>
    );
  }

  if (!invoice) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-muted">Invoice not found</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/invoices")} className="p-2 text-muted hover:text-gray-900 rounded-md hover:bg-gray-100">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{invoice.invoice_number}</h1>
            <StatusBadge status={invoice.status} lang={lang} />
          </div>
          <div className="flex items-center gap-2">
            {invoice.status === "draft" && (
              <button onClick={() => handleStatusChange("sent")}
                className="inline-flex items-center gap-2 border border-secondary text-secondary px-3 py-2 rounded-lg text-sm font-medium hover:bg-secondary/5">
                <Send className="w-4 h-4" /> {t("inv_send", lang)}
              </button>
            )}
            {invoice.status !== "paid" && (
              <button onClick={() => handleStatusChange("paid")}
                className="inline-flex items-center gap-2 border border-success text-success px-3 py-2 rounded-lg text-sm font-medium hover:bg-success/5">
                <CheckCircle className="w-4 h-4" /> {t("inv_mark_paid", lang)}
              </button>
            )}
            <button onClick={handlePrint}
              className="inline-flex items-center gap-2 bg-primary text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark">
              <Printer className="w-4 h-4" /> {t("inv_print", lang)}
            </button>
          </div>
        </div>

        {/* Invoice Document */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          {/* Business & Customer Info */}
          <div className="flex justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{business?.name_en}</h2>
              {business?.name_ur && <p className="font-urdu text-muted" dir="rtl">{business.name_ur}</p>}
              {business?.address_en && <p className="text-sm text-muted mt-1">{business.address_en}</p>}
              {business?.phone && <p className="text-sm text-muted">{business.phone}</p>}
            </div>
            <div className="text-right">
              <h3 className="text-lg font-bold text-primary">{invoice.invoice_number}</h3>
              <p className="text-sm text-muted mt-1">{t("inv_date", lang)}: {invoice.issue_date}</p>
              <p className="text-sm text-muted">{t("inv_due_date", lang)}: {invoice.due_date}</p>
            </div>
          </div>

          {/* Bill To */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-muted mb-1">{lang === "ur" ? "بنام:" : "Bill To:"}</p>
            <p className="font-semibold text-gray-900">{invoice.customer?.name_en}</p>
            {invoice.customer?.name_ur && <p className="font-urdu text-sm text-muted" dir="rtl">{invoice.customer.name_ur}</p>}
            {invoice.customer?.phone && <p className="text-sm text-muted">{invoice.customer.phone}</p>}
          </div>

          {/* Items Table */}
          <table className="w-full mb-6">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-start py-3 text-sm font-medium text-muted">#</th>
                <th className="text-start py-3 text-sm font-medium text-muted">{t("inv_description", lang)}</th>
                <th className="text-center py-3 text-sm font-medium text-muted">{t("inv_quantity", lang)}</th>
                <th className="text-right py-3 text-sm font-medium text-muted">{t("inv_unit_price", lang)}</th>
                <th className="text-right py-3 text-sm font-medium text-muted">{t("inv_item_total", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.items || []).map((item: any, idx: number) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-3 text-sm text-muted">{idx + 1}</td>
                  <td className="py-3 text-sm text-gray-900">
                    {item.description_en}
                    {item.description_ur && <span className="text-muted font-urdu mr-2" dir="rtl"> / {item.description_ur}</span>}
                  </td>
                  <td className="py-3 text-sm text-center text-gray-900">{item.quantity}</td>
                  <td className="py-3 text-sm text-right text-gray-900">{formatPKR(Number(item.unit_price))}</td>
                  <td className="py-3 text-sm text-right font-medium text-gray-900">{formatPKR(Number(item.total))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted">{t("inv_subtotal", lang)}</span>
                <span>{formatPKR(Number(invoice.subtotal))}</span>
              </div>
              {Number(invoice.tax_amount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">{t("inv_tax", lang)} ({invoice.tax_percentage}%)</span>
                  <span>{formatPKR(Number(invoice.tax_amount))}</span>
                </div>
              )}
              {Number(invoice.discount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">{t("inv_discount", lang)}</span>
                  <span>-{formatPKR(Number(invoice.discount))}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t-2 border-gray-200 pt-2">
                <span>{t("inv_total", lang)}</span>
                <span className="text-primary">{formatPKR(Number(invoice.total))}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {(invoice.notes_en || invoice.notes_ur) && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm font-medium text-muted mb-1">{t("inv_notes", lang)}</p>
              {invoice.notes_en && <p className="text-sm text-gray-700">{invoice.notes_en}</p>}
              {invoice.notes_ur && <p className="text-sm text-gray-700 font-urdu mt-1" dir="rtl">{invoice.notes_ur}</p>}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
