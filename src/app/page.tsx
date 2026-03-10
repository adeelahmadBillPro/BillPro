import Link from "next/link";
import {
  FileText,
  Users,
  CreditCard,
  BarChart3,
  Wallet,
  Shield,
  Globe,
  Smartphone,
  Moon,
  Download,
  ArrowRight,
  CheckCircle,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Invoice Management",
    titleUr: "انوائس مینجمنٹ",
    desc: "Create, send, and track professional invoices with bilingual support",
  },
  {
    icon: Users,
    title: "Customer Tracking",
    titleUr: "صارفین ٹریکنگ",
    desc: "Manage customers with ledger, balance tracking, and contact info",
  },
  {
    icon: CreditCard,
    title: "Payment Recording",
    titleUr: "ادائیگی ریکارڈ",
    desc: "Record payments via cash, bank, cheque, or online methods",
  },
  {
    icon: BarChart3,
    title: "Reports & Charts",
    titleUr: "رپورٹس اور چارٹس",
    desc: "Revenue charts, profit/loss, Excel & PDF export",
  },
  {
    icon: Wallet,
    title: "Expense Tracking",
    titleUr: "اخراجات ٹریکنگ",
    desc: "Track business expenses by category with detailed summaries",
  },
  {
    icon: Shield,
    title: "Team Roles",
    titleUr: "ٹیم رولز",
    desc: "Owner, admin, accountant, and viewer roles with invite system",
  },
];

const highlights = [
  { icon: Globe, text: "English & Urdu bilingual" },
  { icon: Moon, text: "Dark mode support" },
  { icon: Smartphone, text: "Mobile responsive" },
  { icon: Download, text: "PDF invoices & reports" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface">
      {/* Nav */}
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">BillPro</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 px-3 py-2"
            >
              Login
            </Link>
            <Link
              href="/auth/signup"
              className="text-sm font-medium bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
          <CheckCircle className="w-4 h-4" />
          Free & Open Source
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-4">
          Professional Billing
          <br />
          <span className="text-primary">Made Simple</span>
        </h1>
        <p className="font-urdu text-xl sm:text-2xl text-muted mb-2" dir="rtl">
          پیشہ ورانہ بلنگ اور انوائس سسٹم
        </p>
        <p className="text-lg text-muted max-w-2xl mx-auto mb-8">
          Complete billing solution for Pakistani businesses with Urdu/English support,
          expense tracking, team roles, and professional PDF invoices.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl text-base font-medium hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25"
          >
            Start Free <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 bg-white text-gray-700 px-6 py-3 rounded-xl text-base font-medium border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
          >
            Sign In
          </Link>
        </div>

        {/* Highlight chips */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {highlights.map((h) => (
            <div
              key={h.text}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-gray-200 text-sm text-gray-600"
            >
              <h.icon className="w-4 h-4 text-primary" />
              {h.text}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-3">
          Everything You Need
        </h2>
        <p className="text-muted text-center mb-12 max-w-xl mx-auto">
          A complete toolkit for managing your business finances, from invoicing to expense tracking.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md hover:border-gray-300 transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{f.title}</h3>
              <p className="font-urdu text-sm text-primary" dir="rtl">
                {f.titleUr}
              </p>
              <p className="text-sm text-muted mt-2">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-primary rounded-2xl p-8 sm:p-12 text-center text-white">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            Ready to streamline your billing?
          </h2>
          <p className="font-urdu text-lg opacity-90 mb-2" dir="rtl">
            ابھی شروع کریں — مکمل طور پر مفت
          </p>
          <p className="opacity-80 mb-6 max-w-lg mx-auto">
            Create your account in 30 seconds and start managing invoices, payments, and expenses.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-xl text-base font-semibold hover:bg-gray-50 transition-colors"
          >
            Create Free Account <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <FileText className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-gray-700">BillPro</span>
          </div>
          <p>Professional billing for Pakistani businesses</p>
        </div>
      </footer>
    </div>
  );
}
