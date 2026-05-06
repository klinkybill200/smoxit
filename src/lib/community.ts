// Community helpers: anonymous identity + level system

const NAME_SEED_KEY = "smoxit:anon-seed";

const ADJECTIVES = [
  "Brave", "Mighty", "Fierce", "Calm", "Bold", "Swift", "Steady", "Lucky",
  "Wild", "Quiet", "Sunny", "Stormy", "Iron", "Golden", "Silent", "Rapid",
  "Cosmic", "Electric", "Noble", "Rebel", "Zen", "Phoenix", "Frosty", "Blazing",
  "Lone", "Smoky", "Velvet", "Royal", "Mystic", "Turbo", "Neon", "Quantum",
];
const NOUNS = [
  "Wolf", "Tiger", "Falcon", "Bear", "Dragon", "Lion", "Otter", "Hawk",
  "Panda", "Fox", "Eagle", "Shark", "Phoenix", "Raven", "Cobra", "Stag",
  "Whale", "Lynx", "Rhino", "Puma", "Orca", "Bison", "Mantis", "Owl",
  "Comet", "Storm", "Ember", "Drifter", "Voyager", "Ranger", "Knight", "Nomad",
];

const REAL_NAMES = [
  "Alex", "Sam", "Jamie", "Chris", "Jordan", "Taylor", "Morgan", "Casey",
  "Robin", "Charlie", "Sasha", "Noah", "Mia", "Liam", "Emma", "Lukas",
  "Lena", "Finn", "Hannah", "Leon", "Sophie", "Max", "Lara", "Tom",
  "Anna", "Ben", "Clara", "David", "Ella", "Felix", "Greta", "Henry",
  "Ida", "Jonas", "Kim", "Laura", "Marco", "Nina", "Oliver", "Paula",
  "Quinn", "Rafa", "Stella", "Theo", "Uma", "Vince", "Wendy", "Yara",
  "Maya", "Julia", "Kevin", "Mark", "Nico", "Pia", "Tim", "Eva",
];

export function anonName(userId?: string | null): string {
  const id = userId ?? localStorage.getItem(NAME_SEED_KEY) ?? "guest";
  let h1 = 0, h2 = 0, h3 = 0, h4 = 0;
  for (let i = 0; i < id.length; i++) {
    h1 = (h1 * 31 + id.charCodeAt(i)) | 0;
    h2 = (h2 * 17 + id.charCodeAt(i) * 7) | 0;
    h3 = (h3 * 13 + id.charCodeAt(i) * 3) | 0;
    h4 = (h4 * 23 + id.charCodeAt(i) * 5) | 0;
  }
  // ~40% real first names, ~60% creative adjective+noun combos
  if (Math.abs(h4) % 5 < 2) {
    const name = REAL_NAMES[Math.abs(h1) % REAL_NAMES.length];
    const num = Math.abs(h3) % 90 + 10;
    return `${name}_${num}`;
  }
  const adj = ADJECTIVES[Math.abs(h1) % ADJECTIVES.length];
  const noun = NOUNS[Math.abs(h2) % NOUNS.length];
  const num = Math.abs(h3) % 90 + 10;
  return `${adj}${noun}${num}`;
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
