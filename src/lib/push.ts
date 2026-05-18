import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";

// ============================================================
// Native (iOS/Android) push via Capacitor + APNs/FCM
// ============================================================

const isNative = (): boolean => {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
};

let foregroundListenerSet = false;

/**
 * Set up listeners that display incoming push notifications while the app
 * is in the foreground and handle taps. Safe to call multiple times.
 */
export async function initNativePushListeners(): Promise<void> {
  if (!isNative() || foregroundListenerSet) return;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const { LocalNotifications } = await import("@capacitor/local-notifications");

    // Ask local-notification permission once so foreground banners can render
    try {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== "granted") {
        await LocalNotifications.requestPermissions();
      }
    } catch {}

    await PushNotifications.addListener("pushNotificationReceived", async (notification) => {
      // App is in foreground — surface as a local notification so it appears
      try {
        await LocalNotifications.schedule({
          notifications: [{
            id: Math.floor(Math.random() * 2_000_000_000),
            title: notification.title || "SMOXIT",
            body: notification.body || "",
            extra: notification.data || {},
          }],
        });
      } catch {}
    });

    await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const url = (action.notification?.data as any)?.url;
      if (url && typeof window !== "undefined") {
        try { window.location.assign(url); } catch {}
      }
    });

    foregroundListenerSet = true;
  } catch {}
}

async function registerNativePush(): Promise<{ ok: boolean; error?: string }> {
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    const perm = await PushNotifications.checkPermissions();
    let state = perm.receive;
    if (state === "prompt" || state === "prompt-with-rationale") {
      const req = await PushNotifications.requestPermissions();
      state = req.receive;
    }
    if (state !== "granted") return { ok: false, error: "denied" };

    return await new Promise((resolve) => {
      let resolved = false;
      const done = (r: { ok: boolean; error?: string }) => {
        if (resolved) return;
        resolved = true;
        resolve(r);
      };

      PushNotifications.addListener("registration", async (t) => {
        try {
          const { data: userResp } = await supabase.auth.getUser();
          const userId = userResp.user?.id;
          if (!userId) return done({ ok: false, error: "not_authed" });

          const platform = Capacitor.getPlatform() === "ios" ? "ios" : "android";
          await supabase
            .from("native_push_tokens")
            .upsert(
              {
                user_id: userId,
                platform,
                token: t.value,
                last_used_at: new Date().toISOString(),
              },
              { onConflict: "token" },
            );

          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
          await supabase
            .from("profiles")
            .update({ push_opt_in: true, push_timezone: tz })
            .eq("user_id", userId);

          done({ ok: true });
        } catch (e: any) {
          done({ ok: false, error: e?.message || "error" });
        }
      });

      PushNotifications.addListener("registrationError", (err) => {
        done({ ok: false, error: err?.error || "registration_error" });
      });

      PushNotifications.register().catch((e) => {
        done({ ok: false, error: e?.message || "register_failed" });
      });
    });
  } catch (e: any) {
    return { ok: false, error: e?.message || "error" };
  }
}

// ============================================================
// Web Push (PWA) via VAPID + Service Worker
// ============================================================

const VAPID_PUBLIC_KEY_FALLBACK =
  "BJV2AFTTZYZ88-XMtxCJCAKcxTfV0wfZqO1woI_GrWEM_TgbcCImO1SbKKe4nTiqG224AgAUUBCeM6qPjPnxKfI";

let cachedVapidKey: string | null = null;
async function getServerVapidKey(): Promise<string> {
  if (cachedVapidKey) return cachedVapidKey;
  try {
    const { data, error } = await supabase.functions.invoke("send-push", { body: { mode: "vapid_key" } });
    if (!error && (data as any)?.key) {
      cachedVapidKey = (data as any).key as string;
      return cachedVapidKey;
    }
  } catch {}
  return VAPID_PUBLIC_KEY_FALLBACK;
}

export const VAPID_PUBLIC_KEY = VAPID_PUBLIC_KEY_FALLBACK;
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
  // Native always supports push via Capacitor plugin
  if (isNative()) return true;
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!("PushManager" in window)) return false;
  if (!("Notification" in window)) return false;
  try {
    if (window.self !== window.top) return false;
  } catch {
    return false;
  }
  return true;
}

export function getPushPermission(): NotificationPermission | "unsupported" {
  if (isNative()) {
    // Treat native as "default" until the user runs subscribe; the prompt
    // card will trigger the native permission dialog on tap.
    return "default";
  }
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

export async function subscribeToPush(): Promise<{ ok: boolean; error?: string }> {
  if (isNative()) return registerNativePush();

  if (!isPushSupported()) return { ok: false, error: "unsupported" };

  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return { ok: false, error: "denied" };

    const reg = await navigator.serviceWorker.register(SW_PATH);
    await navigator.serviceWorker.ready;

    const serverKey = await getServerVapidKey();
    const desiredKeyBytes = urlBase64ToUint8Array(serverKey);

    let sub = await reg.pushManager.getSubscription();
    if (sub) {
      const existingKey = arrBufToBase64(sub.options.applicationServerKey as ArrayBuffer | null);
      const desiredKeyB64 = arrBufToBase64(desiredKeyBytes.buffer as ArrayBuffer);
      if (!existingKey || existingKey !== desiredKeyB64) {
        try { await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint); } catch {}
        try { await sub.unsubscribe(); } catch {}
        sub = null;
      }
    }
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: desiredKeyBytes.buffer as ArrayBuffer,
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
  try {
    if (isNative()) {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      try { await PushNotifications.unregister(); } catch {}
      const { data: userResp } = await supabase.auth.getUser();
      if (userResp.user?.id) {
        await supabase.from("native_push_tokens").delete().eq("user_id", userResp.user.id);
        await supabase.from("profiles").update({ push_opt_in: false }).eq("user_id", userResp.user.id);
      }
      return;
    }

    if (!isPushSupported()) return;
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
