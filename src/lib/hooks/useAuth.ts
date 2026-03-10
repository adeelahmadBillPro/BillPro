"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Business, UserRole } from "@/types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Effect 1: Listen for auth state changes (sync only — no DB queries here)
  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
          setBusiness(null);
          setRole(null);
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Effect 2: Fetch business + role via business_members when user changes
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    const userId = user.id;
    const userEmail = user.email;
    let cancelled = false;

    async function loadBusiness() {
      try {
        // First try business_members (multi-user path)
        const { data: membership } = await supabase
          .from("business_members")
          .select("business_id, role")
          .eq("user_id", userId)
          .limit(1)
          .single();

        if (cancelled) return;

        if (membership) {
          // Found membership — fetch the business
          const { data: bizData } = await supabase
            .from("businesses")
            .select("*")
            .eq("id", membership.business_id)
            .single();

          if (cancelled) return;

          if (bizData) {
            setBusiness(bizData);
            setRole(membership.role as UserRole);
            setLoading(false);
            return;
          }
        }

        // Fallback: check if user owns a business directly (pre-migration)
        const { data: bizData } = await supabase
          .from("businesses")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (cancelled) return;

        if (bizData) {
          setBusiness(bizData);
          setRole("owner");
          setLoading(false);
          return;
        }

        // No business found — auto-create one + membership
        const { data: newBiz } = await supabase
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

        if (newBiz) {
          // Create owner membership
          await supabase.from("business_members").insert({
            business_id: newBiz.id,
            user_id: userId,
            role: "owner",
          });
          setBusiness(newBiz);
          setRole("owner");
        }
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
    setRole(null);
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
    if (!error && data) {
      // Create owner membership
      await supabase.from("business_members").insert({
        business_id: data.id,
        user_id: user.id,
        role: "owner",
      });
      setBusiness(data);
      setRole("owner");
    }
    return { data, error };
  }, [user]);

  const fetchBusiness = useCallback(async (userId: string) => {
    const supabase = createClient();
    const { data: membership } = await supabase
      .from("business_members")
      .select("business_id, role")
      .eq("user_id", userId)
      .limit(1)
      .single();

    if (membership) {
      const { data } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", membership.business_id)
        .single();
      setBusiness(data);
      setRole(membership.role as UserRole);
      return data;
    }

    // Fallback
    const { data } = await supabase
      .from("businesses")
      .select("*")
      .eq("user_id", userId)
      .single();
    setBusiness(data);
    setRole("owner");
    return data;
  }, []);

  return { user, business, role, loading, signOut, createBusiness, fetchBusiness };
}
