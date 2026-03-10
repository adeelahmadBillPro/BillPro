"use client";

import { useState, useEffect } from "react";
import { Crown, Check, Loader2 } from "lucide-react";
import { getSubscriptionPlans } from "@/lib/supabase/database";
import { formatPKR } from "@/lib/i18n";
import type { Language, SubscriptionPlan } from "@/types";

interface SubscriptionPaywallProps {
  lang: Language;
}

export default function SubscriptionPaywall({ lang }: SubscriptionPaywallProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await getSubscriptionPlans();
      setPlans((data || []).filter(p => p.price > 0));
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-surface to-secondary/10 p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {lang === "ur" ? "اپ گریڈ کریں" : "Upgrade Your Plan"}
          </h1>
          <p className="text-muted mt-2 max-w-md mx-auto">
            {lang === "ur"
              ? "آپ کی مفت آزمائش ختم ہو گئی ہے۔ BillPro استعمال جاری رکھنے کے لیے پلان منتخب کریں۔"
              : "Your free trial has expired. Choose a plan to continue using BillPro."}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`bg-white dark:bg-gray-800 rounded-2xl border-2 shadow-sm p-6 flex flex-col ${
                  plan.sort_order === 2
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              >
                {plan.sort_order === 2 && (
                  <span className="inline-flex self-start items-center gap-1 bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full mb-3">
                    {lang === "ur" ? "مقبول ترین" : "Most Popular"}
                  </span>
                )}
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {lang === "ur" ? plan.name_ur : plan.name}
                </h3>
                <p className="text-sm text-muted mt-1">
                  {lang === "ur" ? plan.description_ur : plan.description}
                </p>
                <div className="mt-4 mb-6">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">
                    {formatPKR(plan.price)}
                  </span>
                  <span className="text-sm text-muted">
                    /{lang === "ur" ? "ماہ" : "month"}
                  </span>
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {(plan.features as string[]).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={`https://wa.me/923001234567?text=I want to subscribe to BillPro ${plan.name} plan`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    plan.sort_order === 2
                      ? "bg-primary text-white hover:bg-primary-dark"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {lang === "ur" ? "رابطہ کریں" : "Contact to Subscribe"}
                </a>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-muted mt-6">
          {lang === "ur"
            ? "ادائیگی کے بعد آپ کا اکاؤنٹ 24 گھنٹوں میں فعال ہو جائے گا"
            : "Your account will be activated within 24 hours after payment"}
        </p>
      </div>
    </div>
  );
}
