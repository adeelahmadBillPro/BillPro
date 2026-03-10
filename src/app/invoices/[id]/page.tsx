"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { useLanguage } from "@/lib/store";
import { useAuth } from "@/lib/hooks/useAuth";
import { getInvoice, updateInvoiceStatus, logActivity, getActivityLog } from "@/lib/supabase/database";
import { t, formatPKR } from "@/lib/i18n";
import { ArrowLeft, Printer, CheckCircle, Send, Download, MessageCircle, Loader2, Bell, Edit2, Copy, Mail, Clock } from "lucide-react";
import type { ActivityLog } from "@/types";
import QRCode from "@/components/QRCode";

export default function InvoiceDetailPage() {
  const { lang } = useLanguage();
  const { user, business } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<ActivityLog[]>([]);

  const loadInvoice = useCallback(async () => {
    if (!params.id) return;
    setLoading(true);
    const { data } = await getInvoice(params.id as string);
    setInvoice(data);
    setLoading(false);
    // Load audit trail for this invoice
    if (business) {
      const { data: logs } = await getActivityLog(business.id, 200);
      setHistory((logs || []).filter((l) => l.entity_id === params.id));
    }
  }, [params.id, business]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  const handleStatusChange = async (status: "sent" | "paid") => {
    if (!invoice) return;
    await updateInvoiceStatus(invoice.id, status);
    if (user && business) await logActivity(business.id, user.id, status === "paid" ? "marked_paid" : "sent", "invoice", invoice.invoice_number, invoice.id);
    loadInvoice();
  };

  const [pdfLoading, setPdfLoading] = useState(false);

  const handlePrint = () => window.print();

  const handleEmailInvoice = () => {
    if (!invoice || !business) return;
    const to = invoice.customer?.email || "";
    const total = Number(invoice.total).toLocaleString("en-PK");
    const subject = encodeURIComponent(`Invoice ${invoice.invoice_number} from ${business.name_en}`);
    const items = (invoice.items || []).map((i: any, idx: number) =>
      `${idx + 1}. ${i.description_en} — Qty: ${i.quantity} × Rs ${Number(i.unit_price).toLocaleString()} = Rs ${Number(i.total).toLocaleString()}`
    ).join("\n");
    const body = encodeURIComponent(
      `Dear ${invoice.customer?.name_en || "Customer"},\n\nPlease find the details for invoice ${invoice.invoice_number}:\n\nDate: ${invoice.issue_date}\nDue Date: ${invoice.due_date}\n\n${items}\n\nSubtotal: Rs ${Number(invoice.subtotal).toLocaleString()}\n${Number(invoice.tax_amount) > 0 ? `Tax (${invoice.tax_percentage}%): Rs ${Number(invoice.tax_amount).toLocaleString()}\n` : ""}${Number(invoice.discount) > 0 ? `Discount: -Rs ${Number(invoice.discount).toLocaleString()}\n` : ""}Total: Rs ${total}\n\nPlease process payment at your earliest convenience.\n\nThank you,\n${business.name_en}\n${business.phone || ""}`
    );
    window.open(`mailto:${to}?subject=${subject}&body=${body}`, "_self");
  };

  const handleSendReminder = () => {
    if (!invoice?.customer?.phone) return;
    const phone = invoice.customer.phone.replace(/[^0-9]/g, "");
    const intlPhone = phone.startsWith("0") ? "92" + phone.slice(1) : phone;
    const total = Number(invoice.total).toLocaleString("en-PK");
    const msg = lang === "ur"
      ? `محترم ${invoice.customer.name_ur || invoice.customer.name_en},\n\nیہ ادائیگی کی یاد دہانی ہے۔ انوائس ${invoice.invoice_number} کی رقم Rs ${total} واجب الادا ہے۔ واجب الادا تاریخ: ${invoice.due_date}\n\nبراہ کرم جلد از جلد ادائیگی کریں۔\nشکریہ — ${business?.name_ur || business?.name_en || "BillPro"}`
      : `Dear ${invoice.customer.name_en},\n\nThis is a friendly reminder that invoice ${invoice.invoice_number} for Rs ${total} is pending. Due date: ${invoice.due_date}\n\nPlease process the payment at your earliest convenience.\nThank you — ${business?.name_en || "BillPro"}`;
    window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleDownloadPDF = async () => {
    if (!invoice || !business) return;
    setPdfLoading(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { default: InvoicePDF } = await import("@/lib/pdf/InvoicePDF");
      const blob = await pdf(<InvoicePDF invoice={invoice} business={business} lang={lang} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice.invoice_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation failed:", err);
    }
    setPdfLoading(false);
  };

  const handleShareWhatsApp = async () => {
    if (!invoice || !business) return;
    setPdfLoading(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { default: InvoicePDF } = await import("@/lib/pdf/InvoicePDF");
      const blob = await pdf(<InvoicePDF invoice={invoice} business={business} lang={lang} />).toBlob();
      const file = new File([blob], `${invoice.invoice_number}.pdf`, { type: "application/pdf" });

      // Try native share (works on mobile)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `Invoice ${invoice.invoice_number}`,
          text: `Invoice ${invoice.invoice_number} from ${business.name_en} — Total: Rs ${Number(invoice.total).toLocaleString("en-PK")}`,
          files: [file],
        });
      } else {
        // Fallback: download PDF + open WhatsApp with text
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${invoice.invoice_number}.pdf`;
        a.click();
        URL.revokeObjectURL(url);

        const msg = `Invoice ${invoice.invoice_number} from ${business.name_en}\nTotal: Rs ${Number(invoice.total).toLocaleString("en-PK")}\n\nPDF attached separately.`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
      }
    } catch (err) {
      console.error("Share failed:", err);
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/invoices")} className="p-2 text-muted hover:text-gray-900 rounded-md hover:bg-gray-100">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{invoice.invoice_number}</h1>
            <StatusBadge status={invoice.status} lang={lang} />
          </div>
          <div className="flex items-center gap-2 ml-10 sm:ml-0 flex-wrap">
            {invoice.status !== "paid" && (
              <button onClick={() => router.push(`/invoices/${invoice.id}/edit`)}
                className="inline-flex items-center gap-2 border border-primary text-primary px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/5">
                <Edit2 className="w-4 h-4" /> <span className="hidden sm:inline">{t("common_edit", lang)}</span>
              </button>
            )}
            <button onClick={() => router.push(`/invoices/new?duplicate=${invoice.id}`)}
              className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">
              <Copy className="w-4 h-4" /> <span className="hidden sm:inline">{t("inv_duplicate", lang)}</span>
            </button>
            {invoice.status === "draft" && (
              <button onClick={() => handleStatusChange("sent")}
                className="inline-flex items-center gap-2 border border-secondary text-secondary px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-secondary/5">
                <Send className="w-4 h-4" /> <span className="hidden sm:inline">{t("inv_send", lang)}</span>
              </button>
            )}
            {invoice.status !== "paid" && (
              <button onClick={() => handleStatusChange("paid")}
                className="inline-flex items-center gap-2 border border-success text-success px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-success/5">
                <CheckCircle className="w-4 h-4" /> <span className="hidden sm:inline">{t("inv_mark_paid", lang)}</span>
              </button>
            )}
            <button onClick={handlePrint}
              className="inline-flex items-center gap-2 bg-primary text-white px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-dark">
              <Printer className="w-4 h-4" /> <span className="hidden sm:inline">{t("inv_print", lang)}</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={pdfLoading}
              className="inline-flex items-center gap-2 bg-gray-800 text-white px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-900 disabled:opacity-50"
            >
              {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span className="hidden sm:inline">{t("inv_download_pdf", lang)}</span>
            </button>
            <button
              onClick={handleShareWhatsApp}
              disabled={pdfLoading}
              className="inline-flex items-center gap-2 bg-[#25D366] text-white px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-[#1da851] disabled:opacity-50"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">{t("inv_share_whatsapp", lang)}</span>
            </button>
            <button
              onClick={handleEmailInvoice}
              className="inline-flex items-center gap-2 bg-secondary text-white px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-secondary-light"
            >
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">{t("inv_email", lang)}</span>
            </button>
            {invoice.status !== "paid" && invoice.customer?.phone && (
              <button
                onClick={handleSendReminder}
                className="inline-flex items-center gap-2 bg-amber-500 text-white px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-amber-600"
              >
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">{t("rem_send", lang)}</span>
              </button>
            )}
          </div>
        </div>

        {/* Invoice Document */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-8">
          {/* Business & Customer Info */}
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-8">
            <div className="flex items-start gap-4">
              {business?.logo_url && (
                <img src={business.logo_url} alt="" className="w-16 h-16 object-contain rounded-lg" />
              )}
              <div>
              <h2 className="text-xl font-bold text-gray-900">{business?.name_en}</h2>
              {business?.name_ur && <p className="font-urdu text-muted" dir="rtl">{business.name_ur}</p>}
              {business?.address_en && <p className="text-sm text-muted mt-1">{business.address_en}</p>}
              {business?.phone && <p className="text-sm text-muted">{business.phone}</p>}
              </div>
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

          {/* QR Code */}
          <div className="mt-8 pt-6 border-t border-gray-200 flex justify-center">
            <div className="text-center">
              <p className="text-xs text-muted mb-2">{t("qr_scan_to_pay", lang)}</p>
              <QRCode value={
                invoice.customer?.portal_token
                  ? `${typeof window !== "undefined" ? window.location.origin : ""}/portal/${invoice.customer.portal_token}`
                  : `Invoice: ${invoice.invoice_number}\nAmount: Rs ${Number(invoice.total).toLocaleString()}\nBusiness: ${business?.name_en || "BillPro"}`
              } />
            </div>
          </div>
        </div>

        {/* Audit Trail */}
        {history.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 no-print">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              {t("audit_history", lang)}
            </h3>
            <div className="space-y-3">
              {history.map((log) => (
                <div key={log.id} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-900 capitalize">{log.action.replace(/_/g, " ")}</span>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <span className="text-muted ml-1">
                        {log.details.old_status && log.details.new_status
                          ? `(${log.details.old_status} → ${log.details.new_status})`
                          : ""}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted whitespace-nowrap">
                    {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
