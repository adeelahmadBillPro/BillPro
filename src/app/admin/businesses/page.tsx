"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { adminGetAllBusinesses } from "@/lib/supabase/database";
import { Building2, Search, Loader2 } from "lucide-react";
import Link from "next/link";

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await adminGetAllBusinesses();
      setBusinesses(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = businesses.filter(b =>
    (b.name_en || "").toLowerCase().includes(search.toLowerCase()) ||
    (b.email || "").toLowerCase().includes(search.toLowerCase())
  );

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">All Businesses</h1>
            <p className="text-sm text-muted">{businesses.length} registered businesses</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search businesses..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-start p-4 text-sm font-medium text-muted">Business</th>
                <th className="text-start p-4 text-sm font-medium text-muted">Email</th>
                <th className="text-start p-4 text-sm font-medium text-muted">Phone</th>
                <th className="text-start p-4 text-sm font-medium text-muted">Status</th>
                <th className="text-start p-4 text-sm font-medium text-muted">Created</th>
                <th className="text-end p-4 text-sm font-medium text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted text-sm">
                    No businesses found
                  </td>
                </tr>
              ) : (
                filtered.map((biz) => {
                  const sub = biz.subscriptions?.[0];
                  const status = sub?.status || "no_subscription";
                  const isTrialExpired = status === "trialing" && sub?.trial_ends_at && new Date(sub.trial_ends_at) < new Date();

                  return (
                    <tr key={biz.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{biz.name_en || "—"}</p>
                            {biz.name_ur && <p className="text-xs text-muted font-urdu" dir="rtl">{biz.name_ur}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted">{biz.email || "—"}</td>
                      <td className="p-4 text-sm text-muted">{biz.phone || "—"}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center text-xs font-semibold px-2 py-1 rounded-full ${
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
                          className="text-sm text-primary hover:underline font-medium"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
