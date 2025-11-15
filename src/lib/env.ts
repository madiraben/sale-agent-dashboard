import { z } from "zod";

/**
 * Environment variable validation schema
 * This ensures all required environment variables are present and valid at runtime
 * 
 * Note: Secrets are optional during build time but should be present at runtime
 */
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || 
                    process.env.NODE_ENV === undefined;

const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Supabase Configuration (public keys required at build time)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("Invalid Supabase URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "Supabase anon key is required"),
  // Secrets optional at build time, required at runtime
  SUPABASE_SERVICE_ROLE_KEY: isBuildTime 
    ? z.string().optional() 
    : z.string().min(1, "Supabase service role key is required"),

  // Stripe Configuration (optional at build time)
  STRIPE_SECRET_KEY: isBuildTime
    ? z.string().optional()
    : z.string().startsWith("sk_", "Invalid Stripe secret key format"),
  STRIPE_WEBHOOK_SECRET: isBuildTime
    ? z.string().optional()
    : z.string().min(1, "Stripe webhook secret is required"),
  STRIPE_PRICE_MONTHLY: z.string().optional(),
  STRIPE_PRICE_QUARTERLY: z.string().optional(),
  STRIPE_PRICE_YEARLY: z.string().optional(),
  STRIPE_PORTAL_RETURN_URL: z.string().url().optional(),

  // App Configuration
  APP_URL: z.string().url("Invalid app URL").optional(),
  NEXT_PUBLIC_APP_URL: z.string().url("Invalid public app URL").optional(),

  // OpenAI Configuration (optional at build time)
  OPENAI_API_KEY: isBuildTime
    ? z.string().optional()
    : z.string().min(1, "OpenAI API key is required"),
  OPENAI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),

  // Google Cloud / Vertex AI Configuration
  GOOGLE_CLOUD_LOCATION: z.string().optional(),
  GOOGLE_CLOUD_PROJECT_ID: z.string().optional(),
  GOOGLE_CLOUD_CLIENT_EMAIL: z.string().email().optional(),
  GOOGLE_CLOUD_PRIVATE_KEY: z.string().optional(),

  // Facebook Configuration
  FB_GRAPH_VERSION: z.string().default("v20.0"),
  FB_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  FB_APP_SECRET: z.string().optional(),

  // Telegram Configuration (if needed)
  TELEGRAM_BOT_TOKEN: z.string().optional(),
});

/**
 * Validated environment variables
 * Use this instead of process.env directly to ensure type safety and validation
 */
export const env = (() => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues
        .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
        .join("\n");
      console.error("❌ Environment validation failed:\n" + missingVars);
      throw new Error("Invalid environment variables. Please check your .env file.");
    }
    throw error;
  }
})();

/**
 * Type-safe environment variables
 */
export type Env = z.infer<typeof envSchema>;

