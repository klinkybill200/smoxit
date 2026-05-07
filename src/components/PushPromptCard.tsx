import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { isPushSupported, getPushPermission, subscribeToPush } from "@/lib/push";
import { toast } from "sonner";

const DISMISS_KEY = "smoxit:push_prompt_dismissed_at";
const SNOOZE_DAYS = 3;

export const PushPromptCard = () => {
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setPerm(getPushPermission());
    try {
      const t = parseInt(localStorage.getItem(DISMISS_KEY) || "0", 10);
      if (t && Date.now() - t < SNOOZE_DAYS * 86400000) setDismissed(true);
    } catch {}
  }, []);

  if (!isPushSupported()) return null;
  if (perm === "granted" || perm === "denied" || perm === "unsupported") return null;
  if (dismissed) return null;

  const enable = async () => {
    setBusy(true);
    try {
      const r = await subscribeToPush();
      setPerm(getPushPermission());
      if (r.ok) toast.success("Push notifications on. 🔔");
      else if (r.error === "denied") toast.error("Permission denied. Enable in browser settings.");
      else toast.error("Could not enable push.");
    } finally {
      setBusy(false);
    }
  };

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setDismissed(true);
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border-2 border-accent/40 bg-gradient-to-br from-accent/15 to-accent/5 p-4">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent shadow-button">
          <Bell className="h-5 w-5 text-accent-foreground" />
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <p className="font-display font-black leading-tight">Stay on track with reminders</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Daily check-ins, craving tips, squad pings. No spam — promise.
          </p>
        </div>
      </div>
      <button
        onClick={enable}
        disabled={busy}
        className="mt-3 w-full rounded-xl bg-accent py-2.5 text-sm font-bold text-accent-foreground shadow-button transition-bounce hover:scale-[1.01] disabled:opacity-50"
      >
        {busy ? "Enabling…" : "Enable notifications"}
      </button>
    </section>
  );
};
