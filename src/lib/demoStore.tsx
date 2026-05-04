import { ReactNode, useEffect, useMemo, useReducer } from "react";
import type { UserData, CravingEntry, MoodEntry, BreathHold, DailyLog } from "./types";
import { todayKey } from "./calc";
import { UserContext } from "./store";

type Action =
  | { type: "INIT_USER"; payload: UserData }
  | { type: "UPDATE"; payload: Partial<UserData> }
  | { type: "ADD_CRAVING"; payload: CravingEntry }
  | { type: "ADD_MOOD"; payload: MoodEntry }
  | { type: "ADD_BREATH"; payload: BreathHold }
  | { type: "TOGGLE_CHALLENGE"; payload: string }
  | { type: "UPSERT_DAILY_LOG"; payload: DailyLog }
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
    case "UPSERT_DAILY_LOG": {
      if (!state) return state;
      const existing = state.dailyLogs ?? [];
      const prev = existing.find((l) => l.date === action.payload.date);
      const merged = { ...(prev ?? { date: action.payload.date }), ...action.payload };
      const next = [...existing.filter((l) => l.date !== action.payload.date), merged];
      return { ...state, dailyLogs: next };
    }
    case "ADD_XP":
      return state ? { ...state, xp: state.xp + action.payload } : state;
    case "RESET":
      return null;
    default:
      return state;
  }
};

/**
 * In-memory user provider for the public /demo route.
 * No Supabase, no localStorage persistence — pure session state.
 */
export const DemoUserProvider = ({
  initialUser,
  children,
}: {
  initialUser: UserData;
  children: ReactNode;
}) => {
  const [user, dispatch] = useReducer(reducer, initialUser);

  // Apply dark mode class like the real provider
  useEffect(() => {
    if (!user) return;
    document.documentElement.classList.toggle("dark", !!user.darkMode);
  }, [user?.darkMode]);

  // Keep challenge date current
  useEffect(() => {
    if (!user) return;
    const today = todayKey();
    if (user.challengeDate !== today) {
      dispatch({ type: "UPDATE", payload: { challengeDate: today } });
    }
  }, [user?.challengeDate]);

  const value = useMemo(
    () => ({ user, loading: false, dispatch }),
    [user]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
