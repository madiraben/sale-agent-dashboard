import { env } from "./env";

/**
 * Application configuration using validated environment variables
 * This ensures type safety and runtime validation of all config values
 */
export const appConfig = {
  appUrl: env.APP_URL || env.NEXT_PUBLIC_APP_URL || "",
  fbGraphVersion: env.FB_GRAPH_VERSION,
  fbWebhookVerifyToken: env.FB_WEBHOOK_VERIFY_TOKEN || "",
  fbAppSecret: env.FB_APP_SECRET || "",
  openai: {
    baseUrl: env.OPENAI_BASE_URL,
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
  },
  stripe: {
    secretKey: env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    prices: {
      monthly: env.STRIPE_PRICE_MONTHLY,
      quarterly: env.STRIPE_PRICE_QUARTERLY,
      yearly: env.STRIPE_PRICE_YEARLY,
    },
    portalReturnUrl: env.STRIPE_PORTAL_RETURN_URL,
  },
  googleCloud: {
    location: env.GOOGLE_CLOUD_LOCATION,
    projectId: env.GOOGLE_CLOUD_PROJECT_ID,
    clientEmail: env.GOOGLE_CLOUD_CLIENT_EMAIL,
    privateKey: env.GOOGLE_CLOUD_PRIVATE_KEY,
  },
} as const;


