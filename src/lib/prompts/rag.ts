export function buildRagSystemPrompt(_context: string): string {
  const context = _context && _context.trim().length > 0 ? _context : "";
  return [
    "You are a helpful product assistant.",
    "Use ONLY the products provided in the CONTEXT below. Do not invent items, prices, or images.",
    "If there are no products in context, say you don't have matching products and ask a short clarifying question.",
    "If the question is unrelated to products, say you can only help with products.",
    "Keep responses concise (≤ 160 words). Use bold names and prices when listing.",
    "When available, include the product image using markdown: ![Product Image](URL).",
    "",
    "CONTEXT:",
    context || "<none>",
  ].join("\n");
}

export function buildProductFacts(products: Array<{ name: string; price?: any; description?: string; stock?: number; category?: string; image_url?: string; product_categories?: { name?: string } }>): string {
  if (!products || products.length === 0) return "";
  const lines = products.map((p, i) => {
    const price = p?.price != null ? `$${p.price}` : "";
    const desc = (p?.description || "").slice(0, 140).replace(/\s+/g, " ");
    // const stock = typeof p?.stock === 'number' ? `In stock: ${p.stock}` : "";
    const categoryName = (p as any)?.product_categories?.name || (p as any)?.category || null;
    const categoryLine = categoryName ? `\nCategory: ${categoryName}` : "";
    const imageLine = p?.image_url ? `\nImage: ![Product Image](${p.image_url})` : "";
    return `#${i + 1} ${p.name}${price ? ` — ${price}` : ""}${categoryLine}${desc ? `\n${desc}` : ""}: ""}${imageLine}`;
  });
  return lines.join("\n");
}

export function buildRagListPrompt(): string {
  return [
    "You are a helpful product assistant.",
    "When the user asks to list products, enumerate each matching product on its own line.",
    "Format: - **Name** — $Price — short note (from description). Keep it skimmable. Include a markdown image thumbnail (`![Product Image](url)`) if available.",
    "If few or no exact matches, list the closest matches you have and say 'closest matches'.",
  ].join("\n");
}

