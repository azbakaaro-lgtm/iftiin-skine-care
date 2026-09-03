export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",

  // One-time secret used to create the first super-admin account.
  // Set this in your environment, call phase1.bootstrapSuperAdmin once, then rotate/remove it.
  ownerSetupKey: process.env.OWNER_SETUP_KEY ?? "",

  // LLM provider (OpenAI-compatible chat completions API).
  // Defaults to OpenRouter's free tier — set OPENROUTER_API_KEY (or reuse
  // OPENAI_API_KEY) and leave LLM_MODEL as "openrouter/free" to let
  // OpenRouter auto-pick a free model (including free vision models for
  // photo analysis). Override LLM_BASE_URL/LLM_MODEL to point at OpenAI,
  // Azure OpenAI, or any other OpenAI-compatible gateway instead.
  llmApiKey: process.env.OPENROUTER_API_KEY ?? process.env.OPENAI_API_KEY ?? "",
  llmBaseUrl: process.env.LLM_BASE_URL ?? "https://openrouter.ai/api",
  llmModel: process.env.LLM_MODEL ?? "openrouter/free",

  // Local file storage.
  storageDir: process.env.STORAGE_DIR ?? "./data/uploads",
  storagePublicPath: "/storage",

  // Optional outbound notification webhook (e.g. Slack/Discord incoming webhook).
  // If unset, notifications are just logged to the console.
  notifyWebhookUrl: process.env.NOTIFY_WEBHOOK_URL ?? "",
};
