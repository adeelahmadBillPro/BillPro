"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { useLanguage } from "@/lib/store";
import { useAuth } from "@/lib/hooks/useAuth";
import { getInvoice, getCustomers, updateInvoice, getActiveProducts, logActivity } from "@/lib/supabase/database";
import { t, formatPKR } from "@/lib/i18n";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import type { Customer, Product } from "@/types";

interface ItemForm {
  description_en: string;
  description_ur: string;
  quantity: number;
  unit_price: number;
}

export default function EditInvoicePage() {
  const { lang } = useLanguage();
  const { user, business } = useAuth();
  const params = useParams();
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState<ItemForm[]>([
    { description_en: "", description_ur: "", quantity: 1, unit_price: 0 },
  ]);
  const [taxPercentage, setTaxPercentage] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [notesEn, setNotesEn] = useState("");
  const [notesUr, setNotesUr] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    if (!business || !params.id) return;
    setLoading(true);

    const [invRes, custRes, prodRes] = await Promise.all([
      getInvoice(params.id as string),
      getCustomers(business.id),
      getActiveProducts(business.id),
    ]);

    setCustomers(custRes.data || []);
    setProducts(prodRes.data || []);

    if (invRes.data) {
      const inv = invRes.data;
      setCustomerId(inv.customer_id);
      setInvoiceNumber(inv.invoice_number);
      setIssueDate(inv.issue_date);
      setDueDate(inv.due_date);
      setTaxPercentage(Number(inv.tax_percentage) || 0);
      setDiscount(Number(inv.discount) || 0);
      setNotesEn(inv.notes_en || "");
      setNotesUr(inv.notes_ur || "");

      const invItems = (inv.items || []).map((item: any) => ({
        description_en: item.description_en || "",
        description_ur: item.description_ur || "",
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price) || 0,
      }));
      if (invItems.length > 0) setItems(invItems);
    }

    setLoading(false);
  }, [business, params.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const addItem = () => {
    setItems([...items, { description_en: "", description_ur: "", quantity: 1, unit_price: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ItemForm, value: string | number) => {
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

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const taxAmount = Math.round((subtotal * taxPercentage) / 100);
  const total = subtotal + taxAmount - discount;

  const handleSave = async () => {
    if (!business || !params.id) return;
    setError("");

    if (!customerId) {
      setError(lang === "ur" ? "براہ کرم صارف منتخب کریں" : "Please select a customer");
      return;
    }
    if (items.every((i) => !i.description_en.trim())) {
      setError(lang === "ur" ? "کم از کم ایک شے شامل کریں" : "Please add at least one item");
      return;
    }

    setSaving(true);

    const invoiceData = {
      customer_id: customerId,
      issue_date: issueDate,
      due_date: dueDate,
      subtotal,
      tax_percentage: taxPercentage,
      tax_amount: taxAmount,
      discount,
      total,
      notes_en: notesEn,
      notes_ur: notesUr,
    };

    const itemsData = items
      .filter((i) => i.description_en.trim())
      .map((item, index) => ({
        description_en: item.description_en,
        description_ur: item.description_ur,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price,
        sort_order: index,
      }));

    const { error: saveError } = await updateInvoice(params.id as string, invoiceData, itemsData);

    if (saveError) {
      setError(saveError.message);
      setSaving(false);
    } else {
      if (user && business) await logActivity(business.id, user.id, "updated", "invoice", invoiceNumber, params.id as string);
      router.push(`/invoices/${params.id}`);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-muted">{t("common_loading", lang)}</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push(`/invoices/${params.id}`)} className="p-2 text-muted hover:text-gray-900 rounded-md hover:bg-gray-100">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className={`text-2xl font-bold text-gray-900 ${lang === "ur" ? "font-urdu" : ""}`}>
              {t("inv_edit", lang)}
            </h1>
          </div>
          <span className="text-sm text-muted font-mono">{invoiceNumber}</span>
        </div>

        {error && (
          <div className="bg-red-50 text-danger text-sm p-3 rounded-lg">{error}</div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
          {/* Customer & Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("inv_customer", lang)} *</label>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">{lang === "ur" ? "-- صارف منتخب کریں --" : "-- Select Customer --"}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_en} {c.name_ur ? `/ ${c.name_ur}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("inv_date", lang)}</label>
                <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("inv_due_date", lang)}</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>
          </div>

          {/* Items */}
          <div>
            <h3 className={`text-sm font-semibold text-gray-900 mb-3 ${lang === "ur" ? "font-urdu" : ""}`}>
              {t("inv_items", lang)}
            </h3>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3 md:p-0 md:border-0 md:rounded-none">
                  {products.length > 0 && (
                    <div className="mb-2 md:mb-1">
                      <select defaultValue=""
                        onChange={(e) => { fillFromProduct(index, e.target.value); e.target.value = ""; }}
                        className="w-full md:w-auto border border-dashed border-primary/40 rounded-lg px-3 py-1.5 text-xs text-primary bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/20">
                        <option value="">{lang === "ur" ? "📦 پروڈکٹ سے بھریں..." : "📦 Fill from product..."}</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name_en} — Rs {Number(p.unit_price).toLocaleString()}/{p.unit}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {/* Desktop */}
                  <div className="hidden md:grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-4">
                      {index === 0 && <label className="block text-xs text-muted mb-1">{t("inv_description", lang)} (EN)</label>}
                      <input type="text" placeholder="Description" value={item.description_en}
                        onChange={(e) => updateItem(index, "description_en", e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div className="col-span-3">
                      {index === 0 && <label className="block text-xs text-muted mb-1">{t("inv_description", lang)} (UR)</label>}
                      <input type="text" placeholder="تفصیل" dir="rtl" value={item.description_ur}
                        onChange={(e) => updateItem(index, "description_ur", e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-urdu focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div className="col-span-1">
                      {index === 0 && <label className="block text-xs text-muted mb-1">{t("inv_quantity", lang)}</label>}
                      <input type="number" min="1" value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div className="col-span-2">
                      {index === 0 && <label className="block text-xs text-muted mb-1">{t("inv_unit_price", lang)}</label>}
                      <input type="number" min="0" value={item.unit_price}
                        onChange={(e) => updateItem(index, "unit_price", parseInt(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div className="col-span-1 text-sm font-semibold text-gray-900 py-2">
                      {formatPKR(item.quantity * item.unit_price)}
                    </div>
                    <div className="col-span-1">
                      <button onClick={() => removeItem(index)} className="p-2 text-muted hover:text-danger rounded-md hover:bg-red-50" disabled={items.length === 1}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {/* Mobile */}
                  <div className="md:hidden space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted">#{index + 1}</span>
                      <button onClick={() => removeItem(index)} className="p-2 text-muted hover:text-danger rounded-md hover:bg-red-50" disabled={items.length === 1}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <input type="text" placeholder="Description (EN)" value={item.description_en}
                      onChange={(e) => updateItem(index, "description_en", e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    <input type="text" placeholder="تفصیل (اردو)" dir="rtl" value={item.description_ur}
                      onChange={(e) => updateItem(index, "description_ur", e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-urdu focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs text-muted mb-1">{t("inv_quantity", lang)}</label>
                        <input type="number" min="1" value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 0)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      </div>
                      <div>
                        <label className="block text-xs text-muted mb-1">{t("inv_unit_price", lang)}</label>
                        <input type="number" min="0" value={item.unit_price}
                          onChange={(e) => updateItem(index, "unit_price", parseInt(e.target.value) || 0)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      </div>
                      <div>
                        <label className="block text-xs text-muted mb-1">{t("inv_total", lang)}</label>
                        <div className="border border-transparent rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-900">
                          {formatPKR(item.quantity * item.unit_price)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={addItem} className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:text-primary-dark font-medium">
              <Plus className="w-4 h-4" /> {t("inv_add_item", lang)}
            </button>
          </div>

          {/* Totals */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-end">
              <div className="w-full md:w-72 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">{t("inv_subtotal", lang)}</span>
                  <span className="font-medium">{formatPKR(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm items-center gap-4">
                  <span className="text-muted">{t("inv_tax", lang)} (%)</span>
                  <input type="number" min="0" max="100" value={taxPercentage} onChange={(e) => setTaxPercentage(parseInt(e.target.value) || 0)}
                    className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <span className="font-medium w-24 text-right">{formatPKR(taxAmount)}</span>
                </div>
                <div className="flex justify-between text-sm items-center gap-4">
                  <span className="text-muted">{t("inv_discount", lang)}</span>
                  <input type="number" min="0" value={discount} onChange={(e) => setDiscount(parseInt(e.target.value) || 0)}
                    className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <span className="font-medium w-24 text-right">-{formatPKR(discount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-3">
                  <span>{t("inv_total", lang)}</span>
                  <span className="text-primary">{formatPKR(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("inv_notes", lang)} (English)</label>
              <textarea rows={3} value={notesEn} onChange={(e) => setNotesEn(e.target.value)} placeholder="Additional notes..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("inv_notes", lang)} (اردو)</label>
              <textarea rows={3} dir="rtl" value={notesUr} onChange={(e) => setNotesUr(e.target.value)} placeholder="اضافی نوٹس..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-urdu focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 border-t border-gray-200 pt-4">
            <button onClick={() => router.push(`/invoices/${params.id}`)} className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              {t("common_cancel", lang)}
            </button>
            <button onClick={handleSave} disabled={saving}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50">
              <Save className="w-4 h-4" />
              {saving ? t("common_loading", lang) : t("common_save", lang)}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
