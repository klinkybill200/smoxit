import { useEffect, useState } from "react";
import { Settings, Flame, Coins, Cigarette, Heart, Trophy, Sparkles } from "lucide-react";
import { useUser } from "@/lib/store";
import { getDuration, moneySaved, cigsAvoided, lifeGainedMinutes, formatLifeGained, milestoneTagline, quoteOfDay, todayKey } from "@/lib/calc";
import { useCurrency } from "@/lib/currency";
import { SmoxitLogo } from "@/components/SmoxitLogo";
import { Button } from "@/components/ui/button";
import { awardXp } from "@/lib/xp";
import { ShareButton } from "@/components/ShareSheet";

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
      <header className="flex items-center pt-2">
        <SmoxitLogo size={28} />
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

      {/* AI Coach promo */}
      <section className="relative overflow-hidden rounded-2xl border-2 border-accent/40 bg-gradient-to-br from-accent/15 to-accent/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent shadow-button">
            <Sparkles className="h-5 w-5 text-accent-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-accent-foreground">AI</span>
              <p className="font-display text-sm font-black">Your AI Quit-Coach is on standby</p>
            </div>
            <p className="text-xs text-muted-foreground">Personalized rescue tips · 24/7 chat · adapts to YOU</p>
          </div>
        </div>
      </section>

      {/* Stats grid */}
      <section className="grid grid-cols-2 gap-3">
        <StatCard
          icon={Coins}
          label="Money Saved"
          value={currency.format(money)}
          share={{
            kind: "money_saved",
            title: "Money saved with SMOXIT",
            text: `I've saved ${currency.format(money)} by quitting smoking with SMOXIT 💸`,
          }}
        />
        <StatCard
          icon={Cigarette}
          label="Cigs Avoided"
          value={String(avoided)}
          share={{
            kind: "cigs_avoided",
            title: "Cigs avoided",
            text: `${avoided} cigarettes I didn't smoke thanks to SMOXIT 🚭`,
          }}
        />
        <StatCard
          icon={Heart}
          label="Life Gained"
          value={formatLifeGained(life)}
          share={{
            kind: "life_gained",
            title: "Life gained",
            text: `I just gained ${formatLifeGained(life)} of life back by quitting smoking ❤️`,
          }}
        />
        <StatCard
          icon={Trophy}
          label="Streak"
          value={`${d.days}d`}
          share={{
            kind: "streak",
            title: "Smoke-free streak",
            text: `${d.days} days smoke-free and counting 🔥`,
          }}
        />
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
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-accent">{goalPct.toFixed(0)}%</p>
            <ShareButton
              intent={{
                kind: "dream_goal",
                title: "My dream goal",
                text: `I'm ${goalPct.toFixed(0)}% closer to my dream "${user.dreamGoal.name}" — funded by quitting smoking with SMOXIT 🎯`,
              }}
            />
          </div>
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
      <section className="rounded-2xl bg-gradient-hero p-5 text-white">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">Quote of the Day</p>
        <p className="mt-2 font-display text-lg font-bold leading-snug text-balance">"{quoteOfDay()}"</p>
      </section>
    </div>
  );
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  share,
}: {
  icon: any;
  label: string;
  value: string;
  share?: import("@/lib/share").ShareIntent;
}) => (
  <div className="smoxit-card relative">
    {share && <ShareButton intent={share} className="absolute right-2 top-2" />}
    <Icon className="mb-2 h-5 w-5 text-accent" />
    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="stat-number mt-1 text-2xl text-foreground">{value}</p>
  </div>
);
