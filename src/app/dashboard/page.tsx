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
  getDueSoonInvoices,
  getTopCustomers,
  getExpenseStats,
  markOverdueInvoices,
  processDueRecurringInvoices,
  getLowStockProducts,
} from "@/lib/supabase/database";
import { t, formatPKR } from "@/lib/i18n";
import Link from "next/link";
import { FileText, TrendingUp, TrendingDown, Clock, Users, Wallet, Bell, MessageCircle, Mail, Package } from "lucide-react";

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
  const [dueSoonInvoices, setDueSoonInvoices] = useState<any[]>([]);
  const [expenseStats, setExpenseStats] = useState({ total: 0, this_month: 0 });
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
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

    // Auto-generate recurring invoices + mark overdue
    await Promise.all([
      processDueRecurringInvoices(business.id),
      markOverdueInvoices(business.id),
    ]);

    const [statsData, invoicesRes, overdueRes, topCustRes, expStats, dueSoonRes, lowStockRes] = await Promise.all([
      getDashboardStats(business.id),
      getInvoicesByDateRange(business.id, startDate, endDate),
      getOverdueInvoices(business.id),
      getTopCustomers(business.id, 5),
      getExpenseStats(business.id),
      getDueSoonInvoices(business.id),
      getLowStockProducts(business.id),
    ]);

    setStats(statsData);
    setRevenueData(buildMonthlyRevenue(invoicesRes.data));
    setStatusData(buildStatusData(invoicesRes.data, lang));
    setTopCustomers(topCustRes.data);
    setOverdueInvoices(overdueRes.data);
    setExpenseStats(expStats);
    setDueSoonInvoices(dueSoonRes.data);
    setLowStockProducts(lowStockRes.data || []);
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
        {/* Wayflyer-style Gradient Hero Banner */}
        <div className="bg-gradient-hero rounded-2xl p-6 md:p-8 text-white shadow-lg shadow-primary/20 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className={`text-2xl md:text-3xl font-bold ${lang === "ur" ? "font-urdu" : ""}`}>
                {t("dash_welcome", lang)} 👋
              </h1>
              <p className="text-white/70 mt-1 text-sm">
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
          {/* Inline Hero Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-white/60 text-xs font-medium">{t("dash_total_revenue", lang)}</p>
              <p className="text-xl md:text-2xl font-bold mt-1">{loading ? "..." : formatPKR(stats.total_revenue)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-white/60 text-xs font-medium">{t("dash_pending_amount", lang)}</p>
              <p className="text-xl md:text-2xl font-bold mt-1">{loading ? "..." : formatPKR(stats.pending_amount)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-white/60 text-xs font-medium">{t("dash_profit", lang)}</p>
              <p className="text-xl md:text-2xl font-bold mt-1">{loading ? "..." : formatPKR(stats.total_revenue - expenseStats.total)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-white/60 text-xs font-medium">{t("dash_total_customers", lang)}</p>
              <p className="text-xl md:text-2xl font-bold mt-1">{loading ? "..." : stats.total_customers.toString()}</p>
            </div>
          </div>
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

        {/* Low Stock Alerts */}
        {lowStockProducts.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm">
            <div className="p-6 border-b border-gray-200/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Package className="w-4 h-4 text-amber-600" />
                </div>
                <h2 className={`text-lg font-semibold text-gray-900 ${lang === "ur" ? "font-urdu" : ""}`}>
                  {lang === "ur" ? "کم اسٹاک الرٹس" : "Low Stock Alerts"}
                </h2>
                <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                  {lowStockProducts.length}
                </span>
              </div>
              <Link href="/products" className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">
                {lang === "ur" ? "تمام پروڈکٹس دیکھیں" : "View All Products"} &rarr;
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {lowStockProducts.map((product: any) => (
                <div key={product.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                      product.stock_quantity === 0
                        ? "bg-red-100 text-red-600"
                        : product.stock_quantity <= 2
                        ? "bg-amber-100 text-amber-700"
                        : "bg-yellow-50 text-yellow-700"
                    }`}>
                      {product.stock_quantity}
                    </div>
                    <div>
                      <p className={`text-sm font-medium text-gray-900 ${lang === "ur" ? "font-urdu" : ""}`}>
                        {lang === "ur" ? product.name_ur || product.name_en : product.name_en}
                      </p>
                      <p className="text-xs text-muted">
                        {lang === "ur" ? "باقی اسٹاک:" : "Remaining:"} {product.stock_quantity} {product.unit || (lang === "ur" ? "یونٹ" : "units")}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                    product.stock_quantity === 0
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {product.stock_quantity === 0
                      ? (lang === "ur" ? "اسٹاک ختم" : "Out of Stock")
                      : (lang === "ur" ? "کم اسٹاک" : "Low Stock")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Customers + Overdue Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopCustomersCard customers={topCustomers} lang={lang} />
          <OverdueAlerts invoices={overdueInvoices} lang={lang} businessName={business?.name_en || business?.name_ur || "BillPro"} />
        </div>

        {/* Due Soon Reminders */}
        {dueSoonInvoices.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm">
            <div className="p-6 border-b border-gray-200/60 flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              <h2 className={`text-lg font-semibold text-gray-900 ${lang === "ur" ? "font-urdu" : ""}`}>
                {t("dash_due_soon", lang)}
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {dueSoonInvoices.map((inv: any) => {
                const daysLeft = Math.ceil((new Date(inv.due_date).getTime() - Date.now()) / 86400000);
                const phone = inv.customer?.phone;
                const email = inv.customer?.email;
                const custName = lang === "ur" ? inv.customer?.name_ur || inv.customer?.name_en : inv.customer?.name_en;
                return (
                  <div key={inv.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${daysLeft <= 1 ? "bg-danger/10 text-danger" : daysLeft <= 3 ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"}`}>
                        {daysLeft <= 0 ? t("dash_today", lang) : `${daysLeft}d`}
                      </div>
                      <div>
                        <Link href={`/invoices/${inv.id}`} className="text-sm font-medium text-gray-900 hover:text-primary">
                          {inv.invoice_number} — {custName || "—"}
                        </Link>
                        <p className="text-xs text-muted">
                          {t("dash_due_in", lang)} {daysLeft <= 0 ? t("dash_today", lang) : `${daysLeft} ${t("dash_days", lang)}`} · {formatPKR(Number(inv.total))}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {phone && (
                        <a
                          href={`https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Reminder: Invoice ${inv.invoice_number} of ${formatPKR(Number(inv.total))} is due on ${inv.due_date}. Please arrange payment.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg text-success hover:bg-success/10 transition-colors"
                          title="WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}
                      {email && (
                        <a
                          href={`mailto:${email}?subject=${encodeURIComponent(`Payment Reminder: Invoice ${inv.invoice_number}`)}&body=${encodeURIComponent(`Dear ${custName},\n\nThis is a friendly reminder that Invoice ${inv.invoice_number} of ${formatPKR(Number(inv.total))} is due on ${inv.due_date}.\n\nPlease arrange payment at your earliest convenience.\n\nThank you.`)}`}
                          className="p-2 rounded-lg text-secondary hover:bg-secondary/10 transition-colors"
                          title="Email"
                        >
                          <Mail className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Invoices Table */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm">
          <div className="p-6 border-b border-gray-200/60">
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
