import { useMemo, useState } from "react";
import { Lock, CheckCircle2, Heart, Wind, Smartphone, Plus } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useUser } from "@/lib/store";
import { getDuration, todayKey } from "@/lib/calc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const milestones = [
  { hours: 0.33, title: "Heart rate drops", desc: "Your heart rate and blood pressure return to normal." },
  { hours: 8, title: "CO levels normalize", desc: "Carbon monoxide levels drop, oxygen rises." },
  { hours: 24, title: "Heart attack risk drops", desc: "Your risk of heart attack already starts decreasing." },
  { hours: 48, title: "Taste & smell return", desc: "Damaged nerve endings begin to regrow." },
  { hours: 24 * 14, title: "Lung function improves", desc: "Up to +30% in just two weeks." },
  { hours: 24 * 30, title: "Coughing reduces", desc: "Lungs cleaner. Breathing easier." },
  { hours: 24 * 365, title: "Heart disease risk halved", desc: "Compared to a smoker." },
  { hours: 24 * 365 * 10, title: "Lung cancer risk halved", desc: "Your body is rebuilt." },
];

export const HealthScreen = () => {
  const { user, dispatch } = useUser();
  const [breath, setBreath] = useState("");

  if (!user) return null;
  const d = getDuration(user.quitDate);

  const chartData = useMemo(
    () => user.breathHolds.slice(-10).map((b) => ({ name: b.date.slice(5), seconds: b.seconds })),
    [user.breathHolds]
  );

  const moodChart = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const date = todayKey(new Date(Date.now() - (13 - i) * 86400000));
      const m = user.moods.find((x) => x.date === date);
      return { name: date.slice(8), mood: m?.mood ?? null };
    });
  }, [user.moods]);

  const addBreath = () => {
    const sec = Number(breath);
    if (!sec || sec <= 0) return;
    dispatch({ type: "ADD_BREATH", payload: { date: todayKey(), seconds: sec } });
    setBreath("");
    toast.success("Breath hold logged. Lungs leveling up. 💪");
  };

  return (
    <div className="space-y-4 pt-2">
      <h1 className="font-display text-3xl font-black">Health</h1>
      <p className="text-sm text-muted-foreground">Your body is rebuilding itself. Watch it happen.</p>

      {/* Timeline */}
      <section className="smoxit-card">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Recovery Timeline</p>
        <div className="relative mt-4">
          <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-border" />
          <div className="space-y-4">
            {milestones.map((m) => {
              const unlocked = d.totalHours >= m.hours;
              return (
                <div key={m.title} className="relative flex gap-4">
                  <div
                    className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      unlocked
                        ? "bg-accent text-primary shadow-[0_0_15px_hsl(var(--accent)/0.6)]"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {unlocked ? <CheckCircle2 className="h-5 w-5" strokeWidth={2.5} /> : <Lock className="h-4 w-4" />}
                  </div>
                  <div className={`flex-1 pb-2 ${unlocked ? "" : "opacity-50"}`}>
                    <p className="text-xs font-bold uppercase tracking-wider text-accent">
                      {m.hours < 24 ? `${Math.round(m.hours * 60)} min` : m.hours < 24 * 30 ? `${Math.round(m.hours / 24)} days` : m.hours < 24 * 365 ? `${Math.round(m.hours / 24 / 30)} months` : `${Math.round(m.hours / 24 / 365)} years`}
                    </p>
                    <p className="font-display font-black">{m.title}</p>
                    <p className="text-xs text-muted-foreground">{m.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Lung capacity */}
      <section className="smoxit-card">
        <div className="mb-3 flex items-center gap-2">
          <Wind className="h-5 w-5 text-accent" />
          <p className="font-display font-black">Lung Capacity Tracker</p>
        </div>
        <p className="text-xs text-muted-foreground">Hold your breath as long as you can. Log it weekly.</p>
        <div className="mt-3 flex gap-2">
          <Input
            type="number"
            value={breath}
            onChange={(e) => setBreath(e.target.value)}
            placeholder="Seconds"
            className="h-11"
          />
          <Button onClick={addBreath} className="h-11 bg-accent font-bold text-primary hover:bg-accent-glow">
            <Plus className="mr-1 h-4 w-4" /> Log
          </Button>
        </div>
        {chartData.length > 0 && (
          <div className="mt-4 h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={10} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number) => [`${v}s`, "Hold"]}
                />
                <Line type="monotone" dataKey="seconds" stroke="hsl(var(--accent))" strokeWidth={3} dot={{ fill: "hsl(var(--accent))", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Mood history */}
      <section className="smoxit-card">
        <div className="mb-3 flex items-center gap-2">
          <Heart className="h-5 w-5 text-accent" />
          <p className="font-display font-black">Mood — Last 14 Days</p>
        </div>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={moodChart}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={10} />
              <YAxis domain={[1, 5]} hide />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
              <Line type="monotone" dataKey="mood" stroke="hsl(var(--accent))" strokeWidth={3} dot={{ fill: "hsl(var(--accent))", r: 4 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Health connect */}
      <section className="rounded-2xl border-2 border-dashed border-border bg-secondary/30 p-5">
        <div className="flex items-start gap-3">
          <Smartphone className="h-6 w-6 shrink-0 text-accent" />
          <div className="flex-1">
            <p className="font-display font-black">Connect Health App</p>
            <p className="text-xs text-muted-foreground">Track resting heart rate & activity automatically.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => toast("Integration coming soon. 🚀")}
            >
              Connect
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};
