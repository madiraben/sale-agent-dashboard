

export const Currency = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
};

export type CustomerWithStats = Customer & {
  last_date?: string | null;
  orders_count: number;
  total: number;
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  size: string;
  category_id?: string;
  price: number;
  stock?: number;
  image_url?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
};

export type Category = {
  id: string;
  name: string;
  updated_at?: string;
};

export type Order = {
  id: string;
  customer_id?: string;
  date: string;
  total: number;
  status: "pending" | "paid" | "refunded" | string;
};

export type OrderItem = {
  order_id?: string;
  product_id: string;
  name: string;
  qty: number;
  price: number;
};

export type TypeChatMessage = { id: string; role: "user" | "assistant"; content: string; time?: string };

export type Embedding = {
  id: string;
  text: string;
  image_url: string;
  created_at?: string;
  updated_at?: string;
};

// Request payload for creating a multimodal embedding
export type MultimodalEmbeddingRequest = {
  text?: string;
  // Prefer base64 from client to avoid SSRF; server may also accept a safe remote URL
  imageBase64?: string; // raw base64 string, no data: prefix
  imageUrl?: string; // optional remote URL (https only)
  imageMimeType?: string; // optional hint
};

// Normalized response from the embeddings API
export type MultimodalEmbeddingResponse = {
  embedding?: number[];
  textEmbedding?: number[];
  imageEmbedding?: number[];
  usedRegion?: string;
  error?: string;
  details?: unknown;
  status?: number;
};