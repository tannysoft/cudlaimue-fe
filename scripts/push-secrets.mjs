#!/usr/bin/env node
/**
 * Push all secrets from `.dev.vars` to Cloudflare Worker in one go.
 *
 *   pnpm secrets:push          → push to default env (workers.dev preview)
 *   pnpm secrets:push prod     → push to [env.production]
 *
 * Reads dotenv-style `.dev.vars`, writes a temp JSON, calls
 * `wrangler secret bulk`, then deletes the temp file. Lines commented with
 * `#`, empty lines, and `KEY=` with no value are ignored.
 */
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const envArg = process.argv[2];
const dotVarsPath = resolve(".dev.vars");
if (!existsSync(dotVarsPath)) {
  console.error("❌ .dev.vars not found — copy .dev.vars.example and fill values first");
  process.exit(1);
}

const raw = readFileSync(dotVarsPath, "utf8");
const vars = {};
// These live in wrangler.toml [vars] — don't push as secrets or wrangler
// will reject the upload with "Binding name already in use".
const SKIP = new Set([
  "CLOUDFLARE_ACCOUNT_ID",
  "WP_API_URL",
  "WC_API_URL",
  "LINE_LOGIN_CHANNEL_ID",
  "LIFF_ID",
  "BEAM_API_URL",
  "BEAM_MERCHANT_ID",
]);
for (const line of raw.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const m = trimmed.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
  if (!m) continue;
  const [, key, rawVal] = m;
  if (SKIP.has(key)) continue;
  // Strip optional wrapping quotes and trailing inline comment.
  let value = rawVal;
  const quoted = value.match(/^(["'])(.*?)\1/);
  if (quoted) {
    value = quoted[2];
  } else {
    value = value.replace(/\s+#.*$/, "").trim();
  }
  if (value) vars[key] = value;
}

const keys = Object.keys(vars);
if (keys.length === 0) {
  console.error("❌ no secrets found in .dev.vars");
  process.exit(1);
}

const tmp = resolve(".tmp-secrets.json");
writeFileSync(tmp, JSON.stringify(vars, null, 2), { mode: 0o600 });

const args = ["wrangler", "secret", "bulk", tmp];
if (envArg) args.push("--env", envArg);

console.log(`→ pushing ${keys.length} secrets: ${keys.join(", ")}`);
console.log(`  env: ${envArg ?? "(default / preview)"}`);
const res = spawnSync("pnpm", args, { stdio: "inherit" });
try {
  unlinkSync(tmp);
} catch {
  /* ignore */
}
process.exit(res.status ?? 1);
