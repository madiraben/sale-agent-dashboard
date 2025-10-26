import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveUserTenant, ensureStripeCustomer } from "@/lib/stripe-helpers";

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    let plan: "monthly" | "quarterly" | "yearly" = "monthly";
    try {
      const body = await req.json().catch(() => ({}));
      if (body?.plan && ["monthly", "quarterly", "yearly"].includes(body.plan)) plan = body.plan;
    } catch {}

    // Resolve current tenant
    const { tenantId, tenant } = await resolveUserTenant(supabase);

    // Ensure Stripe customer exists
    const customerId = await ensureStripeCustomer({
      supabase,
      tenantId,
      existingStripeCustomerId: tenant.stripe_customer_id,
      email: user.email ?? undefined,
    });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    const priceMap: Record<string, string | undefined> = {
      monthly: process.env.STRIPE_PRICE_MONTHLY || process.env.STRIPE_PRICE_PRO,
      quarterly: process.env.STRIPE_PRICE_QUARTERLY,
      yearly: process.env.STRIPE_PRICE_YEARLY,
    };
    const price = priceMap[plan]!;
    if (!price || !price.startsWith("price_")) {
      return NextResponse.json({ error: `Price for plan '${plan}' is not configured` }, { status: 400 });
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const successUrl = `${appUrl}/dashboard?sub=success`;
    const cancelUrl = `${appUrl}/billing?canceled=1`;

    const sessionCheckout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { tenant_id: tenantId },
    });
    return NextResponse.json({ url: sessionCheckout.url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}


