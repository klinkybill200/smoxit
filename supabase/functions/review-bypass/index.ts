// Apple App Review bypass: provisions a fixed review account (idempotent)
// so the client can sign in with a hardcoded password. ONLY accepts the
// specific review email + code combination.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const REVIEW_EMAIL = "review@smoxit.app";
const REVIEW_CODE = "12345678";
const REVIEW_PASSWORD = "AppleReview!2025Smoxit#bypass";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, code } = await req.json();
    if (
      typeof email !== "string" ||
      typeof code !== "string" ||
      email.trim().toLowerCase() !== REVIEW_EMAIL ||
      code.trim() !== REVIEW_CODE
    ) {
      return new Response(JSON.stringify({ error: "not_authorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Find or create the user
    let userId: string | null = null;
    const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const found = existing?.users?.find((u) => u.email?.toLowerCase() === REVIEW_EMAIL);

    if (found) {
      userId = found.id;
      // Make sure the password matches the hardcoded one
      await admin.auth.admin.updateUserById(userId, {
        password: REVIEW_PASSWORD,
        email_confirm: true,
      });
    } else {
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email: REVIEW_EMAIL,
        password: REVIEW_PASSWORD,
        email_confirm: true,
      });
      if (cErr || !created.user) throw cErr ?? new Error("create_user_failed");
      userId = created.user.id;
    }

    // Reset reviewer account so they go through full onboarding each review cycle.
    // subscription_status flips to "active" only AFTER onboarding completes
    // (handled client-side in src/lib/store.tsx).
    await admin.from("profiles").upsert(
      {
        user_id: userId,
        email: REVIEW_EMAIL,
        subscription_status: "trialing",
        onboarding_completed: false,
        trial_start: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    // Wipe any prior user_data so onboarding runs fresh
    await admin.from("user_data").delete().eq("user_id", userId);

    return new Response(JSON.stringify({ ok: true, password: REVIEW_PASSWORD }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
