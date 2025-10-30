import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type FacebookPageRow = {
  user_id: string;
  page_id: string;
  page_name: string | null;
  page_token: string | null;
  is_active: boolean | null;
};

export async function findActivePageById(pageId: string): Promise<FacebookPageRow | null> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("facebook_pages")
    .select("user_id,page_id,page_name,page_token,is_active")
    .eq("page_id", pageId)
    .eq("is_active", true)
    .maybeSingle();
  return (data as any) || null;
}

export async function getTenantIdsForUser(userId: string): Promise<string[]> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("user_tenants")
    .select("tenant_id")
    .eq("user_id", userId);
  return ((data as any[]) || []).map((r) => r.tenant_id).filter(Boolean);
}


