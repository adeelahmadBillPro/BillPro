"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { adminGetAllBusinesses, getAllSubscriptionPlans } from "@/lib/supabase/database";
import { formatPKR } from "@/lib/i18n";
import {
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";

export default function AdminDashboardPage() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await adminGetAllBusinesses();
      setBusinesses(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const totalBusinesses = businesses.length;
  const activeSubs = businesses.filter(b => b.subscriptions?.[0]?.status === "active").length;
  const trialingSubs = businesses.filter(b => b.subscriptions?.[0]?.status === "trialing").length;
  const expiredSubs = businesses.filter(b => {
    const sub = b.subscriptions?.[0];
    if (!sub) return true;
    if (sub.status === "expired" || sub.status === "cancelled") return true;
    if (sub.status === "trialing" && new Date(sub.trial_ends_at) < new Date()) return true;
    return false;
  }).length;

  // Estimate MRR from active subscriptions (simplified)
  const mrr = activeSubs * 3500; // Average of Basic + Pro

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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
          <p className="text-sm text-muted mt-1">Manage all businesses and subscriptions</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-sm text-muted">Total Businesses</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalBusinesses}</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm text-muted">Active Subscriptions</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{activeSubs}</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-sm text-muted">On Trial</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{trialingSubs}</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-sm text-muted">Expired / No Sub</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{expiredSubs}</p>
          </div>
        </div>

        {/* Recent Businesses */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">All Businesses</h2>
            <Link href="/admin/businesses" className="text-sm text-primary hover:underline">
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-start p-4 text-sm font-medium text-muted">Business</th>
                  <th className="text-start p-4 text-sm font-medium text-muted">Email</th>
                  <th className="text-start p-4 text-sm font-medium text-muted">Status</th>
                  <th className="text-start p-4 text-sm font-medium text-muted">Created</th>
                  <th className="text-end p-4 text-sm font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {businesses.slice(0, 10).map((biz) => {
                  const sub = biz.subscriptions?.[0];
                  const status = sub?.status || "no_subscription";
                  const isTrialExpired = status === "trialing" && sub?.trial_ends_at && new Date(sub.trial_ends_at) < new Date();

                  return (
                    <tr key={biz.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-4">
                        <p className="text-sm font-medium text-gray-900">{biz.name_en || "—"}</p>
                        {biz.name_ur && <p className="text-xs text-muted font-urdu" dir="rtl">{biz.name_ur}</p>}
                      </td>
                      <td className="p-4 text-sm text-muted">{biz.email || "—"}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                          status === "active" ? "bg-green-100 text-green-700" :
                          status === "trialing" && !isTrialExpired ? "bg-amber-100 text-amber-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {isTrialExpired ? "Trial Expired" : status === "no_subscription" ? "No Sub" : status}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-muted">
                        {new Date(biz.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-end">
                        <Link
                          href={`/admin/business/${biz.id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
