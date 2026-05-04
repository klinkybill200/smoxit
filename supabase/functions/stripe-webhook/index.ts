import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-11-20.acacia" });
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const supaAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("no sig", { status: 400 });
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (e) {
    console.error("invalid webhook", e);
    return new Response(`bad sig: ${e instanceof Error ? e.message : "?"}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscriptionFromEvent(event);
        break;
      }
      case "invoice.payment_succeeded": {
        await handleInvoicePaid(event);
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const customerId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
        if (customerId) {
          await supaAdmin.from("profiles").update({ subscription_status: "past_due" }).eq("stripe_customer_id", customerId);
        }
        break;
      }
    }
    return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("webhook handler error", e);
    return new Response("handler error", { status: 500 });
  }
});

async function syncSubscriptionFromEvent(event: Stripe.Event) {
  let customerId: string | null = null;
  let subId: string | null = null;

  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session;
    customerId = typeof s.customer === "string" ? s.customer : s.customer?.id ?? null;
    subId = typeof s.subscription === "string" ? s.subscription : s.subscription?.id ?? null;
  } else {
    const sub = event.data.object as Stripe.Subscription;
    customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    subId = sub.id;
  }
  if (!customerId) return;

  let status = "canceled";
  let periodEnd: string | null = null;
  if (subId) {
    const sub = await stripe.subscriptions.retrieve(subId);
    status = sub.status; // active, past_due, canceled, trialing, etc.
    periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
  }

  await supaAdmin
    .from("profiles")
    .update({
      subscription_status: status,
      subscription_current_period_end: periodEnd,
      stripe_customer_id: customerId,
    })
    .eq("stripe_customer_id", customerId);
}

async function handleInvoicePaid(event: Stripe.Event) {
  const inv = event.data.object as Stripe.Invoice;
  const customerId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
  if (!customerId) return;

  // Sync subscription state (covers renewal too)
  if (inv.subscription) {
    const subId = typeof inv.subscription === "string" ? inv.subscription : inv.subscription.id;
    const sub = await stripe.subscriptions.retrieve(subId);
    await supaAdmin
      .from("profiles")
      .update({
        subscription_status: sub.status,
        subscription_current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
      })
      .eq("stripe_customer_id", customerId);
  }

  // Referral conversion: only on FIRST paid invoice for a referred user
  if (inv.billing_reason !== "subscription_create") return;

  const { data: referredProfile } = await supaAdmin
    .from("profiles")
    .select("user_id, referred_by")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (!referredProfile?.referred_by) return;

  // Find referrer by referral_code
  const { data: referrer } = await supaAdmin
    .from("profiles")
    .select("user_id, stripe_customer_id, referral_credits, email")
    .eq("referral_code", referredProfile.referred_by)
    .maybeSingle();
  if (!referrer || referrer.user_id === referredProfile.user_id) return;

  // Idempotency: only convert if not already converted
  const { data: existingRef } = await supaAdmin
    .from("referrals")
    .select("id, status")
    .eq("referred_user_id", referredProfile.user_id)
    .maybeSingle();

  if (existingRef?.status === "converted") return;

  if (existingRef) {
    await supaAdmin
      .from("referrals")
      .update({ status: "converted", converted_at: new Date().toISOString() })
      .eq("id", existingRef.id);
  } else {
    await supaAdmin.from("referrals").insert({
      referrer_user_id: referrer.user_id,
      referred_user_id: referredProfile.user_id,
      referral_code: referredProfile.referred_by,
      status: "converted",
      converted_at: new Date().toISOString(),
    });
  }

  // Apply $5 credit to referrer's Stripe customer balance
  if (referrer.stripe_customer_id) {
    try {
      // Negative balance = credit owed to customer (reduces next invoice)
      await stripe.customers.createBalanceTransaction(referrer.stripe_customer_id, {
        amount: -500, // -$5.00 in cents
        currency: "usd",
        description: `Referral credit — invited ${referredProfile.user_id}`,
      });
    } catch (e) {
      console.error("could not create balance transaction", e);
    }
  }

  await supaAdmin
    .from("profiles")
    .update({ referral_credits: (referrer.referral_credits ?? 0) + 1 })
    .eq("user_id", referrer.user_id);
}
