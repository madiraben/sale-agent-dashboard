import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function ensureStripeCustomer(params: {
  supabase: SupabaseClient;
  tenantId: string;
  existingStripeCustomerId?: string | null;
  email?: string;
  name?: string;
}): Promise<string> {
  const { supabase, tenantId, existingStripeCustomerId, email, name } = params;
  
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("STRIPE_SECRET_KEY not configured");
  
  const stripe = new Stripe(secret);
  
  // Return existing customer if we have one
  if (existingStripeCustomerId) {
    return existingStripeCustomerId;
  }
  
  // Create new customer
  const customer = await stripe.customers.create({
    email: email ?? undefined,
    name: name ?? undefined,
    metadata: { tenant_id: tenantId },
  });
  
  await supabase
    .from("tenants")
    .update({ stripe_customer_id: customer.id })
    .eq("id", tenantId);
  
  return customer.id;
}

export async function resolveUserTenant(supabase: SupabaseClient): Promise<{
  tenantId: string;
  tenant: any;
}> {
  // Get or create membership
  let { data: membership, error: mErr } = await supabase
    .from("user_tenants")
    .select("tenant_id")
    .limit(1)
    .single();
    
  if (mErr || !membership) {
    // Auto-bootstrap a workspace for this user
    await (supabase as any).rpc("bootstrap_tenant", { p_name: "My Workspace" });
    const retry = await supabase
      .from("user_tenants")
      .select("tenant_id")
      .limit(1)
      .single();
    membership = retry.data as any;
    if (!membership) {
      throw new Error("Failed to resolve or create tenant for user");
    }
  }
  
  const tenantId = (membership as any).tenant_id as string;
  
  // Load tenant data
  const { data: tenant, error: tErr } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .limit(1)
    .single();
    
  if (tErr || !tenant) {
    throw new Error("Failed to load tenant data");
  }
  
  return { tenantId, tenant };
}


