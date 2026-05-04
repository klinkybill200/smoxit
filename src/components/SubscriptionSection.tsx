import { useState } from "react";
import { CreditCard, RefreshCw, ExternalLink, Loader2 } from "lucide-react";
import { useSubscription } from "@/lib/subscription";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const formatDate = (d: Date | null) =>
  d ? d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";

const formatTrialRemaining = (ms: number) => {
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days >= 1) return `${days} day${days === 1 ? "" : "s"} remaining`;
  return `${hours} hour${hours === 1 ? "" : "s"} remaining`;
};

export const SubscriptionSection = () => {
  const sub = useSubscription();
  const [loading, setLoading] = useState(false);

  const openPortal = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-portal-session", {});
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
      else throw new Error("No portal URL");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open portal");
      setLoading(false);
    }
  };

  const restore = async () => {
    await sub.refresh();
    toast.success("Subscription status refreshed");
  };

  let display = "";
  if (sub.status === "loading") display = "Loading…";
  else if (sub.status === "active")
    display = `✅ Premium – $9.95/month · Next billing: ${formatDate(sub.currentPeriodEnd)}`;
  else if (sub.status === "trialing" && sub.msUntilTrialEnd > 0)
    display = `⏳ Free Trial – ${formatTrialRemaining(sub.msUntilTrialEnd)}`;
  else if (sub.status === "past_due")
    display = "⚠️ Payment failed – please update your card";
  else if (sub.status === "canceled")
    display = `❌ Canceled – access until ${formatDate(sub.currentPeriodEnd)}`;
  else display = "❌ No active subscription";

  const credits = sub.referralCredits * 5;

  return (
    <section className="smoxit-card">
      <div className="flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-accent" />
        <p className="font-display font-black">Subscription</p>
      </div>

      <p className="mt-3 text-sm font-semibold">{display}</p>

      {sub.referredCount > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Referral credits earned: <span className="font-bold text-accent">${credits}</span> ({sub.referredCount} friend{sub.referredCount === 1 ? "" : "s"})
        </p>
      )}

      <div className="mt-4 space-y-2">
        <Button
          onClick={openPortal}
          disabled={loading || sub.status === "loading"}
          variant="outline"
          className="w-full"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Manage Subscription <ExternalLink className="ml-1.5 h-4 w-4" /></>}
        </Button>
        <Button onClick={restore} variant="ghost" size="sm" className="w-full text-xs">
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Restore Purchase
        </Button>
      </div>
    </section>
  );
};
