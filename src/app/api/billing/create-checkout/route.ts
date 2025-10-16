import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

    // Resolve current tenant via membership
    let { data: membership, error: mErr } = await supabase
      .from("user_tenants")
      .select("tenant_id")
      .limit(1)
      .single();
    if (mErr || !membership) {
      // Auto-bootstrap a workspace for this user if none exists yet
      await (supabase as any).rpc("bootstrap_tenant", { p_name: "My Workspace" });
      const retry = await supabase
        .from("user_tenants")
        .select("tenant_id")
        .limit(1)
        .single();
      membership = retry.data as any;
      if (!membership) return NextResponse.json({ error: "No workspace found for user" }, { status: 400 });
    }
    const tenantId = (membership as any).tenant_id as string;
    const { data: tenant } = await supabase
      .from("tenants")
      .select("stripe_customer_id")
      .eq("id", tenantId)
      .limit(1)
      .single();
    const stripeCustomerId = (tenant as any)?.stripe_customer_id as string | undefined;

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    let customerId = stripeCustomerId;
    if (!customerId) {
      const c = await stripe.customers.create({
        email: user.email ?? undefined,
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


