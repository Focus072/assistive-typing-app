# Testing Stripe payments with test cards

Test credit cards **only work in Stripe test mode**. Use test API keys and test Price IDs.

## 1. Turn on Stripe test mode

1. Open [Stripe Dashboard](https://dashboard.stripe.com).
2. Toggle **Test mode** (top right) so it’s **on** (orange).
3. Go to **Developers → API keys** and copy:
   - **Secret key** (starts with `sk_test_`).

## 2. Create test products and prices

1. In test mode, go to **Product catalog**.
2. Create products for Basic, Pro, Unlimited (or use existing test products).
3. Add a **recurring** price to each (e.g. $5, $10, $15/month).
4. Copy each **Price ID** (e.g. `price_1ABC...`).

## 3. Use test keys locally

In `.env.local` (for local runs only), point to **test** keys and **test** Price IDs:

```env
# Test mode – for testing with test cards only
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxx   # from Developers → Webhooks (add endpoint, use test signing secret)
STRIPE_BASIC_PRICE_ID=price_xxxx   # test Basic price ID
STRIPE_PRO_PRICE_ID=price_xxxx     # test Pro price ID
STRIPE_UNLIMITED_PRICE_ID=price_xxxx  # test Unlimited price ID
```

Restart the dev server, then go to your app and start a checkout. Stripe Checkout will open in **test** mode.

## 4. Test card numbers (Stripe docs)

Use these in the Stripe Checkout form when testing:

| Use case        | Card number           |
|-----------------|-----------------------|
| **Success**     | `4242 4242 4242 4242` |
| **Decline**     | `4000 0000 0000 0002` |
| **3D Secure**   | `4000 0025 0000 3155` |

- **Expiry:** any future date (e.g. 12/34)  
- **CVC:** any 3 digits (e.g. 123)  
- **ZIP:** any valid value  

More: [Stripe test cards](https://docs.stripe.com/testing#cards)

## 5. Test the full backend flow

1. Run the app locally with the test env vars above.
2. Sign in (Google).
3. On pricing, click **Get started** for a plan.
4. On Stripe Checkout, enter `4242 4242 4242 4242` and complete the form.
5. After payment, you should be redirected to `/dashboard?checkout=success`.
6. In Stripe Dashboard (test mode), check **Payments** and **Customers** to confirm the subscription and webhook events (if you configured a webhook).

## 6. Switching back to live

For production or real payments, set `.env.local` (or Vercel env) back to **live** keys and **live** Price IDs (`sk_live_...` and your live price IDs). Never use test cards with live keys.

---

## 7. Webhook: link payments to your database

When a customer pays, Stripe sends a `checkout.session.completed` event to your app. Your app then updates the user’s plan in the DB. **If the webhook isn’t set up, the payment succeeds in Stripe but the user stays on FREE in your app.**

You need **two** webhook setups: one for production (Stripe Dashboard) and one for local dev (Stripe CLI).

### Endpoint URLs

| Environment | Endpoint URL |
|-------------|--------------|
| **Production** | `https://typingisboring.com/api/webhooks/stripe` |
| **Local** | `http://localhost:3002/api/webhooks/stripe` (via Stripe CLI, see below) |

### Set up the webhook (production)

1. **Stripe Dashboard** → **Developers** → **Webhooks** → **Add endpoint**.
2. **Endpoint URL:** `https://typingisboring.com/api/webhooks/stripe`
3. **Events to send:** at least `checkout.session.completed`. Optionally add `customer.subscription.updated` and `customer.subscription.deleted`.
4. After creating the endpoint, open it and copy the **Signing secret** (starts with `whsec_`).
5. In **Vercel** → your project → **Settings** → **Environment Variables**, set:
   - `STRIPE_WEBHOOK_SECRET` = that signing secret (for **Production**).
6. Redeploy so the new env is used.

Stripe will then POST to your app after each successful checkout; your route will update the user’s `planTier` and `subscriptionStatus`.

### Set up the webhook (local / localhost:3002)

Stripe cannot reach `localhost` directly. Use the **Stripe CLI** to forward webhook events to your app:

1. **Install Stripe CLI:** [Stripe CLI docs](https://docs.stripe.com/stripe-cli) (e.g. `winget install Stripe.StripeCLI` on Windows, or download from GitHub).
2. **Log in:** `stripe login` (one-time).
3. **Forward to localhost:** run:
   ```bash
   stripe listen --forward-to localhost:3002/api/webhooks/stripe
   ```
4. The CLI will print a **webhook signing secret** (e.g. `whsec_...`). Copy it.
5. In `.env.local`, set:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxx   # the secret from stripe listen
   ```
6. Keep the CLI running while you test. With your dev server on port 3002, Stripe events will be forwarded to `http://localhost:3002/api/webhooks/stripe` and your DB will update after test checkouts.

Use the **production** signing secret in Vercel; use the **CLI** secret only in `.env.local` for local testing.

### Payment already succeeded but DB not updated

If someone paid before the webhook was configured (or the webhook failed), run the sync script so the DB matches Stripe:

```bash
npx tsx scripts/sync-stripe-subscription.ts galaljobah@gmail.com
```

This finds the Stripe customer and active subscription for that email and updates the user in your database. Then run `npx tsx scripts/check-user-plan.ts galaljobah@gmail.com` to confirm.
