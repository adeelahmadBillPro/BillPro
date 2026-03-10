"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import TrialBanner from "./TrialBanner";
import SubscriptionPaywall from "./SubscriptionPaywall";
import PWAInstall from "./PWAInstall";
import { useLanguage, useTheme } from "@/lib/store";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { getDirection } from "@/lib/i18n";
import { Menu } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { lang, toggleLang } = useLanguage();
  const { theme, toggleTheme, isDark } = useTheme();
  const { user, business, loading, signOut } = useAuth();
  const { subscription, isAdmin, trialDaysLeft, trialExpired, showPaywall } = useSubscription(business?.id);
  const dir = getDirection(lang);
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-2 text-muted text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Show paywall if subscription expired (not for super admins)
  if (showPaywall) {
    return <SubscriptionPaywall lang={lang} />;
  }

  return (
    <div className="flex min-h-screen" dir={dir}>
      <Sidebar
        lang={lang}
        onToggleLang={toggleLang}
        onLogout={signOut}
        onToggleTheme={toggleTheme}
        isDark={isDark}
        businessName={lang === "ur" ? business?.name_ur || business?.name_en || "BillPro" : business?.name_en || "BillPro"}
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isAdmin={isAdmin}
      />
      <main className="flex-1 min-w-0 overflow-auto bg-surface">
        {/* Mobile header */}
        <div className="sticky top-0 z-30 flex items-center gap-3 p-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/60 dark:border-gray-700/60 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </button>
          <span className="text-lg font-bold text-primary">BillPro</span>
        </div>
        <div className="p-4 md:p-8">
          {/* Trial Banner */}
          {subscription && (
            <div className="mb-4">
              <TrialBanner
                lang={lang}
                daysLeft={trialDaysLeft}
                isExpired={trialExpired}
                status={subscription.status}
              />
            </div>
          )}
          {children}
        </div>
      </main>
      <PWAInstall lang={lang} />
    </div>
  );
}
