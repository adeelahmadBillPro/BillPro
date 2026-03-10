"use client";

import { Clock, AlertTriangle, Crown } from "lucide-react";
import Link from "next/link";
import { t } from "@/lib/i18n";
import type { Language } from "@/types";

interface TrialBannerProps {
  lang: Language;
  daysLeft: number;
  isExpired: boolean;
  status: string;
}

export default function TrialBanner({ lang, daysLeft, isExpired, status }: TrialBannerProps) {
  if (status === "active") return null;

  // Expired or cancelled — red banner
  if (isExpired || status === "expired" || status === "cancelled") {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-lg flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">
              {lang === "ur" ? "آپ کی آزمائش ختم ہو گئی" : "Your trial has expired"}
            </p>
            <p className="text-xs text-red-600 dark:text-red-400">
              {lang === "ur" ? "جاری رکھنے کے لیے پلان منتخب کریں" : "Choose a plan to continue using BillPro"}
            </p>
          </div>
        </div>
        <Link
          href="/settings/subscription"
          className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors shrink-0"
        >
          <Crown className="w-4 h-4" />
          {lang === "ur" ? "ابھی اپ گریڈ کریں" : "Upgrade Now"}
        </Link>
      </div>
    );
  }

  // Trialing — warning banner when < 5 days left
  if (daysLeft <= 5 && daysLeft > 0) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              {lang === "ur"
                ? `آزمائش ${daysLeft} دن میں ختم ہو گی`
                : `Trial ends in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {lang === "ur" ? "بلاتعطل رسائی کے لیے ابھی اپ گریڈ کریں" : "Upgrade now for uninterrupted access"}
            </p>
          </div>
        </div>
        <Link
          href="/settings/subscription"
          className="inline-flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors shrink-0"
        >
          <Crown className="w-4 h-4" />
          {lang === "ur" ? "پلان دیکھیں" : "View Plans"}
        </Link>
      </div>
    );
  }

  return null;
}
