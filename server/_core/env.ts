export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",

  // One-time secret used to create the first super-admin account.
  // Set this in your environment, call phase1.bootstrapSuperAdmin once, then rotate/remove it.
  ownerSetupKey: process.env.OWNER_SETUP_KEY ?? "",

  // LLM provider (OpenAI-compatible chat completions API).
  // Works with OpenAI directly, or any compatible gateway (OpenRouter, Azure OpenAI, etc.)
  // by overriding LLM_BASE_URL.
  llmApiKey: process.env.OPENAI_API_KEY ?? "",
  llmBaseUrl: process.env.LLM_BASE_URL ?? "https://api.openai.com",
  llmModel: process.env.LLM_MODEL ?? "gpt-4o-mini",

  // Local file storage.
  storageDir: process.env.STORAGE_DIR ?? "./data/uploads",
  storagePublicPath: "/storage",

  // Optional outbound notification webhook (e.g. Slack/Discord incoming webhook).
  // If unset, notifications are just logged to the console.
  notifyWebhookUrl: process.env.NOTIFY_WEBHOOK_URL ?? "",
};
