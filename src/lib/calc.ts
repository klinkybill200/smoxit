import type { UserData } from "./types";

export const todayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export interface SmokeFreeDuration {
  ms: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalHours: number;
  totalMinutes: number;
}

export const getDuration = (quitDate: number, now = Date.now()): SmokeFreeDuration => {
  const ms = Math.max(0, now - quitDate);
  const totalSeconds = Math.floor(ms / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;
  const seconds = totalSeconds % 60;
  return { ms, days, hours, minutes, seconds, totalHours, totalMinutes };
};

export const moneySaved = (u: Pick<UserData, "quitDate" | "cigsPerDay" | "pricePerPack" | "cigsPerPack">) => {
  const d = getDuration(u.quitDate);
  const pricePerCig = u.pricePerPack / Math.max(1, u.cigsPerPack);
  const cigsAvoided = (u.cigsPerDay / 24) * d.totalHours;
  return cigsAvoided * pricePerCig;
};

export const cigsAvoided = (u: Pick<UserData, "quitDate" | "cigsPerDay">) => {
  const d = getDuration(u.quitDate);
  return Math.floor((u.cigsPerDay / 24) * d.totalHours);
};

// Each cigarette ≈ 11 minutes of life lost (well-cited estimate)
export const lifeGainedMinutes = (u: Pick<UserData, "quitDate" | "cigsPerDay">) =>
  cigsAvoided(u) * 11;

export const formatLifeGained = (minutes: number) => {
  if (minutes < 60) return `${Math.floor(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(1)} hrs`;
  const days = hours / 24;
  return `${days.toFixed(1)} days`;
};

import { formatCurrency, type Currency } from "./currency";

/** @deprecated Prefer useCurrency().format() in components for currency-aware output */
export const formatMoney = (n: number, currency?: Currency) => formatCurrency(n, currency);

// XP formula
export const levelInfo = (xp: number) => {
  const levels = ["Beginner", "Fighter", "Warrior", "Champion", "Legend", "Immortal"];
  const thresholds = [0, 100, 300, 700, 1500, 3000];
  let level = 0;
  for (let i = 0; i < thresholds.length; i++) if (xp >= thresholds[i]) level = i;
  const current = thresholds[level];
  const next = thresholds[level + 1] ?? thresholds[level] + 1500;
  const progress = ((xp - current) / (next - current)) * 100;
  return { name: levels[level], level, xp, current, next, progress: Math.min(100, progress) };
};

export const milestoneTagline = (days: number) => {
  if (days < 1) return "You just took the bravest step. 🚀";
  if (days < 3) return "Look at you go! 🔥";
  if (days < 7) return "Nicotine is leaving the building. 💨";
  if (days < 14) return "One week strong! 💪";
  if (days < 30) return "Two weeks. You're a fighter. ⚡";
  if (days < 90) return "One month free. Unstoppable. 🏆";
  if (days < 180) return "Three months. New you. ✨";
  if (days < 365) return "Halfway to a year. Legend. 👑";
  return "A year+ smoke-free. Immortal. 🔱";
};

export const dailyQuotes = [
  "Every cigarette refused is a vote for the future you.",
  "You are not giving anything up. You are gaining everything.",
  "The craving lasts 5 minutes. Freedom lasts forever.",
  "Discipline is choosing what you want most over what you want now.",
  "Strong people aren't born. They're built — one decision at a time.",
  "Your lungs are throwing a party right now. Don't crash it.",
  "Quitting smoking is the best gift you'll ever give yourself.",
  "You're not 'trying' to quit. You quit. Period.",
  "The version of you a year from now is begging you not to smoke today.",
  "Cravings are waves. You're the surfer.",
];

export const quoteOfDay = () => {
  const idx = Math.floor((Date.now() / 86400000)) % dailyQuotes.length;
  return dailyQuotes[idx];
};
