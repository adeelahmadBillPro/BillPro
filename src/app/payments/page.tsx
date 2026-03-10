"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Modal from "@/components/Modal";
import { useLanguage } from "@/lib/store";
import { useAuth } from "@/lib/hooks/useAuth";
import { getPayments, getInvoices, createPayment } from "@/lib/supabase/database";
import { t, formatPKR } from "@/lib/i18n";
import { Plus, Banknote, CreditCard, Building, Globe } from "lucide-react";
import { hasPermission } from "@/lib/permissions";
import type { PaymentMethod } from "@/types";

const methodIcons: Record<string, any> = {
  cash: Banknote,
  bank_transfer: Building,
  cheque: CreditCard,
  online: Globe,
};
const methodKeys: Record<string, string> = {
  cash: "pay_cash",
  bank_transfer: "pay_bank",
  cheque: "pay_cheque",
  online: "pay_online",
};

export default function PaymentsPage() {
  const { lang } = useLanguage();
  const { business, role } = useAuth();
  const canCreate = hasPermission(role, "create");
  const [payments, setPayments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    invoice_id: "",
    amount: 0,
    payment_method: "cash" as PaymentMethod,
    payment_date: new Date().toISOString().split("T")[0],
    reference_number: "",
    notes: "",
  });

  const loadData = useCallback(async () => {
    if (!business) return;
    setLoading(true);
    const [payRes, invRes] = await Promise.all([
      getPayments(business.id),
      getInvoices(business.id),
    ]);
    setPayments(payRes.data || []);
    setInvoices((invRes.data || []).filter((i: any) => i.status !== "paid" && i.status !== "cancelled"));
    setLoading(false);
  }, [business]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    if (!form.invoice_id || form.amount <= 0) return;
    setSaving(true);
    await createPayment(form);
    setSaving(false);
    setModalOpen(false);
    setForm({
      invoice_id: "",
      amount: 0,
      payment_method: "cash" as PaymentMethod,
      payment_date: new Date().toISOString().split("T")[0],
      reference_number: "",
      notes: "",
    });
    loadData();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className={`text-2xl font-bold text-gray-900 ${lang === "ur" ? "font-urdu" : ""}`}>
            {t("pay_title", lang)}
          </h1>
          {canCreate && (
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t("pay_add", lang)}
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-start p-4 text-sm font-medium text-muted">{t("inv_number", lang)}</th>
                <th className="text-start p-4 text-sm font-medium text-muted">{t("inv_customer", lang)}</th>
                <th className="text-start p-4 text-sm font-medium text-muted">{t("pay_amount", lang)}</th>
                <th className="text-start p-4 text-sm font-medium text-muted">{t("pay_method", lang)}</th>
                <th className="text-start p-4 text-sm font-medium text-muted">{t("pay_date", lang)}</th>
                <th className="text-start p-4 text-sm font-medium text-muted">{t("pay_reference", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted text-sm">{t("common_loading", lang)}</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted text-sm">{t("common_no_data", lang)}</td></tr>
              ) : (
                payments.map((payment: any) => {
                  const MethodIcon = methodIcons[payment.payment_method] || Banknote;
                  return (
                    <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-sm font-medium text-gray-900">{payment.invoice?.invoice_number || "—"}</td>
                      <td className="p-4 text-sm text-gray-600">
                        {lang === "ur"
                          ? payment.invoice?.customer?.name_ur || payment.invoice?.customer?.name_en || "—"
                          : payment.invoice?.customer?.name_en || "—"}
                      </td>
                      <td className="p-4 text-sm font-semibold text-success">{formatPKR(Number(payment.amount))}</td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                          <MethodIcon className="w-4 h-4" />
                          {t(methodKeys[payment.payment_method] || "pay_cash", lang)}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-muted">{payment.payment_date}</td>
                      <td className="p-4 text-sm text-muted">{payment.reference_number || "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={t("pay_add", lang)}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("inv_number", lang)} *</label>
            <select
              value={form.invoice_id}
              onChange={(e) => setForm({ ...form, invoice_id: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">-- Select Invoice --</option>
              {invoices.map((inv: any) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_number} — {inv.customer?.name_en} ({formatPKR(Number(inv.total))})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("pay_amount", lang)} (PKR) *</label>
              <input
                type="number"
                min="1"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: parseInt(e.target.value) || 0 })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("pay_method", lang)}</label>
              <select
                value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value as PaymentMethod })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="cash">{t("pay_cash", lang)}</option>
                <option value="bank_transfer">{t("pay_bank", lang)}</option>
                <option value="cheque">{t("pay_cheque", lang)}</option>
                <option value="online">{t("pay_online", lang)}</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("pay_date", lang)}</label>
              <input
                type="date"
                value={form.payment_date}
                onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("pay_reference", lang)}</label>
              <input
                type="text"
                value={form.reference_number}
                onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
                placeholder="TXN-12345"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              {t("common_cancel", lang)}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.invoice_id || form.amount <= 0}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
            >
              {saving ? t("common_loading", lang) : t("common_save", lang)}
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
