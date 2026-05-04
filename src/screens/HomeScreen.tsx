import { useEffect, useState } from "react";
import { Settings, Flame, Coins, Cigarette, Heart, Trophy, Sparkles } from "lucide-react";
import { useUser } from "@/lib/store";
import { getDuration, moneySaved, cigsAvoided, lifeGainedMinutes, formatLifeGained, milestoneTagline, quoteOfDay, todayKey } from "@/lib/calc";
import { useCurrency } from "@/lib/currency";
import { SmoxitLogo } from "@/components/SmoxitLogo";
import { Button } from "@/components/ui/button";
import { awardXp } from "@/lib/xp";

const moods = ["😩", "😕", "😐", "🙂", "🤩"] as const;

export const HomeScreen = () => {
  const { user, dispatch } = useUser();
  const currency = useCurrency();
  const [, force] = useState(0);

  useEffect(() => {
    const i = setInterval(() => force((x) => x + 1), 1000);
    return () => clearInterval(i);
  }, []);

  // Daily login XP — once per day
  useEffect(() => {
    (async () => {
      const granted = await awardXp("daily_login", { silent: true });
      if (granted > 0) dispatch({ type: "ADD_XP", payload: granted });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) return null;
  const d = getDuration(user.quitDate);
  const money = moneySaved(user);
  const avoided = cigsAvoided(user);
  const life = lifeGainedMinutes(user);
  const goalPct = user.dreamGoal.target > 0 ? Math.min(100, (money / user.dreamGoal.target) * 100) : 0;
  const today = todayKey();
  const todayMood = user.moods.find((m) => m.date === today);
  const checkinStreak = (() => {
    let s = 0;
    for (let i = 0; ; i++) {
      const k = todayKey(new Date(Date.now() - i * 86400000));
      if (user.moods.some((m) => m.date === k)) s++;
      else break;
    }
    return s;
  })();

  const setMood = (mood: 1 | 2 | 3 | 4 | 5) => {
    const wasNew = !todayMood;
    dispatch({ type: "ADD_MOOD", payload: { date: today, mood } });
    if (wasNew) {
      dispatch({ type: "ADD_XP", payload: 10 });
      void awardXp("mood_checkin", { silent: true });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between pt-2">
        <SmoxitLogo size={28} />
        <button className="rounded-full bg-card p-2.5 shadow-[var(--shadow-card)] border border-border/40" aria-label="Settings">
          <Settings className="h-5 w-5 text-muted-foreground" />
        </button>
      </header>

      {/* Timer card */}
      <section className="smoxit-card relative overflow-hidden">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-glow opacity-60" />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">You're Smoke-Free For</p>
        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          {[
            { v: d.days, l: "Days" },
            { v: d.hours, l: "Hrs" },
            { v: d.minutes, l: "Mins" },
            { v: d.seconds, l: "Secs" },
          ].map((x) => (
            <div key={x.l} className="rounded-xl bg-secondary/60 py-2.5">
              <div className="stat-number text-2xl text-foreground">{String(x.v).padStart(2, "0")}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{x.l}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm font-semibold text-accent">{milestoneTagline(d.days)}</p>
      </section>

      {/* Stats grid */}
      <section className="grid grid-cols-2 gap-3">
        <StatCard icon={Coins} label="Money Saved" value={currency.format(money)} />
        <StatCard icon={Cigarette} label="Cigs Avoided" value={String(avoided)} />
        <StatCard icon={Heart} label="Life Gained" value={formatLifeGained(life)} />
        <StatCard icon={Trophy} label="Streak" value={`${d.days}d`} />
      </section>

      {/* Why I Quit */}
      <section className="rounded-2xl border border-accent/30 bg-accent/10 p-5">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent">
          <Sparkles className="h-3.5 w-3.5" /> Why I Quit
        </div>
        <p className="mt-2 font-display text-lg font-bold leading-snug text-foreground text-balance">
          "{user.whyQuit}"
        </p>
      </section>

      {/* Dream goal */}
      <section className="smoxit-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Dream Goal</p>
            <p className="font-display text-lg font-black">{user.dreamGoal.name}</p>
          </div>
          <p className="text-sm font-bold text-accent">{goalPct.toFixed(0)}%</p>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-gradient-accent transition-all duration-500" style={{ width: `${goalPct}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {currency.format(money)} of {currency.format(user.dreamGoal.target)} saved 🎯
        </p>
      </section>

      {/* Daily check-in */}
      <section className="smoxit-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Daily Check-in</p>
            <p className="font-display text-lg font-black">How do you feel today?</p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-bold text-warning">
            <Flame className="h-3.5 w-3.5" /> {checkinStreak}d
          </div>
        </div>
        <div className="mt-3 flex justify-between">
          {moods.map((emoji, i) => {
            const val = (i + 1) as 1 | 2 | 3 | 4 | 5;
            const active = todayMood?.mood === val;
            return (
              <button
                key={emoji}
                onClick={() => setMood(val)}
                className={`flex h-12 w-12 items-center justify-center rounded-full text-2xl transition-bounce ${
                  active ? "scale-110 bg-accent shadow-button" : "bg-secondary hover:scale-105"
                }`}
                aria-label={`Mood ${val}`}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      </section>

      {/* Quote */}
      <section className="rounded-2xl bg-gradient-hero p-5 text-primary-foreground">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">Quote of the Day</p>
        <p className="mt-2 font-display text-lg font-bold leading-snug text-balance">"{quoteOfDay()}"</p>
      </section>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="smoxit-card">
    <Icon className="mb-2 h-5 w-5 text-accent" />
    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="stat-number mt-1 text-2xl text-foreground">{value}</p>
  </div>
);
