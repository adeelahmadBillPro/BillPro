"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useLanguage } from "@/lib/store";
import { useAuth } from "@/lib/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { t } from "@/lib/i18n";
import { Building, User, Globe, Check } from "lucide-react";

export default function SettingsPage() {
  const { lang } = useLanguage();
  const { business, user, fetchBusiness } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name_en: "", name_ur: "", address_en: "", address_ur: "",
    phone: "", ntn_number: "", email: "",
  });

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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">کاروبار کا نام (اردو)</label>
              <input type="text" dir="rtl" value={form.name_ur} onChange={(e) => setForm({ ...form, name_ur: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-urdu focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address (English)</label>
              <input type="text" value={form.address_en} onChange={(e) => setForm({ ...form, address_en: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">پتہ (اردو)</label>
              <input type="text" dir="rtl" value={form.address_ur} onChange={(e) => setForm({ ...form, address_ur: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-urdu focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0300-1234567"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NTN Number</label>
              <input type="text" value={form.ntn_number} onChange={(e) => setForm({ ...form, ntn_number: e.target.value })} placeholder="National Tax Number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {saved ? <><Check className="w-4 h-4" /> {lang === "ur" ? "محفوظ ہو گیا!" : "Saved!"}</> :
             saving ? t("common_loading", lang) : t("common_save", lang)}
          </button>
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
