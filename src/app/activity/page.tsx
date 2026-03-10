"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useLanguage } from "@/lib/store";
import { useAuth } from "@/lib/hooks/useAuth";
import { getActivityLog } from "@/lib/supabase/database";
import { t } from "@/lib/i18n";
import { Activity, FileText, Users, CreditCard, Wallet, Package, RefreshCw, Settings } from "lucide-react";
import type { ActivityLog } from "@/types";

const entityIcons: Record<string, any> = {
  invoice: FileText,
  customer: Users,
  payment: CreditCard,
  expense: Wallet,
  product: Package,
  recurring: RefreshCw,
  settings: Settings,
};

const actionColors: Record<string, string> = {
  created: "text-green-600 bg-green-50",
  updated: "text-blue-600 bg-blue-50",
  deleted: "text-red-600 bg-red-50",
  status_changed: "text-amber-600 bg-amber-50",
};

function timeAgo(dateStr: string, lang: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return lang === "ur" ? "ابھی" : "just now";
  if (mins < 60) return lang === "ur" ? `${mins} منٹ پہلے` : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return lang === "ur" ? `${hours} گھنٹے پہلے` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return lang === "ur" ? `${days} دن پہلے` : `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(lang === "ur" ? "ur-PK" : "en-PK");
}

export default function ActivityPage() {
  const { lang } = useLanguage();
  const { business } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    if (!business) return;
    setLoading(true);
    const { data } = await getActivityLog(business.id, 100);
    setLogs(data || []);
    setLoading(false);
  }, [business]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const getActionLabel = (action: string) => {
    const labels: Record<string, Record<string, string>> = {
      created: { en: "Created", ur: "بنایا" },
      updated: { en: "Updated", ur: "اپڈیٹ کیا" },
      deleted: { en: "Deleted", ur: "حذف کیا" },
      status_changed: { en: "Status changed", ur: "حیثیت تبدیل کی" },
    };
    return labels[action]?.[lang] || action;
  };

  const getEntityLabel = (type: string) => {
    const labels: Record<string, Record<string, string>> = {
      invoice: { en: "Invoice", ur: "انوائس" },
      customer: { en: "Customer", ur: "صارف" },
      payment: { en: "Payment", ur: "ادائیگی" },
      expense: { en: "Expense", ur: "خرچہ" },
      product: { en: "Product", ur: "مصنوعات" },
      recurring: { en: "Recurring", ur: "بار بار" },
    };
    return labels[type]?.[lang] || type;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-primary" />
          <h1 className={`text-2xl font-bold text-gray-900 ${lang === "ur" ? "font-urdu" : ""}`}>
            {t("nav_activity", lang)}
          </h1>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          {loading ? (
            <div className="text-center py-12 text-muted text-sm">{t("common_loading", lang)}</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-muted">{t("common_no_data", lang)}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {logs.map((log) => {
                const Icon = entityIcons[log.entity_type] || Activity;
                const colorClass = actionColors[log.action] || "text-gray-600 bg-gray-50";
                return (
                  <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors">
                    <div className={`p-2 rounded-lg ${colorClass} shrink-0`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{getActionLabel(log.action)}</span>
                        {" "}
                        <span className="text-muted">{getEntityLabel(log.entity_type)}</span>
                        {log.entity_label && (
                          <span className="font-medium"> — {log.entity_label}</span>
                        )}
                      </p>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <p className="text-xs text-muted mt-0.5">
                          {log.details.old_status && log.details.new_status
                            ? `${log.details.old_status} → ${log.details.new_status}`
                            : ""}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted whitespace-nowrap shrink-0">
                      {timeAgo(log.created_at, lang)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
