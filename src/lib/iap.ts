// Apple In-App Purchase integration via RevenueCat.
// Web is a no-op — web users continue to use Stripe Checkout.
import { isNative } from "@/lib/platform";
import { supabase } from "@/integrations/supabase/client";

// RevenueCat public SDK key (safe to ship in the client bundle).
// Paste the iOS key from RevenueCat → Project Settings → API keys (starts with "appl_").
export const REVENUECAT_IOS_KEY = "appl_REPLACE_ME";

// Entitlement identifier configured in RevenueCat (Project → Entitlements).
export const PREMIUM_ENTITLEMENT = "premium";

// Product identifier as defined in App Store Connect.
export const PREMIUM_PRODUCT_ID = "smoxit_pro";

let configured = false;

const getPurchases = async () => {
  const mod = await import("@revenuecat/purchases-capacitor");
  return mod.Purchases;
};

/** Configure RevenueCat once per app session and link to the Supabase user id. */
export const configureIAP = async (userId: string | null | undefined) => {
  if (!isNative()) return;
  try {
    const Purchases = await getPurchases();
    if (!configured) {
      await Purchases.configure({
        apiKey: REVENUECAT_IOS_KEY,
        appUserID: userId ?? undefined,
      });
      configured = true;
    } else if (userId) {
      await Purchases.logIn({ appUserID: userId });
    }
  } catch (e) {
    console.error("RevenueCat configure failed", e);
  }
};

export const logoutIAP = async () => {
  if (!isNative() || !configured) return;
  try {
    const Purchases = await getPurchases();
    await Purchases.logOut();
  } catch (e) {
    console.error("RevenueCat logout failed", e);
  }
};

/**
 * Trigger the Apple purchase sheet for the Smoxit Pro subscription.
 * Returns true if the user now has the premium entitlement.
 */
export const purchasePremium = async (): Promise<boolean> => {
  if (!isNative()) throw new Error("IAP only available in the iOS app");
  const Purchases = await getPurchases();

  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  const pkg =
    current?.availablePackages?.find(
      (p) => p.product.identifier === PREMIUM_PRODUCT_ID,
    ) ?? current?.availablePackages?.[0];

  if (!pkg) throw new Error("No subscription package available");

  const result = await Purchases.purchasePackage({ aPackage: pkg });
  const entitled = !!result.customerInfo.entitlements.active?.[PREMIUM_ENTITLEMENT];
  if (entitled) await syncEntitlementToProfile(true, result.customerInfo);
  return entitled;
};

/** Restore previous purchases — required by Apple guidelines. */
export const restorePurchases = async (): Promise<boolean> => {
  if (!isNative()) return false;
  const Purchases = await getPurchases();
  const { customerInfo } = await Purchases.restorePurchases();
  const entitled = !!customerInfo.entitlements.active?.[PREMIUM_ENTITLEMENT];
  await syncEntitlementToProfile(entitled, customerInfo);
  return entitled;
};

/** Mirror the entitlement into our profiles table so the rest of the app sees it. */
const syncEntitlementToProfile = async (entitled: boolean, customerInfo: any) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const ent = customerInfo?.entitlements?.active?.[PREMIUM_ENTITLEMENT];
    const periodEnd = ent?.expirationDate ? new Date(ent.expirationDate).toISOString() : null;
    await supabase
      .from("profiles")
      .update({
        subscription_status: entitled ? "active" : "canceled",
        subscription_current_period_end: periodEnd,
      })
      .eq("user_id", user.id);
  } catch (e) {
    console.error("syncEntitlementToProfile failed", e);
  }
};
