"use client";

import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  color?: string;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  color = "primary",
}: StatCardProps) {
  const colorMap: Record<string, { bg: string; icon: string }> = {
    primary: { bg: "bg-primary/10 dark:bg-primary/20", icon: "text-primary" },
    secondary: { bg: "bg-lavender/30 dark:bg-secondary/20", icon: "text-secondary" },
    accent: { bg: "bg-amber-100 dark:bg-amber-500/20", icon: "text-amber-600 dark:text-amber-400" },
    success: { bg: "bg-emerald-50 dark:bg-emerald-500/20", icon: "text-emerald-600 dark:text-emerald-400" },
  };

  const c = colorMap[color] || colorMap.primary;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200/60 dark:border-gray-700/60 shadow-sm hover:shadow-md dark:shadow-none transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
          {trend && (
            <p className="text-xs text-success mt-1">{trend}</p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${c.bg}`}>
          <Icon className={`w-6 h-6 ${c.icon}`} />
        </div>
      </div>
    </div>
  );
}
