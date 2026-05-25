// RevenueCat webhook → mirrors Apple/Google subscription state into profiles.
// Configure in RevenueCat → Project → Integrations → Webhooks:
//   URL:  https://<project-ref>.functions.supabase.co/revenuecat-webhook
//   Auth header value: same as the REVENUECAT_WEBHOOK_AUTH secret below.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ACTIVE_EVENTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "PRODUCT_CHANGE",
  "UNCANCELLATION",
  "TEMPORARY_ENTITLEMENT_GRANT",
]);
const INACTIVE_EVENTS = new Set([
  "CANCELLATION",
  "EXPIRATION",
  "SUBSCRIPTION_PAUSED",
  "BILLING_ISSUE",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const expected = Deno.env.get("REVENUECAT_WEBHOOK_AUTH");
    if (expected) {
      const got = req.headers.get("authorization") ?? req.headers.get("Authorization");
      if (got !== expected) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json();
    const event = body?.event ?? body;
    const type: string = event?.type ?? "";
    const appUserId: string | undefined =
      event?.app_user_id ?? event?.original_app_user_id;
    const expirationMs: number | undefined = event?.expiration_at_ms;

    console.log("revenuecat-webhook", { type, appUserId, expirationMs });

    if (!appUserId) {
      return new Response(JSON.stringify({ ok: true, skipped: "no app_user_id" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let nextStatus: string | null = null;
    if (ACTIVE_EVENTS.has(type)) nextStatus = "active";
    else if (INACTIVE_EVENTS.has(type)) {
      nextStatus = type === "BILLING_ISSUE" ? "past_due" : "canceled";
    }

    if (nextStatus) {
      const updates: Record<string, unknown> = { subscription_status: nextStatus };
      if (expirationMs) {
        updates.subscription_current_period_end = new Date(expirationMs).toISOString();
      }
      const { error } = await supabase.from("profiles").update(updates).eq("user_id", appUserId);
      if (error) console.error("profiles update failed", error);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("revenuecat-webhook error", e);
    const msg = e instanceof Error ? e.message : "unknown";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
