import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function buildProductContextForTenants(tenantIds: string[], embedding: number[], query: string): Promise<{ products: any[]; context: string }> {
  const supabase = createSupabaseAdminClient();

  const [hybridRes, vectorRes] = await Promise.allSettled([
    supabase.rpc("search_products_hybrid_text", {
      query_text: query,
      query_embedding: embedding,
      match_threshold: 0.2,
      match_count: 20,
    }),
    supabase.rpc("search_products_by_embedding", {
      query_embedding: embedding,
      match_threshold: 0.3,
      match_count: 20,
    }),
  ]);
  const hybrid = (hybridRes.status === "fulfilled" && (hybridRes.value as any)?.data) || [];
  const vector = (vectorRes.status === "fulfilled" && (vectorRes.value as any)?.data) || [];
  const all = [...hybrid, ...vector];
  const ids = Array.from(new Set(all.map((p: any) => p?.id).filter(Boolean)));

  let products: any[] = [];
  if (ids.length > 0 && tenantIds.length > 0) {
    const { data } = await supabase
      .from("products")
      .select("id,name,sku,size,description,price,image_url,product_categories(name),tenant_id,stock")
      .in("id", ids)
      .in("tenant_id", tenantIds)
      .limit(20);
    products = (data || []);
  }

  const top = products.slice(0, 5);
  const context = top.length > 0
    ? top.map((p: any, i: number) => {
        const categoryName = (p?.product_categories && p.product_categories?.name) || p?.category_name || null;
        const categoryLine = categoryName ? `\nCategory: ${categoryName}` : "";
        const sizeLine = p?.size ? `\nSize: ${p.size}` : "";
        const imageUrl = p?.image_url;
        return `#${i + 1} ${p.name} - $${p.price}${categoryLine}${sizeLine}\nKey: ${(p.description || "").slice(0, 140)}${imageUrl ? `\nImage: ${imageUrl}` : ""} ${p.sku ? `\nSKU: ${p.sku}` : ""}  ${p.stock ? `\nStock: ${p.stock}` : ""}`;
      }).join("\n")
    : "No relevant products found.";

  return { products: top, context };
}


