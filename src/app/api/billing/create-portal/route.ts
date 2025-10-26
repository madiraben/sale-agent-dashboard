import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveUserTenant, ensureStripeCustomer } from "@/lib/stripe-helpers";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // Resolve current tenant
    const { tenantId, tenant } = await resolveUserTenant(supabase);

    // Ensure Stripe customer exists
    const stripeCustomerId = await ensureStripeCustomer({
      supabase,
      tenantId,
      existingStripeCustomerId: tenant.stripe_customer_id,
      email: session.user?.email ?? undefined,
      name: tenant.name ?? undefined,
    });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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


