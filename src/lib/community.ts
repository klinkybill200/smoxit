// Community helpers: anonymous identity + level system

const NAME_SEED_KEY = "smoxit:anon-seed";

export function anonName(userId?: string | null): string {
  const id = userId ?? localStorage.getItem(NAME_SEED_KEY) ?? "guest";
  // simple deterministic 4-digit hash
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const num = Math.abs(hash) % 9000 + 1000;
  return `Quitter_${num}`;
}

const palette = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(180 60% 45%)",
  "hsl(20 80% 55%)",
  "hsl(280 60% 55%)",
  "hsl(140 50% 45%)",
  "hsl(340 70% 55%)",
];
export function anonColor(userId?: string | null): string {
  const id = userId ?? "guest";
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 17 + id.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

export function levelFromXp(xp: number) {
  const tiers = [
    { min: 0, name: "Seedling", emoji: "🌱", level: 1 },
    { min: 100, name: "Fighter", emoji: "🔥", level: 2 },
    { min: 300, name: "Warrior", emoji: "⚡", level: 3 },
    { min: 600, name: "Champion", emoji: "🏆", level: 4 },
    { min: 1000, name: "Legend", emoji: "👑", level: 5 },
  ];
  let current = tiers[0];
  for (const t of tiers) if (xp >= t.min) current = t;
  return current;
}

export function timeAgo(ts: string | number | Date): string {
  const d = typeof ts === "string" || typeof ts === "number" ? new Date(ts) : ts;
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return "now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export function generateSquadCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export type Category = "win" | "struggle" | "advice" | "milestone";

export const CATEGORY_META: Record<Category, { label: string; emoji: string; color: string }> = {
  win: { label: "Win", emoji: "🔥", color: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
  struggle: { label: "Struggle", emoji: "😤", color: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  advice: { label: "Advice", emoji: "💬", color: "bg-purple-500/15 text-purple-600 dark:text-purple-400" },
  milestone: { label: "Milestone", emoji: "🎉", color: "bg-accent/20 text-accent-foreground" },
};
