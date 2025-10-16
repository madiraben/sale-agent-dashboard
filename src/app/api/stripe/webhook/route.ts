import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  let evt: Stripe.Event;
  try {
    evt = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Invalid signature" }, { status: 400 });
  }

  // Use service role to bypass RLS for trusted webhook updates
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  async function activate(sub: Stripe.Subscription) {
    const customerId = sub.customer as string;
    // Some Stripe TS versions don't expose current_period_end on the type - access via any
    const currentPeriodEnd = new Date(((sub as any).current_period_end as number) * 1000).toISOString();
    const priceId = sub.items.data[0]?.price?.id;
    const nickname = sub.items.data[0]?.price?.nickname || "";
    let planSlug: string = "unknown";
    if (priceId) {
      if (process.env.STRIPE_PRICE_MONTHLY && priceId === process.env.STRIPE_PRICE_MONTHLY) planSlug = "monthly";
      else if (process.env.STRIPE_PRICE_QUARTERLY && priceId === process.env.STRIPE_PRICE_QUARTERLY) planSlug = "quarterly";
      else if (process.env.STRIPE_PRICE_YEARLY && priceId === process.env.STRIPE_PRICE_YEARLY) planSlug = "yearly";
    }
    if (planSlug === "unknown" && nickname) {
      const n = nickname.toLowerCase();
      if (n.includes("month")) planSlug = "monthly";
      else if (n.includes("quarter") || n.includes("3")) planSlug = "quarterly";
      else if (n.includes("year") || n.includes("annual")) planSlug = "yearly";
    }
    const plan = planSlug !== "unknown" ? planSlug : (nickname || priceId || "pro");
    await admin
      .from("tenants")
      .update({
        stripe_subscription_id: sub.id,
        stripe_customer_id: customerId,
        plan,
        current_period_end: currentPeriodEnd,
        is_active: sub.status === "active" || sub.status === "trialing",
        billing_provider: "stripe",
      })
      .eq("stripe_customer_id", customerId);
  }

  async function deactivate(customerId: string) {
    await admin
      .from("tenants")
      .update({ is_active: false })
      .eq("stripe_customer_id", customerId);
  }

  try {
    switch (evt.type) {
      case "checkout.session.completed": {
        const s = evt.data.object as Stripe.Checkout.Session;
        if (s.subscription && s.customer) {
          // Ensure stripe_customer_id is recorded and link by metadata tenant_id if provided
          if (s.metadata?.tenant_id && s.customer) {
            await admin
              .from("tenants")
              .update({ stripe_customer_id: s.customer as string })
              .eq("id", s.metadata.tenant_id as string);
          }
          const sub = await stripe.subscriptions.retrieve(s.subscription as string);
          await activate(sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await activate(evt.data.object as Stripe.Subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = evt.data.object as Stripe.Subscription;
        await deactivate(sub.customer as string);
        break;
      }
      case "invoice.payment_failed": {
        const inv = evt.data.object as Stripe.Invoice;
        if (inv.customer) await deactivate(inv.customer as string);
        break;
      }
      case "invoice.paid": {
        const inv = evt.data.object as Stripe.Invoice;
        const subscriptionId = (inv as any).subscription as string | null;
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          await activate(sub);
        }
        break;
      }
    }
  } catch (e) {
    // swallow to always return 200; Stripe will retry on 400/500
  }
  return NextResponse.json({ ok: true });
}

export const config = { api: { bodyParser: false } } as any;


