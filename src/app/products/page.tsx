"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Modal from "@/components/Modal";
import { useLanguage } from "@/lib/store";
import { useAuth } from "@/lib/hooks/useAuth";
import { getProducts, createProduct, updateProduct, deleteProduct, logActivity } from "@/lib/supabase/database";
import { t, formatPKR } from "@/lib/i18n";
import { hasPermission } from "@/lib/permissions";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { Plus, Search, Edit2, Trash2, Package, ToggleLeft, ToggleRight } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import type { Product } from "@/types";

const UNITS = ["piece", "hour", "day", "kg", "meter", "service", "month", "unit"];

export default function ProductsPage() {
  const { lang } = useLanguage();
  const { user, business, role } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const canCreate = hasPermission(role, "create");
  const canDelete = hasPermission(role, "delete");
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name_en: "", name_ur: "", description_en: "", description_ur: "",
    unit_price: "", unit: "piece", is_active: true, stock_quantity: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const loadProducts = useCallback(async () => {
    if (!business) return;
    setLoading(true);
    const { data } = await getProducts(business.id);
    setProducts(data || []);
    setLoading(false);
  }, [business]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const resetForm = () => {
    setForm({ name_en: "", name_ur: "", description_en: "", description_ur: "", unit_price: "", unit: "piece", is_active: true, stock_quantity: "" });
    setEditing(null);
  };

  const openAdd = () => { resetForm(); setFormErrors({}); setShowModal(true); };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name_en: p.name_en, name_ur: p.name_ur,
      description_en: p.description_en, description_ur: p.description_ur,
      unit_price: String(p.unit_price), unit: p.unit, is_active: p.is_active,
      stock_quantity: p.stock_quantity !== null ? String(p.stock_quantity) : "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    const errs: Record<string, string> = {};
    if (!form.name_en.trim()) errs.name_en = lang === "ur" ? "نام ضروری ہے" : "Product name is required";
    if (!form.unit_price || parseFloat(form.unit_price) <= 0) errs.unit_price = lang === "ur" ? "قیمت ضروری ہے" : "Price must be greater than 0";
    setFormErrors(errs);
    if (Object.keys(errs).length > 0 || !business) return;
    const payload = {
      business_id: business.id,
      name_en: form.name_en.trim(),
      name_ur: form.name_ur.trim(),
      description_en: form.description_en.trim(),
      description_ur: form.description_ur.trim(),
      unit_price: parseFloat(form.unit_price) || 0,
      unit: form.unit,
      is_active: form.is_active,
      stock_quantity: form.stock_quantity.trim() === "" ? null : parseInt(form.stock_quantity) || 0,
    };
    if (editing) {
      await updateProduct(editing.id, payload);
      if (user) await logActivity(business.id, user.id, "updated", "product", form.name_en, editing.id);
    } else {
      await createProduct(payload);
      if (user) await logActivity(business.id, user.id, "created", "product", form.name_en);
    }
    setShowModal(false);
    resetForm();
    showToast(editing ? (lang === "ur" ? "مصنوعات اپ ڈیٹ ہو گئی" : "Product updated") : (lang === "ur" ? "مصنوعات شامل ہو گئی" : "Product added"), "success");
    loadProducts();
  };

  const handleDelete = async (id: string) => {
    const prod = products.find(p => p.id === id);
    const ok = await confirm({
      title: lang === "ur" ? "مصنوعات حذف کریں؟" : "Delete Product?",
      message: lang === "ur" ? `کیا آپ واقعی "${prod?.name_en || ""}" حذف کرنا چاہتے ہیں؟` : `Are you sure you want to delete "${prod?.name_en || ""}"?`,
      confirmText: lang === "ur" ? "حذف کریں" : "Delete",
      cancelText: t("common_cancel", lang),
      variant: "danger",
    });
    if (!ok) return;
    await deleteProduct(id);
    if (user && business) await logActivity(business.id, user.id, "deleted", "product", prod?.name_en || "", id);
    showToast(lang === "ur" ? "مصنوعات حذف ہو گئی" : "Product deleted", "success");
    loadProducts();
  };

  const handleToggleActive = async (p: Product) => {
    await updateProduct(p.id, { is_active: !p.is_active });
    if (user && business) await logActivity(business.id, user.id, "updated", "product", p.name_en, p.id, { toggled_active: !p.is_active });
    loadProducts();
  };

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    return !q || p.name_en.toLowerCase().includes(q) || p.name_ur.includes(q);
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className={`text-2xl font-bold text-gray-900 ${lang === "ur" ? "font-urdu" : ""}`}>
            {t("nav_products", lang)}
          </h1>
          {canCreate && (
            <button onClick={openAdd}
              className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors">
              <Plus className="w-4 h-4" /> {t("prod_add", lang)}
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t("common_search", lang)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3 animate-fade-in">
                <div className="skeleton h-5 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
                <div className="skeleton h-7 w-24" />
                <div className="skeleton h-3 w-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title={lang === "ur" ? "کوئی مصنوعات نہیں ملی" : "No products found"}
            description={search ? (lang === "ur" ? "دوسری تلاش آزمائیں" : "Try a different search term") : (lang === "ur" ? "اپنی پہلی مصنوعات شامل کریں" : "Add your first product to get started")}
            action={!search && canCreate ? { label: t("prod_add", lang), onClick: openAdd } : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <div key={p.id}
                className={`bg-white rounded-2xl border shadow-sm p-5 transition-all hover:shadow-md ${p.is_active ? "border-gray-200/60" : "border-gray-200/60 opacity-60"}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{p.name_en}</h3>
                    {p.name_ur && <p className="text-sm text-muted font-urdu truncate" dir="rtl">{p.name_ur}</p>}
                  </div>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${p.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {p.is_active ? (lang === "ur" ? "فعال" : "Active") : (lang === "ur" ? "غیر فعال" : "Inactive")}
                  </span>
                </div>

                {(p.description_en || p.description_ur) && (
                  <p className="text-sm text-muted mb-3 line-clamp-2">
                    {lang === "ur" && p.description_ur ? p.description_ur : p.description_en}
                  </p>
                )}

                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold text-primary">{formatPKR(p.unit_price)}</span>
                  <span className="text-xs text-muted bg-gray-100 px-2 py-1 rounded">/ {p.unit}</span>
                </div>
                <div className="mb-4">
                  {p.stock_quantity !== null && (
                    <span className={`text-xs font-medium px-2 py-1 rounded ${p.stock_quantity > 0 ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"}`}>
                      {t("prod_stock", lang)}: {p.stock_quantity}
                    </span>
                  )}
                </div>

                {canCreate && (
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    <button onClick={() => openEdit(p)}
                      className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-dark transition-colors">
                      <Edit2 className="w-3.5 h-3.5" /> {t("common_edit", lang)}
                    </button>
                    <button onClick={() => handleToggleActive(p)}
                      className="flex items-center gap-1.5 text-sm text-muted hover:text-gray-700 transition-colors ml-auto">
                      {p.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    {canDelete && (
                      <button onClick={() => handleDelete(p.id)}
                        className="flex items-center gap-1.5 text-sm text-danger hover:text-red-700 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Modal */}
        <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }}
          title={editing ? t("prod_edit", lang) : t("prod_add", lang)}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("prod_name_en", lang)} <span className="text-danger">*</span>
                </label>
                <input type="text" value={form.name_en}
                  onChange={(e) => { setForm({ ...form, name_en: e.target.value }); setFormErrors(prev => { const n = { ...prev }; delete n.name_en; return n; }); }}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${formErrors.name_en ? "border-red-400 focus:ring-red-200 bg-red-50" : "border-gray-300 focus:ring-primary/20"}`} />
                {formErrors.name_en && <p className="text-xs text-danger mt-1 animate-shake">{formErrors.name_en}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("prod_name_ur", lang)}
                </label>
                <input type="text" dir="rtl" value={form.name_ur}
                  onChange={(e) => setForm({ ...form, name_ur: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-urdu focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("prod_desc_en", lang)}
                </label>
                <input type="text" value={form.description_en}
                  onChange={(e) => setForm({ ...form, description_en: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("prod_desc_ur", lang)}
                </label>
                <input type="text" dir="rtl" value={form.description_ur}
                  onChange={(e) => setForm({ ...form, description_ur: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-urdu focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("prod_price", lang)} (PKR) <span className="text-danger">*</span>
                </label>
                <input type="number" value={form.unit_price}
                  onChange={(e) => { setForm({ ...form, unit_price: e.target.value }); setFormErrors(prev => { const n = { ...prev }; delete n.unit_price; return n; }); }}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${formErrors.unit_price ? "border-red-400 focus:ring-red-200 bg-red-50" : "border-gray-300 focus:ring-primary/20"}`} />
                {formErrors.unit_price && <p className="text-xs text-danger mt-1 animate-shake">{formErrors.unit_price}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("prod_unit", lang)}
                </label>
                <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("prod_stock", lang)}
              </label>
              <input type="number" min="0" value={form.stock_quantity}
                onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                placeholder={lang === "ur" ? "خالی = لامحدود" : "Empty = unlimited"}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              <p className="text-xs text-muted mt-1">{lang === "ur" ? "خالی چھوڑیں = اسٹاک ٹریکنگ غیر فعال" : "Leave empty = no stock tracking"}</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/20" />
              <span className="text-sm text-gray-700">{t("prod_active", lang)}</span>
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => { setShowModal(false); resetForm(); }}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                {t("common_cancel", lang)}
              </button>
              <button onClick={handleSave} disabled={!form.name_en.trim()}
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
