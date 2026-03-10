"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  CreditCard,
  Wallet,
  Package,
  RefreshCw,
  BarChart3,
  Activity,
  Database,
  Settings,
  LogOut,
  Languages,
  Receipt,
  Moon,
  Sun,
  Shield,
} from "lucide-react";
import { t } from "@/lib/i18n";
import type { Language } from "@/types";

interface SidebarProps {
  lang: Language;
  onToggleLang: () => void;
  onLogout: () => void;
  onToggleTheme: () => void;
  isDark: boolean;
  businessName?: string;
  mobileOpen?: boolean;
  onClose?: () => void;
  isAdmin?: boolean;
}

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, labelKey: "nav_dashboard" },
  { href: "/invoices", icon: FileText, labelKey: "nav_invoices" },
  { href: "/customers", icon: Users, labelKey: "nav_customers" },
  { href: "/payments", icon: CreditCard, labelKey: "nav_payments" },
  { href: "/products", icon: Package, labelKey: "nav_products" },
  { href: "/recurring", icon: RefreshCw, labelKey: "nav_recurring" },
  { href: "/expenses", icon: Wallet, labelKey: "nav_expenses" },
  { href: "/reports", icon: BarChart3, labelKey: "nav_reports" },
  { href: "/activity", icon: Activity, labelKey: "nav_activity" },
  { href: "/backup", icon: Database, labelKey: "nav_backup" },
  { href: "/settings", icon: Settings, labelKey: "nav_settings" },
];

export default function Sidebar({ lang, onToggleLang, onLogout, onToggleTheme, isDark, businessName, mobileOpen, onClose, isAdmin }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-sidebar flex flex-col
          transition-transform duration-200 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:static md:z-auto
        `}
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-white">
                {t("app_name", lang)}
              </h1>
              <p className="text-xs text-white/50 truncate">
                {businessName || t("app_tagline", lang)}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-white/15 text-white shadow-lg shadow-white/5"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-accent" : ""}`} />
                <span className={lang === "ur" ? "font-urdu" : ""}>
                  {t(item.labelKey, lang)}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-3 border-t border-white/10 space-y-0.5">
          {isAdmin && (
            <Link
              href="/admin"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 w-full transition-all"
            >
              <Shield className="w-5 h-5" />
              <span>Super Admin</span>
            </Link>
          )}

          <button
            onClick={onToggleTheme}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 w-full transition-all"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span>{isDark ? t("theme_light", lang) : t("theme_dark", lang)}</span>
          </button>

          <button
            onClick={onToggleLang}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 w-full transition-all"
          >
            <Languages className="w-5 h-5" />
            <span>{lang === "en" ? "اردو" : "English"}</span>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 w-full transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className={lang === "ur" ? "font-urdu" : ""}>
              {t("nav_logout", lang)}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
