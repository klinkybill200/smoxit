import { useEffect, useMemo, useState } from "react";
import {
  Lock,
  CheckCircle2,
  Heart,
  Wind,
  Smartphone,
  Plus,
  Droplets,
  Moon,
  Zap,
  Activity,
  ChevronRight,
  X,
  Minus,
} from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts";
import { useUser } from "@/lib/store";
import { getDuration, todayKey } from "@/lib/calc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { awardXp } from "@/lib/xp";
import type { DailyLog } from "@/lib/types";

const milestones = [
  { hours: 0.33, title: "Heart rate drops", desc: "Heart rate & blood pressure normalize." },
  { hours: 8, title: "CO levels normalize", desc: "Oxygen rises, carbon monoxide drops." },
  { hours: 24, title: "Heart attack risk drops", desc: "Risk already starts decreasing." },
  { hours: 48, title: "Taste & smell return", desc: "Nerve endings begin to regrow." },
  { hours: 24 * 14, title: "Lung function improves", desc: "Up to +30% in 2 weeks." },
  { hours: 24 * 30, title: "Coughing reduces", desc: "Lungs cleaner. Breathing easier." },
  { hours: 24 * 365, title: "Heart disease risk halved", desc: "Compared to a smoker." },
  { hours: 24 * 365 * 10, title: "Lung cancer risk halved", desc: "Your body is rebuilt." },
];

const moods = ["😩", "😕", "😐", "🙂", "🤩"] as const;

const fmtHrs = (h: number) =>
  h < 24 ? `${Math.round(h * 60)}m` : h < 24 * 30 ? `${Math.round(h / 24)}d` : h < 24 * 365 ? `${Math.round(h / 24 / 30)}mo` : `${Math.round(h / 24 / 365)}y`;

export const HealthScreen = () => {
  const { user, dispatch } = useUser();
  const [lungOpen, setLungOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);

  if (!user) return null;
  const d = getDuration(user.quitDate);
  const today = todayKey();

  const todayMood = user.moods.find((m) => m.date === today);
  const todayLog: DailyLog =
    user.dailyLogs?.find((l) => l.date === today) ?? { date: today };

  const lungChart = useMemo(
    () =>
      user.breathHolds
        .filter((b) => b.seconds > 0)
        .slice(-12)
        .map((b) => ({ name: b.date.slice(5), seconds: b.seconds })),
    [user.breathHolds]
  );
  const bestLung = lungChart.reduce((m, x) => Math.max(m, x.seconds), 0);
  const lastLung = lungChart.at(-1)?.seconds ?? 0;

  const moodChart = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const date = todayKey(new Date(Date.now() - (13 - i) * 86400000));
        const m = user.moods.find((x) => x.date === date);
        return { name: date.slice(8), mood: m?.mood ?? null };
      }),
    [user.moods]
  );

  const nextMilestone = milestones.find((m) => d.totalHours < m.hours);
  const unlockedCount = milestones.filter((m) => d.totalHours >= m.hours).length;

  const setMood = (mood: 1 | 2 | 3 | 4 | 5) => {
    const wasNew = !todayMood;
    dispatch({ type: "ADD_MOOD", payload: { date: today, mood } });
    if (wasNew) {
      dispatch({ type: "ADD_XP", payload: 10 });
      void awardXp("mood_checkin", { silent: true });
    }
  };

  const updateLog = (patch: Partial<DailyLog>, xpKey: Parameters<typeof awardXp>[0] | null) => {
    const prevHas = (k: keyof DailyLog) => todayLog[k] !== undefined;
    const newKeys = Object.keys(patch) as (keyof DailyLog)[];
    const isFirst = newKeys.some((k) => !prevHas(k));
    dispatch({ type: "UPSERT_DAILY_LOG", payload: { date: today, ...patch } });
    if (isFirst && xpKey) {
      void awardXp(xpKey, { silent: true }).then((g) => {
        if (g > 0) dispatch({ type: "ADD_XP", payload: g });
      });
    }
  };

  const logBreath = (sec: number) => {
    if (!sec || sec <= 0) return;
    dispatch({ type: "ADD_BREATH", payload: { date: today, seconds: sec } });
    void awardXp("lung_capacity_logged", { silent: true }).then((g) => {
      if (g > 0) dispatch({ type: "ADD_XP", payload: g });
    });
    toast.success("Lung capacity logged 🫁");
    setLungOpen(false);
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-black leading-tight">Health</h1>
          <p className="text-xs text-muted-foreground">Your body is rebuilding. Track it.</p>
        </div>
        <div className="rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-bold text-accent">
          {unlockedCount}/{milestones.length} unlocked
        </div>
      </div>

      {/* Hero row: Lung capacity + Mood (SOS-style emphasis) */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setLungOpen(true)}
          className="relative overflow-hidden rounded-3xl bg-gradient-hero p-4 text-left text-primary-foreground shadow-elevated transition-bounce hover:scale-[1.02] active:scale-100"
        >
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-accent/20" />
          <div className="relative">
            <div className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-accent/90">
              <Wind className="h-4 w-4 text-primary" strokeWidth={2.5} />
            </div>
            <p className="font-display text-base font-black leading-tight">
              LUNG<br />CAPACITY
            </p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-display text-2xl font-black text-accent tabular-nums">
                {lastLung || "—"}
              </span>
              <span className="text-[10px] text-white/70">sec last · best {bestLung || "—"}s</span>
            </div>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-accent">
              Tap to log +10 XP
            </p>
          </div>
        </button>

        <div className="relative overflow-hidden rounded-3xl bg-card p-4 shadow-card border border-border/40">
          <div className="mb-1.5 flex items-center gap-2">
            <Heart className="h-4 w-4 text-destructive" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Mood today
            </p>
          </div>
          <p className="font-display text-base font-black leading-tight">
            {todayMood ? "Locked in" : "How do you feel?"}
          </p>
          <div className="mt-2 flex justify-between">
            {moods.map((emoji, i) => {
              const val = (i + 1) as 1 | 2 | 3 | 4 | 5;
              const active = todayMood?.mood === val;
              return (
                <button
                  key={emoji}
                  onClick={() => setMood(val)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-lg transition-bounce ${
                    active
                      ? "scale-110 bg-accent shadow-button"
                      : "bg-secondary hover:scale-105"
                  }`}
                  aria-label={`Mood ${val}`}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-accent">
            +10 XP daily
          </p>
        </div>
      </div>

      {/* Compact daily-log tile grid */}
      <div className="grid grid-cols-2 gap-3">
        <CounterTile
          icon={Droplets}
          label="Hydration"
          unit="glasses"
          value={todayLog.hydration ?? 0}
          max={12}
          step={1}
          target={8}
          onChange={(v) => updateLog({ hydration: v }, "hydration_logged")}
          accentClass="text-accent"
        />
        <CounterTile
          icon={Moon}
          label="Sleep"
          unit="hours"
          value={todayLog.sleep ?? 0}
          max={12}
          step={0.5}
          target={8}
          onChange={(v) => updateLog({ sleep: v }, "sleep_logged")}
          accentClass="text-primary"
        />
        <DotPickerTile
          icon={Zap}
          label="Energy"
          value={todayLog.energy}
          onChange={(v) => updateLog({ energy: v }, "energy_logged")}
        />
        <SoonTile
          icon={Activity}
          label="Resting HR"
          desc="Connect health app"
          onClick={() =>
            toast("Apple Health & Google Fit integration coming soon. 🚀")
          }
        />
      </div>

      {/* Mini sparkline row */}
      <div className="grid grid-cols-2 gap-3">
        <SparkTile
          title="Lung trend"
          subtitle={`${lungChart.length} logs`}
          data={lungChart.map((c) => ({ v: c.seconds }))}
          stat={lastLung > 0 ? `${lastLung}s` : "—"}
        />
        <SparkTile
          title="Mood — 14d"
          subtitle={`${moodChart.filter((m) => m.mood !== null).length} check-ins`}
          data={moodChart.map((m) => ({ v: m.mood }))}
          stat={todayMood ? moods[todayMood.mood - 1] : "—"}
        />
      </div>

      {/* Compact next-milestone + collapsed timeline */}
      <button
        onClick={() => setTimelineOpen(true)}
        className="smoxit-card flex w-full items-center gap-3 text-left transition-bounce hover:scale-[1.01]"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/15">
          {nextMilestone ? (
            <Lock className="h-5 w-5 text-accent" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-success" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {nextMilestone ? "Next milestone" : "All unlocked"}
          </p>
          <p className="truncate font-display text-sm font-black">
            {nextMilestone?.title ?? "Legend status reached"}
          </p>
          {nextMilestone && (
            <p className="truncate text-[11px] text-muted-foreground">
              in {fmtHrs(nextMilestone.hours - d.totalHours)} · {nextMilestone.desc}
            </p>
          )}
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </button>

      {/* Connect health app — slimmer */}
      <button
        onClick={() => toast("Integration coming soon. 🚀")}
        className="flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-secondary/30 p-3 text-left"
      >
        <Smartphone className="h-5 w-5 shrink-0 text-accent" />
        <div className="flex-1">
          <p className="text-sm font-display font-black">Connect Health App</p>
          <p className="text-[11px] text-muted-foreground">
            Auto-sync HR, steps & sleep
          </p>
        </div>
        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
          Soon
        </span>
      </button>

      {lungOpen && <LungModal onClose={() => setLungOpen(false)} onLog={logBreath} />}
      {timelineOpen && (
        <TimelineModal
          onClose={() => setTimelineOpen(false)}
          totalHours={d.totalHours}
        />
      )}
    </div>
  );
};

/* -------------------- Tiles -------------------- */

const CounterTile = ({
  icon: Icon,
  label,
  unit,
  value,
  max,
  step,
  target,
  onChange,
  accentClass,
}: {
  icon: any;
  label: string;
  unit: string;
  value: number;
  max: number;
  step: number;
  target: number;
  onChange: (v: number) => void;
  accentClass?: string;
}) => {
  const pct = Math.min(100, (value / target) * 100);
  return (
    <div className="smoxit-card p-4">
      <div className="flex items-start justify-between">
        <Icon className={`h-5 w-5 ${accentClass ?? "text-accent"}`} />
        <div className="flex gap-1">
          <button
            onClick={() => onChange(Math.max(0, +(value - step).toFixed(1)))}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary"
            aria-label="Decrease"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onChange(Math.min(max, +(value + step).toFixed(1)))}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-primary"
            aria-label="Increase"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={3} />
          </button>
        </div>
      </div>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <div className="flex items-baseline gap-1">
        <span className="stat-number text-2xl text-foreground">{value}</span>
        <span className="text-[11px] text-muted-foreground">/ {target} {unit}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-gradient-accent transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

const DotPickerTile = ({
  icon: Icon,
  label,
  value,
  onChange,
}: {
  icon: any;
  label: string;
  value?: 1 | 2 | 3 | 4 | 5;
  onChange: (v: 1 | 2 | 3 | 4 | 5) => void;
}) => (
  <div className="smoxit-card p-4">
    <Icon className="h-5 w-5 text-warning" />
    <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
      {label}
    </p>
    <p className="font-display text-sm font-black">
      {value ? `${value} / 5` : "Tap to log"}
    </p>
    <div className="mt-2 flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = (value ?? 0) >= n;
        return (
          <button
            key={n}
            onClick={() => onChange(n as 1 | 2 | 3 | 4 | 5)}
            className={`h-5 flex-1 rounded-full transition-all ${
              active ? "bg-warning shadow-[0_0_8px_hsl(var(--warning)/0.6)]" : "bg-secondary"
            }`}
            aria-label={`Energy ${n}`}
          />
        );
      })}
    </div>
    <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-accent">+5 XP</p>
  </div>
);

const SoonTile = ({
  icon: Icon,
  label,
  desc,
  onClick,
}: {
  icon: any;
  label: string;
  desc: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="smoxit-card p-4 text-left transition-bounce hover:scale-[1.02]"
  >
    <div className="flex items-start justify-between">
      <Icon className="h-5 w-5 text-destructive" />
      <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent">
        Soon
      </span>
    </div>
    <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
      {label}
    </p>
    <p className="font-display text-sm font-black leading-tight">—</p>
    <p className="mt-1 text-[11px] text-muted-foreground">{desc}</p>
  </button>
);

const SparkTile = ({
  title,
  subtitle,
  data,
  stat,
}: {
  title: string;
  subtitle: string;
  data: { v: number | null }[];
  stat: string;
}) => {
  const hasData = data.some((d) => d.v !== null && d.v !== undefined);
  return (
    <div className="smoxit-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {title}
          </p>
          <p className="font-display text-lg font-black leading-tight">{stat}</p>
        </div>
        <span className="text-[10px] text-muted-foreground">{subtitle}</span>
      </div>
      <div className="mt-2 h-12">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 11,
                  padding: "4px 8px",
                }}
                formatter={(v: number) => [v, ""]}
                labelFormatter={() => ""}
              />
              <Line
                type="monotone"
                dataKey="v"
                stroke="hsl(var(--accent))"
                strokeWidth={2.5}
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg bg-secondary/50">
            <p className="text-[11px] text-muted-foreground">No data yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

/* -------------------- Modals -------------------- */

const ModalShell = ({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/60 px-3 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] backdrop-blur-sm">
    <div className="animate-slide-up w-full max-w-[430px] rounded-3xl bg-card p-5 shadow-elevated">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-black">{title}</h2>
        <button
          onClick={onClose}
          className="rounded-full bg-secondary p-2"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const LungModal = ({
  onClose,
  onLog,
}: {
  onClose: () => void;
  onLog: (sec: number) => void;
}) => {
  const [seconds, setSeconds] = useState("");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Live timer
  useMemo(() => {
    if (!running) return;
    const start = Date.now();
    const i = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 100) / 10), 100);
    return () => clearInterval(i);
  }, [running]);

  return (
    <ModalShell onClose={onClose} title="Lung Capacity Test">
      <p className="text-sm text-muted-foreground">
        Take a deep breath, hold as long as you comfortably can, then log it.
      </p>

      <div className="mt-4 rounded-2xl bg-gradient-hero p-5 text-center text-primary-foreground">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">Live timer</p>
        <p className="my-2 font-display text-5xl font-black tabular-nums">
          {elapsed.toFixed(1)}
          <span className="text-xl text-white/60">s</span>
        </p>
        {!running ? (
          <Button
            onClick={() => {
              setElapsed(0);
              setRunning(true);
            }}
            className="bg-accent font-bold text-primary hover:bg-accent-glow"
          >
            Start hold
          </Button>
        ) : (
          <Button
            onClick={() => {
              setRunning(false);
              const s = Math.round(elapsed);
              if (s > 0) onLog(s);
            }}
            className="bg-success font-bold text-success-foreground hover:bg-success/90"
          >
            <CheckCircle2 className="mr-1 h-4 w-4" /> Stop & log
          </Button>
        )}
      </div>

      <p className="mt-5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Or enter manually
      </p>
      <div className="mt-2 flex gap-2">
        <Input
          type="number"
          value={seconds}
          onChange={(e) => setSeconds(e.target.value)}
          placeholder="Seconds"
          className="h-11"
        />
        <Button
          onClick={() => onLog(Number(seconds))}
          className="h-11 bg-accent font-bold text-primary hover:bg-accent-glow"
        >
          <Plus className="mr-1 h-4 w-4" /> Log
        </Button>
      </div>
    </ModalShell>
  );
};

const TimelineModal = ({
  onClose,
  totalHours,
}: {
  onClose: () => void;
  totalHours: number;
}) => (
  <ModalShell onClose={onClose} title="Recovery Timeline">
    <div className="relative">
      <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-border" />
      <div className="space-y-4">
        {milestones.map((m) => {
          const unlocked = totalHours >= m.hours;
          return (
            <div key={m.title} className="relative flex gap-4">
              <div
                className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  unlocked
                    ? "bg-accent text-primary shadow-[0_0_15px_hsl(var(--accent)/0.6)]"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {unlocked ? (
                  <CheckCircle2 className="h-5 w-5" strokeWidth={2.5} />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
              </div>
              <div className={`flex-1 pb-2 ${unlocked ? "" : "opacity-50"}`}>
                <p className="text-xs font-bold uppercase tracking-wider text-accent">
                  {fmtHrs(m.hours)}
                </p>
                <p className="font-display font-black">{m.title}</p>
                <p className="text-xs text-muted-foreground">{m.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </ModalShell>
);
