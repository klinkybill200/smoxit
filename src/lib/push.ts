import { supabase } from "@/integrations/supabase/client";

// VAPID public key (safe to expose). Matches VAPID_PUBLIC_KEY secret.
export const VAPID_PUBLIC_KEY =
  "BJV2AFTTZYZ88-XMtxCJCAKcxTfV0wfZqO1woI_GrWEM_TgbcCImO1SbKKe4nTiqG224AgAUUBCeM6qPjPnxKfI";

const SW_PATH = "/sw-push.js";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function arrBufToBase64(buf: ArrayBuffer | null): string {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!("PushManager" in window)) return false;
  if (!("Notification" in window)) return false;
  // Skip in iframe / preview to avoid SW pollution
  try {
    if (window.self !== window.top) return false;
  } catch {
    return false;
  }
  return true;
}

export function getPushPermission(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

export async function subscribeToPush(): Promise<{ ok: boolean; error?: string }> {
  if (!isPushSupported()) return { ok: false, error: "unsupported" };

  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return { ok: false, error: "denied" };

    const reg = await navigator.serviceWorker.register(SW_PATH);
    await navigator.serviceWorker.ready;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const json = sub.toJSON() as any;
    const endpoint = sub.endpoint;
    const p256dh = json?.keys?.p256dh ?? arrBufToBase64(sub.getKey("p256dh"));
    const auth = json?.keys?.auth ?? arrBufToBase64(sub.getKey("auth"));

    const { data: userResp } = await supabase.auth.getUser();
    const userId = userResp.user?.id;
    if (!userId) return { ok: false, error: "not_authed" };

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || null;

    await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: userId,
          endpoint,
          p256dh,
          auth,
          user_agent: navigator.userAgent,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" },
      );

    await supabase
      .from("profiles")
      .update({ push_opt_in: true, push_timezone: tz })
      .eq("user_id", userId);

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "error" };
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
    const { data: userResp } = await supabase.auth.getUser();
    if (userResp.user?.id) {
      await supabase.from("profiles").update({ push_opt_in: false }).eq("user_id", userResp.user.id);
    }
  } catch {}
}
