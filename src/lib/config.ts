export const appConfig = {
  appUrl: process.env.APP_URL || "",
  fbGraphVersion: process.env.FB_GRAPH_VERSION || "v20.0",
  fbWebhookVerifyToken: process.env.FB_WEBHOOK_VERIFY_TOKEN || "",
  fbAppSecret: process.env.FB_APP_SECRET || "",
  openai: {
    baseUrl: process.env.OPENAI_BASE_URL || "",
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  },
};


