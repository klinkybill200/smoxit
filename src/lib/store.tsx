import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, ReactNode } from "react";
import type { UserData, CravingEntry, MoodEntry, BreathHold } from "./types";
import { todayKey } from "./calc";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";

const STORAGE_KEY = "smoxit:user";

type Action =
  | { type: "INIT_USER"; payload: UserData }
  | { type: "UPDATE"; payload: Partial<UserData> }
  | { type: "ADD_CRAVING"; payload: CravingEntry }
  | { type: "ADD_MOOD"; payload: MoodEntry }
  | { type: "ADD_BREATH"; payload: BreathHold }
  | { type: "TOGGLE_CHALLENGE"; payload: string }
  | { type: "ADD_XP"; payload: number }
  | { type: "RESET" };

const reducer = (state: UserData | null, action: Action): UserData | null => {
  switch (action.type) {
    case "INIT_USER":
      return action.payload;
    case "UPDATE":
      return state ? { ...state, ...action.payload } : state;
    case "ADD_CRAVING":
      return state ? { ...state, cravings: [action.payload, ...state.cravings] } : state;
    case "ADD_MOOD": {
      if (!state) return state;
      const filtered = state.moods.filter((m) => m.date !== action.payload.date);
      return { ...state, moods: [...filtered, action.payload] };
    }
    case "ADD_BREATH":
      return state ? { ...state, breathHolds: [...state.breathHolds, action.payload] } : state;
    case "TOGGLE_CHALLENGE": {
      if (!state) return state;
      const id = action.payload;
      const has = state.completedChallenges.includes(id);
      return {
        ...state,
        completedChallenges: has
          ? state.completedChallenges.filter((c) => c !== id)
          : [...state.completedChallenges, id],
        xp: has ? Math.max(0, state.xp - 15) : state.xp + 15,
      };
    }
    case "ADD_XP":
      return state ? { ...state, xp: state.xp + action.payload } : state;
    case "RESET":
      return null;
    default:
      return state;
  }
};

interface Ctx {
  user: UserData | null;
  loading: boolean;
  dispatch: React.Dispatch<Action>;
}

const UserContext = createContext<Ctx | null>(null);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const { session, user: authUser, loading: authLoading } = useAuth();
  const [user, dispatch] = useReducer(reducer, null);
  const [dataLoading, setDataLoading] = useState(true);
  const hydratedForUserId = useRef<string | null>(null);

  // Hydrate from Cloud whenever auth user changes
  useEffect(() => {
    if (authLoading) return;
    if (!authUser) {
      // logged out
      dispatch({ type: "RESET" });
      hydratedForUserId.current = null;
      setDataLoading(false);
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      return;
    }
    if (hydratedForUserId.current === authUser.id) return;

    setDataLoading(true);
    hydratedForUserId.current = authUser.id;

    (async () => {
      const { data, error } = await supabase
        .from("user_data")
        .select("data")
        .eq("user_id", authUser.id)
        .maybeSingle();

      if (!error && data?.data) {
        dispatch({ type: "INIT_USER", payload: data.data as unknown as UserData });
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data.data)); } catch {}
      } else {
        // No cloud data → fresh user, will be created via Onboarding
        dispatch({ type: "RESET" });
      }
      setDataLoading(false);
    })();
  }, [authUser, authLoading]);

  // Persist to localStorage AND cloud (debounced)
  const saveTimer = useRef<number | null>(null);
  useEffect(() => {
    if (!user || !authUser) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(user)); } catch {}
    document.documentElement.classList.toggle("dark", !!user.darkMode);

    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      await supabase.from("user_data").upsert(
        { user_id: authUser.id, data: user as any },
        { onConflict: "user_id" }
      );
      // Mark onboarding complete on profile
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("user_id", authUser.id);
    }, 600);
  }, [user, authUser]);

  // Refresh challenge date daily
  useEffect(() => {
    if (!user) return;
    const today = todayKey();
    if (user.challengeDate !== today) {
      dispatch({ type: "UPDATE", payload: { challengeDate: today } });
    }
  }, [user]);

  const value = useMemo(
    () => ({ user, loading: authLoading || dataLoading, dispatch }),
    [user, authLoading, dataLoading]
  );
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside UserProvider");
  return ctx;
};

export const createDefaultUser = (partial: Partial<UserData>): UserData => ({
  name: "Friend",
  quitDate: Date.now(),
  cigsPerDay: 15,
  pricePerPack: 8,
  cigsPerPack: 20,
  yearsSmoking: 5,
  motivations: [],
  whyQuit: "",
  dreamGoal: { name: "Dream Trip", target: 1000 },
  cravings: [],
  moods: [],
  breathHolds: [],
  completedChallenges: [],
  challengeDate: todayKey(),
  xp: 0,
  darkMode: false,
  ...partial,
});
