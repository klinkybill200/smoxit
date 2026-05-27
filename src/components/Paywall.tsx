import { useState } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SmoxitLogo } from "@/components/SmoxitLogo";
import { useSubscription } from "@/lib/subscription";
import { useUser } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { getDuration, moneySaved } from "@/lib/calc";
import { useCurrency } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isNative } from "@/lib/platform";
import { purchasePremium, restorePurchases, configureStatus } from "@/lib/iap";
import { useRevenueCat } from "@/hooks/useRevenueCat";

interface PaywallProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  dismissible?: boolean;
}

const FEATURES = [
  "Unlimited craving & mood tracking",
  "SOS Coach, Breathing & Meditations",
  "Quit Squad & Community Feed",
  "Milestone badges & streak protection",
  "Health app integration",
];

export const Paywall = ({ open, onOpenChange, dismissible = true }: PaywallProps) => {
  const { user } = useUser();
  const { signOut } = useAuth();
  const sub = useSubscription();
  const currency = useCurrency();
  const [loading, setLoading] = useState(false);
  const rc = useRevenueCat();

  const days = user ? getDuration(user.quitDate).days : 0;
  const saved = user ? moneySaved(user) : 0;
  const hasReferral = !!user && !!sub.referralCode === false ? false : false;
  // Actually check from profile: do we have a referred_by code?
  // Simpler: read from sub.referralCredits won't tell us. Check profiles.referred_by directly via sub.
  // For UI purposes: show discount only if user was referred (we'd need to fetch referred_by).

  const startCheckout = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {});
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start checkout");
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (dismissible || v) onOpenChange(v); }}>
      <DialogContent
        className="max-w-[430px] gap-0 p-0 overflow-hidden border-0 bg-background sm:rounded-2xl [&>button]:hidden h-[100dvh] sm:h-auto sm:max-h-[92vh] overflow-y-auto"
        onEscapeKeyDown={(e) => { if (!dismissible) e.preventDefault(); }}
        onPointerDownOutside={(e) => { if (!dismissible) e.preventDefault(); }}
      >
        {dismissible && (
          <button
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-foreground/10 text-foreground hover:bg-foreground/20"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div className="bg-gradient-hero px-6 pt-10 pb-8 text-primary-foreground">
          <div className="flex justify-center">
            <SmoxitLogo size={48} variant="light" />
          </div>
          <h2 className="mt-5 text-center font-display text-3xl font-black leading-tight">
            Keep your streak alive.
          </h2>
          {user && days > 0 && (
            <p className="mt-3 text-center text-sm text-primary-foreground/85">
              You're already <strong className="text-accent">{days} days smoke-free</strong>{" "}
              and saved <strong className="text-accent">{currency.format(saved)}</strong> — don't stop now.
            </p>
          )}
        </div>

        <div className="px-6 py-6 space-y-5">
          {isNative() ? (
            <div className="rounded-2xl border-2 border-accent/40 bg-card p-5 shadow-[var(--shadow-card)]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-accent">Smoxit Premium</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-4xl font-black text-foreground">€9.99</span>
                <span className="text-sm text-muted-foreground">/ month</span>
              </div>
              <ul className="mt-4 space-y-2.5">
                {FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span className="text-foreground">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-accent/40 bg-card p-5 shadow-[var(--shadow-card)]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-accent">Smoxit Premium</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-4xl font-black text-foreground">{currency.priceLabel}</span>
                <span className="text-sm text-muted-foreground">/ month</span>
              </div>
              <ul className="mt-4 space-y-2.5">
                {FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span className="text-foreground">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isNative() ? (
            <>
              <Button
                onClick={async () => {
                  setLoading(true);
                  try {
                    const ok = await rc.purchaseMonthly();
                    await sub.refresh();
                    if (ok) {
                      toast.success("Welcome to Smoxit Premium! 🎉");
                      onOpenChange(false);
                    }
                  } catch (e) {
                    // error toast already shown by hook
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full h-14 text-base font-bold bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Subscribe Now"}
              </Button>
              <button
                onClick={async () => {
                  setLoading(true);
                  try {
                    const ok = await restorePurchases();
                    await sub.refresh();
                    toast[ok ? "success" : "message"](ok ? "Purchase restored 🎉" : "No previous purchase found");
                    if (ok) onOpenChange(false);
                  } catch (e: any) {
                    toast.error(e?.message ?? "Restore failed");
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="block w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Restore Purchase
              </button>
              <p className="text-center text-[10px] text-muted-foreground leading-snug">
                Auto-renewable subscription. Payment will be charged to your Apple ID. Subscription renews unless canceled at least 24 hours before the end of the period. Manage in Settings → Apple ID → Subscriptions.
              </p>
            </>
          ) : (
            <>
              <Button
                onClick={startCheckout}
                disabled={loading}
                className="w-full h-14 text-base font-bold bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : `Subscribe for ${currency.priceLabel}/month`}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Cancel anytime · Secure payment via Stripe
              </p>
            </>
          )}

          {isNative() && (
            <div className="rounded-xl border border-border bg-muted/40 p-3 text-[10px] font-mono text-muted-foreground space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider">RC Debug</span>
                <button
                  onClick={() => rc.refresh()}
                  className="rounded bg-foreground/10 px-2 py-0.5 text-[10px] hover:bg-foreground/20"
                >
                  Refresh
                </button>
              </div>
              <div>native: {String(rc.diagnostics.native)}</div>
              <div>plugin loaded: {String(rc.diagnostics.pluginLoaded)}</div>
              <div>last step: {rc.diagnostics.lastStep ?? "—"}</div>
              <div>offering: {rc.diagnostics.offeringId ?? "(none)"}</div>
              <div>packages: {rc.diagnostics.packageIds.join(", ") || "(none)"}</div>
              <div>products: {rc.diagnostics.productIds.join(", ") || "(none)"}</div>
              <div>customerInfo: {String(rc.diagnostics.customerInfoFetched)}</div>
              <div>appUserId: {rc.diagnostics.appUserId ?? "—"}</div>
              <div>configureStatus: {configureStatus}</div>
              <div>pro: {String(rc.isProMember)}</div>
              {rc.error && <div className="text-destructive break-words">err: {rc.error}</div>}
            </div>
          )}

          {!dismissible && (
            <button
              onClick={async () => { await signOut(); }}
              className="block w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              Sign out
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
