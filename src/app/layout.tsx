import type { Metadata, Viewport } from "next";
import "./globals.css";
import {
  jsonLdString,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "https://cudlaimue.com",
  ),
  title: {
    default: "คัดลายมือ — ฟอนต์ลายมือ & อีบุ๊ก",
    template: "%s · คัดลายมือ",
  },
  description:
    "คัดลายมือ — แหล่งรวมฟอนต์ลายมือ อีบุ๊ก และบทความสร้างแรงบันดาลใจ ใช้ได้ทั้งส่วนตัวและเชิงพาณิชย์",
  icons: [
    { rel: "icon", url: "/favicon/favicon.ico" },
    { rel: "apple-touch-icon", url: "/favicon/apple-touch-icon.png" },
  ],
  openGraph: {
    type: "website",
    title: "คัดลายมือ — ฟอนต์ลายมือ & อีบุ๊ก",
    description: "ฟอนต์ลายมือสไตล์น่ารัก และอีบุ๊กดิจิทัล",
    siteName: "คัดลายมือ",
    locale: "th_TH",
    images: ["/brand/cover.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "คัดลายมือ — ฟอนต์ลายมือ & อีบุ๊ก",
    description: "ฟอนต์ลายมือสไตล์น่ารัก และอีบุ๊กดิจิทัล",
    images: ["/brand/cover.png"],
  },
  manifest: "/favicon/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#EE9050",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://use.typekit.net" />
        <link rel="preconnect" href="https://p.typekit.net" crossOrigin="" />
        <link rel="stylesheet" href="https://use.typekit.net/wme5edi.css" />
      </head>
      <body className="bg-cream min-h-screen">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdString(organizationJsonLd()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdString(websiteJsonLd()) }}
        />
        {children}
      </body>
    </html>
  );
}
