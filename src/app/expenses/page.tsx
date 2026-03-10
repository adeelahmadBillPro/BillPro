"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import Modal from "@/components/Modal";
import CategoryBadge from "@/components/CategoryBadge";
import { useLanguage } from "@/lib/store";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getExpenses,
  getExpenseCategories,
  createExpense,
  updateExpense,
  deleteExpense,
  ensureDefaultCategories,
  getExpenseStats,
  logActivity,
} from "@/lib/supabase/database";
import { t, formatPKR, formatDate } from "@/lib/i18n";
import { hasPermission } from "@/lib/permissions";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import type { Expense, ExpenseCategory, PaymentMethod } from "@/types";
import { Plus, Search, Pencil, Trash2, Settings2, Wallet } from "lucide-react";
import EmptyState from "@/components/EmptyState";

const PAYMENT_METHODS: { value: PaymentMethod; labelKey: string }[] = [
  { value: "cash", labelKey: "pay_cash" },
  { value: "bank_transfer", labelKey: "pay_bank" },
  { value: "cheque", labelKey: "pay_cheque" },
  { value: "online", labelKey: "pay_online" },
];

export default function ExpensesPage() {
  const { lang } = useLanguage();
  const { user, business, role, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const canCreate = hasPermission(role, "create");
  const canDelete = hasPermission(role, "delete");

  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [stats, setStats] = useState({ total: 0, this_month: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState({
    description_en: "",
    description_ur: "",
    amount: "",
    expense_date: new Date().toISOString().split("T")[0],
    category_id: "",
    payment_method: "cash" as PaymentMethod,
    reference_number: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (authLoading || !business) {
      if (!authLoading) setLoading(false);
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business, authLoading]);

  async function loadData() {
    if (!business) return;
    setLoading(true);
    await ensureDefaultCategories(business.id);
    const [expRes, catRes, statsRes] = await Promise.all([
      getExpenses(business.id),
      getExpenseCategories(business.id),
      getExpenseStats(business.id),
    ]);
    setExpenses(expRes.data || []);
    setCategories(catRes.data || []);
    setStats(statsRes);
    setLoading(false);
  }

  function openAdd() {
    setEditing(null);
    setFormErrors({});
    setForm({
      description_en: "",
      description_ur: "",
      amount: "",
      expense_date: new Date().toISOString().split("T")[0],
      category_id: categories[0]?.id || "",
      payment_method: "cash",
      reference_number: "",
      notes: "",
    });
    setModalOpen(true);
  }

  function openEdit(exp: Expense) {
    setEditing(exp);
    setFormErrors({});
    setForm({
      description_en: exp.description_en,
      description_ur: exp.description_ur || "",
      amount: String(exp.amount),
      expense_date: exp.expense_date,
      category_id: exp.category_id || "",
      payment_method: exp.payment_method,
      reference_number: exp.reference_number || "",
      notes: exp.notes || "",
    });
    setModalOpen(true);
  }

  async function handleSave() {
    const errs: Record<string, string> = {};
    if (!form.description_en.trim()) errs.description_en = lang === "ur" ? "تفصیل ضروری ہے" : "Description is required";
    if (!form.amount || parseFloat(form.amount) <= 0) errs.amount = lang === "ur" ? "رقم ضروری ہے" : "Amount must be greater than 0";
    setFormErrors(errs);
    if (Object.keys(errs).length > 0 || !business) return;
    setSaving(true);

    const payload = {
      business_id: business.id,
      description_en: form.description_en,
      description_ur: form.description_ur,
      amount: parseFloat(form.amount),
      expense_date: form.expense_date,
      category_id: form.category_id || null,
      payment_method: form.payment_method,
      reference_number: form.reference_number,
      notes: form.notes,
    };

    if (editing) {
      await updateExpense(editing.id, payload);
      if (user) await logActivity(business.id, user.id, "updated", "expense", form.description_en, editing.id);
    } else {
      await createExpense(payload);
      if (user) await logActivity(business.id, user.id, "created", "expense", form.description_en);
    }

    setSaving(false);
    setModalOpen(false);
    showToast(editing ? (lang === "ur" ? "خرچہ اپ ڈیٹ ہو گیا" : "Expense updated") : (lang === "ur" ? "خرچہ شامل ہو گیا" : "Expense added"), "success");
    loadData();
  }

  async function handleDelete(id: string) {
    const exp = expenses.find((e: any) => e.id === id);
    const ok = await confirm({
      title: lang === "ur" ? "خرچہ حذف کریں؟" : "Delete Expense?",
      message: lang === "ur" ? `کیا آپ واقعی "${exp?.description_en || ""}" حذف کرنا چاہتے ہیں؟` : `Are you sure you want to delete "${exp?.description_en || ""}"?`,
      confirmText: lang === "ur" ? "حذف کریں" : "Delete",
      cancelText: t("common_cancel", lang),
      variant: "danger",
    });
    if (!ok) return;
    await deleteExpense(id);
    if (user && business) await logActivity(business.id, user.id, "deleted", "expense", exp?.description_en || "", id);
    showToast(lang === "ur" ? "خرچہ حذف ہو گیا" : "Expense deleted", "success");
    loadData();
  }

  // Filter expenses
  const filtered = expenses.filter((exp: any) => {
    const matchSearch =
      exp.description_en?.toLowerCase().includes(search.toLowerCase()) ||
      exp.description_ur?.includes(search);
    const matchCategory = filterCategory === "all" || exp.category_id === filterCategory;
    return matchSearch && matchCategory;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className={`text-2xl font-bold text-gray-900 ${lang === "ur" ? "font-urdu" : ""}`}>
              {t("exp_title", lang)}
            </h1>
          </div>
          <div className="flex gap-2">
            <Link
              href="/expenses/categories"
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Settings2 className="w-4 h-4" />
              <span className={lang === "ur" ? "font-urdu" : ""}>{t("exp_categories", lang)}</span>
            </Link>
            {canCreate && (
              <button
                onClick={openAdd}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className={lang === "ur" ? "font-urdu" : ""}>{t("exp_add", lang)}</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-gray-200/60 shadow-sm">
            <p className={`text-sm text-muted ${lang === "ur" ? "font-urdu" : ""}`}>{t("exp_total", lang)}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatPKR(stats.total)}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-200/60 shadow-sm">
            <p className={`text-sm text-muted ${lang === "ur" ? "font-urdu" : ""}`}>{t("exp_this_month", lang)}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatPKR(stats.this_month)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder={t("common_search", lang)}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">{t("common_filter", lang)}: {t("exp_category", lang)}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {lang === "ur" ? cat.name_ur || cat.name_en : cat.name_en}
              </option>
            ))}
          </select>
        </div>

        {/* Expenses Table */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-start p-4 text-sm font-medium text-muted">{t("exp_date", lang)}</th>
                <th className="text-start p-4 text-sm font-medium text-muted">{t("exp_description", lang)}</th>
                <th className="text-start p-4 text-sm font-medium text-muted">{t("exp_category", lang)}</th>
                <th className="text-start p-4 text-sm font-medium text-muted">{t("exp_amount", lang)}</th>
                <th className="text-start p-4 text-sm font-medium text-muted">{t("pay_method", lang)}</th>
                <th className="text-start p-4 text-sm font-medium text-muted">{t("common_actions", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="p-4"><div className="skeleton h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6}>
                  <EmptyState
                    icon={Wallet}
                    title={lang === "ur" ? "کوئی خرچہ نہیں ملا" : "No expenses found"}
                    description={lang === "ur" ? "اپنا پہلا خرچہ شامل کریں" : "Add your first expense to start tracking"}
                    action={canCreate ? { label: t("exp_add", lang), onClick: openAdd } : undefined}
                  />
                </td></tr>
              ) : (
                filtered.map((exp: any) => (
                  <tr key={exp.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm text-muted">{formatDate(exp.expense_date, lang)}</td>
                    <td className="p-4 text-sm font-medium text-gray-900">
                      {lang === "ur" ? exp.description_ur || exp.description_en : exp.description_en}
                    </td>
                    <td className="p-4">
                      {exp.category ? (
                        <CategoryBadge
                          nameEn={exp.category.name_en}
                          nameUr={exp.category.name_ur}
                          color={exp.category.color}
                          lang={lang}
                        />
                      ) : (
                        <span className="text-sm text-muted">{t("exp_no_category", lang)}</span>
                      )}
                    </td>
                    <td className="p-4 text-sm font-semibold text-gray-900">{formatPKR(Number(exp.amount))}</td>
                    <td className="p-4 text-sm text-muted">
                      {t(`pay_${exp.payment_method === "bank_transfer" ? "bank" : exp.payment_method}`, lang)}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {canCreate && (
                          <button onClick={() => openEdit(exp)} className="p-1.5 text-muted hover:text-primary rounded-md hover:bg-gray-100">
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => handleDelete(exp.id)} className="p-1.5 text-muted hover:text-danger rounded-md hover:bg-red-50">
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

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t(editing ? "exp_edit" : "exp_add", lang)}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("exp_description", lang)} (English) <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={form.description_en}
              onChange={(e) => { setForm({ ...form, description_en: e.target.value }); setFormErrors(prev => { const n = { ...prev }; delete n.description_en; return n; }); }}
              className={`w-full border rounded-lg px-3 py-2 text-sm transition-colors ${formErrors.description_en ? "border-red-400 focus:ring-red-200 bg-red-50" : "border-gray-200 focus:ring-primary/20"}`}
            />
            {formErrors.description_en && <p className="text-xs text-danger mt-1 animate-shake">{formErrors.description_en}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 font-urdu">
              {t("exp_description", "ur")} (اردو)
            </label>
            <input
              type="text"
              value={form.description_ur}
              onChange={(e) => setForm({ ...form, description_ur: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-urdu"
              dir="rtl"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("exp_amount", lang)} (PKR) <span className="text-danger">*</span></label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => { setForm({ ...form, amount: e.target.value }); setFormErrors(prev => { const n = { ...prev }; delete n.amount; return n; }); }}
                className={`w-full border rounded-lg px-3 py-2 text-sm transition-colors ${formErrors.amount ? "border-red-400 focus:ring-red-200 bg-red-50" : "border-gray-200 focus:ring-primary/20"}`}
                min="0"
                step="0.01"
              />
              {formErrors.amount && <p className="text-xs text-danger mt-1 animate-shake">{formErrors.amount}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("exp_date", lang)}</label>
              <input
                type="date"
                value={form.expense_date}
                onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("exp_category", lang)}</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">— {t("exp_no_category", lang)} —</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {lang === "ur" ? cat.name_ur || cat.name_en : cat.name_en}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("pay_method", lang)}</label>
              <select
                value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value as PaymentMethod })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{t(m.labelKey, lang)}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("pay_reference", lang)}</label>
            <input
              type="text"
              value={form.reference_number}
              onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("inv_notes", lang)}</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              rows={2}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving || !form.description_en || !form.amount}
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
