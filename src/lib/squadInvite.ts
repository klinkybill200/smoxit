import { supabase } from "@/integrations/supabase/client";

export const SQUAD_INVITE_KEY = "smoxit:pending_squad";

export const captureSquadInviteFromUrl = (): string | null => {
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("squad");
    if (code && /^[A-Z0-9]{4,8}$/i.test(code)) {
      const up = code.toUpperCase();
      localStorage.setItem(SQUAD_INVITE_KEY, up);
      return up;
    }
  } catch {}
  return localStorage.getItem(SQUAD_INVITE_KEY);
};

export const consumePendingSquadInvite = (): string | null => {
  try {
    const v = localStorage.getItem(SQUAD_INVITE_KEY);
    if (v) localStorage.removeItem(SQUAD_INVITE_KEY);
    return v;
  } catch { return null; }
};

/** Returns squad name if join succeeded. */
export const applyPendingSquadInvite = async (userId: string): Promise<string | null> => {
  const code = consumePendingSquadInvite();
  if (!code) return null;
  const { data: squad } = await supabase.from("squads").select("*").eq("code", code).maybeSingle();
  if (!squad) return null;
  // already member?
  const { data: existing } = await supabase
    .from("squad_members")
    .select("user_id")
    .eq("squad_id", squad.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return squad.name;
  const { error } = await supabase.from("squad_members").insert({ squad_id: squad.id, user_id: userId });
  if (error) return null;
  return squad.name;
};

export const buildSquadShareUrl = (code: string) => {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://smoxit.app";
  return `${origin}/invite/${code}`;
};

export const buildSquadShareMessage = (code: string, squadName?: string) => {
  const url = buildSquadShareUrl(code);
  const name = squadName ? ` "${squadName}"` : "";
  return `Hey! I'm quitting smoking with SMOXIT 🚭. Join my Quit-Squad${name} with code ${code} → ${url}`;
};
