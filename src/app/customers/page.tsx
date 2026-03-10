"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import Modal from "@/components/Modal";
import { useLanguage } from "@/lib/store";
import { useAuth } from "@/lib/hooks/useAuth";
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, logActivity, generatePortalToken } from "@/lib/supabase/database";
import { t, formatPKR } from "@/lib/i18n";
import { Plus, Search, Edit, Trash2, Phone, Mail, BookOpen, Link2, Check, Upload, FileSpreadsheet, Users } from "lucide-react";
import { hasPermission } from "@/lib/permissions";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { SkeletonCard } from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import type { Customer } from "@/types";

const emptyForm = {
  name_en: "", name_ur: "", phone: "", email: "",
  address_en: "", address_ur: "", city_en: "", city_ur: "",
};

export default function CustomersPage() {
  const { lang } = useLanguage();
  const { user, business, role } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const canCreate = hasPermission(role, "create");
  const canDelete = hasPermission(role, "delete");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<number | null>(null);

  const loadCustomers = useCallback(async () => {
    if (!business) return;
    setLoading(true);
    const { data } = await getCustomers(business.id);
    setCustomers(data || []);
    setLoading(false);
  }, [business]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setFormErrors({});
    setForm({
      name_en: customer.name_en,
      name_ur: customer.name_ur,
      phone: customer.phone,
      email: customer.email || "",
      address_en: customer.address_en || "",
      address_ur: customer.address_ur || "",
      city_en: customer.city_en || "",
      city_ur: customer.city_ur || "",
    });
    setEditingId(customer.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    const errs: Record<string, string> = {};
    if (!form.name_en.trim()) errs.name_en = lang === "ur" ? "نام ضروری ہے" : "Name is required";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = lang === "ur" ? "ای میل درست نہیں" : "Invalid email address";
    if (form.phone && !/^[0-9\-+() ]{7,15}$/.test(form.phone)) errs.phone = lang === "ur" ? "فون نمبر درست نہیں" : "Invalid phone number";
    setFormErrors(errs);
    if (Object.keys(errs).length > 0 || !business) return;
    setSaving(true);

    if (editingId) {
      await updateCustomer(editingId, form);
      if (user) await logActivity(business.id, user.id, "updated", "customer", form.name_en, editingId);
    } else {
      await createCustomer({ ...form, business_id: business.id });
      if (user) await logActivity(business.id, user.id, "created", "customer", form.name_en);
    }

    setSaving(false);
    setModalOpen(false);
    showToast(editingId ? (lang === "ur" ? "صارف اپ ڈیٹ ہو گیا" : "Customer updated") : (lang === "ur" ? "صارف شامل ہو گیا" : "Customer added"), "success");
    loadCustomers();
  };

  const handleDelete = async (id: string) => {
    const cust = customers.find(c => c.id === id);
    const ok = await confirm({
      title: lang === "ur" ? "صارف حذف کریں؟" : "Delete Customer?",
      message: lang === "ur" ? `کیا آپ واقعی "${cust?.name_en || ""}" حذف کرنا چاہتے ہیں؟` : `Are you sure you want to delete "${cust?.name_en || ""}"? This cannot be undone.`,
      confirmText: lang === "ur" ? "حذف کریں" : "Delete",
      cancelText: t("common_cancel", lang),
      variant: "danger",
    });
    if (!ok) return;
    await deleteCustomer(id);
    if (user && business) await logActivity(business.id, user.id, "deleted", "customer", cust?.name_en || "", id);
    showToast(lang === "ur" ? "صارف حذف ہو گیا" : "Customer deleted", "success");
    loadCustomers();
  };

  const handlePortalLink = async (customer: Customer) => {
    if (!business) return;
    const { token } = await generatePortalToken(customer.id);
    if (token) {
      const url = `${window.location.origin}/portal/${token}`;
      await navigator.clipboard.writeText(url);
      setCopiedToken(customer.id);
      setTimeout(() => setCopiedToken(null), 2000);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { read, utils } = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const wb = read(buffer);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = utils.sheet_to_json<Record<string, any>>(ws);
    // Auto-map common column names
    const mapped = rows.map((row) => ({
      name_en: row["Name"] || row["name_en"] || row["Name (EN)"] || row["Customer"] || "",
      name_ur: row["Name (UR)"] || row["name_ur"] || "",
      phone: String(row["Phone"] || row["phone"] || row["Mobile"] || ""),
      email: row["Email"] || row["email"] || "",
      address_en: row["Address"] || row["address_en"] || "",
      address_ur: row["Address (UR)"] || row["address_ur"] || "",
      city_en: row["City"] || row["city_en"] || "",
      city_ur: row["City (UR)"] || row["city_ur"] || "",
    })).filter((r) => r.name_en.trim());
    setImportData(mapped);
    setImportResult(null);
    setImportModalOpen(true);
    e.target.value = "";
  };

  const handleImportAll = async () => {
    if (!business || importData.length === 0) return;
    setImporting(true);
    let count = 0;
    for (const row of importData) {
      await createCustomer({ ...row, business_id: business.id });
      count++;
    }
    if (user) await logActivity(business.id, user.id, "imported", "customer", `${count} customers`);
    setImporting(false);
    setImportResult(count);
    setImportData([]);
    loadCustomers();
  };

  const filtered = customers.filter(
    (c) =>
      c.name_en.toLowerCase().includes(search.toLowerCase()) ||
      c.name_ur.includes(search) ||
      c.phone.includes(search)
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className={`text-2xl font-bold text-gray-900 ${lang === "ur" ? "font-urdu" : ""}`}>
            {t("cust_title", lang)}
          </h1>
          <div className="flex items-center gap-2">
            {canCreate && (
              <label className="inline-flex items-center gap-2 border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer">
                <Upload className="w-4 h-4" />
                {t("cust_import", lang)}
                <input type="file" accept=".csv,.xlsx,.xls" onChange={handleImportFile} className="hidden" />
              </label>
            )}
            {canCreate && (
              <button
                onClick={openAdd}
                className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t("cust_add", lang)}
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder={t("common_search", lang)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {/* Loading */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          /* Customer Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((customer) => (
              <div
                key={customer.id}
                className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{customer.name_en}</h3>
                    {customer.name_ur && (
                      <p className="text-sm font-urdu text-muted" dir="rtl">{customer.name_ur}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {canCreate && (
                      <button
                        onClick={() => openEdit(customer)}
                        className="p-1.5 text-muted hover:text-secondary rounded-md hover:bg-gray-100"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(customer.id)}
                        className="p-1.5 text-muted hover:text-danger rounded-md hover:bg-gray-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  {customer.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-muted" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-muted" />
                      <span>{customer.email}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted">{t("cust_balance", lang)}</p>
                    <p className={`text-sm font-bold ${Number(customer.balance) > 0 ? "text-danger" : "text-success"}`}>
                      {formatPKR(Number(customer.balance))}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/customers/${customer.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-dark transition-colors"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      {t("ledger_view", lang)}
                    </Link>
                    {canCreate && (
                      <button
                        onClick={() => handlePortalLink(customer)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-secondary hover:text-secondary/80 transition-colors"
                        title={t("portal_generate", lang)}
                      >
                        {copiedToken === customer.id ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                        {copiedToken === customer.id ? t("portal_copied", lang) : t("portal_link", lang)}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && !loading && (
              <div className="col-span-full">
                <EmptyState
                  icon={Users}
                  title={lang === "ur" ? "کوئی صارف نہیں ملا" : "No customers found"}
                  description={search ? (lang === "ur" ? "دوسری تلاش آزمائیں" : "Try a different search term") : (lang === "ur" ? "اپنا پہلا صارف شامل کریں" : "Add your first customer to get started")}
                  action={!search && canCreate ? { label: t("cust_add", lang), onClick: openAdd } : undefined}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? t("cust_edit", lang) : t("cust_add", lang)}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("cust_name", lang)} (EN) <span className="text-danger">*</span></label>
              <input
                type="text"
                value={form.name_en}
                onChange={(e) => { setForm({ ...form, name_en: e.target.value }); setFormErrors(prev => { const n = { ...prev }; delete n.name_en; return n; }); }}
                placeholder="Customer Name"
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${formErrors.name_en ? "border-red-400 focus:ring-red-200 bg-red-50" : "border-gray-300 focus:ring-primary/20"}`}
              />
              {formErrors.name_en && <p className="text-xs text-danger mt-1 animate-shake">{formErrors.name_en}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("cust_name", lang)} (UR)</label>
              <input
                type="text"
                dir="rtl"
                value={form.name_ur}
                onChange={(e) => setForm({ ...form, name_ur: e.target.value })}
                placeholder="صارف کا نام"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-urdu focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("cust_phone", lang)}</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => { setForm({ ...form, phone: e.target.value }); setFormErrors(prev => { const n = { ...prev }; delete n.phone; return n; }); }}
                placeholder="0300-1234567"
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${formErrors.phone ? "border-red-400 focus:ring-red-200 bg-red-50" : "border-gray-300 focus:ring-primary/20"}`}
              />
              {formErrors.phone && <p className="text-xs text-danger mt-1 animate-shake">{formErrors.phone}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("cust_email", lang)}</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => { setForm({ ...form, email: e.target.value }); setFormErrors(prev => { const n = { ...prev }; delete n.email; return n; }); }}
                placeholder="email@example.com"
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${formErrors.email ? "border-red-400 focus:ring-red-200 bg-red-50" : "border-gray-300 focus:ring-primary/20"}`}
              />
              {formErrors.email && <p className="text-xs text-danger mt-1 animate-shake">{formErrors.email}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("cust_address", lang)} (EN)</label>
              <input
                type="text"
                value={form.address_en}
                onChange={(e) => setForm({ ...form, address_en: e.target.value })}
                placeholder="Address"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("cust_address", lang)} (UR)</label>
              <input
                type="text"
                dir="rtl"
                value={form.address_ur}
                onChange={(e) => setForm({ ...form, address_ur: e.target.value })}
                placeholder="پتہ"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-urdu focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("cust_city", lang)} (EN)</label>
              <input
                type="text"
                value={form.city_en}
                onChange={(e) => setForm({ ...form, city_en: e.target.value })}
                placeholder="City"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("cust_city", lang)} (UR)</label>
              <input
                type="text"
                dir="rtl"
                value={form.city_ur}
                onChange={(e) => setForm({ ...form, city_ur: e.target.value })}
                placeholder="شہر"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-urdu focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {t("common_cancel", lang)}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.name_en.trim()}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
            >
              {saving ? t("common_loading", lang) : t("common_save", lang)}
            </button>
          </div>
        </div>
      </Modal>

      {/* Import Preview Modal */}
      <Modal
        isOpen={importModalOpen}
        onClose={() => { setImportModalOpen(false); setImportData([]); setImportResult(null); }}
        title={t("cust_import_title", lang)}
      >
        <div className="space-y-4">
          {importResult !== null ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 text-success" />
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {importResult} {t("cust_import_success", lang)}
              </p>
              <button
                onClick={() => { setImportModalOpen(false); setImportResult(null); }}
                className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark"
              >
                {lang === "ur" ? "بند کریں" : "Close"}
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted">
                {importData.length} {t("cust_import_rows", lang)}
              </p>
              <div className="max-h-64 overflow-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-700">#</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-700">{t("cust_name", lang)}</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-700">{t("cust_phone", lang)}</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-700">{t("cust_email", lang)}</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-700">{t("cust_city", lang)}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {importData.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-muted">{i + 1}</td>
                        <td className="px-3 py-2">{row.name_en}</td>
                        <td className="px-3 py-2">{row.phone}</td>
                        <td className="px-3 py-2">{row.email}</td>
                        <td className="px-3 py-2">{row.city_en}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => { setImportModalOpen(false); setImportData([]); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {t("common_cancel", lang)}
                </button>
                <button
                  onClick={handleImportAll}
                  disabled={importing}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  {importing ? t("common_loading", lang) : t("cust_import_btn", lang)}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </DashboardLayout>
  );
}
