"use client";

import { useState, useEffect } from "react";
import { getBusinessSubscription, isSuperAdmin } from "@/lib/supabase/database";
import type { Subscription } from "@/types";

export function useSubscription(businessId: string | undefined) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) return;

    async function load() {
      const [subRes, adminRes] = await Promise.all([
        getBusinessSubscription(businessId!),
        isSuperAdmin(),
      ]);
      setSubscription(subRes.data);
      setIsAdmin(adminRes);
      setLoading(false);
    }

    load();
  }, [businessId]);

  // Calculate subscription state
  const now = new Date();
  const isTrialing = subscription?.status === "trialing";
  const trialEndsAt = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
  const trialDaysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;
  const trialExpired = isTrialing && trialEndsAt && trialEndsAt < now;

  const isActive = subscription?.status === "active";
  const periodEnd = subscription?.current_period_end ? new Date(subscription.current_period_end) : null;
  const subscriptionExpired = isActive && periodEnd && periodEnd < now;

  // Access is granted if: super admin, active sub, or valid trial
  const hasAccess = isAdmin || isActive && !subscriptionExpired || isTrialing && !trialExpired;

  // Show paywall when trial/sub expired and not super admin
  const showPaywall = !isAdmin && !loading && (trialExpired || subscriptionExpired || subscription?.status === "expired" || subscription?.status === "cancelled");

  return {
    subscription,
    isAdmin,
    loading,
    isTrialing,
    trialDaysLeft,
    trialExpired: !!trialExpired,
    isActive,
    hasAccess,
    showPaywall,
  };
}
