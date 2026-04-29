import { useMemo, useState } from "react";
import { Trophy, Lock, Check, Share2, Zap, Star } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useUser } from "@/lib/store";
import { getDuration, levelInfo, todayKey, moneySaved, cigsAvoided } from "@/lib/calc";
import { Button } from "@/components/ui/button";
import { Confetti } from "@/components/Confetti";
import { toast } from "sonner";

interface Badge {
  id: string;
  label: string;
  desc: string;
  unlock: (u: { days: number; cigsAvoided: number }) => boolean;
}

const badges: Badge[] = [
  { id: "1d", label: "Day 1", desc: "The hardest one. You did it.", unlock: (u) => u.days >= 1 },
  { id: "3d", label: "3 Days", desc: "Nicotine is gone from your body.", unlock: (u) => u.days >= 3 },
  { id: "1w", label: "1 Week", desc: "One full week of freedom.", unlock: (u) => u.days >= 7 },
  { id: "2w", label: "2 Weeks", desc: "Cravings are losing power.", unlock: (u) => u.days >= 14 },
  { id: "100", label: "100 Cigs", desc: "100 cigarettes never smoked.", unlock: (u) => u.cigsAvoided >= 100 },
  { id: "1m", label: "1 Month", desc: "A whole month. Champion.", unlock: (u) => u.days >= 30 },
  { id: "3m", label: "3 Months", desc: "Your lungs are reborn.", unlock: (u) => u.days >= 90 },
  { id: "6m", label: "6 Months", desc: "Half a year unstoppable.", unlock: (u) => u.days >= 180 },
  { id: "1y", label: "1 Year", desc: "Legend status achieved.", unlock: (u) => u.days >= 365 },
];

const dailyChallenges = [
  { id: "water", label: "Drink 2L of water" },
  { id: "walk", label: "10-minute walk" },
  { id: "breathe", label: "Do 3 breathing cycles" },
  { id: "no-think", label: "Go 4 hrs without a craving thought" },
];

export const ProgressScreen = () => {
  const { user, dispatch } = useUser();
  const [confetti, setConfetti] = useState(0);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  if (!user) return null;
  const d = getDuration(user.quitDate);
  const lvl = levelInfo(user.xp);
  const today = todayKey();

  const ctx = { days: d.days, cigsAvoided: cigsAvoided(user) };

  // 7-week heatmap (last 49 days)
  const heatmap = useMemo(() => {
    return Array.from({ length: 49 }, (_, i) => {
      const date = new Date(Date.now() - (48 - i) * 86400000);
      const isClean = date.getTime() >= user.quitDate && date.getTime() <= Date.now();
      return { date, isClean };
    });
  }, [user.quitDate]);

  // Weekly chart - last 7 days
  const weekData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(Date.now() - (6 - i) * 86400000);
      const dayMs = day.getTime();
      const isClean = dayMs + 86400000 >= user.quitDate;
      const cigs = isClean ? user.cigsPerDay : 0;
      const moneyDay = isClean ? (user.cigsPerDay * user.pricePerPack) / user.cigsPerPack : 0;
      return {
        name: day.toLocaleDateString(undefined, { weekday: "short" }),
        cigs,
        money: Number(moneyDay.toFixed(2)),
      };
    });
  }, [user]);

  const toggleChallenge = (id: string) => {
    const key = `${today}-${id}`;
    const wasComplete = user.completedChallenges.includes(key);
    dispatch({ type: "TOGGLE_CHALLENGE", payload: key });
    if (!wasComplete) {
      setConfetti((c) => c + 1);
      toast.success("+15 XP! You crushed it. 💪");
    }
  };

  const share = () => {
    const text = `I've been smoke-free for ${d.days} days with SMOXIT! 🎉 ${cigsAvoided(user)} cigarettes avoided. €${moneySaved(user).toFixed(2)} saved.`;
    if (navigator.share) navigator.share({ title: "SMOXIT", text }).catch(() => {});
    else {
      navigator.clipboard?.writeText(text);
      toast.success("Milestone copied to clipboard!");
    }
  };

  return (
    <div className="space-y-4 pt-2">
      <Confetti trigger={confetti} />

      <h1 className="font-display text-3xl font-black">Progress</h1>

      {/* Level card */}
      <section className="rounded-2xl bg-gradient-hero p-5 text-primary-foreground">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-accent">Your Level</p>
            <p className="font-display text-3xl font-black">{lvl.name}</p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-primary">
            <Star className="h-7 w-7" strokeWidth={2.5} />
          </div>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-gradient-accent" style={{ width: `${lvl.progress}%` }} />
        </div>
        <p className="mt-2 text-xs text-white/70">
          {lvl.xp} / {lvl.next} XP — {Math.max(0, lvl.next - lvl.xp)} XP to next level
        </p>
      </section>

      {/* Heatmap */}
      <section className="smoxit-card">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Smoke-Free Calendar</p>
        <p className="text-sm text-muted-foreground">Last 7 weeks</p>
        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {heatmap.map((cell, i) => (
            <div
              key={i}
              className={`aspect-square rounded-md ${
                cell.isClean ? "bg-accent shadow-[0_0_6px_hsl(var(--accent)/0.5)]" : "bg-secondary"
              }`}
              title={cell.date.toDateString()}
            />
          ))}
        </div>
      </section>

      {/* Weekly chart */}
      <section className="smoxit-card">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">This Week — Money Saved</p>
        <div className="mt-3 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekData}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: "hsl(var(--secondary))" }}
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                formatter={(v: number) => [`€${v}`, "Saved"]}
              />
              <Bar dataKey="money" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Daily challenges */}
      <section className="smoxit-card">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Daily Challenges</p>
          <span className="text-xs font-bold text-accent">+15 XP each</span>
        </div>
        <div className="mt-3 space-y-2">
          {dailyChallenges.map((c) => {
            const key = `${today}-${c.id}`;
            const done = user.completedChallenges.includes(key);
            return (
              <button
                key={c.id}
                onClick={() => toggleChallenge(c.id)}
                className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-bounce ${
                  done ? "border-accent bg-accent/10" : "border-border bg-secondary/40 hover:border-accent/50"
                }`}
              >
                <div className={`flex h-7 w-7 items-center justify-center rounded-full ${done ? "bg-accent text-primary" : "bg-card border border-border"}`}>
                  {done && <Check className="h-4 w-4" strokeWidth={3} />}
                </div>
                <span className={`flex-1 text-sm font-semibold ${done ? "line-through text-muted-foreground" : ""}`}>
                  {c.label}
                </span>
                <Zap className="h-4 w-4 text-warning" />
              </button>
            );
          })}
        </div>
      </section>

      {/* Badges */}
      <section className="smoxit-card">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Milestone Badges</p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {badges.map((b) => {
            const unlocked = b.unlock(ctx);
            return (
              <button
                key={b.id}
                onClick={() => setSelectedBadge(b)}
                className={`flex flex-col items-center gap-1.5 rounded-2xl p-3 transition-bounce ${
                  unlocked
                    ? "bg-accent/10 hover:bg-accent/20"
                    : "bg-secondary/50 opacity-60"
                }`}
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-full ${
                    unlocked ? "bg-gradient-accent shadow-[0_0_20px_hsl(var(--accent)/0.6)] animate-badge-unlock" : "bg-muted"
                  }`}
                >
                  {unlocked ? (
                    <Trophy className="h-6 w-6 text-primary" strokeWidth={2.5} />
                  ) : (
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <span className="text-xs font-bold">{b.label}</span>
              </button>
            );
          })}
        </div>
        {selectedBadge && (
          <div className="mt-3 rounded-xl border border-accent/30 bg-accent/10 p-3 text-sm">
            <p className="font-bold">{selectedBadge.label}</p>
            <p className="text-muted-foreground">{selectedBadge.desc}</p>
          </div>
        )}
      </section>

      {/* Share */}
      <Button onClick={share} className="h-14 w-full bg-gradient-accent text-base font-bold text-primary shadow-button">
        <Share2 className="mr-2 h-5 w-5" /> Share Your Milestone
      </Button>
    </div>
  );
};
