"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { useLanguage } from "@/lib/store";
import { useAuth } from "@/lib/hooks/useAuth";
import { getInvoices, updateInvoiceStatus, deleteInvoice, markOverdueInvoices, bulkUpdateInvoiceStatus, bulkDeleteInvoices, logActivity } from "@/lib/supabase/database";
import { t, formatPKR } from "@/lib/i18n";
import { Plus, Search, Filter, Eye, Trash2, CheckCircle, Bell, Edit2, Square, CheckSquare, X, Download, FileText } from "lucide-react";
import { SkeletonTable } from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import { hasPermission } from "@/lib/permissions";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import type { InvoiceStatus } from "@/types";

export default function InvoicesPage() {
  const { lang } = useLanguage();
  const { user, business, role } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const canCreate = hasPermission(role, "create");
  const canDelete = hasPermission(role, "delete");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const loadInvoices = useCallback(async () => {
    if (!business) return;
    setLoading(true);
    await markOverdueInvoices(business.id);
    const { data } = await getInvoices(business.id);
    setInvoices(data || []);
    setLoading(false);
  }, [business]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const handleMarkPaid = async (id: string) => {
    await updateInvoiceStatus(id, "paid");
    const inv = invoices.find(i => i.id === id);
    if (user && business) await logActivity(business.id, user.id, "marked_paid", "invoice", inv?.invoice_number || "", id);
    showToast(lang === "ur" ? "ادا شدہ نشان لگا دیا گیا" : "Marked as paid", "success");
    loadInvoices();
  };

  const handleDelete = async (id: string) => {
    const inv = invoices.find(i => i.id === id);
    const ok = await confirm({
      title: lang === "ur" ? "انوائس حذف کریں؟" : "Delete Invoice?",
      message: lang === "ur" ? `کیا آپ واقعی انوائس ${inv?.invoice_number || ""} حذف کرنا چاہتے ہیں؟ یہ عمل واپس نہیں ہو سکتا۔` : `Are you sure you want to delete invoice ${inv?.invoice_number || ""}? This action cannot be undone.`,
      confirmText: lang === "ur" ? "حذف کریں" : "Delete",
      cancelText: t("common_cancel", lang),
      variant: "danger",
    });
    if (!ok) return;
    await deleteInvoice(id);
    if (user && business) await logActivity(business.id, user.id, "deleted", "invoice", inv?.invoice_number || "", id);
    showToast(lang === "ur" ? "انوائس حذف ہو گئی" : "Invoice deleted", "success");
    loadInvoices();
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const handleReminder = (invoice: any) => {
    const phone = invoice.customer?.phone?.replace(/[^0-9]/g, "");
    if (!phone) return;
    const intlPhone = phone.startsWith("0") ? "92" + phone.slice(1) : phone;
    const total = Number(invoice.total).toLocaleString("en-PK");
    const name = lang === "ur" ? (invoice.customer?.name_ur || invoice.customer?.name_en) : invoice.customer?.name_en;
    const biz = business?.name_en || "BillPro";
    const msg = lang === "ur"
      ? `محترم ${name},\nانوائس ${invoice.invoice_number} کی رقم Rs ${total} واجب الادا ہے۔ براہ کرم جلد ادائیگی کریں۔\nشکریہ — ${biz}`
      : `Dear ${name},\nInvoice ${invoice.invoice_number} for Rs ${total} is pending. Please process payment.\nThank you — ${biz}`;
    window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const filtered = invoices.filter((inv) => {
    const matchSearch =
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (inv.customer?.name_en || "").toLowerCase().includes(search.toLowerCase()) ||
      (inv.customer?.name_ur || "").includes(search);
    const matchStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const toggleSelectAll = () => {
    setSelected(prev => prev.length === filtered.length ? [] : filtered.map(inv => inv.id));
  };

  const handleBulkMarkPaid = async () => {
    if (selected.length === 0) return;
    await bulkUpdateInvoiceStatus(selected, "paid");
    if (user && business) await logActivity(business.id, user.id, "bulk_marked_paid", "invoice", `${selected.length} invoices`);
    setSelected([]);
    loadInvoices();
  };

  const handleBulkDelete = async () => {
    if (selected.length === 0) return;
    const ok = await confirm({
      title: lang === "ur" ? "منتخب انوائسز حذف کریں؟" : "Delete Selected Invoices?",
      message: lang === "ur" ? `کیا آپ واقعی ${selected.length} انوائسز حذف کرنا چاہتے ہیں؟` : `Are you sure you want to delete ${selected.length} invoices? This cannot be undone.`,
      confirmText: lang === "ur" ? "حذف کریں" : "Delete All",
      cancelText: t("common_cancel", lang),
      variant: "danger",
    });
    if (!ok) return;
    await bulkDeleteInvoices(selected);
    if (user && business) await logActivity(business.id, user.id, "bulk_deleted", "invoice", `${selected.length} invoices`);
    showToast(lang === "ur" ? `${selected.length} انوائسز حذف ہو گئیں` : `${selected.length} invoices deleted`, "success");
    setSelected([]);
    loadInvoices();
  };

  const handleExportExcel = async () => {
    const { exportToExcel } = await import("@/lib/reports/excel");
    exportToExcel(
      filtered.map((inv) => ({
        invoice_number: inv.invoice_number,
        customer: lang === "ur" ? (inv.customer?.name_ur || inv.customer?.name_en || "") : (inv.customer?.name_en || ""),
        issue_date: inv.issue_date,
        due_date: inv.due_date,
        subtotal: Number(inv.subtotal),
        tax: Number(inv.tax_amount),
        discount: Number(inv.discount),
        total: Number(inv.total),
        status: inv.status,
      })),
      [
        { key: "invoice_number", header: "Invoice #", width: 15 },
        { key: "customer", header: "Customer", width: 25 },
        { key: "issue_date", header: "Issue Date", width: 12 },
        { key: "due_date", header: "Due Date", width: 12 },
        { key: "subtotal", header: "Subtotal (PKR)", width: 15 },
        { key: "tax", header: "Tax (PKR)", width: 12 },
        { key: "discount", header: "Discount (PKR)", width: 12 },
        { key: "total", header: "Total (PKR)", width: 15 },
        { key: "status", header: "Status", width: 10 },
      ],
      `Invoices_${new Date().toISOString().split("T")[0]}`,
      "Invoices"
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className={`text-2xl font-bold text-gray-900 ${lang === "ur" ? "font-urdu" : ""}`}>
            {t("inv_title", lang)}
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              {t("ledger_export", lang)}
            </button>
            {canCreate && (
              <Link
                href="/invoices/new"
                className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t("inv_create", lang)}
              </Link>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder={t("common_search", lang)}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">{t("common_filter", lang)}</option>
              <option value="draft">{t("status_draft", lang)}</option>
              <option value="sent">{t("status_sent", lang)}</option>
              <option value="paid">{t("status_paid", lang)}</option>
              <option value="overdue">{t("status_overdue", lang)}</option>
            </select>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selected.length > 0 && (
          <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
            <span className="text-sm font-medium text-primary">{selected.length} {t("bulk_selected", lang)}</span>
            <div className="flex items-center gap-2 ml-auto">
              {canCreate && (
                <button onClick={handleBulkMarkPaid}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-success text-white rounded-lg text-xs font-medium hover:bg-green-700">
                  <CheckCircle className="w-3.5 h-3.5" /> {t("inv_mark_paid", lang)}
                </button>
              )}
              {canDelete && (
                <button onClick={handleBulkDelete}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-danger text-white rounded-lg text-xs font-medium hover:bg-red-700">
                  <Trash2 className="w-3.5 h-3.5" /> {t("common_delete", lang)}
                </button>
              )}
              <button onClick={() => setSelected([])}
                className="p-1.5 text-muted hover:text-gray-700 rounded-md hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="w-10 p-4">
                  <button onClick={toggleSelectAll} className="text-muted hover:text-gray-700">
                    {selected.length === filtered.length && filtered.length > 0 ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="text-start p-4 text-sm font-medium text-muted">{t("inv_number", lang)}</th>
                <th className="text-start p-4 text-sm font-medium text-muted">{t("inv_customer", lang)}</th>
                <th className="text-start p-4 text-sm font-medium text-muted">{t("inv_date", lang)}</th>
                <th className="text-start p-4 text-sm font-medium text-muted">{t("inv_due_date", lang)}</th>
                <th className="text-start p-4 text-sm font-medium text-muted">{t("inv_amount", lang)}</th>
                <th className="text-start p-4 text-sm font-medium text-muted">{t("inv_status", lang)}</th>
                <th className="text-start p-4 text-sm font-medium text-muted">{t("common_actions", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="p-4"><div className="skeleton h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8}>
                  <EmptyState
                    icon={FileText}
                    title={lang === "ur" ? "کوئی انوائس نہیں ملی" : "No invoices found"}
                    description={search || statusFilter !== "all" ? (lang === "ur" ? "فلٹرز تبدیل کریں" : "Try adjusting your filters") : (lang === "ur" ? "اپنی پہلی انوائس بنائیں" : "Create your first invoice to get started")}
                  />
                </td></tr>
              ) : (
                filtered.map((invoice) => (
                  <tr key={invoice.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${selected.includes(invoice.id) ? "bg-primary/5" : ""}`}>
                    <td className="w-10 p-4">
                      <button onClick={() => toggleSelect(invoice.id)} className="text-muted hover:text-gray-700">
                        {selected.includes(invoice.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="p-4 text-sm font-medium text-gray-900">{invoice.invoice_number}</td>
                    <td className="p-4 text-sm text-gray-600">
                      {lang === "ur" ? invoice.customer?.name_ur || invoice.customer?.name_en : invoice.customer?.name_en || "—"}
                    </td>
                    <td className="p-4 text-sm text-muted">{invoice.issue_date}</td>
                    <td className="p-4 text-sm text-muted">{invoice.due_date}</td>
                    <td className="p-4 text-sm font-semibold text-gray-900">{formatPKR(Number(invoice.total))}</td>
                    <td className="p-4"><StatusBadge status={invoice.status as InvoiceStatus} lang={lang} /></td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {canCreate && invoice.status !== "paid" && (
                          <button
                            onClick={() => handleMarkPaid(invoice.id)}
                            className="p-1.5 text-muted hover:text-success rounded-md hover:bg-green-50"
                            title={t("inv_mark_paid", lang)}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {invoice.status !== "paid" && invoice.customer?.phone && (
                          <button
                            onClick={() => handleReminder(invoice)}
                            className="p-1.5 text-muted hover:text-amber-600 rounded-md hover:bg-amber-50"
                            title={t("rem_send", lang)}
                          >
                            <Bell className="w-4 h-4" />
                          </button>
                        )}
                        {canCreate && invoice.status !== "paid" && (
                          <Link href={`/invoices/${invoice.id}/edit`} className="p-1.5 text-muted hover:text-primary rounded-md hover:bg-gray-100" title={t("common_edit", lang)}>
                            <Edit2 className="w-4 h-4" />
                          </Link>
                        )}
                        <Link href={`/invoices/${invoice.id}`} className="p-1.5 text-muted hover:text-primary rounded-md hover:bg-gray-100">
                          <Eye className="w-4 h-4" />
                        </Link>
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(invoice.id)}
                            className="p-1.5 text-muted hover:text-danger rounded-md hover:bg-gray-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
