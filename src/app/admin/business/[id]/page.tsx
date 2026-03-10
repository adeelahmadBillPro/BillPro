"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminLayout from "@/components/AdminLayout";
import {
  adminGetBusinessDetail,
  adminGetBusinessStats,
  getBusinessSubscription,
  getAllSubscriptionPlans,
  activateSubscription,
  updateSubscriptionStatus,
} from "@/lib/supabase/database";
import { formatPKR } from "@/lib/i18n";
import {
  ArrowLeft,
  Building2,
  Users,
  FileText,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Crown,
  Loader2,
  Shield,
} from "lucide-react";
import type { Subscription, SubscriptionPlan } from "@/types";

export default function AdminBusinessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.id as string;

  const [business, setBusiness] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  // Activate form
  const [selectedPlan, setSelectedPlan] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("manual");
  const [paymentRef, setPaymentRef] = useState("");
  const [notes, setNotes] = useState("");

  const loadData = useCallback(async () => {
    const [bizRes, statsRes, subRes, plansRes] = await Promise.all([
      adminGetBusinessDetail(businessId),
      adminGetBusinessStats(businessId),
      getBusinessSubscription(businessId),
      getAllSubscriptionPlans(),
    ]);
    setBusiness(bizRes.data);
    setStats(statsRes);
    setSubscription(subRes.data);
    setPlans((plansRes.data || []).filter(p => p.price > 0));
    if (plansRes.data?.[1]) setSelectedPlan(plansRes.data[1].id);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleActivate = async () => {
    if (!selectedPlan) return;
    setActivating(true);
    await activateSubscription(businessId, selectedPlan, paymentMethod, paymentRef, notes);
    await loadData();
    setActivating(false);
  };

  const handleDeactivate = async () => {
    setActivating(true);
    await updateSubscriptionStatus(businessId, "cancelled");
    await loadData();
    setActivating(false);
  };

  const handleExtendTrial = async () => {
    // Extend trial by 14 more days from now
    setActivating(true);
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);
    await supabase.from("subscriptions").upsert({
      business_id: businessId,
      status: "trialing",
      trial_ends_at: trialEnd.toISOString(),
    }, { onConflict: "business_id" });
    await loadData();
    setActivating(false);
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

  if (!business) {
    return (
      <AdminLayout>
        <div className="text-center py-20 text-muted">Business not found</div>
      </AdminLayout>
    );
  }

  const subStatus = subscription?.status || "no_subscription";
  const isTrialExpired = subStatus === "trialing" && subscription?.trial_ends_at && new Date(subscription.trial_ends_at) < new Date();

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/admin")} className="p-2 text-muted hover:text-gray-900 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{business.name_en}</h1>
            {business.name_ur && <p className="text-sm text-muted font-urdu" dir="rtl">{business.name_ur}</p>}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-blue-500" />
              <p className="text-xs text-muted">Invoices</p>
            </div>
            <p className="text-2xl font-bold">{stats?.invoiceCount || 0}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-green-500" />
              <p className="text-xs text-muted">Revenue</p>
            </div>
            <p className="text-2xl font-bold">{formatPKR(stats?.totalRevenue || 0)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-purple-500" />
              <p className="text-xs text-muted">Customers</p>
            </div>
            <p className="text-2xl font-bold">{stats?.customerCount || 0}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-amber-500" />
              <p className="text-xs text-muted">Team Members</p>
            </div>
            <p className="text-2xl font-bold">{stats?.memberCount || 0}</p>
          </div>
        </div>

        {/* Business Info */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Business Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted">Email:</span> <span className="font-medium">{business.email || "—"}</span></div>
            <div><span className="text-muted">Phone:</span> <span className="font-medium">{business.phone || "—"}</span></div>
            <div><span className="text-muted">Address:</span> <span className="font-medium">{business.address_en || "—"}</span></div>
            <div><span className="text-muted">NTN:</span> <span className="font-medium">{business.ntn_number || "—"}</span></div>
            <div><span className="text-muted">Created:</span> <span className="font-medium">{new Date(business.created_at).toLocaleDateString()}</span></div>
            <div><span className="text-muted">Currency:</span> <span className="font-medium">{business.currency || "PKR"}</span></div>
          </div>
        </div>

        {/* Subscription Status */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Subscription</h2>

          <div className="flex items-center gap-3 mb-4">
            <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${
              subStatus === "active" ? "bg-green-100 text-green-700" :
              subStatus === "trialing" && !isTrialExpired ? "bg-amber-100 text-amber-700" :
              "bg-red-100 text-red-700"
            }`}>
              {subStatus === "active" && <CheckCircle2 className="w-4 h-4" />}
              {subStatus === "trialing" && !isTrialExpired && <Clock className="w-4 h-4" />}
              {(isTrialExpired || subStatus === "expired" || subStatus === "cancelled" || subStatus === "no_subscription") && <XCircle className="w-4 h-4" />}
              {isTrialExpired ? "Trial Expired" : subStatus === "no_subscription" ? "No Subscription" : subStatus.charAt(0).toUpperCase() + subStatus.slice(1)}
            </span>
            {subscription?.plan && (
              <span className="text-sm text-muted">
                Plan: <strong>{subscription.plan.name}</strong> — {formatPKR(subscription.plan.price)}/mo
              </span>
            )}
          </div>

          {subscription?.trial_ends_at && (
            <p className="text-sm text-muted mb-2">Trial ends: {new Date(subscription.trial_ends_at).toLocaleDateString()}</p>
          )}
          {subscription?.current_period_end && (
            <p className="text-sm text-muted mb-2">Period ends: {new Date(subscription.current_period_end).toLocaleDateString()}</p>
          )}
          {subscription?.payment_method && (
            <p className="text-sm text-muted mb-2">Payment: {subscription.payment_method} {subscription.payment_reference ? `(${subscription.payment_reference})` : ""}</p>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 mt-4 mb-4">
            <button
              onClick={handleExtendTrial}
              disabled={activating}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm font-medium hover:bg-amber-200 transition-colors disabled:opacity-50"
            >
              <Clock className="w-4 h-4" />
              Extend Trial +14 days
            </button>
            {subStatus === "active" && (
              <button
                onClick={handleDeactivate}
                disabled={activating}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                Deactivate
              </button>
            )}
          </div>

          {/* Activate Subscription Form */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Crown className="w-4 h-4 text-primary" />
              Activate Subscription
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Plan</label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name} — {formatPKR(p.price)}/mo</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="manual">Manual</option>
                  <option value="jazzcash">JazzCash</option>
                  <option value="easypaisa">Easypaisa</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="stripe">Stripe</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Payment Reference</label>
                <input
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="Transaction ID or receipt #"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Notes</label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal notes"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <button
              onClick={handleActivate}
              disabled={activating || !selectedPlan}
              className="mt-3 inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {activating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Activate Subscription
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
