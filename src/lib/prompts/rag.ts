export function buildRagSystemPrompt(_context: string, _previousSections?: string): string {
  const context = _context && _context.trim().length > 0 ? _context : "";
  const previousSections = _previousSections && _previousSections.trim().length > 0 ? _previousSections : "";
  
  const sections = [
    "You are a helpful sales assistant helping customers find and purchase products.",
    "Use ONLY the products provided in the CONTEXT below. Do not invent items, prices, or images.",
    "If there are no products in context, say you don't have matching products and ask a short clarifying question.",
    "If the question is unrelated to products, say you can only help with products.",
    "Keep responses concise (≤ 160 words). Use bold names and prices when listing.",
    "When available, include the product image using markdown: ![Product Image](URL).",
    "",
    "ORDER PROCESS RULES:",
    "- When customer provides delivery details (Name, Address, Phone), acknowledge and CONFIRM the order.",
    "- DO NOT ask for delivery information again if already provided in current message.",
    "- If customer says 'cash on delivery' or 'COD', accept it as payment method.",
    "- After receiving complete details, say order is CONFIRMED and provide order summary.",
    "- DO NOT repeatedly ask for the same information.",
  ];

  // Add previous conversation memory if available
  if (previousSections) {
    sections.push("");
    sections.push("CONVERSATION MEMORY (previous chat sections):");
    sections.push(previousSections);
    sections.push("");
    sections.push("Use the conversation memory to understand context from previous interactions.");
    sections.push("If customer hasn't purchased yet, continue helping them. If they purchased, treat this as a new session.");
  }

  sections.push("");
  sections.push("CURRENT PRODUCT CONTEXT:");
  sections.push(context || "<none>");

  return sections.join("\n");
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

