"use client";

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useLanguage } from "@/lib/store";
import { useAuth } from "@/lib/hooks/useAuth";
import { getCustomers, getInvoices, getPayments, getExpenses, getProducts } from "@/lib/supabase/database";
import { t } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import { Download, Database, Loader2, FileText, Users, CreditCard, Wallet, Package } from "lucide-react";

export default function BackupPage() {
  const { lang } = useLanguage();
  const { business } = useAuth();
  const { showToast } = useToast();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!business) return;
    setExporting(true);

    try {
      const [custRes, invRes, payRes, expRes, prodRes] = await Promise.all([
        getCustomers(business.id),
        getInvoices(business.id),
        getPayments(business.id),
        getExpenses(business.id),
        getProducts(business.id),
      ]);

      const { utils, writeFile } = await import("xlsx");

      const wb = utils.book_new();

      // Customers sheet
      const customers = (custRes.data || []).map((c) => ({
        Name_EN: c.name_en,
        Name_UR: c.name_ur,
        Phone: c.phone,
        Email: c.email || "",
        Address: c.address_en || "",
        City: c.city_en || "",
        Balance: c.balance,
        Created: c.created_at,
      }));
      utils.book_append_sheet(wb, utils.json_to_sheet(customers), "Customers");

      // Invoices sheet
      const invoices = (invRes.data || []).map((i: any) => ({
        Invoice: i.invoice_number,
        Customer: i.customer?.name_en || "",
        Status: i.status,
        Issue_Date: i.issue_date,
        Due_Date: i.due_date,
        Subtotal: Number(i.subtotal),
        Tax: Number(i.tax_amount),
        Discount: Number(i.discount),
        Total: Number(i.total),
      }));
      utils.book_append_sheet(wb, utils.json_to_sheet(invoices), "Invoices");

      // Payments sheet
      const payments = (payRes.data || []).map((p: any) => ({
        Invoice: p.invoice?.invoice_number || "",
        Customer: p.invoice?.customer?.name_en || "",
        Amount: Number(p.amount),
        Method: p.payment_method,
        Date: p.payment_date,
        Reference: p.reference_number || "",
      }));
      utils.book_append_sheet(wb, utils.json_to_sheet(payments), "Payments");

      // Expenses sheet
      const expenses = (expRes.data || []).map((e: any) => ({
        Description_EN: e.description_en,
        Description_UR: e.description_ur,
        Category: e.category?.name_en || "",
        Amount: Number(e.amount),
        Date: e.expense_date,
        Method: e.payment_method,
        Reference: e.reference_number || "",
      }));
      utils.book_append_sheet(wb, utils.json_to_sheet(expenses), "Expenses");

      // Products sheet
      const products = (prodRes.data || []).map((p) => ({
        Name_EN: p.name_en,
        Name_UR: p.name_ur,
        Price: p.unit_price,
        Unit: p.unit,
        Active: p.is_active ? "Yes" : "No",
      }));
      utils.book_append_sheet(wb, utils.json_to_sheet(products), "Products");

      const date = new Date().toISOString().split("T")[0];
      writeFile(wb, `BillPro_Backup_${date}.xlsx`);
      showToast(lang === "ur" ? "بیک اپ کامیابی سے ڈاؤنلوڈ ہو گیا" : "Backup downloaded successfully", "success");
    } catch (err) {
      console.error("Export failed:", err);
      showToast(lang === "ur" ? "بیک اپ ناکام" : "Export failed", "error");
    }

    setExporting(false);
  };

  const cards = [
    { icon: Users, label: lang === "ur" ? "صارفین" : "Customers", color: "text-blue-600 bg-blue-50" },
    { icon: FileText, label: lang === "ur" ? "انوائسز" : "Invoices", color: "text-primary bg-primary/10" },
    { icon: CreditCard, label: lang === "ur" ? "ادائیگیاں" : "Payments", color: "text-green-600 bg-green-50" },
    { icon: Wallet, label: lang === "ur" ? "اخراجات" : "Expenses", color: "text-amber-600 bg-amber-50" },
    { icon: Package, label: lang === "ur" ? "مصنوعات" : "Products", color: "text-purple-600 bg-purple-50" },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-primary" />
          <h1 className={`text-2xl font-bold text-gray-900 ${lang === "ur" ? "font-urdu" : ""}`}>
            {t("nav_backup", lang)}
          </h1>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {lang === "ur" ? "مکمل ڈیٹا ایکسپورٹ" : "Full Data Export"}
            </h2>
            <p className="text-sm text-muted">
              {lang === "ur"
                ? "تمام کاروباری ڈیٹا ایک ایکسل فائل میں ڈاؤنلوڈ کریں۔ اس میں صارفین، انوائسز، ادائیگیاں، اخراجات اور مصنوعات شامل ہیں۔"
                : "Download all your business data in a single Excel file. Includes customers, invoices, payments, expenses, and products."}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {cards.map((card) => (
              <div key={card.label} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-gray-50">
                <div className={`p-2 rounded-lg ${card.color}`}>
                  <card.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-gray-700">{card.label}</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full inline-flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Download className="w-5 h-5" />
            )}
            {exporting
              ? (lang === "ur" ? "ایکسپورٹ ہو رہا ہے..." : "Exporting...")
              : (lang === "ur" ? "ایکسل ڈاؤنلوڈ کریں" : "Download Excel Backup")}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
