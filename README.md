# Cudlaimue

ฟอนต์ลายมือ + อีบุ๊ก + บทความ (headless WP) บน Cloudflare Workers + D1 + R2
Next.js 16 · Tailwind 4 · Drizzle ORM · LINE Login/LIFF · Beamcheckout

---

## 🚀 TL;DR

```bash
pnpm install

# ครั้งแรกเท่านั้น — สร้าง D1/KV/R2 (ดู "ครั้งแรก" ด้านล่าง)
# คัดลอก env templates
cp .env.example     .env.local         # shell env สำหรับ wrangler CLI
cp .dev.vars.example .dev.vars         # runtime secrets (local dev)

# ใช้งานประจำวัน
pnpm db:migrate         # migrate local D1
pnpm seed:admin admin@cudlaimue.com 'password'
pnpm dev                # → http://localhost:3000

# deploy ขึ้น workers.dev
pnpm db:migrate:remote  # migrate prod D1 (ครั้งเดียวหลังแก้ schema)
pnpm seed:admin:remote admin@cudlaimue.com 'real-password'
pnpm deploy             # → cudlaimue-fe.<account>.workers.dev
```

---

## 🧩 Config แบบง่าย

**ไฟล์ config ตัวเดียว**: [wrangler.toml](wrangler.toml) — bindings (D1/R2/KV/Browser) + public vars
**ไฟล์ secrets ตัวเดียว**: [.dev.vars](.dev.vars.example) — LINE secret, Beam secret, session secret ฯลฯ
**ไฟล์ CLI env**: [.env.local](.env.example) — CLOUDFLARE_API_TOKEN สำหรับ wrangler/drizzle

| ต้องการค่าต่างกันระหว่าง local ↔ prod? | ทำยังไง |
|---|---|
| `APP_URL`, base origin | **ไม่ต้องตั้ง** — code อ่านจาก `req.url` |
| Secrets (LINE secret ฯลฯ) | Local → `.dev.vars` · Prod → `wrangler secret put KEY` |
| Public vars (LIFF_ID ฯลฯ) | ตั้งใน `wrangler.toml [vars]` ครั้งเดียว |
| URL สำหรับ cutover เว็บจริง | Uncomment `routes = [...]` ใน wrangler.toml |

---

## 🆕 ตั้งค่าครั้งแรก (once)

```bash
pnpm wrangler login

# สร้าง resources
pnpm wrangler d1 create cudlaimue-db
pnpm wrangler kv namespace create KV
pnpm wrangler kv namespace create NEXT_INC_CACHE_KV
pnpm wrangler r2 bucket create cudlaimue-assets

# → เอา id ที่ได้ไปแทนใน wrangler.toml

# Production secrets (ทีเดียวจบ)
pnpm wrangler secret put SESSION_SECRET            # 64-char hex
pnpm wrangler secret put LINE_LOGIN_CHANNEL_SECRET
pnpm wrangler secret put BEAM_SECRET_KEY
pnpm wrangler secret put BEAM_WEBHOOK_SECRET
pnpm wrangler secret put CF_BROWSER_TOKEN          # Browser Rendering:Edit
pnpm wrangler secret put CLOUDFLARE_ACCOUNT_ID
```

สำหรับ LINE + Beam:
- LINE Developers Console → Callback URL: `https://<domain>/api/auth/line/callback`
- Beamcheckout Dashboard → Webhook endpoint: `https://<domain>/api/checkout/webhook`

---

## 🎛 Cutover ขึ้น cudlaimue.com จริง

1. เปิด [wrangler.toml](wrangler.toml) → uncomment บล็อก `routes = [...]`
2. `pnpm deploy`
3. DNS ของ `cudlaimue.com` ที่ Cloudflare ต้องเปิด orange cloud (proxied)
4. WordPress เดิม → ย้ายไป `blog.cudlaimue.com` หรือใช้ route pattern เจาะจง

---

## 📁 Project layout

```
src/app/              pages + API routes (Next.js App Router)
src/components/       shared UI
src/lib/              db/ auth/ beam/ wp/ pdf/ r2.ts cf.ts utils.ts
migrations/           D1 schema (SQLite)
scripts/              seed-admin.mjs
wrangler.toml         Cloudflare bindings + public vars (single source)
.dev.vars             Runtime secrets for local dev only (git-ignored)
.env.local            CLI tokens (wrangler/drizzle) — git-ignored
```

---

## 🛡 ทำไมปลอดภัย

- **ฟอนต์**: download route เช็ค session + entitlement ก่อน stream จาก R2
- **อีบุ๊ก**: PDF อยู่ใน R2 ไม่เคยถึง browser — ส่งเป็น PNG ทีละหน้าฝังลายน้ำ email ผู้ซื้อ (Satori SVG + Cloudflare Browser Rendering)
- **Webhook**: verify HMAC `X-Beam-Signature` + constant-time compare
- **Session**: HttpOnly + Secure + SameSite=lax cookie, 30 วัน
