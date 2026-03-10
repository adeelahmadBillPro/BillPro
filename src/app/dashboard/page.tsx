"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import DateRangeFilter, { getDateRange, type DatePreset } from "@/components/charts/DateRangeFilter";
import RevenueChart from "@/components/charts/RevenueChart";
import StatusPieChart from "@/components/charts/StatusPieChart";
import TopCustomersCard from "@/components/dashboard/TopCustomersCard";
import OverdueAlerts from "@/components/dashboard/OverdueAlerts";
import { useLanguage } from "@/lib/store";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getDashboardStats,
  getInvoicesByDateRange,
  getOverdueInvoices,
  getTopCustomers,
  getExpenseStats,
} from "@/lib/supabase/database";
import { t, formatPKR } from "@/lib/i18n";
import { FileText, TrendingUp, TrendingDown, Clock, Users, Wallet } from "lucide-react";

// Build monthly revenue data from invoices
function buildMonthlyRevenue(invoices: any[]) {
  const monthMap = new Map<string, { paid: number; pending: number }>();

  for (const inv of invoices) {
    const date = new Date(inv.issue_date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const existing = monthMap.get(key) || { paid: 0, pending: 0 };

    if (inv.status === "paid") {
      existing.paid += Number(inv.total);
    } else if (inv.status === "sent" || inv.status === "overdue" || inv.status === "draft") {
      existing.pending += Number(inv.total);
    }
    monthMap.set(key, existing);
  }

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => {
      const [, m] = key.split("-");
      return { month: months[parseInt(m) - 1], paid: val.paid, pending: val.pending };
    });
}

// Build status distribution from invoices
function buildStatusData(invoices: any[], lang: string) {
  const counts: Record<string, number> = { paid: 0, sent: 0, draft: 0, overdue: 0, cancelled: 0 };
  for (const inv of invoices) {
    if (counts[inv.status] !== undefined) counts[inv.status]++;
  }

  const colors: Record<string, string> = {
    paid: "#16a34a",
    sent: "#1e40af",
    draft: "#6b7280",
    overdue: "#dc2626",
    cancelled: "#9ca3af",
  };

  return Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([status, value]) => ({
      name: t(`status_${status}`, lang as any),
      value,
      color: colors[status] || "#6b7280",
    }));
}

export default function DashboardPage() {
  const { lang } = useLanguage();
  const { business, loading: authLoading } = useAuth();

  // Date range state
  const [preset, setPreset] = useState<DatePreset>("this_year");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Data states
  const [stats, setStats] = useState({
    total_invoices: 0,
    total_revenue: 0,
    pending_amount: 0,
    total_customers: 0,
    recent_invoices: [] as any[],
  });
  const [revenueData, setRevenueData] = useState<{ month: string; paid: number; pending: number }[]>([]);
  const [statusData, setStatusData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);
  const [overdueInvoices, setOverdueInvoices] = useState<any[]>([]);
  const [expenseStats, setExpenseStats] = useState({ total: 0, this_month: 0 });
  const [loading, setLoading] = useState(true);

  // Initialize date range
  useEffect(() => {
    const range = getDateRange(preset);
    setStartDate(range.start);
    setEndDate(range.end);
  }, [preset]);

  // Load all dashboard data
  const loadData = useCallback(async () => {
    if (!business || !startDate || !endDate) return;
    setLoading(true);

    const [statsData, invoicesRes, overdueRes, topCustRes, expStats] = await Promise.all([
      getDashboardStats(business.id),
      getInvoicesByDateRange(business.id, startDate, endDate),
      getOverdueInvoices(business.id),
      getTopCustomers(business.id, 5),
      getExpenseStats(business.id),
    ]);

    setStats(statsData);
    setRevenueData(buildMonthlyRevenue(invoicesRes.data));
    setStatusData(buildStatusData(invoicesRes.data, lang));
    setTopCustomers(topCustRes.data);
    setOverdueInvoices(overdueRes.data);
    setExpenseStats(expStats);
    setLoading(false);
  }, [business, startDate, endDate, lang]);

  useEffect(() => {
    if (authLoading) return;
    if (!business) {
      setLoading(false);
      return;
    }
    loadData();
  }, [authLoading, business, loadData]);

  const handlePresetChange = (newPreset: DatePreset) => {
    setPreset(newPreset);
    if (newPreset !== "custom") {
      const range = getDateRange(newPreset);
      setStartDate(range.start);
      setEndDate(range.end);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header + Date Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className={`text-2xl font-bold text-gray-900 ${lang === "ur" ? "font-urdu" : ""}`}>
              {t("dash_welcome", lang)} 👋
            </h1>
            <p className="text-muted mt-1 text-sm">
              {lang === "ur" ? "آج کی کاروباری سرگرمیوں کا خلاصہ" : "Here's your business summary for today"}
            </p>
          </div>
          <DateRangeFilter
            lang={lang}
            preset={preset}
            startDate={startDate}
            endDate={endDate}
            onPresetChange={handlePresetChange}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard title={t("dash_total_invoices", lang)} value={loading ? "..." : stats.total_invoices.toString()} icon={FileText} color="primary" />
          <StatCard title={t("dash_total_revenue", lang)} value={loading ? "..." : formatPKR(stats.total_revenue)} icon={TrendingUp} color="success" />
          <StatCard title={t("dash_pending_amount", lang)} value={loading ? "..." : formatPKR(stats.pending_amount)} icon={Clock} color="accent" />
          <StatCard title={t("dash_expenses", lang)} value={loading ? "..." : formatPKR(expenseStats.total)} icon={Wallet} color="secondary" />
          <StatCard title={t("dash_profit", lang)} value={loading ? "..." : formatPKR(stats.total_revenue - expenseStats.total)} icon={stats.total_revenue >= expenseStats.total ? TrendingUp : TrendingDown} color={stats.total_revenue >= expenseStats.total ? "success" : "primary"} />
          <StatCard title={t("dash_total_customers", lang)} value={loading ? "..." : stats.total_customers.toString()} icon={Users} color="primary" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RevenueChart data={revenueData} lang={lang} />
          </div>
          <StatusPieChart data={statusData} lang={lang} />
        </div>

        {/* Top Customers + Overdue Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopCustomersCard customers={topCustomers} lang={lang} />
          <OverdueAlerts invoices={overdueInvoices} lang={lang} />
        </div>

        {/* Recent Invoices Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className={`text-lg font-semibold text-gray-900 ${lang === "ur" ? "font-urdu" : ""}`}>
              {t("dash_recent_invoices", lang)}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-start p-4 text-sm font-medium text-muted">{t("inv_number", lang)}</th>
                  <th className="text-start p-4 text-sm font-medium text-muted">{t("inv_customer", lang)}</th>
                  <th className="text-start p-4 text-sm font-medium text-muted">{t("inv_amount", lang)}</th>
                  <th className="text-start p-4 text-sm font-medium text-muted">{t("inv_status", lang)}</th>
                  <th className="text-start p-4 text-sm font-medium text-muted">{t("inv_date", lang)}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted text-sm">{t("common_loading", lang)}</td></tr>
                ) : stats.recent_invoices.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted text-sm">{t("common_no_data", lang)}</td></tr>
                ) : (
                  stats.recent_invoices.map((invoice: any) => (
                    <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-sm font-medium text-gray-900">{invoice.invoice_number}</td>
                      <td className="p-4 text-sm text-gray-600">
                        {lang === "ur" ? invoice.customer?.name_ur || invoice.customer?.name_en || "—" : invoice.customer?.name_en || "—"}
                      </td>
                      <td className="p-4 text-sm font-semibold text-gray-900">{formatPKR(Number(invoice.total))}</td>
                      <td className="p-4"><StatusBadge status={invoice.status} lang={lang} /></td>
                      <td className="p-4 text-sm text-muted">{invoice.issue_date}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
