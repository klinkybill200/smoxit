export type Mood = 1 | 2 | 3 | 4 | 5;
export type Trigger = "stress" | "boredom" | "social" | "habit" | "other";

export interface CravingEntry {
  id: string;
  timestamp: number;
  trigger: Trigger;
  resisted: boolean;
}

export interface MoodEntry {
  date: string; // YYYY-MM-DD
  mood: Mood;
}

export interface DreamGoal {
  name: string;
  target: number;
}

export interface BreathHold {
  date: string;
  seconds: number;
}

export interface CommunityPost {
  id: string;
  text: string;
  likes: number;
  liked?: boolean;
  timeAgo: string;
}

export interface UserData {
  name: string;
  quitDate: number; // ms epoch
  cigsPerDay: number;
  pricePerPack: number;
  cigsPerPack: number;
  yearsSmoking: number;
  motivations: string[];
  whyQuit: string;
  dreamGoal: DreamGoal;
  cravings: CravingEntry[];
  moods: MoodEntry[];
  breathHolds: BreathHold[];
  completedChallenges: string[]; // dateKey-challengeId
  challengeDate: string;
  xp: number;
  darkMode: boolean;
}
