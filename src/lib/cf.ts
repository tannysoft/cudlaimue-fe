import { getCloudflareContext } from "@opennextjs/cloudflare";
import type {
  R2Bucket,
  KVNamespace,
  D1Database,
  Fetcher,
  ImagesBinding,
  SendEmail,
} from "@cloudflare/workers-types";

export interface Env {
  DB: D1Database;
  R2: R2Bucket;
  KV: KVNamespace;
  NEXT_INC_CACHE_KV: KVNamespace;
  ASSETS: Fetcher;
  BROWSER: Fetcher; // Browser Rendering binding
  IMAGES: ImagesBinding; // Cloudflare Image Transformations
  SEND_EMAIL: SendEmail; // Cloudflare Email Routing outbound

  // vars
  APP_URL: string;
  EMAIL_FROM: string;
  EMAIL_FROM_NAME: string;
  WP_API_URL: string;
  WC_API_URL: string;
  WC_CONSUMER_KEY?: string;
  WC_CONSUMER_SECRET?: string;
  LINE_LOGIN_CHANNEL_ID: string;
  LIFF_ID: string;
  BEAM_API_URL: string;
  BEAM_MERCHANT_ID: string;

  // secrets
  LINE_LOGIN_CHANNEL_SECRET: string;
  LINE_MESSAGING_CHANNEL_ACCESS_TOKEN?: string;
  BEAM_SECRET_KEY: string;
  BEAM_WEBHOOK_SECRET: string;
  SESSION_SECRET: string;
  ADMIN_BOOTSTRAP_EMAIL?: string;
  ADMIN_BOOTSTRAP_PASSWORD?: string;

  // Runtime-only Cloudflare API token (Browser Rendering:Edit scope).
  // NOT the same token used by wrangler CLI — see .env.example.
  CLOUDFLARE_ACCOUNT_ID?: string;
  CF_BROWSER_TOKEN?: string;
}

export function env(): Env {
  const { env } = getCloudflareContext();
  return env as unknown as Env;
}
