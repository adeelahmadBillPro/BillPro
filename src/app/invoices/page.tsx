"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { useLanguage } from "@/lib/store";
import { useAuth } from "@/lib/hooks/useAuth";
import { getInvoices, updateInvoiceStatus, deleteInvoice } from "@/lib/supabase/database";
import { t, formatPKR } from "@/lib/i18n";
import { Plus, Search, Filter, Eye, Trash2, CheckCircle } from "lucide-react";
import { hasPermission } from "@/lib/permissions";
import type { InvoiceStatus } from "@/types";

export default function InvoicesPage() {
  const { lang } = useLanguage();
  const { business, role } = useAuth();
  const canCreate = hasPermission(role, "create");
  const canDelete = hasPermission(role, "delete");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const loadInvoices = useCallback(async () => {
    if (!business) return;
    setLoading(true);
    const { data } = await getInvoices(business.id);
    setInvoices(data || []);
    setLoading(false);
  }, [business]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const handleMarkPaid = async (id: string) => {
    await updateInvoiceStatus(id, "paid");
    loadInvoices();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("common_confirm_delete", lang))) return;
    await deleteInvoice(id);
    loadInvoices();
  };

  const filtered = invoices.filter((inv) => {
    const matchSearch =
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (inv.customer?.name_en || "").toLowerCase().includes(search.toLowerCase()) ||
      (inv.customer?.name_ur || "").includes(search);
    const matchStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className={`text-2xl font-bold text-gray-900 ${lang === "ur" ? "font-urdu" : ""}`}>
            {t("inv_title", lang)}
          </h1>
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

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
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
                <tr><td colSpan={7} className="p-8 text-center text-muted text-sm">{t("common_loading", lang)}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-muted text-sm">{t("common_no_data", lang)}</td></tr>
              ) : (
                filtered.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
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
