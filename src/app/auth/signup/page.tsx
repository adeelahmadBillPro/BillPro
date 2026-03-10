"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Receipt } from "lucide-react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [businessNameEn, setBusinessNameEn] = useState("");
  const [businessNameUr, setBusinessNameUr] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match / پاسورڈ مماثل نہیں ہیں");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters / پاسورڈ کم از کم 6 حروف کا ہونا چاہیے");
      return;
    }
    if (!businessNameEn.trim()) {
      setError("Business name is required / کاروبار کا نام ضروری ہے");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      // Step 1: Sign up
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      // Step 2: If no session (email confirmation required), sign in manually
      if (!authData.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          setError("Account created! Please check your email to confirm, then login. / اکاؤنٹ بن گیا! براہ کرم ای میل چیک کریں، پھر لاگ ان کریں");
          setLoading(false);
          return;
        }
      }

      // Step 3: Get current user from session
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Step 4: Create business
        const { data: bizData, error: bizError } = await supabase.from("businesses").insert({
          user_id: user.id,
          name_en: businessNameEn.trim(),
          name_ur: businessNameUr.trim(),
          email: email,
        }).select().single();

        if (bizError) {
          console.error("Business creation error:", bizError);
          setError("Account created but business setup failed. Go to Settings to complete setup. / اکاؤنٹ بن گیا لیکن کاروبار کی ترتیب ناکام رہی");
        }

        // Step 5: Create trial subscription
        if (bizData) {
          const trialEnd = new Date();
          trialEnd.setDate(trialEnd.getDate() + 14);
          await supabase.from("subscriptions").insert({
            business_id: bizData.id,
            status: "trialing",
            trial_ends_at: trialEnd.toISOString(),
          });
        }
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-surface to-secondary/10 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Receipt className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">BillPro</h1>
          <p className="text-muted mt-1 font-urdu text-lg" dir="rtl">پیشہ ورانہ بلنگ اور انوائس سسٹم</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign Up / سائن اپ</h2>

          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-danger text-sm p-3 rounded-lg">{error}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name (English) *</label>
              <input
                type="text"
                value={businessNameEn}
                onChange={(e) => setBusinessNameEn(e.target.value)}
                required
                placeholder="Your Business Name"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">کاروبار کا نام (اردو)</label>
              <input
                type="text"
                dir="rtl"
                value={businessNameUr}
                onChange={(e) => setBusinessNameUr(e.target.value)}
                placeholder="کاروبار کا نام"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-urdu focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email / ای میل *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password / پاسورڈ *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password / پاسورڈ کی تصدیق *</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 shadow-sm shadow-primary/20"
            >
              {loading ? "Loading..." : "Sign Up / سائن اپ"}
            </button>
          </form>

          <p className="text-center text-sm text-muted mt-6">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-primary font-medium hover:underline">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
