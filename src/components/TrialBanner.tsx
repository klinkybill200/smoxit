import { useState } from "react";
import { useSubscription } from "@/lib/subscription";
import { Paywall } from "./Paywall";
import { cn } from "@/lib/utils";

const formatRemaining = (ms: number) => {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const mins = totalMin % 60;
  if (days >= 1) return `${days}d ${hours}h left`;
  if (hours >= 1) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
};

export const TrialBanner = () => {
  const sub = useSubscription();
  const [open, setOpen] = useState(false);

  if (sub.status === "loading" || sub.status === "active") return null;
  if (!sub.trialEndsAt) return null;
  if (sub.msUntilTrialEnd <= 0) return null; // hard paywall handles this

  const lessThan24h = sub.msUntilTrialEnd < 24 * 3600 * 1000;
  const remaining = formatRemaining(sub.msUntilTrialEnd);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "w-full px-4 py-2.5 text-center text-sm font-bold text-white transition-colors",
          lessThan24h ? "bg-[hsl(0,73%,56%)] hover:bg-[hsl(0,73%,50%)]" : "bg-[hsl(38,92%,50%)] hover:bg-[hsl(38,92%,45%)]"
        )}
      >
        {lessThan24h
          ? `🚨 Trial ends in ${remaining.replace(" left", "")} — Upgrade now`
          : `⏳ Free trial: ${remaining} — Upgrade to keep access`}
      </button>
      <Paywall open={open} onOpenChange={setOpen} dismissible />
    </>
  );
};
