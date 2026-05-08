// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version",
};

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = "https://my.smoxit.app";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
}

const POOL = {
  daily_morning: [
    { title: "Day starts now 💪", body: "Open SMOXIT and grab your daily XP." },
    { title: "Good morning, fighter", body: "Log your mood and keep the streak alive." },
    { title: "Today's challenge awaits", body: "Tap to claim your daily mission." },
    { title: "Your future-self says hi 👋", body: "5 sec to log your check-in." },
    { title: "Rise. Breathe. Win.", body: "Day one of the rest of your life — again." },
  ],
  daily_evening: [
    { title: "Don't break the streak 🔥", body: "Quick mood check before bed?" },
    { title: "One more habit win", body: "Log your day and earn XP." },
    { title: "End the day strong", body: "Tap for tonight's reflection." },
    { title: "Sleep proud tonight 😴", body: "You stayed smoke-free. Log it." },
  ],
  craving_window: [
    { title: "Craving incoming?", body: "Open the breathing tool. 60 sec, you've got this." },
    { title: "Beat the urge", body: "Tap for a 4-4-4 reset." },
    { title: "Talk to your AI Coach", body: "One message can ride the wave out." },
  ],
  daily_mood: [
    { title: "How do you feel today? 💚", body: "Log your mood in 5 seconds and earn XP." },
    { title: "Mood check-in", body: "One tap. Track your progress." },
    { title: "Quick reflection", body: "Rate today's mood and keep your streak alive." },
    { title: "Your mind matters 🧠", body: "Take 5 sec for today's mood log." },
  ],
  weekly_lung: [
    { title: "Lung capacity check 🫁", body: "Time for your weekly breath-hold test!" },
    { title: "How strong are your lungs?", body: "Log this week's breath hold and watch the curve grow." },
    { title: "Weekly lung test 💨", body: "30 seconds: hold your breath, track the win." },
  ],
  streak_risk: [
    { title: "Your streak is in danger ⚠️", body: "Open SMOXIT now — one tap saves it." },
    { title: "Don't lose what you built 🔥", body: "A check-in keeps your streak alive." },
    { title: "We miss you 💚", body: "It's been a while. Your future-self is watching." },
  ],
  money_milestone: [
    { title: "Cha-ching! 💰", body: "You've saved enough for something real. Open SMOXIT." },
    { title: "Money milestone unlocked", body: "See how much you've kept in your pocket." },
  ],
  squad_nudge: [
    { title: "Your squad is active 👥", body: "New messages waiting. Drop by and say hi." },
    { title: "Squad activity 💬", body: "Don't leave your crew hanging — tap in." },
  ],
};


function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function base64UrlToBytes(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function jsonToBase64Url(value: Record<string, unknown>): string {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}

function derEcdsaToRaw(signature: Uint8Array): Uint8Array {
  if (signature.length === 64) return signature;
  let offset = 0;
  if (signature[offset++] !== 0x30) throw new Error("Invalid ECDSA signature");
  const seqLen = signature[offset++];
  if (seqLen + offset !== signature.length) throw new Error("Invalid ECDSA signature length");
  if (signature[offset++] !== 0x02) throw new Error("Invalid ECDSA r marker");
  const rLen = signature[offset++];
  const r = signature.slice(offset, offset + rLen);
  offset += rLen;
  if (signature[offset++] !== 0x02) throw new Error("Invalid ECDSA s marker");
  const sLen = signature[offset++];
  const s = signature.slice(offset, offset + sLen);

  const normalize = (part: Uint8Array) => {
    let p = part;
    while (p.length > 32 && p[0] === 0) p = p.slice(1);
    if (p.length > 32) throw new Error("Invalid ECDSA signature part");
    const out = new Uint8Array(32);
    out.set(p, 32 - p.length);
    return out;
  };

  const out = new Uint8Array(64);
  out.set(normalize(r), 0);
  out.set(normalize(s), 32);
  return out;
}

async function createVapidAuthorization(endpoint: string): Promise<string> {
  const aud = new URL(endpoint).origin;
  const publicBytes = base64UrlToBytes(VAPID_PUBLIC_KEY);
  const privateBytes = base64UrlToBytes(VAPID_PRIVATE_KEY);
  if (publicBytes.length !== 65 || publicBytes[0] !== 0x04 || privateBytes.length !== 32) {
    throw new Error("Invalid VAPID key format");
  }

  const b64 = (bytes: Uint8Array) => bytesToBase64Url(bytes);
  const key = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      x: b64(publicBytes.slice(1, 33)),
      y: b64(publicBytes.slice(33, 65)),
      d: b64(privateBytes),
      ext: false,
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const header = jsonToBase64Url({ typ: "JWT", alg: "ES256" });
  const payload = jsonToBase64Url({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, sub: VAPID_SUBJECT });
  const signingInput = `${header}.${payload}`;
  const signature = derEcdsaToRaw(new Uint8Array(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(signingInput),
  )));

  return `vapid t=${signingInput}.${bytesToBase64Url(signature)}, k=${VAPID_PUBLIC_KEY}`;
}

async function sendWebPush(subscription: { endpoint: string; keys: { p256dh: string; auth: string } }, payload: string) {
  const details = (webpush as any).generateRequestDetails(subscription, payload, { vapidDetails: null, TTL: 2419200 });
  const headers = new Headers();
  for (const [key, value] of Object.entries(details.headers ?? {})) {
    if (key.toLowerCase() !== "content-length") headers.set(key, String(value));
  }
  headers.set("Authorization", await createVapidAuthorization(subscription.endpoint));

  const res = await fetch(details.endpoint, {
    method: details.method || "POST",
    headers,
    body: details.body ?? undefined,
  });
  if (!res.ok) {
    const err: any = new Error(`Push service responded ${res.status}`);
    err.statusCode = res.status;
    err.body = await res.text().catch(() => "");
    throw err;
  }
}

async function sendToUser(userId: string, payload: PushPayload): Promise<{ sent: number; cleaned: number }> {
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error || !subs || subs.length === 0) return { sent: 0, cleaned: 0 };

  let sent = 0;
  let cleaned = 0;
  for (const s of subs) {
    try {
      await sendWebPush(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
      );
      sent++;
    } catch (e: any) {
      const code = e?.statusCode;
      const bodyStr = typeof e?.body === "string" ? e.body : JSON.stringify(e?.body || {});
      const isBadJwt = code === 403 && bodyStr.includes("BadJwtToken");
      if (code === 404 || code === 410 || isBadJwt) {
        await supabase.from("push_subscriptions").delete().eq("id", s.id);
        cleaned++;
        console.log("cleaned stale sub", s.id, code, isBadJwt ? "BadJwtToken" : "");
      } else {
        console.error("push error", code, bodyStr);
      }
    }
  }
  return { sent, cleaned };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Public: return current VAPID public key so client always matches server.
  const _url = new URL(req.url);
  const _bodyPreview = req.method === "POST" ? await req.clone().json().catch(() => ({})) : {};
  const _mode = (_bodyPreview as any)?.mode || _url.searchParams.get("mode");
  if (_mode === "vapid_key") {
    return new Response(JSON.stringify({ key: VAPID_PUBLIC_KEY }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  if (_mode === "vapid_check") {
    // Derive public key from private key and compare to stored public key.
    try {
      const b64urlToBytes = (s: string) => {
        const pad = "=".repeat((4 - (s.length % 4)) % 4);
        const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
        const bin = atob(b64);
        const out = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return out;
      };
      const bytesToB64Url = (buf: ArrayBuffer) => {
        const bytes = new Uint8Array(buf);
        let bin = "";
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      };
      const d = b64urlToBytes(VAPID_PRIVATE_KEY);
      const pubBytes = b64urlToBytes(VAPID_PUBLIC_KEY); // 65 bytes: 0x04 || X(32) || Y(32)
      if (pubBytes.length !== 65 || pubBytes[0] !== 0x04) {
        return new Response(JSON.stringify({ ok: false, reason: "public_key_format", publicLen: pubBytes.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const x = bytesToB64Url(pubBytes.slice(1, 33).buffer);
      const y = bytesToB64Url(pubBytes.slice(33, 65).buffer);
      const dB64 = bytesToB64Url(d.buffer);
      const jwk = { kty: "EC", crv: "P-256", x, y, d: dB64, ext: true } as JsonWebKey;
      const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]);
      const exported = await crypto.subtle.exportKey("jwk", key) as JsonWebKey;
      const publicKey = await crypto.subtle.importKey(
        "jwk",
        { kty: "EC", crv: "P-256", x, y, ext: true } as JsonWebKey,
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["verify"],
      );
      const probe = new TextEncoder().encode("vapid-key-pair-check");
      const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, probe);
      const keyPairMatches = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, publicKey, sig, probe);
      const ok = exported.x === x && exported.y === y && keyPairMatches;
      return new Response(JSON.stringify({ ok, keyPairMatches, derivedX: exported.x, storedX: x, derivedY: exported.y, storedY: y }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (e: any) {
      return new Response(JSON.stringify({ ok: false, error: e?.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  }

  try {
    const url = new URL(req.url);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const mode: string = body.mode || url.searchParams.get("mode") || "test";

    // Direct test send to a specific user
    if (mode === "test") {
      const userId: string | undefined = body.user_id;
      if (!userId) return new Response(JSON.stringify({ error: "user_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const result = await sendToUser(userId, {
        title: body.title || "SMOXIT test",
        body: body.body || "Push works! 🚀",
        url: body.url || "/",
      });
      return new Response(JSON.stringify({ ok: true, ...result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Cron: bulk push modes (rate-limited per profile.last_push_sent_at)
    // Triggered hourly by cron. We fan out only to users whose LOCAL time
    // (profiles.push_timezone) matches the desired hour/weekday for that mode.
    if (
      mode === "daily_morning" ||
      mode === "daily_evening" ||
      mode === "daily_mood" ||
      mode === "weekly_lung" ||
      mode === "craving_window"
    ) {
      const pool = POOL[mode as keyof typeof POOL];

      // Local-time targeting per mode (hours: array of local hours when this fires)
      const TARGET: Record<string, { hours: number[]; weekday?: number }> = {
        daily_morning: { hours: [8] },
        daily_evening: { hours: [20] },
        daily_mood: { hours: [17] },
        weekly_lung: { hours: [16], weekday: 0 },
        // Common craving peaks: late morning, after lunch, evening wind-down
        craving_window: { hours: [11, 15, 21] },
      };
      const target = TARGET[mode];

      // Rate-limit window per mode
      const minHours = mode === "weekly_lung" ? 20 : mode === "craving_window" ? 3 : 6;
      const cutoff = new Date(Date.now() - minHours * 3600 * 1000).toISOString();

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, last_push_sent_at, push_timezone")
        .eq("push_opt_in", true)
        .or(`last_push_sent_at.is.null,last_push_sent_at.lt.${cutoff}`)
        .limit(2000);

      const now = new Date();
      const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

      function localMatches(tz: string | null): boolean {
        const zone = tz || "UTC";
        try {
          const fmt = new Intl.DateTimeFormat("en-US", {
            timeZone: zone,
            hour: "numeric",
            hour12: false,
            weekday: "short",
          });
          const parts = fmt.formatToParts(now);
          const hourStr = parts.find((p) => p.type === "hour")?.value ?? "";
          const wdStr = parts.find((p) => p.type === "weekday")?.value ?? "";
          const hour = parseInt(hourStr, 10) % 24;
          if (!target.hours.includes(hour)) return false;
          if (target.weekday !== undefined && WD[target.weekday] !== wdStr) return false;
          return true;
        } catch {
          return false;
        }
      }

      const eligible = (profiles ?? []).filter((p) => localMatches(p.push_timezone));

      let total = 0;
      for (const p of eligible) {
        const msg = pick(pool);
        const r = await sendToUser(p.user_id, { ...msg, url: "/" });
        if (r.sent > 0) {
          total += r.sent;
          await supabase.from("profiles").update({ last_push_sent_at: new Date().toISOString() }).eq("user_id", p.user_id);
        }
      }
      return new Response(JSON.stringify({ ok: true, mode, candidates: profiles?.length ?? 0, eligible: eligible.length, sent: total }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Streak risk: users opted in but inactive (no push in 36h)
    if (mode === "streak_risk") {
      const cutoff = new Date(Date.now() - 36 * 3600 * 1000).toISOString();
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, last_push_sent_at")
        .eq("push_opt_in", true)
        .or(`last_push_sent_at.is.null,last_push_sent_at.lt.${cutoff}`)
        .limit(2000);

      let total = 0;
      for (const p of (profiles ?? [])) {
        const msg = pick(POOL.streak_risk);
        const r = await sendToUser(p.user_id, { ...msg, url: "/", tag: "streak_risk" });
        if (r.sent > 0) {
          total += r.sent;
          await supabase.from("profiles").update({ last_push_sent_at: new Date().toISOString() }).eq("user_id", p.user_id);
        }
      }
      return new Response(JSON.stringify({ ok: true, mode, candidates: profiles?.length ?? 0, sent: total }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Event: squad message — notify other squad members
    if (mode === "squad_message") {
      const squadId: string | undefined = body.squad_id;
      const sender: string | undefined = body.sender_user_id;
      const preview: string = (body.preview || "").slice(0, 80);
      if (!squadId || !sender) {
        return new Response(JSON.stringify({ error: "squad_id and sender_user_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: members } = await supabase
        .from("squad_members")
        .select("user_id")
        .eq("squad_id", squadId);

      const { data: squad } = await supabase.from("squads").select("name").eq("id", squadId).maybeSingle();
      const squadName = squad?.name || "Your squad";

      const { data: senderProfile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", sender)
        .maybeSingle();
      const senderName = (senderProfile as any)?.display_name || "Someone";

      let total = 0;
      let targets = (members ?? []).map((m) => m.user_id).filter((id) => id !== sender);

      // Exclude users who muted this squad
      const { data: mutes } = await supabase
        .from("squad_mutes")
        .select("user_id")
        .eq("squad_id", squadId);
      const mutedSet = new Set((mutes ?? []).map((m: any) => m.user_id));
      targets = targets.filter((id) => !mutedSet.has(id));

      for (const uid of targets) {
        const { data: prof } = await supabase.from("profiles").select("push_opt_in").eq("user_id", uid).maybeSingle();
        if (!prof?.push_opt_in) continue;
        const r = await sendToUser(uid, {
          title: `${senderName} in ${squadName} 💬`,
          body: preview || "New message in your squad",
          url: "/",
          tag: `squad-${squadId}`,
        });
        if (r.sent > 0) total += r.sent;
      }
      return new Response(JSON.stringify({ ok: true, sent: total }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Milestone push: { mode: "milestone", user_id, title, body }
    if (mode === "milestone") {
      const userId: string | undefined = body.user_id;
      if (!userId) return new Response(JSON.stringify({ error: "user_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const r = await sendToUser(userId, {
        title: body.title || "Milestone unlocked! 🏆",
        body: body.body || "Open SMOXIT to celebrate.",
        url: "/",
        tag: "milestone",
      });
      return new Response(JSON.stringify({ ok: true, ...r }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "unknown mode" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message || "error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
