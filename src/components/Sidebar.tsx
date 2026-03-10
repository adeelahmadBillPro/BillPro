"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  CreditCard,
  Wallet,
  BarChart3,
  Settings,
  LogOut,
  Languages,
  Receipt,
} from "lucide-react";
import { t } from "@/lib/i18n";
import type { Language } from "@/types";

interface SidebarProps {
  lang: Language;
  onToggleLang: () => void;
  onLogout: () => void;
  businessName?: string;
}

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, labelKey: "nav_dashboard" },
  { href: "/invoices", icon: FileText, labelKey: "nav_invoices" },
  { href: "/customers", icon: Users, labelKey: "nav_customers" },
  { href: "/payments", icon: CreditCard, labelKey: "nav_payments" },
  { href: "/expenses", icon: Wallet, labelKey: "nav_expenses" },
  { href: "/reports", icon: BarChart3, labelKey: "nav_reports" },
  { href: "/settings", icon: Settings, labelKey: "nav_settings" },
];

export default function Sidebar({ lang, onToggleLang, onLogout, businessName }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Receipt className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {t("app_name", lang)}
            </h1>
            <p className="text-xs text-muted truncate max-w-[140px]">
              {businessName || t("app_tagline", lang)}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className={lang === "ur" ? "font-urdu" : ""}>
                {t(item.labelKey, lang)}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        <button
          onClick={onToggleLang}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 w-full transition-colors"
        >
          <Languages className="w-5 h-5" />
          <span>{lang === "en" ? "اردو" : "English"}</span>
        </button>

        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-danger hover:bg-red-50 w-full transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className={lang === "ur" ? "font-urdu" : ""}>
            {t("nav_logout", lang)}
          </span>
        </button>
      </div>
    </aside>
  );
}
