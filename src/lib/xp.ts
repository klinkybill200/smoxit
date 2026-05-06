import { supabase } from "@/integrations/supabase/client";
import { todayKey } from "./calc";
import { toast } from "sonner";

/**
 * XP event catalog. `dedupe` defines uniqueness scope:
 *  - "once"  → one-time event (e.g. install)
 *  - "daily" → once per UTC day
 *  - "free"  → no dedupe (unlimited)
 */
export type XpEventType =
  // Tracking actions
  | "mood_checkin"          // 10 XP, daily
  | "craving_resisted"      // 25 XP, free (already wired in ToolsScreen)
  | "breath_session"        // 8 XP, daily
  | "daily_login"           // 5 XP, daily
  // Health tracking
  | "lung_capacity_logged"  // 10 XP, daily
  | "hydration_logged"      // 5 XP, daily
  | "sleep_logged"          // 5 XP, daily
  | "energy_logged"         // 5 XP, daily
  // Engagement actions
  | "coach_chat_message"    // 3 XP, free (cap server-side later)
  | "tool_breathing_used"   // 5 XP, daily
  | "tool_game_used"        // 5 XP, daily
  | "tool_audio_used"       // 5 XP, daily
  | "tool_tips_viewed"      // 3 XP, daily
  | "share_milestone"       // 15 XP, daily
  // Daily / weekly challenges
  | "daily_challenge"       // 15 XP, free (key holds challenge id+date)
  | "weekly_quest"          // 50 XP, free
  | "monthly_quest"         // 200 XP, free
  // Community
  | "post_shared"           // 10 XP, free
  | "comment_posted"        // 5 XP, free
  | "challenge_joined"      // 10 XP, free
  | "challenge_day"         // 20 XP, free
  | "squad_challenge";      // varies, free (squad collective challenge)

interface XpDef { amount: number; dedupe: "once" | "daily" | "free"; label: string }

export const XP_DEFS: Record<XpEventType, XpDef> = {
  mood_checkin:        { amount: 10, dedupe: "daily", label: "Mood logged" },
  craving_resisted:    { amount: 25, dedupe: "free",  label: "Craving crushed" },
  breath_session:      { amount: 8,  dedupe: "daily", label: "Breath session" },
  daily_login:         { amount: 5,  dedupe: "daily", label: "Daily check-in" },
  lung_capacity_logged:{ amount: 10, dedupe: "daily", label: "Lung capacity logged" },
  hydration_logged:    { amount: 5,  dedupe: "daily", label: "Hydration logged" },
  sleep_logged:        { amount: 5,  dedupe: "daily", label: "Sleep logged" },
  energy_logged:       { amount: 5,  dedupe: "daily", label: "Energy logged" },
  coach_chat_message:  { amount: 3,  dedupe: "free",  label: "Coach message" },
  tool_breathing_used: { amount: 5,  dedupe: "daily", label: "Breathing tool" },
  tool_game_used:      { amount: 5,  dedupe: "daily", label: "Distraction game" },
  tool_audio_used:     { amount: 5,  dedupe: "daily", label: "Meditation" },
  tool_tips_viewed:    { amount: 3,  dedupe: "daily", label: "Quick tips" },
  share_milestone:     { amount: 15, dedupe: "daily", label: "Shared milestone" },
  daily_challenge:     { amount: 15, dedupe: "free",  label: "Daily challenge" },
  weekly_quest:        { amount: 50, dedupe: "free",  label: "Weekly quest" },
  monthly_quest:       { amount: 200,dedupe: "free",  label: "Monthly quest" },
  post_shared:         { amount: 10, dedupe: "free",  label: "Post shared" },
  comment_posted:      { amount: 5,  dedupe: "free",  label: "Comment posted" },
  challenge_joined:    { amount: 10, dedupe: "free",  label: "Challenge joined" },
  challenge_day:       { amount: 20, dedupe: "free",  label: "Challenge day" },
};

function dedupeKey(type: XpEventType, extra?: string): string | null {
  const def = XP_DEFS[type];
  if (def.dedupe === "free") return extra ? `${type}:${extra}` : null;
  if (def.dedupe === "daily") return `${type}:${todayKey()}${extra ? `:${extra}` : ""}`;
  return `${type}${extra ? `:${extra}` : ""}`;
}

/**
 * Award XP to current user with idempotency.
 * Returns the XP amount granted (0 if duplicate or not authed).
 * Caller is responsible for updating local user.xp via the existing dispatch flow.
 */
export async function awardXp(
  type: XpEventType,
  opts: { extra?: string; silent?: boolean } = {},
): Promise<number> {
  const def = XP_DEFS[type];
  const key = dedupeKey(type, opts.extra);

  const { data: userResp } = await supabase.auth.getUser();
  const userId = userResp.user?.id;
  if (!userId) return 0;

  const insert = await supabase
    .from("xp_events")
    .insert({
      user_id: userId,
      event_type: type,
      xp_amount: def.amount,
      dedupe_key: key,
    })
    .select("id")
    .maybeSingle();

  // Unique-constraint violation → already awarded
  if (insert.error) {
    return 0;
  }

  if (!opts.silent) {
    toast.success(`+${def.amount} XP — ${def.label}`);
  }
  return def.amount;
}
