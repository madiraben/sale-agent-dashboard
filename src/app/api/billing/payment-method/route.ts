import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { data: tenant } = await supabase
      .from("tenants")
      .select("stripe_customer_id")
      .limit(1)
      .single();

    const customerId = (tenant as any)?.stripe_customer_id as string | undefined;
    if (!customerId) return NextResponse.json({ paymentMethod: null });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const pms = await stripe.paymentMethods.list({ customer: customerId, type: "card" });
    const pm = pms.data[0];
    if (!pm || pm.card == null) return NextResponse.json({ paymentMethod: null });
    const { brand, last4, exp_month, exp_year } = pm.card;
    return NextResponse.json({ paymentMethod: { brand, last4, exp_month, exp_year } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}


