"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Modal from "@/components/Modal";
import { useLanguage } from "@/lib/store";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getRecurringInvoices, createRecurringInvoice, updateRecurringInvoice,
  deleteRecurringInvoice, getCustomers, getActiveProducts,
} from "@/lib/supabase/database";
import { t, formatPKR } from "@/lib/i18n";
import { hasPermission } from "@/lib/permissions";
import { useConfirm } from "@/components/ConfirmDialog";
import {
  Plus, Trash2, Edit2, Search, RefreshCw, Calendar, Pause, Play, Package,
} from "lucide-react";
import type { RecurringInvoice, Customer, Product, RecurringFrequency } from "@/types";

const FREQ_LABELS: Record<RecurringFrequency, { en: string; ur: string }> = {
  weekly: { en: "Weekly", ur: "ہفتہ وار" },
  monthly: { en: "Monthly", ur: "ماہانہ" },
  quarterly: { en: "Quarterly", ur: "سہ ماہی" },
  yearly: { en: "Yearly", ur: "سالانہ" },
};

interface ItemTemplate {
  description_en: string;
  description_ur: string;
  quantity: number;
  unit_price: number;
}

export default function RecurringPage() {
  const { lang } = useLanguage();
  const { business, role } = useAuth();
  const { confirm } = useConfirm();
  const canCreate = hasPermission(role, "create");
  const canDelete = hasPermission(role, "delete");

  const [recurrings, setRecurrings] = useState<RecurringInvoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<RecurringInvoice | null>(null);

  // Form state
  const [customerId, setCustomerId] = useState("");
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly");
  const [nextDate, setNextDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [items, setItems] = useState<ItemTemplate[]>([
    { description_en: "", description_ur: "", quantity: 1, unit_price: 0 },
  ]);
  const [taxPercentage, setTaxPercentage] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [notesEn, setNotesEn] = useState("");
  const [notesUr, setNotesUr] = useState("");

  const loadData = useCallback(async () => {
    if (!business) return;
    setLoading(true);
    const [riRes, custRes, prodRes] = await Promise.all([
      getRecurringInvoices(business.id),
      getCustomers(business.id),
      getActiveProducts(business.id),
    ]);
    setRecurrings(riRes.data || []);
    setCustomers(custRes.data || []);
    setProducts(prodRes.data || []);
    setLoading(false);
  }, [business]);

  useEffect(() => { loadData(); }, [loadData]);

  const resetForm = () => {
    setEditing(null);
    setCustomerId("");
    setFrequency("monthly");
    setNextDate(new Date().toISOString().split("T")[0]);
    setEndDate("");
    setItems([{ description_en: "", description_ur: "", quantity: 1, unit_price: 0 }]);
    setTaxPercentage(0);
    setDiscount(0);
    setNotesEn("");
    setNotesUr("");
  };

  const openAdd = () => { resetForm(); setShowModal(true); };

  const openEdit = (ri: RecurringInvoice) => {
    setEditing(ri);
    setCustomerId(ri.customer_id);
    setFrequency(ri.frequency);
    setNextDate(ri.next_date);
    setEndDate(ri.end_date || "");
    setItems(ri.items_template.length > 0 ? ri.items_template : [{ description_en: "", description_ur: "", quantity: 1, unit_price: 0 }]);
    setTaxPercentage(ri.tax_percentage);
    setDiscount(ri.discount);
    setNotesEn(ri.notes_en);
    setNotesUr(ri.notes_ur);
    setShowModal(true);
  };

  const updateItem = (index: number, field: keyof ItemTemplate, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const fillFromProduct = (index: number, productId: string) => {
    const p = products.find((pr) => pr.id === productId);
    if (!p) return;
    const updated = [...items];
    updated[index] = {
      description_en: p.name_en + (p.description_en ? ` - ${p.description_en}` : ""),
      description_ur: p.name_ur + (p.description_ur ? ` - ${p.description_ur}` : ""),
      quantity: 1,
      unit_price: p.unit_price,
    };
    setItems(updated);
  };

  const addItem = () => {
    setItems([...items, { description_en: "", description_ur: "", quantity: 1, unit_price: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const taxAmount = Math.round((subtotal * taxPercentage) / 100);
  const total = subtotal + taxAmount - discount;

  const handleSave = async () => {
    if (!business || !customerId || items.every((i) => !i.description_en.trim())) return;
    const payload = {
      business_id: business.id,
      customer_id: customerId,
      frequency,
      next_date: nextDate,
      end_date: endDate || null,
      items_template: items.filter((i) => i.description_en.trim()),
      tax_percentage: taxPercentage,
      discount,
      notes_en: notesEn,
      notes_ur: notesUr,
    };
    if (editing) {
      await updateRecurringInvoice(editing.id, payload);
    } else {
      await createRecurringInvoice(payload);
    }
    setShowModal(false);
    resetForm();
    loadData();
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: lang === "ur" ? "بار بار انوائس حذف کریں؟" : "Delete Recurring Invoice?",
      message: lang === "ur" ? "کیا آپ واقعی یہ بار بار انوائس حذف کرنا چاہتے ہیں؟" : "Are you sure you want to delete this recurring invoice?",
      confirmText: lang === "ur" ? "حذف کریں" : "Delete",
      cancelText: t("common_cancel", lang),
      variant: "danger",
    });
    if (!ok) return;
    await deleteRecurringInvoice(id);
    loadData();
  };

  const handleToggleActive = async (ri: RecurringInvoice) => {
    await updateRecurringInvoice(ri.id, { is_active: !ri.is_active });
    loadData();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className={`text-2xl font-bold text-gray-900 ${lang === "ur" ? "font-urdu" : ""}`}>
            {t("nav_recurring", lang)}
          </h1>
          {canCreate && (
            <button onClick={openAdd}
              className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors">
              <Plus className="w-4 h-4" /> {t("rec_add", lang)}
            </button>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-12 text-muted">{t("common_loading", lang)}</div>
        ) : recurrings.length === 0 ? (
          <div className="text-center py-12">
            <RefreshCw className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-muted">{t("common_no_data", lang)}</p>
            <p className="text-sm text-muted mt-1">
              {lang === "ur" ? "بار بار آنے والے انوائسز خودکار طور پر بنتے ہیں" : "Recurring invoices are auto-generated on schedule"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {recurrings.map((ri) => {
              const riItems = (ri.items_template as any[]) || [];
              const riSubtotal = riItems.reduce((s: number, i: any) => s + i.quantity * i.unit_price, 0);
              const riTax = Math.round((riSubtotal * Number(ri.tax_percentage)) / 100);
              const riTotal = riSubtotal + riTax - Number(ri.discount);
              const freqLabel = FREQ_LABELS[ri.frequency];

              return (
                <div key={ri.id}
                  className={`bg-white rounded-xl border shadow-sm p-5 transition-all ${ri.is_active ? "border-gray-200" : "border-gray-200 opacity-60"}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: Customer + frequency info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {ri.customer?.name_en || "—"}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ri.is_active ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-500"}`}>
                          {lang === "ur" ? freqLabel.ur : freqLabel.en}
                        </span>
                      </div>
                      {ri.customer?.name_ur && (
                        <p className="text-sm text-muted font-urdu" dir="rtl">{ri.customer.name_ur}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {lang === "ur" ? "اگلی تاریخ:" : "Next:"} {ri.next_date}
                        </span>
                        {ri.end_date && (
                          <span>{lang === "ur" ? "آخری:" : "Ends:"} {ri.end_date}</span>
                        )}
                        <span>{lang === "ur" ? "بنائے گئے:" : "Generated:"} {ri.total_generated}</span>
                      </div>
                    </div>

                    {/* Right: Amount + actions */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">{formatPKR(riTotal)}</p>
                        <p className="text-xs text-muted">
                          {riItems.length} {lang === "ur" ? "آئٹمز" : "items"}
                        </p>
                      </div>
                      {canCreate && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleToggleActive(ri)}
                            className={`p-2 rounded-lg transition-colors ${ri.is_active ? "text-primary hover:bg-primary/10" : "text-muted hover:bg-gray-100"}`}
                            title={ri.is_active ? "Pause" : "Resume"}>
                            {ri.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </button>
                          <button onClick={() => openEdit(ri)}
                            className="p-2 text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {canDelete && (
                            <button onClick={() => handleDelete(ri.id)}
                              className="p-2 text-muted hover:text-danger hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add/Edit Modal */}
        <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }}
          title={editing ? t("rec_edit", lang) : t("rec_add", lang)}>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Customer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("inv_customer", lang)} *</label>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">{lang === "ur" ? "-- صارف منتخب کریں --" : "-- Select Customer --"}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name_en} {c.name_ur ? `/ ${c.name_ur}` : ""}</option>
                ))}
              </select>
            </div>

            {/* Frequency + Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("rec_frequency", lang)}</label>
                <select value={frequency} onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                  {(Object.keys(FREQ_LABELS) as RecurringFrequency[]).map((f) => (
                    <option key={f} value={f}>{lang === "ur" ? FREQ_LABELS[f].ur : FREQ_LABELS[f].en}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("rec_start", lang)}</label>
                <input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("rec_end", lang)}</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>

            {/* Items */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t("inv_items", lang)}</label>
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-3 space-y-2">
                    {/* Product picker */}
                    {products.length > 0 && (
                      <select defaultValue=""
                        onChange={(e) => { fillFromProduct(idx, e.target.value); e.target.value = ""; }}
                        className="w-full border border-dashed border-primary/40 rounded-lg px-3 py-1.5 text-xs text-primary bg-primary/5 focus:outline-none">
                        <option value="">{lang === "ur" ? "📦 پروڈکٹ سے بھریں..." : "📦 Fill from product..."}</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name_en} — Rs {Number(p.unit_price).toLocaleString()}/{p.unit}</option>
                        ))}
                      </select>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input type="text" placeholder="Description (EN)" value={item.description_en}
                        onChange={(e) => updateItem(idx, "description_en", e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      <input type="text" placeholder="تفصیل (اردو)" dir="rtl" value={item.description_ur}
                        onChange={(e) => updateItem(idx, "description_ur", e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-urdu focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="number" min="1" placeholder="Qty" value={item.quantity}
                        onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 0)}
                        className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      <input type="number" min="0" placeholder="Price" value={item.unit_price}
                        onChange={(e) => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      <span className="text-sm font-semibold text-gray-700 w-24 text-right">
                        {formatPKR(item.quantity * item.unit_price)}
                      </span>
                      <button onClick={() => removeItem(idx)} disabled={items.length === 1}
                        className="p-1.5 text-muted hover:text-danger rounded disabled:opacity-30">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={addItem} className="mt-2 text-sm text-primary hover:text-primary-dark font-medium flex items-center gap-1">
                <Plus className="w-4 h-4" /> {t("inv_add_item", lang)}
              </button>
            </div>

            {/* Tax + Discount + Total */}
            <div className="flex flex-wrap items-center gap-4 border-t border-gray-200 pt-3">
              <div>
                <label className="block text-xs text-muted mb-1">{t("inv_tax", lang)} (%)</label>
                <input type="number" min="0" max="100" value={taxPercentage}
                  onChange={(e) => setTaxPercentage(parseInt(e.target.value) || 0)}
                  className="w-20 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">{t("inv_discount", lang)}</label>
                <input type="number" min="0" value={discount}
                  onChange={(e) => setDiscount(parseInt(e.target.value) || 0)}
                  className="w-24 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-muted">{t("inv_total", lang)}</p>
                <p className="text-lg font-bold text-primary">{formatPKR(total)}</p>
              </div>
            </div>

            {/* Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="text" placeholder={lang === "ur" ? "نوٹس (انگریزی)" : "Notes (EN)"} value={notesEn}
                onChange={(e) => setNotesEn(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              <input type="text" placeholder={lang === "ur" ? "نوٹس (اردو)" : "Notes (UR)"} dir="rtl" value={notesUr}
                onChange={(e) => setNotesUr(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-urdu focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
              <button onClick={() => { setShowModal(false); resetForm(); }}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                {t("common_cancel", lang)}
              </button>
              <button onClick={handleSave} disabled={!customerId || items.every((i) => !i.description_en.trim())}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50">
                {t("common_save", lang)}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
