"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import Modal from "@/components/Modal";
import { useLanguage } from "@/lib/store";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  ensureDefaultCategories,
} from "@/lib/supabase/database";
import { t } from "@/lib/i18n";
import { hasPermission } from "@/lib/permissions";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import type { ExpenseCategory } from "@/types";
import { Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";

const COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ec4899", "#6b7280", "#0f766e", "#dc2626", "#1e40af"];

export default function CategoriesPage() {
  const { lang } = useLanguage();
  const { business, role, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const canCreate = hasPermission(role, "create");
  const canDelete = hasPermission(role, "delete");
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseCategory | null>(null);
  const [form, setForm] = useState({ name_en: "", name_ur: "", color: "#6b7280" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading || !business) {
      if (!authLoading) setLoading(false);
      return;
    }
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business, authLoading]);

  async function loadCategories() {
    if (!business) return;
    setLoading(true);
    await ensureDefaultCategories(business.id);
    const { data } = await getExpenseCategories(business.id);
    setCategories(data || []);
    setLoading(false);
  }

  function openAdd() {
    setEditing(null);
    setForm({ name_en: "", name_ur: "", color: "#6b7280" });
    setModalOpen(true);
  }

  function openEdit(cat: ExpenseCategory) {
    setEditing(cat);
    setForm({ name_en: cat.name_en, name_ur: cat.name_ur, color: cat.color });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!business || !form.name_en) return;
    setSaving(true);

    if (editing) {
      await updateExpenseCategory(editing.id, form);
    } else {
      await createExpenseCategory({ business_id: business.id, ...form });
    }

    setSaving(false);
    setModalOpen(false);
    loadCategories();
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: lang === "ur" ? "زمرہ حذف کریں؟" : "Delete Category?",
      message: lang === "ur" ? "کیا آپ واقعی یہ زمرہ حذف کرنا چاہتے ہیں؟" : "Are you sure you want to delete this category?",
      confirmText: lang === "ur" ? "حذف کریں" : "Delete",
      cancelText: t("common_cancel", lang),
      variant: "danger",
    });
    if (!ok) return;
    const { error } = await deleteExpenseCategory(id);
    if (error) {
      showToast(lang === "ur" ? "حذف نہیں ہو سکتا: اس زمرے میں اخراجات ہیں" : "Cannot delete: category has expenses. Reassign them first.", "error");
      return;
    }
    showToast(lang === "ur" ? "زمرہ حذف ہو گیا" : "Category deleted", "success");
    loadCategories();
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/expenses" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className={`text-2xl font-bold text-gray-900 ${lang === "ur" ? "font-urdu" : ""}`}>
              {t("exp_categories", lang)}
            </h1>
          </div>
          {canCreate && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className={lang === "ur" ? "font-urdu" : ""}>{t("exp_add_category", lang)}</span>
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-muted text-sm">{t("common_loading", lang)}</div>
          ) : categories.length === 0 ? (
            <div className="p-8 text-center text-muted text-sm">{t("common_no_data", lang)}</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{cat.name_en}</p>
                      {cat.name_ur && (
                        <p className="text-xs text-muted font-urdu">{cat.name_ur}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {canCreate && (
                      <button onClick={() => openEdit(cat)} className="p-1.5 text-muted hover:text-primary rounded-md hover:bg-gray-100">
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => handleDelete(cat.id)} className="p-1.5 text-muted hover:text-danger rounded-md hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t(editing ? "exp_edit_category" : "exp_add_category", lang)}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("exp_name", lang)} (English) *</label>
            <input
              type="text"
              value={form.name_en}
              onChange={(e) => setForm({ ...form, name_en: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 font-urdu">{t("exp_name", "ur")} (اردو)</label>
            <input
              type="text"
              value={form.name_ur}
              onChange={(e) => setForm({ ...form, name_ur: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-urdu"
              dir="rtl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t("exp_color", lang)}</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm({ ...form, color: c })}
                  className={`w-8 h-8 rounded-full transition-all ${form.color === c ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : "hover:scale-105"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving || !form.name_en}
              className="flex-1 bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {saving ? t("common_loading", lang) : t("common_save", lang)}
            </button>
            <button
              onClick={() => setModalOpen(false)}
              className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              {t("common_cancel", lang)}
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
