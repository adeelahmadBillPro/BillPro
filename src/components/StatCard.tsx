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
  const colorMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    secondary: "bg-secondary/10 text-secondary",
    accent: "bg-accent/10 text-accent",
    success: "bg-success/10 text-success",
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trend && (
            <p className="text-xs text-success mt-1">{trend}</p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorMap[color] || colorMap.primary}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
