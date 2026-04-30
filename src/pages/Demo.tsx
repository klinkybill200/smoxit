import { useReducer, useState, useMemo, createContext, ReactNode } from "react";
import { Settings } from "lucide-react";
import { BottomNav, type Tab } from "@/components/BottomNav";
import { HomeScreen } from "@/screens/HomeScreen";
import { ProgressScreen } from "@/screens/ProgressScreen";
import { ToolsScreen } from "@/screens/ToolsScreen";
import { HealthScreen } from "@/screens/HealthScreen";
import { CommunityScreen } from "@/screens/CommunityScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { cn } from "@/lib/utils";
import { createDefaultUser } from "@/lib/store";
import { DemoUserProvider } from "@/lib/demoStore";

const Demo = () => {
  const [tab, setTab] = useState<Tab>("home");

  // Demo user: quit 12 days ago, plausible defaults
  const initialUser = useMemo(
    () =>
      createDefaultUser({
        name: "Demo",
        quitDate: Date.now() - 12 * 24 * 60 * 60 * 1000,
        cigsPerDay: 18,
        pricePerPack: 8,
        yearsSmoking: 7,
        motivations: ["health", "money", "family"],
        whyQuit: "Damit ich für meine Familie voll da sein kann.",
        xp: 240,
      }),
    []
  );

  return (
    <DemoUserProvider initialUser={initialUser}>
      <div className="min-h-screen bg-background">
        <div className="relative mx-auto flex min-h-screen w-full max-w-[430px] flex-col">
          {/* Demo banner */}
          <div className="sticky top-0 z-40 bg-accent/90 px-4 py-1.5 text-center text-[11px] font-bold uppercase tracking-wider text-accent-foreground backdrop-blur">
            Demo-Modus · keine Daten werden gespeichert
          </div>

          <button
            onClick={() => setTab("profile")}
            aria-label="Settings"
            className={cn(
              "absolute right-4 top-10 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-foreground/10 text-foreground/80 backdrop-blur-md transition-smooth hover:text-foreground hover:bg-foreground/15 hover:scale-105",
              tab === "profile" && "text-accent ring-2 ring-accent/40 bg-foreground/15"
            )}
          >
            <Settings className="h-5 w-5" strokeWidth={2.25} />
          </button>

          <main key={tab} className="animate-fade-in flex-1 px-4 pb-6">
            {tab === "home" && <HomeScreen />}
            {tab === "progress" && <ProgressScreen />}
            {tab === "tools" && <ToolsScreen />}
            {tab === "health" && <HealthScreen />}
            {tab === "community" && <CommunityScreen />}
            {tab === "profile" && <ProfileScreen />}
          </main>
          <BottomNav active={tab} onChange={setTab} />
        </div>
      </div>
    </DemoUserProvider>
  );
};

export default Demo;
