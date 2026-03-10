"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Receipt, FileText, Phone, Mail } from "lucide-react";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function PortalPage() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/portal/${params.token}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.error) setError(result.error);
        else setData(result);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load portal");
        setLoading(false);
      });
  }, [params.token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-gray-900 mb-1">Invalid Portal Link</h1>
          <p className="text-gray-500 text-sm">{error || "This link is no longer valid."}</p>
        </div>
      </div>
    );
  }

  const { customer, business, invoices } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{business.name_en}</h1>
              {business.name_ur && (
                <p className="text-sm text-gray-500" dir="rtl">{business.name_ur}</p>
              )}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">Customer Portal</p>
            <p className="font-semibold text-gray-900">{customer.name_en}</p>
            {customer.name_ur && (
              <p className="text-sm text-gray-500" dir="rtl">{customer.name_ur}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              {customer.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> {customer.phone}
                </span>
              )}
              {customer.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> {customer.email}
                </span>
              )}
            </div>
            <p className="mt-3 text-sm">
              Outstanding Balance:{" "}
              <span
                className={`font-bold ${
                  Number(customer.balance) > 0 ? "text-red-600" : "text-green-600"
                }`}
              >
                Rs {Number(customer.balance).toLocaleString()}
              </span>
            </p>
          </div>
        </div>

        {/* Invoices */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Invoices
            </h2>
          </div>
          {invoices.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">No invoices found</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {invoices.map((inv: any) => (
                <div key={inv.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900">{inv.invoice_number}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        statusColors[inv.status] || "bg-gray-100"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      {inv.issue_date} → {inv.due_date}
                    </span>
                    <span className="font-bold text-gray-900">
                      Rs {Number(inv.total).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">Powered by BillPro</p>
      </div>
    </div>
  );
}
