import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTextEmbedding } from "@/lib/embeddings";

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseAdminClient();
    const { ids } = await req.json().catch(() => ({ ids: null as null | string[] }));

    // Fetch products (optionally by ids) with category name
    const query = supabase
      .from("products")
      .select("id,name,sku,size,price,description,product_categories(name)")
      .order("name", { ascending: true });
    const { data: rows, error } = ids && Array.isArray(ids) && ids.length > 0
      ? await query.in("id", ids)
      : await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const updates: Array<{ id: string; embedding: number[] } | null> = await Promise.all(
      (rows ?? []).map(async (p: any) => {
        const category = p?.product_categories?.name || "";
        const parts = [
          p?.name || "",
          p?.sku ? `SKU: ${p.sku}` : "",
          p?.size ? `Size: ${p.size}` : "",
          category ? `Category: ${category}` : "",
          `Price: ${p?.price ?? 0}`,
          p?.description || "",
        ].filter(Boolean);
        const text = parts.join("\n");
        try {
          const embedding = await getTextEmbedding(text);
          return { id: p.id, embedding };
        } catch (e) {
          console.warn("Embedding failed for product", p.id, (e as any)?.message);
          return null;
        }
      })
    );

    const valid = updates.filter(Boolean) as Array<{ id: string; embedding: number[] }>;
    // Update rows individually to avoid inserts and NOT NULL violations
    for (const u of valid) {
      const { error: upErr } = await supabase.from("products").update({ embedding: u.embedding }).eq("id", u.id);
      if (upErr) return NextResponse.json({ error: upErr.message, atId: u.id }, { status: 500 });
    }

    return NextResponse.json({ updated: valid.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}


