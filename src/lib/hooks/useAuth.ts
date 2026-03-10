"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Business } from "@/types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Effect 1: Listen for auth state changes (sync only — no DB queries here)
  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        console.log("[useAuth] authChange:", event, session ? "has session" : "no session");
        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
          setBusiness(null);
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Effect 2: Fetch business when user changes (separate from auth callback)
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    const userId = user.id;
    const userEmail = user.email;
    let cancelled = false;

    async function loadBusiness() {
      try {
        console.log("[useAuth] Fetching business for user:", userId);
        const { data: bizData, error: fetchErr } = await supabase
          .from("businesses")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (cancelled) return;

        if (fetchErr) {
          console.warn("[useAuth] Business fetch error:", fetchErr.message);
        }

        if (bizData) {
          setBusiness(bizData);
          setLoading(false);
          return;
        }

        // No business found — auto-create one
        console.log("[useAuth] No business found, creating...");
        const { data: newBiz, error: insertErr } = await supabase
          .from("businesses")
          .insert({
            user_id: userId,
            name_en: userEmail?.split("@")[0] || "My Business",
            name_ur: "",
            email: userEmail || "",
          })
          .select()
          .single();

        if (cancelled) return;

        if (insertErr) {
          console.error("[useAuth] Business create error:", insertErr.message);
        }

        if (newBiz) setBusiness(newBiz);
      } catch (err) {
        console.error("[useAuth] loadBusiness exception:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadBusiness();
    return () => { cancelled = true; };
  }, [user]);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setBusiness(null);
    router.push("/auth/login");
  }, [router]);

  const createBusiness = useCallback(async (nameEn: string, nameUr: string = "") => {
    if (!user) return null;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("businesses")
      .insert({
        user_id: user.id,
        name_en: nameEn,
        name_ur: nameUr,
        email: user.email || "",
      })
      .select()
      .single();
    if (!error && data) setBusiness(data);
    return { data, error };
  }, [user]);

  const fetchBusiness = useCallback(async (userId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("businesses")
      .select("*")
      .eq("user_id", userId)
      .single();
    setBusiness(data);
    return data;
  }, []);

  return { user, business, loading, signOut, createBusiness, fetchBusiness };
}
