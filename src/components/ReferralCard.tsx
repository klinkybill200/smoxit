import { Copy, Share2, Gift } from "lucide-react";
import { useUser } from "@/lib/store";
import { useSubscription } from "@/lib/subscription";
import { getDuration, moneySaved, formatMoney } from "@/lib/calc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const ReferralCard = () => {
  const { user } = useUser();
  const sub = useSubscription();

  if (!sub.referralCode) return null;

  const link = `https://my.smoxit.app/?ref=${sub.referralCode}`;
  const days = user ? getDuration(user.quitDate).days : 0;
  const saved = user ? moneySaved(user) : 0;
  const message = `I've been smoke-free for ${days} days with SMOXIT and saved ${formatMoney(saved)} 🚭 Join me and we both get $5 off: ${link}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Copied! ✓");
    } catch {
      toast.error("Could not copy");
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join me on SMOXIT", text: message, url: link });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(message);
      toast.success("Message copied to clipboard");
    }
  };

  const credited = sub.referralCredits * 5;

  return (
    <section className="rounded-2xl bg-gradient-hero p-5 text-primary-foreground">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent">
        <Gift className="h-3.5 w-3.5" /> Invite Friends · Earn $5
      </div>
      <p className="mt-2 font-display text-xl font-black leading-snug text-balance">
        Invite a friend. Get $5 off.
      </p>
      <p className="mt-1 text-sm text-primary-foreground/80">
        For every friend who subscribes, we apply $5 to your next bill.
      </p>

      <div className="mt-4 rounded-xl bg-white/10 px-4 py-3 text-center font-mono text-base font-bold tracking-wider">
        {sub.referralCode}
      </div>

      <p className="mt-3 text-xs text-primary-foreground/75">
        {sub.referredCount} friend{sub.referredCount === 1 ? "" : "s"} invited · ${credited} credited so far
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button
          onClick={copy}
          className="h-11 bg-white/15 font-bold text-primary-foreground hover:bg-white/25 border border-white/20"
        >
          <Copy className="mr-1.5 h-4 w-4" /> Copy Link
        </Button>
        <Button
          onClick={share}
          className="h-11 bg-accent font-bold text-primary hover:bg-accent-glow"
        >
          <Share2 className="mr-1.5 h-4 w-4" /> Share
        </Button>
      </div>
    </section>
  );
};
