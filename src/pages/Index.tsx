import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { useUser } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useSubscription } from "@/lib/subscription";
import { AuthScreen } from "@/components/AuthScreen";
import { Onboarding } from "@/components/Onboarding";
import { BottomNav, type Tab } from "@/components/BottomNav";
import { SmoxitLogo } from "@/components/SmoxitLogo";
import { TrialBanner } from "@/components/TrialBanner";
import { Paywall } from "@/components/Paywall";
import { HomeScreen } from "@/screens/HomeScreen";
import { ProgressScreen } from "@/screens/ProgressScreen";
import { ToolsScreen } from "@/screens/ToolsScreen";
import { HealthScreen } from "@/screens/HealthScreen";
import { CommunityScreen } from "@/screens/CommunityScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const Index = () => {
  const { session, loading: authLoading } = useAuth();
  const { user, loading: userLoading } = useUser();
  const sub = useSubscription();
  const [tab, setTab] = useState<Tab>("home");

  // Handle Stripe checkout return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("checkout");
    if (status === "success") {
      toast.success("Welcome to SMOXIT Premium! 🎉");
      // Webhook may take a moment; refresh after short delay
      setTimeout(() => { void sub.refresh(); }, 1500);
      window.history.replaceState({}, "", window.location.pathname);
    } else if (status === "cancel") {
      window.history.replaceState({}, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (authLoading || (session && userLoading)) {
    return (
      <div className="min-h-screen bg-gradient-hero text-primary-foreground flex flex-col items-center justify-center">
        <SmoxitLogo size={64} variant="light" />
        <p className="mt-6 text-primary-foreground/70 animate-pulse">Loading...</p>
      </div>
    );
  }

  if (!session) return <AuthScreen />;
  if (!user) return <Onboarding />;

  // Hard paywall when trial expired and no active sub
  const showHardPaywall = sub.trialExpired && sub.status !== "active";

  return (
    <div className="min-h-screen bg-background">
      <div className="relative mx-auto flex min-h-screen w-full max-w-[430px] flex-col">
        <TrialBanner />

        {/* Settings gear top right */}
        <button
          onClick={() => setTab("profile")}
          aria-label="Settings"
          className={cn(
            "absolute right-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-foreground/10 text-foreground/80 backdrop-blur-md transition-smooth hover:text-foreground hover:bg-foreground/15 hover:scale-105",
            tab === "profile" && "text-accent ring-2 ring-accent/40 bg-foreground/15",
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

      {/* Non-dismissible paywall when trial is over */}
      <Paywall open={showHardPaywall} onOpenChange={() => {}} dismissible={false} />
    </div>
  );
};

export default Index;
