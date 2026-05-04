import type { UserData } from "./types";
import { todayKey, getDuration, cigsAvoided } from "./calc";

export interface QuestDef {
  id: string;
  label: string;
  desc: string;
  xp: number;
  scope: "daily" | "weekly" | "monthly";
  /** Returns 0..1 progress fraction */
  progress: (u: UserData) => number;
}

const lastNDays = (u: UserData, n: number) => {
  const cutoff = Date.now() - n * 86400000;
  return {
    cravings: u.cravings.filter((c) => c.timestamp >= cutoff),
    moods: u.moods.filter((m) => new Date(m.date).getTime() >= cutoff),
    breaths: u.breathHolds.filter((b) => new Date(b.date).getTime() >= cutoff),
  };
};

export const dailyChallenges: QuestDef[] = [
  { id: "water",   label: "Drink 2L of water",     desc: "Stay hydrated",          xp: 15, scope: "daily", progress: () => 0 },
  { id: "walk",    label: "10-minute walk",        desc: "Move your body",         xp: 15, scope: "daily", progress: () => 0 },
  { id: "breathe", label: "3 breathing cycles",    desc: "Reset your nervous system", xp: 15, scope: "daily", progress: () => 0 },
  { id: "no-think",label: "4 hrs craving-free",    desc: "Mind over matter",       xp: 15, scope: "daily", progress: () => 0 },
  { id: "stretch", label: "5-min stretch",         desc: "Release the tension",    xp: 15, scope: "daily", progress: () => 0 },
  { id: "gratitude", label: "Write 1 gratitude",   desc: "Train your mind",        xp: 15, scope: "daily", progress: () => 0 },
];

export const weeklyQuests: QuestDef[] = [
  {
    id: "wq-3-resists",
    label: "Crush 3 cravings",
    desc: "Resist 3 cravings this week",
    xp: 50,
    scope: "weekly",
    progress: (u) => Math.min(1, lastNDays(u, 7).cravings.filter((c) => c.resisted).length / 3),
  },
  {
    id: "wq-5-moods",
    label: "5 mood check-ins",
    desc: "Log your mood 5 days",
    xp: 50,
    scope: "weekly",
    progress: (u) => Math.min(1, lastNDays(u, 7).moods.length / 5),
  },
  {
    id: "wq-3-breath",
    label: "3 breathing sessions",
    desc: "Reset 3 times this week",
    xp: 50,
    scope: "weekly",
    progress: (u) => Math.min(1, lastNDays(u, 7).breaths.length / 3),
  },
];

export const monthlyQuests: QuestDef[] = [
  {
    id: "mq-30-day",
    label: "30 days strong",
    desc: "Stay smoke-free for 30 days",
    xp: 200,
    scope: "monthly",
    progress: (u) => Math.min(1, getDuration(u.quitDate).days / 30),
  },
  {
    id: "mq-500-cigs",
    label: "500 cigs avoided",
    desc: "Hit the 500 mark",
    xp: 200,
    scope: "monthly",
    progress: (u) => Math.min(1, cigsAvoided(u) / 500),
  },
];

export const isQuestComplete = (q: QuestDef, u: UserData) => q.progress(u) >= 1;

export const dailyChallengeKey = (id: string) => `${todayKey()}-${id}`;
