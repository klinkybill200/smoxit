import { useState } from "react";
import { Heart, DollarSign, Users, Activity, Sparkles, Wind, Rocket, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SmoxitLogo } from "@/components/SmoxitLogo";
import { useUser, createDefaultUser } from "@/lib/store";

const motivationOptions = [
  { id: "health", label: "Health", icon: Heart },
  { id: "money", label: "Money", icon: DollarSign },
  { id: "family", label: "Family", icon: Users },
  { id: "sports", label: "Sports", icon: Activity },
  { id: "appearance", label: "Appearance", icon: Sparkles },
  { id: "freedom", label: "Freedom", icon: Wind },
];

export const Onboarding = () => {
  const { dispatch } = useUser();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [quitDate, setQuitDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [cigsPerDay, setCigsPerDay] = useState("15");
  const [pricePerPack, setPricePerPack] = useState("8");
  const [yearsSmoking, setYearsSmoking] = useState("5");
  const [motivations, setMotivations] = useState<string[]>([]);
  const [whyQuit, setWhyQuit] = useState("");

  const next = () => setStep((s) => Math.min(4, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const finish = () => {
    const user = createDefaultUser({
      name: name.trim() || "Friend",
      quitDate: new Date(quitDate).getTime(),
      cigsPerDay: Number(cigsPerDay) || 15,
      pricePerPack: Number(pricePerPack) || 8,
      yearsSmoking: Number(yearsSmoking) || 0,
      motivations,
      whyQuit: whyQuit.trim() || "Because I deserve a better life.",
    });
    dispatch({ type: "INIT_USER", payload: user });
  };

  const toggleMotivation = (id: string) =>
    setMotivations((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));

  return (
    <div className="min-h-screen bg-gradient-hero text-primary-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-5 pb-8 pt-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="10" fill="hsl(var(--accent))" />
              <path d="M11 11 L20 20 L11 29 M29 11 L20 20 L29 29" stroke="hsl(var(--primary))" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-display text-xl font-black tracking-tight">SMOXIT</span>
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${i <= step ? "w-6 bg-accent" : "w-3 bg-white/20"}`}
              />
            ))}
          </div>
        </div>

        {/* Steps */}
        <div className="mt-10 flex-1">
          {step === 0 && (
            <div className="animate-slide-up space-y-6">
              <h1 className="font-display text-4xl font-black leading-tight">
                Let's get to know <span className="text-accent">you.</span>
              </h1>
              <p className="text-white/70">No fluff. Just the basics so we can build your win.</p>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-white/80">Your name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="h-12 border-white/20 bg-white/5 text-white placeholder:text-white/40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qd" className="text-white/80">Quit date & time</Label>
                <Input
                  id="qd"
                  type="datetime-local"
                  value={quitDate}
                  onChange={(e) => setQuitDate(e.target.value)}
                  className="h-12 border-white/20 bg-white/5 text-white"
                />
                <p className="text-xs text-white/50">Can be now, or anytime in the past 30 days.</p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="animate-slide-up space-y-6">
              <h1 className="font-display text-4xl font-black leading-tight">
                Your old <span className="text-accent">habits.</span>
              </h1>
              <p className="text-white/70">We'll turn this into wins, every single day.</p>

              <div className="space-y-2">
                <Label className="text-white/80">Cigarettes per day</Label>
                <Input type="number" inputMode="numeric" value={cigsPerDay} onChange={(e) => setCigsPerDay(e.target.value)} className="h-12 border-white/20 bg-white/5 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Price per pack (€)</Label>
                <Input type="number" inputMode="decimal" value={pricePerPack} onChange={(e) => setPricePerPack(e.target.value)} className="h-12 border-white/20 bg-white/5 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Years smoking</Label>
                <Input type="number" inputMode="numeric" value={yearsSmoking} onChange={(e) => setYearsSmoking(e.target.value)} className="h-12 border-white/20 bg-white/5 text-white" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-slide-up space-y-6">
              <h1 className="font-display text-4xl font-black leading-tight">
                Why are you <span className="text-accent">doing this?</span>
              </h1>
              <p className="text-white/70">Pick all that fire you up.</p>

              <div className="grid grid-cols-2 gap-3">
                {motivationOptions.map(({ id, label, icon: Icon }) => {
                  const active = motivations.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleMotivation(id)}
                      className={`group flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-bounce ${
                        active
                          ? "border-accent bg-accent/15 shadow-button"
                          : "border-white/10 bg-white/5 hover:border-white/30"
                      }`}
                    >
                      <Icon className={`h-7 w-7 ${active ? "text-accent" : "text-white/70"}`} />
                      <span className="font-bold">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-slide-up space-y-6">
              <h1 className="font-display text-4xl font-black leading-tight">
                Your <span className="text-accent">"why".</span>
              </h1>
              <p className="text-white/70">One sentence. We'll show this when cravings hit.</p>

              <Textarea
                value={whyQuit}
                onChange={(e) => setWhyQuit(e.target.value)}
                placeholder="Because I want to be there for my kids — fully alive."
                className="min-h-32 border-white/20 bg-white/5 text-white placeholder:text-white/40"
                maxLength={180}
              />
              <p className="text-right text-xs text-white/50">{whyQuit.length}/180</p>
            </div>
          )}

          {step === 4 && (
            <div className="animate-fade-in flex h-full flex-col items-center justify-center text-center">
              <div className="relative mb-8">
                <div className="absolute inset-0 animate-pulse-glow rounded-full bg-gradient-glow blur-2xl" />
                <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-accent shadow-button">
                  <Rocket className="h-14 w-14 text-primary" strokeWidth={2.5} />
                </div>
              </div>
              <h1 className="font-display text-5xl font-black leading-none">
                YOUR JOURNEY<br />STARTS <span className="text-accent">NOW.</span>
              </h1>
              <p className="mt-6 text-lg text-white/70 text-balance">
                {name || "You"}, every second from here is a win. Let's go.
              </p>
            </div>
          )}
        </div>

        {/* Nav */}
        <div className="mt-8 flex items-center gap-3">
          {step > 0 && (
            <Button
              variant="ghost"
              onClick={back}
              className="text-white hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
          )}
          {step < 4 && (
            <Button
              onClick={next}
              className="ml-auto h-14 flex-1 bg-accent text-base font-bold text-primary shadow-button hover:bg-accent-glow"
            >
              Continue <ArrowRight className="ml-1 h-5 w-5" />
            </Button>
          )}
          {step === 4 && (
            <Button
              onClick={finish}
              className="h-14 w-full bg-accent text-base font-bold text-primary shadow-button hover:bg-accent-glow"
            >
              START YOUR QUIT JOURNEY <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
