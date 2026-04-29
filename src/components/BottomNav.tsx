import { Home, BarChart3, Wrench, HeartPulse, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

export type Tab = "home" | "progress" | "tools" | "health" | "community" | "profile";

const tabs: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "progress", label: "Progress", icon: BarChart3 },
  { id: "tools", label: "Tools", icon: Wrench },
  { id: "health", label: "Health", icon: HeartPulse },
  { id: "community", label: "Community", icon: Users },
  { id: "profile", label: "Profile", icon: User },
];

interface Props {
  active: Tab;
  onChange: (t: Tab) => void;
}

export const BottomNav = ({ active, onChange }: Props) => (
  <nav className="sticky bottom-0 z-40 mt-auto border-t border-border bg-card/95 backdrop-blur-md">
    <div className="mx-auto flex w-full max-w-[430px] items-stretch justify-between px-1 pb-[env(safe-area-inset-bottom)]">
      {tabs.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-smooth",
              isActive ? "text-accent" : "text-muted-foreground hover:text-foreground"
            )}
            aria-label={label}
          >
            {isActive && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-accent" />}
            <Icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_6px_hsl(var(--accent)/0.7)]")} strokeWidth={isActive ? 2.5 : 2} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  </nav>
);
