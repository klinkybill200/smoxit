import { useEffect, useRef, useState } from "react";
import { Bell, Moon, ExternalLink, RotateCcw, Pencil, Target, Shield, LogOut, Camera, Loader2, Leaf, Footprints, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useUser } from "@/lib/store";
import { getDuration, levelInfo, moneySaved, cigsAvoided } from "@/lib/calc";
import { useCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SubscriptionSection } from "@/components/SubscriptionSection";
import { supabase } from "@/integrations/supabase/client";
import { invalidateProfile } from "@/lib/profiles";
import { toast } from "sonner";
import { isPushSupported, getPushPermission, subscribeToPush, unsubscribeFromPush, isNativePush, getNativePushState, type NativePushState } from "@/lib/push";

export const ProfileScreen = () => {
  const { user, dispatch } = useUser();
  const { user: authUser, signOut } = useAuth();
  const currency = useCurrency();
  const [editing, setEditing] = useState(false);
  const [editGoal, setEditGoal] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authUser) return;
    supabase
      .from("profiles")
      .select("avatar_url,display_name")
      .eq("user_id", authUser.id)
      .maybeSingle()
      .then(({ data }) => {
        setAvatarUrl(data?.avatar_url ?? null);
        setDisplayName(data?.display_name ?? "");
      });
  }, [authUser]);

  const handleAvatarPick = () => fileRef.current?.click();

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authUser) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${authUser.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("user_id", authUser.id);
      if (profErr) throw profErr;
      setAvatarUrl(url);
      invalidateProfile(authUser.id);
      toast.success("Profile picture updated");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const saveDisplayName = async () => {
    if (!authUser) return;
    const name = displayName.trim().slice(0, 40);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name || null })
      .eq("user_id", authUser.id);
    if (error) { toast.error("Could not save name"); return; }
    invalidateProfile(authUser.id);
    toast.success("Name updated");
  };

  if (!user) return null;
  const d = getDuration(user.quitDate);
  const lvl = levelInfo(user.xp);
  const money = moneySaved(user);
  const goalPct = user.dreamGoal.target > 0 ? Math.min(100, (money / user.dreamGoal.target) * 100) : 0;

  const [cigs, setCigs] = useState(String(user.cigsPerDay));
  const [price, setPrice] = useState(String(user.pricePerPack));
  const [date, setDate] = useState(new Date(user.quitDate).toISOString().slice(0, 16));
  const [goalName, setGoalName] = useState(user.dreamGoal.name);
  const [goalAmt, setGoalAmt] = useState(String(user.dreamGoal.target));

  const saveSettings = () => {
    dispatch({
      type: "UPDATE",
      payload: {
        cigsPerDay: Number(cigs) || 1,
        pricePerPack: Number(price) || 1,
        quitDate: new Date(date).getTime(),
      },
    });
    setEditing(false);
    toast.success("Saved.");
  };

  const saveGoal = () => {
    dispatch({
      type: "UPDATE",
      payload: { dreamGoal: { name: goalName.trim() || "Dream", target: Number(goalAmt) || 100 } },
    });
    setEditGoal(false);
    toast.success("Dream updated. 🎯");
  };

  return (
    <div className="space-y-4 pt-2">
      <h1 className="font-display text-3xl font-black">Profile</h1>

      {/* User card */}
      <section className="rounded-2xl bg-gradient-hero p-5 text-white">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleAvatarPick}
            disabled={uploading}
            className="group relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-display text-2xl font-black text-accent-foreground ring-2 ring-white/20 transition active:scale-95"
            aria-label="Change profile picture"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span>{(displayName || user.name)[0]?.toUpperCase()}</span>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
              {uploading ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : <Camera className="h-5 w-5 text-white" />}
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
          <div className="min-w-0 flex-1">
            <p className="font-display text-2xl font-black truncate">{displayName || user.name}</p>
            <p className="text-xs text-white/70">Quit since {new Date(user.quitDate).toLocaleDateString()}</p>
            <p className="mt-1 text-xs font-bold text-accent">{lvl.name} · {user.xp} XP</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value.slice(0, 40))}
            placeholder="Display name (shown in community)"
            className="h-9 bg-white/10 text-sm text-white placeholder:text-white/50 border-white/20"
          />
          <Button
            onClick={saveDisplayName}
            size="sm"
            className="h-9 bg-accent font-bold text-accent-foreground hover:bg-accent-glow"
          >
            Save
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div><p className="stat-number text-xl">{d.days}</p><p className="text-[10px] uppercase tracking-wider text-white/60">Days</p></div>
          <div><p className="stat-number text-xl">{currency.format(money)}</p><p className="text-[10px] uppercase tracking-wider text-white/60">Saved</p></div>
          <div><p className="stat-number text-xl">{cigsAvoided(user)}</p><p className="text-[10px] uppercase tracking-wider text-white/60">Avoided</p></div>
        </div>
      </section>

      {/* Dream goal */}
      <section className="smoxit-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-accent" />
            <p className="font-display font-black">Dream Goal</p>
          </div>
          <button onClick={() => setEditGoal((e) => !e)} className="text-xs font-bold text-accent">
            {editGoal ? "Cancel" : "Edit"}
          </button>
        </div>
        {!editGoal ? (
          <>
            <p className="mt-2 font-display text-lg font-black">{user.dreamGoal.name}</p>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-gradient-accent" style={{ width: `${goalPct}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {currency.format(money)} of {currency.format(user.dreamGoal.target)} — {goalPct.toFixed(0)}% there 🎯
            </p>
          </>
        ) : (
          <div className="mt-3 space-y-2">
            <Input value={goalName} onChange={(e) => setGoalName(e.target.value)} placeholder="Goal name" />
            <Input type="number" value={goalAmt} onChange={(e) => setGoalAmt(e.target.value)} placeholder={`${currency.symbol} target`} />
            <Button onClick={saveGoal} className="w-full bg-accent font-bold text-primary hover:bg-accent-glow">Save Goal</Button>
          </div>
        )}
      </section>

      {/* Pace */}
      <section className="smoxit-card">
        <div className="flex items-center gap-2">
          <Footprints className="h-5 w-5 text-accent" />
          <p className="font-display font-black">Your Pace</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          No pressure. Change this anytime — the app adapts to you.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {([
            { key: "gentle", label: "Gentle", icon: Leaf, desc: "Extra time, soft milestones" },
            { key: "normal", label: "Normal", icon: Footprints, desc: "Balanced rhythm" },
            { key: "fast", label: "Fast", icon: Zap, desc: "Closer milestones" },
          ] as const).map((p) => {
            const active = user.pace === p.key;
            return (
              <button
                key={p.key}
                onClick={() => {
                  dispatch({ type: "UPDATE", payload: { pace: p.key } });
                  toast.success(`Pace set to ${p.label}. 🌱`);
                }}
                className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 transition text-center ${
                  active
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary"
                }`}
              >
                <p.icon className={`h-5 w-5 ${active ? "text-accent" : ""}`} />
                <span className="text-xs font-bold">{p.label}</span>
                <span className="text-[10px] leading-tight opacity-70">{p.desc}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Settings */}
      <section className="smoxit-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-accent" />
            <p className="font-display font-black">Settings</p>
          </div>
          <button onClick={() => setEditing((e) => !e)} className="text-xs font-bold text-accent">
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>

        {editing ? (
          <div className="mt-3 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Cigarettes per day</Label>
              <Input type="number" value={cigs} onChange={(e) => setCigs(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Price per pack ({currency.symbol})</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Quit date</Label>
              <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <Button onClick={saveSettings} className="w-full bg-accent font-bold text-primary hover:bg-accent-glow">Save</Button>
          </div>
        ) : (
          <div className="mt-3 space-y-2 text-sm">
            <Row label="Cigarettes/day" value={String(user.cigsPerDay)} />
            <Row label="Price/pack" value={`${currency.symbol}${user.pricePerPack}`} />
            <Row label="Years smoking" value={String(user.yearsSmoking)} />
          </div>
        )}

        <div className="mt-4 space-y-3 border-t border-border pt-3">
          <Toggle icon={Bell} label="Daily motivation" />
          <Toggle icon={Bell} label="Milestone alerts" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Moon className="h-4 w-4 text-muted-foreground" /> Dark mode
            </div>
            <Switch
              checked={user.darkMode}
              onCheckedChange={(v) => dispatch({ type: "UPDATE", payload: { darkMode: v } })}
            />
          </div>
        </div>
      </section>

      {/* Notifications */}
      <NotificationsSection authUserId={authUser?.id} />

      {/* Subscription */}
      <SubscriptionSection />

      {/* Emergency support */}
      <section className="smoxit-card">
        <p className="font-display font-black">Need to talk to someone?</p>
        <p className="mt-1 text-xs text-muted-foreground">Free, confidential support. You're not alone.</p>
        <Button
          asChild
          variant="outline"
          className="mt-3 w-full"
        >
          <a
            href="https://www.google.com/search?q=stop+smoking+services+near+me"
            target="_blank"
            rel="noopener noreferrer"
          >
            Find quit support near you <ExternalLink className="ml-1 h-4 w-4" />
          </a>
        </Button>
      </section>

      {/* Account */}
      <section className="smoxit-card space-y-3">
        {authUser?.email && (
          <p className="text-xs text-muted-foreground text-center">
            Signed in as <span className="font-bold text-foreground">{authUser.email}</span>
          </p>
        )}
        <Button
          variant="ghost"
          className="w-full"
          onClick={async () => {
            await signOut();
            toast.success("Signed out");
          }}
        >
          <LogOut className="mr-2 h-4 w-4" /> Sign Out
        </Button>
        <Button
          variant="ghost"
          className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => {
            if (confirm("Reset all your data? This can't be undone.")) {
              dispatch({ type: "RESET" });
            }
          }}
        >
          <RotateCcw className="mr-2 h-4 w-4" /> Reset App Data
        </Button>
      </section>

      {/* Footer */}
      <footer className="flex items-center justify-center gap-1.5 py-4 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        <Shield className="h-3 w-3 text-accent" />
        Science-backed · 100% Private · Real Support
      </footer>
    </div>
  );
};

const ENABLE_PENDING_MS = 15_000;

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-bold">{value}</span>
  </div>
);

const Toggle = ({ icon: Icon, label }: { icon: any; label: string }) => {
  const [on, setOn] = useState(true);
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-muted-foreground" /> {label}
      </div>
      <Switch checked={on} onCheckedChange={setOn} />
    </div>
  );
};

const NotificationsSection = ({ authUserId }: { authUserId?: string }) => {
  const native = isNativePush();
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  const [hasSub, setHasSub] = useState(false);
  const [nativeState, setNativeState] = useState<NativePushState>({ supported: native, granted: false, denied: false, hasToken: false, optedIn: false });
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [optimisticEnabled, setOptimisticEnabled] = useState<boolean | null>(null);

  const refreshState = async () => {
    if (native) {
      setNativeState(await getNativePushState());
      return;
    }
    setPerm(getPushPermission());
    try {
      const reg = await navigator.serviceWorker?.getRegistration("/sw-push.js");
      const sub = await reg?.pushManager.getSubscription();
      setHasSub(!!sub);
    } catch { setHasSub(false); }
  };

  useEffect(() => { refreshState(); }, []);

  useEffect(() => {
    if (!native) return;
    const refresh = () => { void refreshState(); };
    window.addEventListener("smoxit:native_push_registered", refresh);
    window.addEventListener("smoxit:native_push_error", refresh);
    return () => {
      window.removeEventListener("smoxit:native_push_registered", refresh);
      window.removeEventListener("smoxit:native_push_error", refresh);
    };
  }, [native]);

  const supported = native ? nativeState.supported : isPushSupported();
  const denied = native ? nativeState.denied : perm === "denied";
  const actualEnabled = native ? (nativeState.granted && nativeState.hasToken && nativeState.optedIn) : (perm === "granted" && hasSub);
  const enabled = optimisticEnabled ?? actualEnabled;

  const toggle = async () => {
    if (!supported) { toast.error("Push not supported here."); return; }
    if (denied) {
      toast.error(native
        ? "Benachrichtigungen sind in den iOS-Einstellungen blockiert. Einstellungen → SMOXIT → Mitteilungen aktivieren."
        : "Browser hat Push blockiert. Bitte in den Browser-Einstellungen für diese Seite Benachrichtigungen erlauben und Seite neu laden.");
      return;
    }
    setBusy(true);
    try {
      if (enabled) {
        await unsubscribeFromPush();
        toast("Push notifications off.");
      } else {
        const r = await subscribeToPush();
        if (r.ok) toast.success("Push notifications on. 🔔");
        else if (r.error === "denied") toast.error("Permission denied. Enable in settings.");
        else toast.error(r.error || "Could not enable push.");
      }
      await refreshState();
    } finally { setBusy(false); }
  };

  const sendTest = async () => {
    if (!authUserId) return;
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-push", {
        body: { mode: "test", user_id: authUserId, title: "SMOXIT test 🔔", body: "Push works! Tap to open." },
      });
      if (error) throw error;
      const sent = (data as any)?.sent ?? 0;
      const cleaned = (data as any)?.cleaned ?? 0;
      if (sent === 0 && cleaned > 0) {
        toast("Refreshing push registration…");
        await unsubscribeFromPush();
        const r = await subscribeToPush();
        await refreshState();
        if (r.ok) toast.success("Re-registered. Tap test again.");
        else toast.error("Please toggle Push off and on again.");
      } else if (sent === 0) {
        toast.error("No active subscription. Toggle Push off & on.");
      } else {
        toast.success(`Test sent (${sent}) — check your notifications.`);
      }
    } catch (e: any) {
      toast.error(e?.message || "Could not send test");
    } finally { setTesting(false); }
  };

  return (
    <section className="smoxit-card">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-accent" />
        <p className="font-display font-black">Notifications</p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Daily check-ins, craving tips, squad pings, streak rescue.
      </p>
      <div className="mt-3 flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2">
        <span className="text-sm font-semibold">Push notifications</span>
        <Switch checked={enabled} onCheckedChange={toggle} disabled={busy || !supported || denied} />
      </div>
      {denied && (
        <p className="mt-2 text-xs text-destructive">
          {native
            ? "Push ist in den iOS-Einstellungen blockiert. Einstellungen → SMOXIT → Mitteilungen aktivieren."
            : "Push ist im Browser blockiert. Klick auf das 🔒-Symbol in der Adressleiste → Benachrichtigungen → \"Zulassen\", dann Seite neu laden."}
        </p>
      )}
      {(enabled || native) && (
        <Button onClick={sendTest} disabled={testing || !authUserId} variant="outline" size="sm" className="mt-3 w-full">
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send test notification"}
        </Button>
      )}
      {!supported && !native && (
        <p className="mt-2 text-xs text-muted-foreground">
          Tip: install SMOXIT to your home screen to enable push on iOS.
        </p>
      )}
    </section>
  );
};
