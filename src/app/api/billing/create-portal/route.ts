import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { data: tenant } = await supabase.from("tenants").select("id, stripe_customer_id").limit(1).single();
    const stripeCustomerId = (tenant as any)?.stripe_customer_id as string | undefined;
    if (!stripeCustomerId) return NextResponse.json({ error: "No customer" }, { status: 400 });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const returnUrl = process.env.STRIPE_PORTAL_RETURN_URL ?? `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/billing`;
    const portal = await stripe.billingPortal.sessions.create({ customer: stripeCustomerId, return_url: returnUrl });
    return NextResponse.json({ url: portal.url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}


