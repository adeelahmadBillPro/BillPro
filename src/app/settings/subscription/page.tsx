"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useLanguage } from "@/lib/store";
import { useAuth } from "@/lib/hooks/useAuth";
import { getBusinessSubscription, getSubscriptionPlans } from "@/lib/supabase/database";
import { formatPKR, t } from "@/lib/i18n";
import {
  Crown,
  Check,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import type { Subscription, SubscriptionPlan } from "@/types";

export default function SubscriptionPage() {
  const { lang } = useLanguage();
  const { business } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!business) return;
    async function load() {
      const [subRes, plansRes] = await Promise.all([
        getBusinessSubscription(business!.id),
        getSubscriptionPlans(),
      ]);
      setSubscription(subRes.data);
      setPlans((plansRes.data || []).filter(p => p.price > 0));
      setLoading(false);
    }
    load();
  }, [business]);

  const status = subscription?.status || "no_subscription";
  const isTrialExpired = status === "trialing" && subscription?.trial_ends_at && new Date(subscription.trial_ends_at) < new Date();
  const trialDaysLeft = subscription?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/settings" className="p-2 text-muted hover:text-gray-900 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className={`text-2xl font-bold text-gray-900 ${lang === "ur" ? "font-urdu" : ""}`}>
              {lang === "ur" ? "سبسکرپشن" : "Subscription"}
            </h1>
          </div>
        </div>

        {/* Current Status */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {lang === "ur" ? "موجودہ پلان" : "Current Plan"}
          </h2>

          <div className="flex items-center gap-3 mb-4">
            <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${
              status === "active" ? "bg-green-100 text-green-700" :
              status === "trialing" && !isTrialExpired ? "bg-amber-100 text-amber-700" :
              "bg-red-100 text-red-700"
            }`}>
              {status === "active" && <CheckCircle2 className="w-4 h-4" />}
              {status === "trialing" && !isTrialExpired && <Clock className="w-4 h-4" />}
              {(isTrialExpired || status === "expired" || status === "cancelled") && <XCircle className="w-4 h-4" />}
              {isTrialExpired
                ? (lang === "ur" ? "آزمائش ختم" : "Trial Expired")
                : status === "active"
                  ? (lang === "ur" ? "فعال" : "Active")
                  : status === "trialing"
                    ? (lang === "ur" ? "آزمائش" : "Trial")
                    : (lang === "ur" ? "غیر فعال" : "Inactive")}
            </span>

            {subscription?.plan && (
              <span className="text-sm font-medium text-gray-900">
                {lang === "ur" ? subscription.plan.name_ur : subscription.plan.name}
              </span>
            )}
          </div>

          {status === "trialing" && !isTrialExpired && (
            <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
              {lang === "ur"
                ? `آپ کی آزمائش ${trialDaysLeft} دن میں ختم ہو گی۔ بلاتعطل رسائی کے لیے ابھی اپ گریڈ کریں۔`
                : `Your trial ends in ${trialDaysLeft} day${trialDaysLeft !== 1 ? "s" : ""}. Upgrade now for uninterrupted access.`}
            </p>
          )}

          {(isTrialExpired || status === "expired" || status === "cancelled") && (
            <p className="text-sm text-red-700 bg-red-50 rounded-lg p-3">
              {lang === "ur"
                ? "آپ کا پلان ختم ہو گیا ہے۔ جاری رکھنے کے لیے نیچے سے پلان منتخب کریں۔"
                : "Your plan has expired. Choose a plan below to continue using BillPro."}
            </p>
          )}

          {status === "active" && subscription?.current_period_end && (
            <p className="text-sm text-muted">
              {lang === "ur" ? "اگلی تجدید:" : "Next renewal:"}{" "}
              {new Date(subscription.current_period_end).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Plans */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {lang === "ur" ? "دستیاب پلانز" : "Available Plans"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const isCurrent = subscription?.plan_id === plan.id && status === "active";
              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-2xl border-2 shadow-sm p-5 flex flex-col ${
                    plan.sort_order === 2
                      ? "border-primary ring-2 ring-primary/20"
                      : isCurrent
                        ? "border-green-300 bg-green-50/50"
                        : "border-gray-200"
                  }`}
                >
                  {plan.sort_order === 2 && (
                    <span className="inline-flex self-start items-center gap-1 bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full mb-3">
                      {lang === "ur" ? "مقبول ترین" : "Most Popular"}
                    </span>
                  )}
                  {isCurrent && (
                    <span className="inline-flex self-start items-center gap-1 bg-green-600 text-white text-xs font-semibold px-3 py-1 rounded-full mb-3">
                      <CheckCircle2 className="w-3 h-3" />
                      {lang === "ur" ? "موجودہ پلان" : "Current Plan"}
                    </span>
                  )}
                  <h3 className="text-lg font-bold text-gray-900">
                    {lang === "ur" ? plan.name_ur : plan.name}
                  </h3>
                  <p className="text-sm text-muted mt-1">
                    {lang === "ur" ? plan.description_ur : plan.description}
                  </p>
                  <div className="mt-3 mb-4">
                    <span className="text-3xl font-bold text-gray-900">{formatPKR(plan.price)}</span>
                    <span className="text-sm text-muted">/{lang === "ur" ? "ماہ" : "month"}</span>
                  </div>
                  <ul className="space-y-2 mb-4 flex-1">
                    {(plan.features as string[]).map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {!isCurrent && (
                    <a
                      href={`https://wa.me/923001234567?text=BillPro ${plan.name} plan subscribe karna hai. Business: ${business?.name_en || ""}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                        plan.sort_order === 2
                          ? "bg-primary text-white hover:bg-primary-dark"
                          : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                      }`}
                    >
                      {lang === "ur" ? "رابطہ کریں" : "Contact to Subscribe"}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-center text-xs text-muted">
          {lang === "ur"
            ? "ادائیگی کے بعد آپ کا اکاؤنٹ 24 گھنٹوں میں فعال ہو جائے گا۔ مدد کے لیے واٹس ایپ پر رابطہ کریں۔"
            : "Your account will be activated within 24 hours after payment. Contact us on WhatsApp for support."}
        </p>
      </div>
    </DashboardLayout>
  );
}
