import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// React dev mode + Turbopack HMR both need `eval()`. In prod we keep the
// strictest policy.
const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  ...(isDev ? ["'unsafe-eval'"] : []),
  "https://cdnjs.cloudflare.com",
  "https://static.cloudflareinsights.com",
  "https://*.line-scdn.net",
  "https://*.line-apps.com",
  "https://use.typekit.net",
  "https://p.typekit.net",
].join(" ");

const connectSrc = [
  "'self'",
  "https://*.line.me",
  "https://*.line-apps.com",
  "https://*.line-scdn.net",
  "https://cloudflareinsights.com",
  "https://*.cloudflareinsights.com",
  "https://api.beamcheckout.com",
  "https://cudlaimue.com",
  "https://www.cudlaimue.com",
  "https://*.cudlaimue.com",
  "https://*.workers.dev",
  "https://use.typekit.net",
  "https://p.typekit.net",
  ...(isDev ? ["ws:", "wss:", "http://localhost:*"] : []),
].join(" ");

const CSP = [
  "default-src 'self' https:",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "style-src 'self' 'unsafe-inline' https://use.typekit.net https://p.typekit.net https://fonts.googleapis.com",
  "font-src 'self' data: https://use.typekit.net https://fonts.gstatic.com",
  `script-src ${scriptSrc}`,
  `connect-src ${connectSrc}`,
  "frame-ancestors 'self' https://liff.line.me https://line.me",
].join("; ");

const baseHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const privateHeaders = [
  ...baseHeaders,
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Cache-Control", value: "private, no-store" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Skip Next's image optimizer — we route specific thumbnails through
    // `/api/image` (Cloudflare Images) via the `thumbUrl()` helper, and
    // serve full-res images direct from R2 via `fullUrl()`. No Next magic.
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    serverActions: { bodySizeLimit: "100mb" },
  },
  async headers() {
    return [
      { source: "/:path*", headers: baseHeaders },
      { source: "/read/:path*", headers: privateHeaders },
      { source: "/api/library/:path*", headers: privateHeaders },
    ];
  },
  async redirects() {
    return [
      { source: "/buy", destination: "/fonts", permanent: true },
      { source: "/my-account/downloads", destination: "/account/library", permanent: true },
      { source: "/wp-login.php", destination: "/auth/login", permanent: true },
    ];
  },
};

export default nextConfig;

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
