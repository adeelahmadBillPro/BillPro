"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { t } from "@/lib/i18n";
import type { Language } from "@/types";

interface StatusData {
  name: string;
  value: number;
  color: string;
}

interface StatusPieChartProps {
  data: StatusData[];
  lang: Language;
}

export default function StatusPieChart({ data, lang }: StatusPieChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h3 className={`text-lg font-semibold text-gray-900 mb-4 ${lang === "ur" ? "font-urdu" : ""}`}>
        {t("dash_paid_vs_pending", lang)}
      </h3>
      {total === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-muted text-sm">
          {t("common_no_data", lang)}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [Number(value), ""]}
              contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
