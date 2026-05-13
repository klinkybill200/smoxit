# Stripe Webhook: Email Fallback for Customer ID Mismatch

## Problem
When a user pays via Apple Pay (or similar), Stripe may create a new customer ID that doesn't match the `stripe_customer_id` already stored in `profiles`. The current `.eq("stripe_customer_id", customerId)` update silently affects 0 rows, leaving subscription state stale.

## Fix
In `supabase/functions/stripe-webhook/index.ts`, add an email-based fallback after each profile update. If 0 rows update, fetch the customer's email from Stripe and retry the update by email — also writing back the new `stripe_customer_id` so future events match directly.

## Changes

### 1. `syncSubscriptionFromEvent` (around lines 71–85)
Replace the single update with:
- Run the existing `.update(...).eq("stripe_customer_id", customerId)` and request row count via `.select("user_id")`.
- If `data.length === 0`:
  - `const customer = await stripe.customers.retrieve(customerId)`
  - If `!customer.deleted && customer.email`, run a second update with the same payload **plus** `stripe_customer_id: customerId`, matched by `.eq("email", customer.email)`.
  - Log a warning if still no match.

### 2. `handleInvoicePaid` (around lines 95–107)
Apply the same pattern to the subscription-sync update inside this function. The referral conversion block below already looks up by `stripe_customer_id`; after the fallback writes the new ID, that lookup will continue to work — no changes needed there.

### 3. Helper (optional, recommended)
Extract a small helper to avoid duplication:

```ts
async function updateProfileByCustomer(
  customerId: string,
  patch: Record<string, unknown>,
) {
  const { data } = await supaAdmin
    .from("profiles")
    .update(patch)
    .eq("stripe_customer_id", customerId)
    .select("user_id");

  if (data && data.length > 0) return;

  const customer = await stripe.customers.retrieve(customerId);
  if ("deleted" in customer && customer.deleted) return;
  const email = (customer as Stripe.Customer).email;
  if (!email) return;

  await supaAdmin
    .from("profiles")
    .update({ ...patch, stripe_customer_id: customerId })
    .eq("email", email);
}
```

Then call `updateProfileByCustomer(customerId, { subscription_status, subscription_current_period_end, stripe_customer_id: customerId })` in both functions.

## Out of scope
- No schema changes.
- No changes to webhook signature verification, event routing, or referral logic.
- No changes to client code.

## Verification
After deploy: trigger an Apple Pay test checkout that produces a new Stripe customer ID for an existing user, confirm `profiles.subscription_status` flips to `active` and `stripe_customer_id` is updated to the new ID.
