import { useEffect, useMemo, useState } from "react";
import {
  Trophy, Lock, Check, Share2, Zap, Star, Flame, Coins, Cigarette, Heart,
  Target, Calendar, TrendingUp, Bell, BellOff, Sparkles,
} from "lucide-react";
import { useUser } from "@/lib/store";
import {
  getDuration, levelInfo, todayKey, moneySaved, cigsAvoided,
  lifeGainedMinutes, formatLifeGained,
} from "@/lib/calc";
import { useCurrency } from "@/lib/currency";
import { Confetti } from "@/components/Confetti";
import { toast } from "sonner";
import { dailyChallenges, weeklyQuests, monthlyQuests, isQuestComplete } from "@/lib/quests";
import { awardXp } from "@/lib/xp";
import { isPushSupported, getPushPermission, subscribeToPush, unsubscribeFromPush } from "@/lib/push";
import { useShare, ShareButton } from "@/components/ShareSheet";

interface Badge {
  id: string;
  label: string;
  desc: string;
  unlock: (u: { days: number; cigsAvoided: number; xp: number }) => boolean;
}

const badges: Badge[] = [
  { id: "1d",   label: "Day 1",     desc: "The hardest one. You did it.",          unlock: (u) => u.days >= 1 },
  { id: "3d",   label: "3 Days",    desc: "Nicotine is gone from your body.",      unlock: (u) => u.days >= 3 },
  { id: "1w",   label: "1 Week",    desc: "One full week of freedom.",             unlock: (u) => u.days >= 7 },
  { id: "2w",   label: "2 Weeks",   desc: "Cravings are losing power.",            unlock: (u) => u.days >= 14 },
  { id: "100",  label: "100 Cigs",  desc: "100 cigarettes never smoked.",          unlock: (u) => u.cigsAvoided >= 100 },
  { id: "1m",   label: "1 Month",   desc: "A whole month. Champion.",              unlock: (u) => u.days >= 30 },
  { id: "500x", label: "500 XP",    desc: "Five hundred experience points.",       unlock: (u) => u.xp >= 500 },
  { id: "3m",   label: "3 Months",  desc: "Your lungs are reborn.",                unlock: (u) => u.days >= 90 },
  { id: "6m",   label: "6 Months",  desc: "Half a year unstoppable.",              unlock: (u) => u.days >= 180 },
  { id: "1y",   label: "1 Year",    desc: "Legend status achieved.",               unlock: (u) => u.days >= 365 },
  { id: "1500x",label: "1500 XP",   desc: "Serious commitment.",                   unlock: (u) => u.xp >= 1500 },
  { id: "1000c",label: "1000 Cigs", desc: "1000 cigarettes never smoked.",         unlock: (u) => u.cigsAvoided >= 1000 },
];

export const ProgressScreen = () => {
  const { user, dispatch } = useUser();
  const currency = useCurrency();
  const [confetti, setConfetti] = useState(0);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [pushPerm, setPushPerm] = useState<NotificationPermission | "unsupported">("default");
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => { setPushPerm(getPushPermission()); }, []);

  // Local milestone-push trigger: when a new badge unlocks, fire a self-push
  useEffect(() => {
    if (!user) return;
    try {
      const seen = new Set<string>(JSON.parse(localStorage.getItem("smoxit:badges-seen") || "[]"));
      const ctxNow = { days: getDuration(user.quitDate).days, cigsAvoided: cigsAvoided(user), xp: user.xp };
      const fresh = badges.filter((b) => b.unlock(ctxNow) && !seen.has(b.id));
      if (fresh.length === 0) return;
      fresh.forEach((b) => seen.add(b.id));
      localStorage.setItem("smoxit:badges-seen", JSON.stringify(Array.from(seen)));
      // Only push if user opted in
      if (getPushPermission() !== "granted") return;
      import("@/integrations/supabase/client").then(async ({ supabase }) => {
        const { data } = await supabase.auth.getUser();
        const uid = data.user?.id;
        if (!uid) return;
        const b = fresh[0];
        await supabase.functions.invoke("send-push", {
          body: { mode: "milestone", user_id: uid, title: `🏆 ${b.label} unlocked!`, body: b.desc },
        });
      });
    } catch {}
  }, [user?.xp, user?.quitDate, user?.cravings.length]);


  if (!user) return null;
  const d = getDuration(user.quitDate);
  const lvl = levelInfo(user.xp);
  const today = todayKey();
  const ctx = { days: d.days, cigsAvoided: cigsAvoided(user), xp: user.xp };

  const heatmap = useMemo(() => {
    return Array.from({ length: 49 }, (_, i) => {
      const date = new Date(Date.now() - (48 - i) * 86400000);
      const isClean = date.getTime() >= user.quitDate && date.getTime() <= Date.now();
      return { date, isClean };
    });
  }, [user.quitDate]);

  const todayXp = useMemo(() => {
    // approximate today's XP from completed daily challenges + mood
    let xp = 0;
    user.completedChallenges.forEach((k) => { if (k.startsWith(today)) xp += 15; });
    if (user.moods.some((m) => m.date === today)) xp += 10;
    return xp;
  }, [user, today]);

  const toggleChallenge = async (id: string) => {
    const key = `${today}-${id}`;
    const wasComplete = user.completedChallenges.includes(key);
    dispatch({ type: "TOGGLE_CHALLENGE", payload: key });
    if (!wasComplete) {
      setConfetti((c) => c + 1);
      const granted = await awardXp("daily_challenge", { extra: key, silent: true });
      toast.success(granted ? `+${granted} XP — Challenge crushed! 💪` : "+15 XP — Challenge crushed! 💪");
    }
  };

  const claimQuest = async (questId: string, xp: number, scope: "weekly" | "monthly") => {
    const key = `${scope}:${questId}:${weekKey()}`;
    const granted = await awardXp(scope === "weekly" ? "weekly_quest" : "monthly_quest", { extra: key, silent: true });
    if (granted > 0) {
      dispatch({ type: "ADD_XP", payload: granted });
      setConfetti((c) => c + 1);
      toast.success(`+${granted} XP — Quest complete! 🏆`);
    } else {
      toast("Already claimed this period.");
    }
  };

  const share = () => {
    shareGlobal({
      kind: "milestone",
      title: "My SMOXIT progress",
      text: `I've been smoke-free for ${d.days} days with SMOXIT! 🎉 ${cigsAvoided(user)} cigarettes avoided. ${currency.format(moneySaved(user))} saved.`,
    });
  };

  const togglePush = async () => {
    if (!isPushSupported()) {
      toast.error("Push not supported in this browser/preview.");
      return;
    }
    setPushBusy(true);
    try {
      if (pushPerm === "granted") {
        await unsubscribeFromPush();
        setPushPerm(getPushPermission());
        toast("Push notifications off.");
      } else {
        const r = await subscribeToPush();
        setPushPerm(getPushPermission());
        if (r.ok) toast.success("Push notifications on. 🔔");
        else if (r.error === "denied") toast.error("Permission denied. Enable in browser settings.");
        else toast.error("Could not enable push.");
      }
    } finally {
      setPushBusy(false);
    }
  };

  return (
    <div className="space-y-3 pt-2">
      <Confetti trigger={confetti} />

      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-black">Progress</h1>
        <button
          onClick={togglePush}
          disabled={pushBusy || pushPerm === "unsupported"}
          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold disabled:opacity-50"
          aria-label="Toggle push notifications"
        >
          {pushPerm === "granted" ? <Bell className="h-3.5 w-3.5 text-accent" /> : <BellOff className="h-3.5 w-3.5 text-muted-foreground" />}
          {pushPerm === "granted" ? "On" : "Off"}
        </button>
      </div>

      {/* Hero level card — XP focus */}
      <section className="rounded-2xl bg-gradient-hero p-4 text-primary-foreground">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-accent">Level {lvl.level + 1}</p>
            <p className="font-display text-2xl font-black truncate">{lvl.name}</p>
            <p className="mt-0.5 text-[11px] text-white/70">
              <span className="text-accent font-bold">{lvl.xp} XP</span> · {Math.max(0, lvl.next - lvl.xp)} to next
            </p>
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
            <Star className="h-7 w-7" strokeWidth={2.5} />
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-gradient-accent transition-all" style={{ width: `${lvl.progress}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <MiniStat label="Today" value={`+${todayXp}`} accent />
          <MiniStat label="Streak" value={`${d.days}d`} />
          <MiniStat label="Badges" value={`${badges.filter((b) => b.unlock(ctx)).length}/${badges.length}`} />
        </div>
      </section>

      {/* Compact stats grid */}
      <section className="grid grid-cols-3 gap-2">
        <Tile icon={Coins}     label="Saved"   value={currency.format(moneySaved(user))} />
        <Tile icon={Cigarette} label="Avoided" value={String(cigsAvoided(user))} />
        <Tile icon={Heart}     label="Life+"   value={formatLifeGained(lifeGainedMinutes(user))} />
        <Tile icon={Flame}     label="Streak"  value={`${d.days}d`} />
        <Tile icon={Zap}       label="XP"      value={String(user.xp)} accent />
        <Tile icon={Trophy}    label="Badges"  value={`${badges.filter((b) => b.unlock(ctx)).length}`} />
      </section>

      {/* Daily challenges - compact list */}
      <section className="smoxit-card p-4">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <Target className="h-3.5 w-3.5" /> Daily Missions
          </p>
          <span className="text-[10px] font-bold text-accent">+15 XP each</span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {dailyChallenges.map((c) => {
            const key = `${today}-${c.id}`;
            const done = user.completedChallenges.includes(key);
            return (
              <button
                key={c.id}
                onClick={() => toggleChallenge(c.id)}
                className={`flex items-center gap-2 rounded-xl border-2 px-2.5 py-2 text-left transition-bounce ${
                  done ? "border-accent bg-accent/10" : "border-border bg-secondary/40 hover:border-accent/50"
                }`}
              >
                <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${done ? "bg-accent text-primary" : "bg-card border border-border"}`}>
                  {done && <Check className="h-3 w-3" strokeWidth={3} />}
                </div>
                <span className={`flex-1 text-[11px] font-semibold leading-tight ${done ? "line-through text-muted-foreground" : ""}`}>
                  {c.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Weekly quests */}
      <section className="smoxit-card p-4">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" /> Weekly Quests
          </p>
          <span className="text-[10px] font-bold text-accent">+50 XP each</span>
        </div>
        <div className="mt-2 space-y-2">
          {weeklyQuests.map((q) => {
            const p = q.progress(user);
            const complete = p >= 1;
            return (
              <div key={q.id} className="rounded-xl bg-secondary/40 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold">{q.label}</p>
                  <button
                    disabled={!complete}
                    onClick={() => claimQuest(q.id, q.xp, "weekly")}
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold transition ${
                      complete ? "bg-accent text-primary" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {complete ? "Claim +50" : `${Math.round(p * 100)}%`}
                  </button>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-card">
                  <div className="h-full rounded-full bg-gradient-accent transition-all" style={{ width: `${p * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Monthly quests */}
      <section className="smoxit-card p-4">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" /> Monthly Quests
          </p>
          <span className="text-[10px] font-bold text-accent">+200 XP each</span>
        </div>
        <div className="mt-2 space-y-2">
          {monthlyQuests.map((q) => {
            const p = q.progress(user);
            const complete = p >= 1;
            return (
              <div key={q.id} className="rounded-xl bg-secondary/40 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold">{q.label}</p>
                  <button
                    disabled={!complete}
                    onClick={() => claimQuest(q.id, q.xp, "monthly")}
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold transition ${
                      complete ? "bg-accent text-primary" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {complete ? "Claim +200" : `${Math.round(p * 100)}%`}
                  </button>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-card">
                  <div className="h-full rounded-full bg-gradient-accent transition-all" style={{ width: `${p * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Heatmap - compact */}
      <section className="smoxit-card p-4">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" /> 7 Weeks Smoke-Free
        </p>
        <div className="mt-2 grid grid-cols-7 gap-1">
          {heatmap.map((cell, i) => (
            <div
              key={i}
              className={`aspect-square rounded ${cell.isClean ? "bg-accent shadow-[0_0_4px_hsl(var(--accent)/0.5)]" : "bg-secondary"}`}
              title={cell.date.toDateString()}
            />
          ))}
        </div>
      </section>

      {/* Badges - tile grid */}
      <section className="smoxit-card p-4">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          <Trophy className="h-3.5 w-3.5" /> Milestone Badges
        </p>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {badges.map((b) => {
            const unlocked = b.unlock(ctx);
            return (
              <button
                key={b.id}
                onClick={() => setSelectedBadge(b)}
                className={`flex flex-col items-center gap-1 rounded-xl p-2 transition-bounce ${
                  unlocked ? "bg-accent/10 hover:bg-accent/20" : "bg-secondary/50 opacity-60"
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  unlocked ? "bg-gradient-accent shadow-[0_0_12px_hsl(var(--accent)/0.5)]" : "bg-muted"
                }`}>
                  {unlocked ? <Trophy className="h-4 w-4 text-primary" strokeWidth={2.5} /> : <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
                <span className="text-[10px] font-bold leading-tight text-center">{b.label}</span>
              </button>
            );
          })}
        </div>
        {selectedBadge && (
          <div className="mt-2 rounded-xl border border-accent/30 bg-accent/10 p-2.5 text-xs">
            <p className="font-bold">{selectedBadge.label}</p>
            <p className="text-muted-foreground">{selectedBadge.desc}</p>
          </div>
        )}
      </section>

      {/* Share */}
      <button
        onClick={share}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-accent text-sm font-bold text-primary shadow-button"
      >
        <Share2 className="h-4 w-4" /> Share Milestone <span className="text-[10px] opacity-80">+15 XP</span>
      </button>
    </div>
  );
};

const Tile = ({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: boolean }) => (
  <div className={`rounded-xl border p-2.5 ${accent ? "border-accent/40 bg-accent/10" : "border-border/40 bg-card"} shadow-[var(--shadow-card)]`}>
    <Icon className={`mb-1 h-4 w-4 ${accent ? "text-accent" : "text-muted-foreground"}`} />
    <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="stat-number text-base text-foreground leading-tight">{value}</p>
  </div>
);

const MiniStat = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <div className="rounded-lg bg-white/10 py-1.5">
    <p className={`stat-number text-sm ${accent ? "text-accent" : "text-white"}`}>{value}</p>
    <p className="text-[9px] font-bold uppercase tracking-wider text-white/60">{label}</p>
  </div>
);

// ISO week key for quest claim dedupe
function weekKey(d = new Date()): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - dayNum + 3);
  const firstThu = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((t.getTime() - firstThu.getTime()) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
