import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    let plan: "monthly" | "quarterly" | "yearly" = "monthly";
    try {
      const body = await req.json().catch(() => ({}));
      if (body?.plan && ["monthly", "quarterly", "yearly"].includes(body.plan)) plan = body.plan;
    } catch {}

    const { data: tenant } = await supabase.from("tenants").select("id, stripe_customer_id").limit(1).single();
    const tenantId = (tenant as any)?.id as string;
    const stripeCustomerId = (tenant as any)?.stripe_customer_id as string | undefined;

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    let customerId = stripeCustomerId;
    if (!customerId) {
      const c = await stripe.customers.create({
        email: session.user.email ?? undefined,
        metadata: { tenant_id: tenantId },
      });
      customerId = c.id;
      await supabase.from("tenants").update({ stripe_customer_id: customerId }).eq("id", tenantId);
    }

    const priceMap: Record<string, string | undefined> = {
      monthly: process.env.STRIPE_PRICE_MONTHLY || process.env.STRIPE_PRICE_PRO,
      quarterly: process.env.STRIPE_PRICE_QUARTERLY,
      yearly: process.env.STRIPE_PRICE_YEARLY,
    };
    const price = priceMap[plan]!;
    if (!price || !price.startsWith("price_")) {
      return NextResponse.json({ error: `Price for plan '${plan}' is not configured` }, { status: 400 });
    }
    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard?sub=success`;
    const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/billing?canceled=1`;

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


