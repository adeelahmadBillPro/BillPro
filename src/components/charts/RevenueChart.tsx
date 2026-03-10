"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { t } from "@/lib/i18n";
import type { Language } from "@/types";

interface RevenueDataPoint {
  month: string;
  paid: number;
  pending: number;
}

interface RevenueChartProps {
  data: RevenueDataPoint[];
  lang: Language;
}

function formatAmount(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
}

export default function RevenueChart({ data, lang }: RevenueChartProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h3 className={`text-lg font-semibold text-gray-900 mb-4 ${lang === "ur" ? "font-urdu" : ""}`}>
        {t("dash_revenue_trend", lang)}
      </h3>
      {data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-muted text-sm">
          {t("common_no_data", lang)}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={formatAmount} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value) => [`Rs ${Number(value).toLocaleString()}`, ""]}
              contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
            />
            <Legend />
            <Bar
              dataKey="paid"
              name={t("status_paid", lang)}
              fill="#0f766e"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="pending"
              name={t("dash_pending_amount", lang)}
              fill="#f59e0b"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
