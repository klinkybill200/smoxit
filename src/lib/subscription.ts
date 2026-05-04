import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "incomplete" | "unpaid" | "loading";

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  trialStart: Date | null;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  referralCode: string | null;
  referralCredits: number;
  referredCount: number;
  /** True when user has paying access (active OR within trial). */
  hasAccess: boolean;
  /** True when trial is over and no active sub. */
  trialExpired: boolean;
  msUntilTrialEnd: number;
  refresh: () => Promise<void>;
}

const TRIAL_DAYS = 3;

export const useSubscription = (): SubscriptionInfo => {
  const { user } = useAuth();
  const [info, setInfo] = useState<Omit<SubscriptionInfo, "refresh" | "hasAccess" | "trialExpired" | "msUntilTrialEnd">>({
    status: "loading",
    trialStart: null,
    trialEndsAt: null,
    currentPeriodEnd: null,
    referralCode: null,
    referralCredits: 0,
    referredCount: 0,
  });
  const [, force] = useState(0);

  const load = useCallback(async () => {
    if (!user) {
      setInfo((s) => ({ ...s, status: "loading" }));
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_status, trial_start, subscription_current_period_end, referral_code, referral_credits")
      .eq("user_id", user.id)
      .maybeSingle();

    const { count } = await supabase
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_user_id", user.id)
      .eq("status", "converted");

    const trialStart = profile?.trial_start ? new Date(profile.trial_start) : null;
    const trialEndsAt = trialStart ? new Date(trialStart.getTime() + TRIAL_DAYS * 86400000) : null;

    setInfo({
      status: (profile?.subscription_status as SubscriptionStatus) ?? "trialing",
      trialStart,
      trialEndsAt,
      currentPeriodEnd: profile?.subscription_current_period_end ? new Date(profile.subscription_current_period_end) : null,
      referralCode: profile?.referral_code ?? null,
      referralCredits: profile?.referral_credits ?? 0,
      referredCount: count ?? 0,
    });
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  // tick every minute so countdown re-renders
  useEffect(() => {
    const i = setInterval(() => force((x) => x + 1), 60000);
    return () => clearInterval(i);
  }, []);

  const now = Date.now();
  const msUntilTrialEnd = info.trialEndsAt ? info.trialEndsAt.getTime() - now : 0;
  const trialActive = info.status === "trialing" && msUntilTrialEnd > 0;
  const subActive = info.status === "active" || info.status === "trialing";
  // hasAccess: paying user OR within trial window
  const hasAccess = info.status === "active" || trialActive;
  const trialExpired = info.status !== "active" && msUntilTrialEnd <= 0 && info.trialStart !== null;

  return {
    ...info,
    hasAccess,
    trialExpired,
    msUntilTrialEnd: Math.max(0, msUntilTrialEnd),
    refresh: load,
  };
};

/** Captures ?ref= from URL into localStorage so we can apply it after signup. */
export const REFERRAL_STORAGE_KEY = "smoxit:pending_referral";

export const captureReferralFromUrl = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && /^[A-Z0-9-]{6,32}$/i.test(ref)) {
      localStorage.setItem(REFERRAL_STORAGE_KEY, ref.toUpperCase());
      return ref.toUpperCase();
    }
  } catch {}
  return localStorage.getItem(REFERRAL_STORAGE_KEY);
};

export const consumePendingReferral = (): string | null => {
  try {
    const v = localStorage.getItem(REFERRAL_STORAGE_KEY);
    if (v) localStorage.removeItem(REFERRAL_STORAGE_KEY);
    return v;
  } catch { return null; }
};

/** Called once after auth so referred_by gets set on the new user's profile. */
export const applyPendingReferral = async (userId: string) => {
  const code = consumePendingReferral();
  if (!code) return;

  // Don't allow self-referral or overwrite
  const { data: own } = await supabase.from("profiles").select("referral_code, referred_by").eq("user_id", userId).maybeSingle();
  if (!own || own.referred_by) return;
  if (own.referral_code === code) return;

  // Find referrer
  const { data: referrer } = await supabase.from("profiles").select("user_id").eq("referral_code", code).maybeSingle();
  if (!referrer) return;

  await supabase.from("profiles").update({ referred_by: code }).eq("user_id", userId);
  await supabase.from("referrals").insert({
    referrer_user_id: referrer.user_id,
    referred_user_id: userId,
    referral_code: code,
    status: "pending",
  });
};
