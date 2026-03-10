"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import { useLanguage } from "@/lib/store";
import { useAuth } from "@/lib/hooks/useAuth";
import { getDirection } from "@/lib/i18n";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { lang, toggleLang } = useLanguage();
  const { user, business, loading, signOut } = useAuth();
  const dir = getDirection(lang);
  const router = useRouter();

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

  return (
    <div className="flex min-h-screen" dir={dir}>
      <Sidebar
        lang={lang}
        onToggleLang={toggleLang}
        onLogout={signOut}
        businessName={lang === "ur" ? business?.name_ur || business?.name_en || "BillPro" : business?.name_en || "BillPro"}
      />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
