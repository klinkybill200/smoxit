import { useState } from "react";
import { useUser } from "@/lib/store";
import { Onboarding } from "@/components/Onboarding";
import { BottomNav, type Tab } from "@/components/BottomNav";
import { HomeScreen } from "@/screens/HomeScreen";
import { ProgressScreen } from "@/screens/ProgressScreen";
import { ToolsScreen } from "@/screens/ToolsScreen";
import { HealthScreen } from "@/screens/HealthScreen";
import { CommunityScreen } from "@/screens/CommunityScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";

const Index = () => {
  const { user } = useUser();
  const [tab, setTab] = useState<Tab>("home");

  if (!user) return <Onboarding />;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col">
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
  );
};

export default Index;
