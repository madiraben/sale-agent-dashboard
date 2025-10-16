This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).


## Supabase setup

1) Configure env (already present):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

2) Apply SQL (either via Supabase SQL Editor or CLI):

```sql
-- open `supabase.sql` from project root and run its contents
```

This creates the `products` table, `product_categories` table, `customers`, `orders`, and `order_items` with RLS for authenticated users, plus a public Storage bucket `product-images`.

3) Ensure Authentication is enabled in your Supabase project and you sign in via the app.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## Billing with Stripe

This project ships with a Stripe Billing integration for multi‑tenant SaaS. The billing unit is a tenant (workspace). Users can belong to multiple tenants; access is granted when the tenant is active (paid).

### 1) Environment variables

Add these to your `.env` (test mode while developing):

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_QUARTERLY=price_...
STRIPE_PRICE_YEARLY=price_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...  # from Supabase → Project Settings → API
```

Notes:
- `STRIPE_PRICE_*` are Price IDs created in Stripe Dashboard → Products → Price (e.g., `$20/mo`, `$35/3 months`, `$180/year`). They start with `price_...`.
- `SUPABASE_SERVICE_ROLE_KEY` is used only by the Stripe webhook to update the `tenants` table server‑side (bypassing RLS). Keep it secret; never expose to the browser.

### 2) Start the webhook listener in dev

Install Stripe CLI and run:

```
stripe login
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

Copy the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET` and restart the dev server.

### 3) Plans and Checkout

- Public page `/billing` shows three plans. Clicking a plan calls `POST /api/billing/create-checkout` and redirects to Stripe Checkout.
- On success, the Stripe webhook marks the current tenant as `is_active = true` and records `stripe_customer_id`, `stripe_subscription_id`, `current_period_end`, and `plan`.
- Inactive tenants see a banner inside the dashboard; active tenants have full access (writes are protected by RLS policies that require `tenants.is_active`).

### 4) Managing subscription

- From Profile → "Manage Billing" to open Stripe Customer Portal (update card, cancel, etc.).
- Webhook events (`checkout.session.completed`, `customer.subscription.*`, `invoice.*`) keep `tenants` in sync.

### 5) Testing payments

- Use test card `4242 4242 4242 4242` with any future expiry/CVC and your email.
- Keep Stripe CLI running to forward webhooks.
- Verify in Supabase `public.tenants` that `is_active` flips to true after Checkout.

### 6) Production

- Switch to live keys and live prices. Create a live webhook endpoint in Stripe Dashboard and set its `STRIPE_WEBHOOK_SECRET` in production env.
- Set `NEXT_PUBLIC_APP_URL` to your domain (e.g., `https://your-domain.com`).
- Rotate service role key if it was ever exposed.
