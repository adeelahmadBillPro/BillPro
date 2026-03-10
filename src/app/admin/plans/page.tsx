"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { getAllSubscriptionPlans, adminUpdatePlan } from "@/lib/supabase/database";
import { formatPKR } from "@/lib/i18n";
import { Tag, Check, Users, FileText, Loader2 } from "lucide-react";
import type { SubscriptionPlan } from "@/types";

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ price: 0, max_users: 0, max_invoices_per_month: 0 });

  useEffect(() => {
    async function load() {
      const { data } = await getAllSubscriptionPlans();
      setPlans(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditing(plan.id);
    setEditForm({ price: plan.price, max_users: plan.max_users, max_invoices_per_month: plan.max_invoices_per_month });
  };

  const handleSave = async (planId: string) => {
    await adminUpdatePlan(planId, editForm);
    const { data } = await getAllSubscriptionPlans();
    setPlans(data || []);
    setEditing(null);
  };

  const toggleActive = async (plan: SubscriptionPlan) => {
    await adminUpdatePlan(plan.id, { is_active: !plan.is_active });
    const { data } = await getAllSubscriptionPlans();
    setPlans(data || []);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription Plans</h1>
          <p className="text-sm text-muted">Manage pricing and features</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl border-2 shadow-sm p-5 ${
                plan.is_active ? "border-gray-200/60" : "border-red-200 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                </div>
                <button
                  onClick={() => toggleActive(plan)}
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    plan.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {plan.is_active ? "Active" : "Disabled"}
                </button>
              </div>

              <p className="text-sm text-muted mb-3">{plan.description}</p>

              {editing === plan.id ? (
                <div className="space-y-3 border-t border-gray-200 pt-3">
                  <div>
                    <label className="block text-xs text-muted mb-1">Price (PKR/month)</label>
                    <input
                      type="number"
                      value={editForm.price}
                      onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-muted mb-1">Max Users</label>
                      <input
                        type="number"
                        value={editForm.max_users}
                        onChange={(e) => setEditForm({ ...editForm, max_users: Number(e.target.value) })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-1">Max Invoices/mo</label>
                      <input
                        type="number"
                        value={editForm.max_invoices_per_month}
                        onChange={(e) => setEditForm({ ...editForm, max_invoices_per_month: Number(e.target.value) })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(plan.id)}
                      className="inline-flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-lg text-sm font-medium"
                    >
                      <Check className="w-3.5 h-3.5" /> Save
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      className="px-3 py-1.5 text-sm text-muted hover:text-gray-900"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-3xl font-bold text-gray-900 mb-3">
                    {plan.price === 0 ? "Free" : formatPKR(plan.price)}
                    {plan.price > 0 && <span className="text-sm font-normal text-muted">/mo</span>}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted mb-3">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {plan.max_users} users</span>
                    <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> {plan.max_invoices_per_month} inv/mo</span>
                  </div>
                  <button
                    onClick={() => handleEdit(plan)}
                    className="text-sm text-primary hover:underline font-medium"
                  >
                    Edit Plan
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
