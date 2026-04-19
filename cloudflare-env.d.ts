// Bindings and vars exposed to the Worker at runtime. Keep in sync with
// `wrangler.toml`. When you edit bindings there, regenerate with:
//   pnpm cf-typegen
// (this file is overwritten). Kept committed so CI type-checks pass without
// needing Cloudflare credentials.

interface CloudflareEnv {
  DB: import("@cloudflare/workers-types").D1Database;
  R2: import("@cloudflare/workers-types").R2Bucket;
  KV: import("@cloudflare/workers-types").KVNamespace;
  NEXT_INC_CACHE_KV: import("@cloudflare/workers-types").KVNamespace;
  ASSETS: import("@cloudflare/workers-types").Fetcher;
  BROWSER: import("@cloudflare/workers-types").Fetcher;
  IMAGES: import("@cloudflare/workers-types").ImagesBinding;

  APP_URL: string;
  WP_API_URL: string;
  WC_API_URL: string;
  WC_CONSUMER_KEY?: string;
  WC_CONSUMER_SECRET?: string;
  LINE_LOGIN_CHANNEL_ID: string;
  LIFF_ID: string;
  BEAM_API_URL: string;
  BEAM_MERCHANT_ID: string;

  LINE_LOGIN_CHANNEL_SECRET: string;
  LINE_MESSAGING_CHANNEL_ACCESS_TOKEN?: string;
  BEAM_SECRET_KEY: string;
  BEAM_WEBHOOK_SECRET: string;
  SESSION_SECRET: string;
  ADMIN_BOOTSTRAP_EMAIL?: string;
  ADMIN_BOOTSTRAP_PASSWORD?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CF_BROWSER_TOKEN?: string;
}
