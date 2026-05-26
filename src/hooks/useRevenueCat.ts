import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { isNative } from "@/lib/platform";
import { supabase } from "@/integrations/supabase/client";

const PREMIUM_ENTITLEMENT = "premium";
const MONTHLY_PACKAGE_ID = "$rc_monthly";

const loadPurchases = async () => {
  const mod = await import("@revenuecat/purchases-capacitor");
  return mod.Purchases;
};

const debug = (msg: string, extra?: unknown) => {
  // eslint-disable-next-line no-console
  console.log(`[RevenueCat] ${msg}`, extra ?? "");
};

export const useRevenueCat = () => {
  const [offerings, setOfferings] = useState<any>(null);
  const [isProMember, setIsProMember] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isNative()) {
      setIsLoading(false);
      return;
    }
    try {
      const Purchases = await loadPurchases();
      const offs = await Purchases.getOfferings();
      debug("offerings", offs);
      setOfferings(offs.current ?? null);
      if (!offs.current) {
        const msg = "No current offering configured in RevenueCat";
        setError(msg);
        toast.error(msg);
      }
      const info = await Purchases.getCustomerInfo();
      setIsProMember(!!info.customerInfo?.entitlements?.active?.[PREMIUM_ENTITLEMENT]);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      debug("init error", e);
      setError(msg);
      toast.error(`RevenueCat: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const purchaseMonthly = useCallback(async (): Promise<boolean> => {
    if (!isNative()) {
      toast.error("In-app purchases only available in the iOS app");
      return false;
    }
    try {
      const Purchases = await loadPurchases();
      const offs = await Purchases.getOfferings();
      const current = offs.current;
      if (!current) {
        const msg = "No current offering in RevenueCat (check Offerings tab)";
        toast.error(msg);
        throw new Error(msg);
      }
      debug("packages", current.availablePackages);
      const pkg =
        current.availablePackages?.find((p: any) => p.identifier === MONTHLY_PACKAGE_ID) ??
        current.monthly ??
        current.availablePackages?.[0];
      if (!pkg) {
        const msg = "No $rc_monthly package found in current offering";
        toast.error(msg);
        throw new Error(msg);
      }
      debug("purchasing", pkg);
      const result = await Purchases.purchasePackage({ aPackage: pkg });
      const entitled = !!result.customerInfo?.entitlements?.active?.[PREMIUM_ENTITLEMENT];
      setIsProMember(entitled);

      if (entitled) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const ent = result.customerInfo.entitlements.active[PREMIUM_ENTITLEMENT];
            const periodEnd = ent?.expirationDate ? new Date(ent.expirationDate).toISOString() : null;
            await supabase
              .from("profiles")
              .update({ subscription_status: "active", subscription_current_period_end: periodEnd })
              .eq("user_id", user.id);
          }
        } catch (e) {
          debug("profile sync failed", e);
        }
      }
      return entitled;
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      const userCancelled = e?.userCancelled === true || /cancel/i.test(msg);
      debug("purchase error", e);
      if (!userCancelled) toast.error(`Purchase failed: ${msg}`);
      throw e;
    }
  }, []);

  return { offerings, isProMember, isLoading, error, purchaseMonthly, refresh };
};
