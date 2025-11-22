import { z } from "zod";

// Chat API validators
export const chatMessageSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().min(1).max(10000),
      })
    )
    .min(1)
    .max(50),
});

// RAG Chat validators
export const ragChatSchema = z.object({
  query: z.string().min(1).max(2000),
  conversationId: z.string().uuid().optional(),
});

// Embeddings validators
export const embeddingsSchema = z.object({
  text: z.string().max(5000).optional(),
  imageUrl: z.string().url().max(500).optional(),
  imageBase64: z.string().max(10 * 1024 * 1024).optional(), // 10MB max
}).refine(
  (data) => data.text || data.imageUrl || data.imageBase64,
  { message: "At least one of text, imageUrl, or imageBase64 must be provided" }
);

// Billing validators
export const checkoutSchema = z.object({
  plan: z.enum(["monthly", "quarterly", "yearly"]).default("monthly"),
});

// Facebook webhook validators
export const facebookWebhookVerifySchema = z.object({
  "hub.mode": z.string(),
  "hub.verify_token": z.string(),
  "hub.challenge": z.string(),
});

// Telegram webhook validators
export const telegramUpdateSchema = z.object({
  message: z
    .object({
      message_id: z.number(),
      text: z.string().max(4096).optional(),
      caption: z.string().max(1024).optional(),
      chat: z.object({
        id: z.union([z.number(), z.string()]),
      }),
    })
    .optional(),
});

// Product validators
export const productSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().min(1).max(100),
  size: z.string().max(50).optional(),
  category_id: z.string().uuid().optional(),
  price: z.number().min(0).max(999999),
  stock: z.number().int().min(0).max(999999),
  description: z.string().max(5000).optional(),
  image_url: z.string().url().max(500).optional(),
});

// Order validators
export const orderSchema = z.object({
  customer_id: z.string().uuid(),
  status: z.enum(["pending", "paid", "refunded"]),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        qty: z.number().int().min(1).max(999),
        price: z.number().min(0).max(999999),
      })
    )
    .min(1)
    .max(100),
});

// Customer validators
export const customerSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().min(1).max(50),
  email: z.string().email().max(200).optional(),
  address: z.string().max(500).optional(),
});

// Helper function to validate and return parsed data
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const parsed = schema.parse(data);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
      return { success: false, error: messages };
    }
    return { success: false, error: "Validation failed" };
  }
}

