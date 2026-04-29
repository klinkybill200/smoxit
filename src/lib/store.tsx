import { createContext, useContext, useEffect, useMemo, useReducer, ReactNode } from "react";
import type { UserData, CravingEntry, MoodEntry, BreathHold } from "./types";
import { todayKey } from "./calc";

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
  dispatch: React.Dispatch<Action>;
}

const UserContext = createContext<Ctx | null>(null);

const loadInitial = (): UserData | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserData;
  } catch {
    return null;
  }
};

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, dispatch] = useReducer(reducer, null, loadInitial);

  useEffect(() => {
    if (user) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(user)); } catch {}
      // dark mode toggle
      document.documentElement.classList.toggle("dark", !!user.darkMode);
    } else {
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
    }
  }, [user]);

  // Refresh challenge date daily
  useEffect(() => {
    if (!user) return;
    const today = todayKey();
    if (user.challengeDate !== today) {
      dispatch({ type: "UPDATE", payload: { challengeDate: today } });
    }
  }, [user]);

  const value = useMemo(() => ({ user, dispatch }), [user]);
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
