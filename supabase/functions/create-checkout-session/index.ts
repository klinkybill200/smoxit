import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-11-20.acacia" });
    const priceUsd = Deno.env.get("STRIPE_PRICE_ID")!; // existing = USD
    const priceEur = Deno.env.get("STRIPE_PRICE_ID_EUR") ?? priceUsd;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "no auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supaUser = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await supaUser.auth.getUser();
    if (userErr || !user?.email) return new Response(JSON.stringify({ error: "auth failed" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supaAdmin = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await supaAdmin
      .from("profiles")
      .select("stripe_customer_id, referred_by, referral_code, preferred_currency")
      .eq("user_id", user.id)
      .maybeSingle();

    const currency: "eur" | "usd" = profile?.preferred_currency === "eur" ? "eur" : "usd";
    const priceId = currency === "eur" ? priceEur : priceUsd;

    // Find or create Stripe customer
    let customerId = profile?.stripe_customer_id ?? null;
    if (!customerId) {
      const existing = await stripe.customers.list({ email: user.email, limit: 1 });
      if (existing.data.length > 0) {
        customerId = existing.data[0].id;
      } else {
        const created = await stripe.customers.create({
          email: user.email,
          metadata: { user_id: user.id, referral_code: profile?.referral_code ?? "" },
        });
        customerId = created.id;
      }
      await supaAdmin.from("profiles").update({ stripe_customer_id: customerId }).eq("user_id", user.id);
    }

    const origin = req.headers.get("origin") ?? "https://my.smoxit.app";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancel`,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { user_id: user.id, referred_by: profile?.referred_by ?? "" },
      },
      metadata: { user_id: user.id, referred_by: profile?.referred_by ?? "" },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-checkout-session error", e);
    const msg = e instanceof Error ? e.message : "unknown";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
