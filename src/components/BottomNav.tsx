import { Home, BarChart3, AlertTriangle, HeartPulse, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export type Tab = "home" | "progress" | "tools" | "health" | "community" | "profile";

const leftTabs: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "progress", label: "Progress", icon: BarChart3 },
];
const rightTabs: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "health", label: "Health", icon: HeartPulse },
  { id: "community", label: "Community", icon: Users },
];

interface Props {
  active: Tab;
  onChange: (t: Tab) => void;
}

const TabButton = ({
  id, label, icon: Icon, active, onChange,
}: { id: Tab; label: string; icon: typeof Home; active: Tab; onChange: (t: Tab) => void }) => {
  const isActive = active === id;
  return (
    <button
      onClick={() => onChange(id)}
      className={cn(
        "relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-smooth",
        isActive ? "text-accent" : "text-muted-foreground hover:text-foreground",
      )}
      aria-label={label}
    >
      {isActive && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-accent" />}
      <Icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_6px_hsl(var(--accent)/0.7)]")} strokeWidth={isActive ? 2.5 : 2} />
      <span>{label}</span>
    </button>
  );
};

export const BottomNav = ({ active, onChange }: Props) => (
  <nav className="sticky bottom-0 z-40 mt-auto border-t border-border bg-card/95 backdrop-blur-md">
    <div className="relative mx-auto flex w-full max-w-[430px] items-stretch justify-between px-1 pb-[env(safe-area-inset-bottom)]">
      {leftTabs.map((t) => <TabButton key={t.id} {...t} active={active} onChange={onChange} />)}

      {/* Center emergency SOS button */}
      <div className="flex w-20 shrink-0 items-start justify-center">
        <button
          onClick={() => onChange("tools")}
          aria-label="Notfall – Tools"
          className={cn(
            "animate-sos-breathe -mt-7 flex h-16 w-16 items-center justify-center rounded-full border-4 border-card bg-destructive text-destructive-foreground transition-bounce hover:scale-110 active:scale-95",
            active === "tools" && "ring-4 ring-destructive/30",
          )}
        >
          <AlertTriangle className="animate-sos-icon-breathe h-7 w-7" strokeWidth={2.75} />
        </button>
      </div>

      {rightTabs.map((t) => <TabButton key={t.id} {...t} active={active} onChange={onChange} />)}
    </div>
    <p className={cn(
      "pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-widest",
      active === "tools" ? "text-destructive" : "text-destructive/80",
    )}>
      SOS
    </p>
  </nav>
);
