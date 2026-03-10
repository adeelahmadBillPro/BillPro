"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { useLanguage } from "@/lib/store";
import { useAuth } from "@/lib/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { t, CURRENCIES } from "@/lib/i18n";
import { hasPermission } from "@/lib/permissions";
import { Building, User, Globe, Check, Users, Upload, Trash2, ImageIcon, DollarSign, FileText, Crown } from "lucide-react";
import { useToast } from "@/components/Toast";

export default function SettingsPage() {
  const { lang } = useLanguage();
  const { business, user, role, fetchBusiness } = useAuth();
  const canEditSettings = hasPermission(role, "edit_settings");
  const canManageTeam = hasPermission(role, "manage_team");
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [form, setForm] = useState({
    name_en: "", name_ur: "", address_en: "", address_ur: "",
    phone: "", ntn_number: "", email: "",
    currency: "PKR", invoice_template: "classic",
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !business) return;
    if (file.size > 500_000) {
      showToast(lang === "ur" ? "فائل کا سائز 500KB سے کم ہونا چاہیے" : "File size must be under 500KB", "error");
      return;
    }
    setLogoUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "png";
      const filePath = `${business.id}/logo.${ext}`;
      // Upload (upsert)
      await supabase.storage.from("logos").upload(filePath, file, { upsert: true });
      // Get public URL
      const { data: urlData } = supabase.storage.from("logos").getPublicUrl(filePath);
      const logo_url = urlData.publicUrl + "?t=" + Date.now();
      // Save to business record
      await supabase.from("businesses").update({ logo_url }).eq("id", business.id);
      if (user) await fetchBusiness(user.id);
      showToast(lang === "ur" ? "لوگو اپ لوڈ ہو گیا!" : "Logo uploaded successfully!", "success");
    } catch (err) {
      console.error("Logo upload failed:", err);
      showToast(lang === "ur" ? "لوگو اپ لوڈ ناکام" : "Logo upload failed", "error");
    }
    setLogoUploading(false);
    e.target.value = "";
  };

  const handleLogoRemove = async () => {
    if (!business) return;
    setLogoUploading(true);
    const supabase = createClient();
    // Remove from storage
    const { data: files } = await supabase.storage.from("logos").list(business.id);
    if (files?.length) {
      await supabase.storage.from("logos").remove(files.map(f => `${business.id}/${f.name}`));
    }
    // Clear URL
    await supabase.from("businesses").update({ logo_url: null }).eq("id", business.id);
    if (user) await fetchBusiness(user.id);
    setLogoUploading(false);
  };

  useEffect(() => {
    if (business) {
      setForm({
        name_en: business.name_en || "",
        name_ur: business.name_ur || "",
        address_en: business.address_en || "",
        address_ur: business.address_ur || "",
        phone: business.phone || "",
        ntn_number: business.ntn_number || "",
        email: business.email || "",
        currency: business.currency || "PKR",
        invoice_template: business.invoice_template || "classic",
      });
    }
  }, [business]);

  const handleSave = async () => {
    if (!business) return;
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("businesses")
      .update(form)
      .eq("id", business.id);
    if (user) await fetchBusiness(user.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6">
        <h1 className={`text-2xl font-bold text-gray-900 ${lang === "ur" ? "font-urdu" : ""}`}>
          {t("nav_settings", lang)}
        </h1>

        {/* Subscription Link */}
        <Link
          href="/settings/subscription"
          className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md hover:border-gray-300 transition-all"
        >
          <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
            <Crown className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className={`text-lg font-semibold text-gray-900 ${lang === "ur" ? "font-urdu" : ""}`}>
              {lang === "ur" ? "سبسکرپشن" : "Subscription"}
            </h2>
            <p className="text-sm text-muted">
              {lang === "ur" ? "اپنا پلان اور بلنگ منظم کریں" : "Manage your plan and billing"}
            </p>
          </div>
        </Link>

        {/* Team Management Link */}
        <Link
          href="/settings/team"
          className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md hover:border-gray-300 transition-all"
        >
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className={`text-lg font-semibold text-gray-900 ${lang === "ur" ? "font-urdu" : ""}`}>
              {t("team_title", lang)}
            </h2>
            <p className="text-sm text-muted">
              {lang === "ur" ? "ٹیم ممبرز کا انتظام اور دعوتیں" : "Manage team members and invitations"}
            </p>
          </div>
        </Link>

        {/* Business Logo */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">
              {lang === "ur" ? "کاروباری لوگو" : "Business Logo"}
            </h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
              {business?.logo_url ? (
                <img src={business.logo_url} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <ImageIcon className="w-8 h-8 text-gray-300" />
              )}
            </div>
            {canEditSettings && (
              <div className="space-y-2">
                <label className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors cursor-pointer">
                  <Upload className="w-4 h-4" />
                  {logoUploading ? (lang === "ur" ? "اپ لوڈ ہو رہا ہے..." : "Uploading...") : (lang === "ur" ? "لوگو اپ لوڈ کریں" : "Upload Logo")}
                  <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={logoUploading} className="hidden" />
                </label>
                {business?.logo_url && (
                  <button
                    onClick={handleLogoRemove}
                    disabled={logoUploading}
                    className="flex items-center gap-2 text-sm text-danger hover:text-red-700 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {lang === "ur" ? "لوگو ہٹائیں" : "Remove Logo"}
                  </button>
                )}
                <p className="text-xs text-muted">
                  {lang === "ur" ? "PNG, JPG — زیادہ سے زیادہ 500KB" : "PNG, JPG — max 500KB"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Business Info */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Building className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">
              {lang === "ur" ? "کاروباری معلومات" : "Business Information"}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name (English)</label>
              <input type="text" value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                disabled={!canEditSettings}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-50 disabled:text-muted" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">کاروبار کا نام (اردو)</label>
              <input type="text" dir="rtl" value={form.name_ur} onChange={(e) => setForm({ ...form, name_ur: e.target.value })}
                disabled={!canEditSettings}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-urdu focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-50 disabled:text-muted" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address (English)</label>
              <input type="text" value={form.address_en} onChange={(e) => setForm({ ...form, address_en: e.target.value })}
                disabled={!canEditSettings}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-50 disabled:text-muted" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">پتہ (اردو)</label>
              <input type="text" dir="rtl" value={form.address_ur} onChange={(e) => setForm({ ...form, address_ur: e.target.value })}
                disabled={!canEditSettings}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-urdu focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-50 disabled:text-muted" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0300-1234567"
                disabled={!canEditSettings}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-50 disabled:text-muted" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NTN Number</label>
              <input type="text" value={form.ntn_number} onChange={(e) => setForm({ ...form, ntn_number: e.target.value })} placeholder="National Tax Number"
                disabled={!canEditSettings}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-50 disabled:text-muted" />
            </div>
          </div>
          {canEditSettings && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {saved ? <><Check className="w-4 h-4" /> {lang === "ur" ? "محفوظ ہو گیا!" : "Saved!"}</> :
               saving ? t("common_loading", lang) : t("common_save", lang)}
            </button>
          )}
        </div>

        {/* Profile */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">
              {lang === "ur" ? "پروفائل" : "Profile"}
            </h2>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={user?.email || ""} disabled
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 text-muted" />
          </div>
          {role && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {lang === "ur" ? "کردار" : "Role"}
              </label>
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-primary/10 text-primary capitalize">
                {t(`role_${role}`, lang)}
              </span>
            </div>
          )}
        </div>

        {/* Currency & Invoice Template */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">
              {t("settings_currency", lang)} & {t("settings_template", lang)}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("settings_currency", lang)}</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                disabled={!canEditSettings}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-50 disabled:text-muted"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("settings_template", lang)}</label>
              <select
                value={form.invoice_template}
                onChange={(e) => setForm({ ...form, invoice_template: e.target.value })}
                disabled={!canEditSettings}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-50 disabled:text-muted"
              >
                <option value="classic">{t("tpl_classic", lang)}</option>
                <option value="modern">{t("tpl_modern", lang)}</option>
                <option value="minimal">{t("tpl_minimal", lang)}</option>
              </select>
            </div>
          </div>
          {canEditSettings && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {saved ? <><Check className="w-4 h-4" /> {lang === "ur" ? "محفوظ ہو گیا!" : "Saved!"}</> :
               saving ? t("common_loading", lang) : t("common_save", lang)}
            </button>
          )}
        </div>

        {/* Language */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">
              {lang === "ur" ? "زبان" : "Language"}
            </h2>
          </div>
          <p className="text-sm text-muted">
            {lang === "ur"
              ? "ایپ کی زبان تبدیل کرنے کے لیے سائیڈبار میں زبان کا بٹن استعمال کریں"
              : "Use the language button in the sidebar to switch between English and Urdu"}
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
