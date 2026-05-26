import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { isNative } from "@/lib/platform";
import { supabase } from "@/integrations/supabase/client";
import { Purchases } from "@revenuecat/purchases-capacitor";

const PREMIUM_ENTITLEMENT = "pro";
const MONTHLY_PACKAGE_ID = "$rc_monthly";

const loadPurchases = async () => Purchases;

const debug = (msg: string, extra?: unknown) => {
  // eslint-disable-next-line no-console
  console.log(`[RevenueCat] ${msg}`, extra ?? "");
};

export const useRevenueCat = () => {
  const [offerings, setOfferings] = useState<any>(null);
  const [isProMember, setIsProMember] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<{
    native: boolean;
    pluginLoaded: boolean;
    appUserId?: string;
    offeringId?: string;
    packageIds: string[];
    productIds: string[];
    customerInfoFetched: boolean;
    lastStep?: string;
  }>({ native: false, pluginLoaded: false, packageIds: [], productIds: [], customerInfoFetched: false });

  const refresh = useCallback(async () => {
    const native = isNative();
    setDiagnostics((d) => ({ ...d, native, lastStep: "start" }));
    if (!native) {
      setIsLoading(false);
      return;
    }

    // Wait for Capacitor to be ready
    await new Promise<void>((resolve) => {
      if ((window as any).Capacitor?.isNativePlatform()) {
        resolve();
      } else {
        document.addEventListener("deviceready", () => resolve(), { once: true });
        setTimeout(resolve, 3000); // fallback
      }
    });

    // Add 1 second delay to ensure native bridge is fully ready
    await new Promise((r) => setTimeout(r, 1000));

    try{
      setDiagnostics((d) => ({ ...d, lastStep: "loading plugin" }));
      const Purchases = await loadPurchases();
      setDiagnostics((d) => ({ ...d, pluginLoaded: true, lastStep: "waiting for configure" }));
      // Wait for RevenueCat to be configured (max 5 seconds)
      let retries = 0;
      while (retries < 10) {
        try {
          await Purchases.getOfferings();
          break;
        } catch (e: any) {
          if (e?.message?.includes("configured") || e?.message?.includes("setup")) {
            await new Promise((r) => setTimeout(r, 500));
            retries++;
          } else {
            throw e;
          }
        }
      }
      setDiagnostics((d) => ({ ...d, lastStep: "getOfferings" }));
      const offs = await Purchases.getOfferings();
      debug("offerings", offs);
      const current = offs.current ?? null;
      setOfferings(current);
      setDiagnostics((d) => ({
        ...d,
        offeringId: current?.identifier,
        packageIds: current?.availablePackages?.map((p: any) => p.identifier) ?? [],
        productIds: current?.availablePackages?.map((p: any) => p.product?.identifier) ?? [],
        lastStep: "getCustomerInfo",
      }));
      if (!current) {
        const msg = "No current offering configured in RevenueCat";
        setError(msg);
        toast.error(msg);
      }
      const info = await Purchases.getCustomerInfo();
      setIsProMember(!!info.customerInfo?.entitlements?.active?.[PREMIUM_ENTITLEMENT]);
      setDiagnostics((d) => ({
        ...d,
        customerInfoFetched: true,
        appUserId: (info.customerInfo as any)?.originalAppUserId,
        lastStep: "done",
      }));
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      debug("init error", e);
      setError(msg);
      setDiagnostics((d) => ({ ...d, lastStep: `error: ${msg}` }));
      toast.error(`RevenueCat: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 2000);
    return () => clearTimeout(timer);
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
      const ent = result.customerInfo?.entitlements?.active?.[PREMIUM_ENTITLEMENT];
      const entitled = !!ent;
      setIsProMember(entitled);

      if (entitled) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
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

      // Immediately refresh hook state (offerings, customerInfo, diagnostics)
      await refresh();

      if (entitled) {
        const productId = (pkg as any)?.product?.identifier ?? (pkg as any)?.identifier ?? "unknown";
        const expiresAt = ent?.expirationDate
          ? new Date(ent.expirationDate).toLocaleDateString()
          : "—";
        toast.success("Smoxit Premium aktiviert 🎉", {
          description: `Paket: ${productId} · Entitlement: ${PREMIUM_ENTITLEMENT} · gültig bis ${expiresAt}`,
        });
      } else {
        toast.error("Kauf abgeschlossen, aber Entitlement nicht aktiv");
      }

      return entitled;
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      const userCancelled = e?.userCancelled === true || /cancel/i.test(msg);
      debug("purchase error", e);
      if (!userCancelled) toast.error(`Purchase failed: ${msg}`);
      throw e;
    }
  }, [refresh]);

  return { offerings, isProMember, isLoading, error, diagnostics, purchaseMonthly, refresh };
};
