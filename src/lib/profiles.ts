import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { anonName, anonColor } from "./community";

export interface PublicProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

const cache = new Map<string, PublicProfile>();
const subscribers = new Set<() => void>();

export async function fetchProfiles(userIds: string[]): Promise<void> {
  const missing = userIds.filter((id) => id && !cache.has(id));
  if (missing.length === 0) return;
  const { data } = await supabase
    .from("profiles")
    .select("user_id,display_name,avatar_url")
    .in("user_id", missing);
  for (const id of missing) {
    const found = data?.find((p: any) => p.user_id === id);
    cache.set(id, found ?? { user_id: id, display_name: null, avatar_url: null });
  }
  subscribers.forEach((fn) => fn());
}

export function invalidateProfile(userId: string) {
  cache.delete(userId);
  subscribers.forEach((fn) => fn());
}

export function useProfiles(userIds: string[]) {
  const key = userIds.join(",");
  const [, force] = useState(0);
  useEffect(() => {
    void fetchProfiles(userIds);
    const fn = () => force((n) => n + 1);
    subscribers.add(fn);
    return () => { subscribers.delete(fn); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const map: Record<string, PublicProfile> = {};
  for (const id of userIds) {
    map[id] = cache.get(id) ?? { user_id: id, display_name: null, avatar_url: null };
  }
  return map;
}

export function displayName(p: PublicProfile | undefined, userId: string): string {
  return p?.display_name?.trim() || anonName(userId);
}
export function displayInitial(p: PublicProfile | undefined, userId: string): string {
  return displayName(p, userId).charAt(0).toUpperCase();
}
export function displayColor(userId: string): string {
  return anonColor(userId);
}
