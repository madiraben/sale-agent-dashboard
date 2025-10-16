import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // Resolve current tenant via membership, bootstrap if needed (same pattern as checkout)
    let { data: membership, error: mErr } = await supabase
      .from("user_tenants")
      .select("tenant_id")
      .limit(1)
      .single();
    if (mErr || !membership) {
      if (mErr) return NextResponse.json({ error: "membership_lookup_failed", details: mErr.message }, { status: 400 });
      await (supabase as any).rpc("bootstrap_tenant", { p_name: "My Workspace" });
      const retry = await supabase
        .from("user_tenants")
        .select("tenant_id")
        .limit(1)
        .single();
      membership = retry.data as any;
      if (!membership) return NextResponse.json({ error: "workspace_bootstrap_failed" }, { status: 400 });
    }
    const tenantId = (membership as any).tenant_id as string;

    // Load tenant data
    const { data: tenant, error: tErr } = await supabase
      .from("tenants")
      .select("id, name, stripe_customer_id")
      .eq("id", tenantId)
      .limit(1)
      .single();
    if (tErr) return NextResponse.json({ error: "tenant_lookup_failed", details: tErr.message }, { status: 400 });
    let stripeCustomerId = (tenant as any)?.stripe_customer_id as string | undefined;

    // Ensure Stripe customer exists
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) return NextResponse.json({ error: "stripe_secret_missing" }, { status: 500 });
    const stripe = new Stripe(secret);
    if (!stripeCustomerId) {
      const c = await stripe.customers.create({
        email: session.user?.email ?? undefined,
        name: (tenant as any)?.name ?? undefined,
        metadata: { tenant_id: tenantId },
      });
      stripeCustomerId = c.id;
      await supabase.from("tenants").update({ stripe_customer_id: stripeCustomerId }).eq("id", tenantId);
    }

    const returnUrl = process.env.STRIPE_PORTAL_RETURN_URL ?? `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/billing`;

    // Ensure a portal configuration exists (Stripe requires a default or explicit configuration)
    let configurationId: string | undefined;
    try {
      const configs = await stripe.billingPortal.configurations.list({ active: true, limit: 1 });
      if (configs.data.length > 0) {
        configurationId = configs.data[0].id;
      } else {
        const created = await stripe.billingPortal.configurations.create({
          default_return_url: returnUrl,
          // Minimal features commonly used in SaaS portals
          features: {
            invoice_history: { enabled: true },
            payment_method_update: { enabled: true },
            subscription_cancel: { enabled: true, mode: "at_period_end" },
          } as any,
        });
        configurationId = created.id;
      }
    } catch (e: any) {
      // If creating/fetching configuration fails, we will attempt session without it
    }

    const sessionParams: any = { customer: stripeCustomerId, return_url: returnUrl };
    if (configurationId) sessionParams.configuration = configurationId;
    const portal = await stripe.billingPortal.sessions.create(sessionParams);
    return NextResponse.json({ url: portal.url });
  } catch (e: any) {
    return NextResponse.json({ error: "unhandled", details: e?.message ?? "Failed" }, { status: 500 });
  }
}


