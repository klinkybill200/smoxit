import { useEffect, useRef, useState } from "react";
import { Flame, Wind, Gamepad2, Headphones, Lightbulb, ChevronRight, X, Play, Pause, CheckCircle2, MessageCircle, Sparkles } from "lucide-react";
import { useUser } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Confetti } from "@/components/Confetti";
import { CoachChat } from "@/components/CoachChat";
import { toast } from "sonner";
import type { Trigger } from "@/lib/types";
import { awardXp, type XpEventType } from "@/lib/xp";

type Tool = "menu" | "breathing" | "game" | "audio" | "tips" | "coach";

const triggers: { id: Trigger; label: string; emoji: string }[] = [
  { id: "stress", label: "Stress", emoji: "😰" },
  { id: "boredom", label: "Boredom", emoji: "😑" },
  { id: "social", label: "Social", emoji: "🍻" },
  { id: "habit", label: "Habit", emoji: "🔁" },
  { id: "other", label: "Other", emoji: "❓" },
];

const tips = [
  "Drink a tall glass of cold water — slowly.",
  "Step outside for 60 seconds of fresh air.",
  "Text or call your quit buddy right now.",
  "Chew gum or eat a crunchy snack.",
  "Splash cold water on your face.",
  "Do 10 push-ups or stretch for 2 min.",
  "Brush your teeth — kills the urge fast.",
];

export const ToolsScreen = () => {
  const { user, dispatch } = useUser();
  const [active, setActive] = useState<Tool>("menu");
  const [showCravingFlow, setShowCravingFlow] = useState(false);
  const [confetti, setConfetti] = useState(0);

  if (!user) return null;

  const logCraving = (trigger: Trigger, resisted: boolean) => {
    dispatch({
      type: "ADD_CRAVING",
      payload: { id: crypto.randomUUID(), timestamp: Date.now(), trigger, resisted },
    });
    if (resisted) {
      dispatch({ type: "ADD_XP", payload: 25 });
      void awardXp("craving_resisted", { extra: crypto.randomUUID(), silent: true });
      setConfetti((c) => c + 1);
      toast.success("+25 XP — You crushed that craving! 💪");
    } else {
      toast("Logged. Tomorrow is a new chance. 💙");
    }
    setShowCravingFlow(false);
    setActive("menu");
  };

  const openTool = async (tool: Tool, xpKey: XpEventType | null) => {
    setActive(tool);
    if (xpKey) {
      const granted = await awardXp(xpKey, { silent: true });
      if (granted > 0) dispatch({ type: "ADD_XP", payload: granted });
    }
  };

  return (
    <div className="space-y-4 pt-2">
      <Confetti trigger={confetti} />
      <h1 className="font-display text-3xl font-black">Tools</h1>
      <p className="text-sm text-muted-foreground">You're stronger than this craving.</p>

      {/* Emergency action row: Craving + Coach Chat */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setShowCravingFlow(true)}
          className="relative overflow-hidden rounded-3xl bg-destructive p-5 text-left text-destructive-foreground shadow-elevated transition-bounce hover:scale-[1.02] active:scale-100"
        >
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative">
            <Flame className="mb-2 h-7 w-7 text-white" strokeWidth={2.5} />
            <p className="font-display text-lg font-black leading-tight">I HAVE<br />CRAVINGS. NOW.</p>
            <p className="mt-1 text-[11px] text-white/80">Tap. Breathe. Win.</p>
          </div>
        </button>
        <button
          onClick={() => setActive("coach")}
          className="relative overflow-hidden rounded-3xl bg-primary p-5 text-left text-primary-foreground shadow-elevated transition-bounce hover:scale-[1.02] active:scale-100"
        >
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-accent/20" />
          <div className="relative">
            <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-accent">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <p className="font-display text-lg font-black leading-tight">CHAT<br />COACH</p>
            <p className="mt-1 text-[11px] text-white/70">Talk to an expert.</p>
          </div>
        </button>
      </div>

      {/* Quick tools */}
      <div className="grid grid-cols-2 gap-3">
        <ToolCard icon={Wind} label="Breathing" desc="4-4-4 exercise" onClick={() => setActive("breathing")} />
        <ToolCard icon={Gamepad2} label="Distraction" desc="Tap mini-game" onClick={() => setActive("game")} />
        <ToolCard icon={Headphones} label="Meditation" desc="Guided audio" onClick={() => setActive("audio")} />
        <ToolCard icon={Lightbulb} label="Quick Tips" desc="Beat it fast" onClick={() => setActive("tips")} />
      </div>

      {/* Recent cravings */}
      <section className="smoxit-card">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Recent Cravings</p>
        {user.cravings.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">None logged yet. Stay strong. 💙</p>
        ) : (
          <div className="mt-2 space-y-2">
            {user.cravings.slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-2 text-sm">
                <span className="font-semibold capitalize">{c.trigger}</span>
                <span className="text-xs text-muted-foreground">{new Date(c.timestamp).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                <span className={`text-xs font-bold ${c.resisted ? "text-success" : "text-muted-foreground"}`}>
                  {c.resisted ? "✓ Resisted" : "Slipped"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modals */}
      {showCravingFlow && (
        <CravingModal onClose={() => setShowCravingFlow(false)} whyQuit={user.whyQuit} onLog={logCraving} />
      )}
      {active === "breathing" && <BreathingModal onClose={() => setActive("menu")} />}
      {active === "game" && <GameModal onClose={() => setActive("menu")} />}
      {active === "audio" && <AudioModal onClose={() => setActive("menu")} />}
      {active === "tips" && <TipsModal onClose={() => setActive("menu")} />}
      {active === "coach" && <CoachChat onClose={() => setActive("menu")} whyQuit={user.whyQuit} />}
    </div>
  );
};

const ToolCard = ({ icon: Icon, label, desc, onClick }: any) => (
  <button onClick={onClick} className="smoxit-card flex flex-col items-start text-left transition-bounce hover:scale-[1.02]">
    <Icon className="mb-2 h-6 w-6 text-accent" />
    <p className="font-display font-black">{label}</p>
    <p className="text-xs text-muted-foreground">{desc}</p>
  </button>
);

const ModalShell = ({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/60 px-3 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] backdrop-blur-sm">
    <div className="animate-slide-up w-full max-w-[430px] rounded-3xl bg-card p-5 shadow-elevated">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-black">{title}</h2>
        <button onClick={onClose} className="rounded-full bg-secondary p-2" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const CravingModal = ({ onClose, whyQuit, onLog }: { onClose: () => void; whyQuit: string; onLog: (t: Trigger, r: boolean) => void }) => {
  const [seconds, setSeconds] = useState(300);
  const [trigger, setTrigger] = useState<Trigger>("stress");
  useEffect(() => {
    const i = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(i);
  }, []);
  const pct = ((300 - seconds) / 300) * 100;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;

  return (
    <ModalShell onClose={onClose} title="Ride the Wave">
      <div className="text-center">
        <div className="relative mx-auto h-44 w-44">
          <svg viewBox="0 0 100 100" className="-rotate-90">
            <circle cx="50" cy="50" r="44" stroke="hsl(var(--secondary))" strokeWidth="8" fill="none" />
            <circle
              cx="50" cy="50" r="44"
              stroke="hsl(var(--accent))" strokeWidth="8" fill="none"
              strokeDasharray={`${(pct / 100) * 276} 276`}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="font-display text-4xl font-black tabular-nums">{m}:{String(s).padStart(2, "0")}</p>
            <p className="text-xs text-muted-foreground">until it passes</p>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-accent/30 bg-accent/10 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-accent">Remember Why</p>
          <p className="mt-1 font-display font-bold text-balance">"{whyQuit}"</p>
        </div>

        <p className="mt-5 text-left text-xs font-bold uppercase tracking-widest text-muted-foreground">What triggered it?</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {triggers.map((t) => (
            <button
              key={t.id}
              onClick={() => setTrigger(t.id)}
              className={`rounded-full border-2 px-3 py-1.5 text-xs font-semibold ${
                trigger === t.id ? "border-accent bg-accent/15 text-accent-foreground" : "border-border bg-secondary"
              }`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button onClick={() => onLog(trigger, false)} variant="outline" className="h-12">I slipped</Button>
          <Button onClick={() => onLog(trigger, true)} className="h-12 bg-success font-bold text-success-foreground hover:bg-success/90">
            <CheckCircle2 className="mr-1 h-4 w-4" /> I survived
          </Button>
        </div>
      </div>
    </ModalShell>
  );
};

const BreathingModal = ({ onClose }: { onClose: () => void }) => {
  const [phase, setPhase] = useState<"Inhale" | "Hold" | "Exhale">("Inhale");
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    // 8s cycle synced with the CSS animation: 0-3s Inhale, 3-5s Hold, 5-8s Exhale
    const start = Date.now();
    const i = setInterval(() => {
      const t = ((Date.now() - start) / 1000) % 8;
      setPhase(t < 3 ? "Inhale" : t < 5 ? "Hold" : "Exhale");
      setCycle(Math.floor((Date.now() - start) / 8000));
    }, 200);
    return () => clearInterval(i);
  }, []);

  return (
    <ModalShell onClose={onClose} title="Breathe with Me">
      <div className="flex flex-col items-center py-6">
        <div className="relative flex h-56 w-56 items-center justify-center">
          <div className="animate-breathe-flow-soft absolute inset-0 rounded-full bg-gradient-accent" />
          <div className="animate-breathe-flow absolute h-32 w-32 rounded-full bg-accent shadow-button" />
          <p className="relative font-display text-2xl font-black text-primary">{phase}</p>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">Cycle {Math.min(cycle + 1, 4)} of 4</p>
        {cycle >= 4 && (
          <Button onClick={onClose} className="mt-4 bg-success font-bold text-success-foreground hover:bg-success/90">
            <CheckCircle2 className="mr-1 h-4 w-4" /> Craving passed
          </Button>
        )}
      </div>
    </ModalShell>
  );
};

const GameModal = ({ onClose }: { onClose: () => void }) => {
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(30);
  const [target, setTarget] = useState({ x: 50, y: 50 });
  const [done, setDone] = useState(false);

  useEffect(() => {
    const i = setInterval(() => {
      setTime((t) => {
        if (t <= 1) { setDone(true); clearInterval(i); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(i);
  }, []);

  const hit = () => {
    if (done) return;
    setScore((s) => s + 1);
    setTarget({ x: 10 + Math.random() * 80, y: 10 + Math.random() * 80 });
  };

  return (
    <ModalShell onClose={onClose} title="Tap the Targets">
      <div className="flex justify-between text-sm font-bold">
        <span>Score: <span className="text-accent">{score}</span></span>
        <span>Time: <span className="text-accent">{time}s</span></span>
      </div>
      <div className="relative mt-3 h-72 overflow-hidden rounded-2xl bg-secondary">
        {!done ? (
          <button
            onClick={hit}
            className="absolute h-12 w-12 rounded-full bg-accent shadow-button transition-all hover:scale-110"
            style={{ left: `${target.x}%`, top: `${target.y}%`, transform: "translate(-50%, -50%)" }}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="font-display text-3xl font-black">Final Score</p>
            <p className="text-6xl font-black text-accent">{score}</p>
            <p className="mt-2 text-sm text-muted-foreground">Craving distracted. Win.</p>
          </div>
        )}
      </div>
    </ModalShell>
  );
};

const AudioModal = ({ onClose }: { onClose: () => void }) => {
  const sessions = ["5-min Calm", "Confidence Boost", "Sleep Well"];
  const [playing, setPlaying] = useState<string | null>(null);
  return (
    <ModalShell onClose={onClose} title="Guided Audio">
      <p className="text-xs text-muted-foreground">Audio content to be added.</p>
      <div className="mt-3 space-y-2">
        {sessions.map((s) => (
          <div key={s} className="flex items-center gap-3 rounded-2xl bg-secondary/60 p-3">
            <button
              onClick={() => setPlaying(playing === s ? null : s)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-primary"
            >
              {playing === s ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <div className="flex-1">
              <p className="font-bold">{s}</p>
              <div className="mt-1 flex h-6 items-end gap-0.5">
                {Array.from({ length: 30 }).map((_, i) => (
                  <span
                    key={i}
                    className={`w-1 rounded-full ${playing === s ? "bg-accent" : "bg-muted"}`}
                    style={{ height: `${30 + Math.sin(i + (playing === s ? Date.now() / 200 : 0)) * 30 + 30}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ModalShell>
  );
};

const TipsModal = ({ onClose }: { onClose: () => void }) => (
  <ModalShell onClose={onClose} title="Quick Tips">
    <div className="space-y-2">
      {tips.map((t, i) => (
        <div key={i} className="flex items-start gap-3 rounded-xl bg-secondary/50 p-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-black text-primary">
            {i + 1}
          </div>
          <p className="text-sm font-medium">{t}</p>
        </div>
      ))}
    </div>
  </ModalShell>
);
