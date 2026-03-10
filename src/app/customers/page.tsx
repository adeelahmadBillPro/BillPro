"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Modal from "@/components/Modal";
import { useLanguage } from "@/lib/store";
import { useAuth } from "@/lib/hooks/useAuth";
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from "@/lib/supabase/database";
import { t, formatPKR } from "@/lib/i18n";
import { Plus, Search, Edit, Trash2, Phone, Mail } from "lucide-react";
import { hasPermission } from "@/lib/permissions";
import type { Customer } from "@/types";

const emptyForm = {
  name_en: "", name_ur: "", phone: "", email: "",
  address_en: "", address_ur: "", city_en: "", city_ur: "",
};

export default function CustomersPage() {
  const { lang } = useLanguage();
  const { business, role } = useAuth();
  const canCreate = hasPermission(role, "create");
  const canDelete = hasPermission(role, "delete");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

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
    setModalOpen(true);
  };

  const openEdit = (customer: Customer) => {
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
    if (!business || !form.name_en.trim()) return;
    setSaving(true);

    if (editingId) {
      await updateCustomer(editingId, form);
    } else {
      await createCustomer({ ...form, business_id: business.id });
    }

    setSaving(false);
    setModalOpen(false);
    loadCustomers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("common_confirm_delete", lang))) return;
    await deleteCustomer(id);
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
          <div className="text-center py-12 text-muted text-sm">{t("common_loading", lang)}</div>
        ) : (
          /* Customer Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((customer) => (
              <div
                key={customer.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow"
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
                  <div className="text-right">
                    <p className="text-xs text-muted">{t("cust_city", lang)}</p>
                    <p className="text-sm text-gray-700">
                      {lang === "ur" ? customer.city_ur || customer.city_en || "—" : customer.city_en || "—"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && !loading && (
              <div className="col-span-full text-center py-12 text-muted text-sm">
                {t("common_no_data", lang)}
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("cust_name", lang)} (EN) *</label>
              <input
                type="text"
                value={form.name_en}
                onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                placeholder="Customer Name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("cust_phone", lang)}</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0300-1234567"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("cust_email", lang)}</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@example.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
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
          <div className="grid grid-cols-2 gap-4">
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
    </DashboardLayout>
  );
}
