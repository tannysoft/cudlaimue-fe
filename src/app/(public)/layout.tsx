import { eq } from "drizzle-orm";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { CookieNotice } from "@/components/layout/cookie-notice";
import { CartToast } from "@/components/shop/cart-toast";
import { LiffExternalProvider } from "@/components/liff/liff-external-provider";
import { getSessionUser } from "@/lib/auth/session";
import { env } from "@/lib/cf";
import { db } from "@/lib/db";
import { entitlements } from "@/lib/db/schema";

/**
 * Public site chrome — applied to home, shop, articles, cart, checkout, account,
 * auth, and legal pages. Admin/read/liff/api intentionally sit outside this
 * group so they don't inherit the storefront header/footer.
 */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  let hasLibrary = false;
  if (user) {
    const rows = await db()
      .select({ id: entitlements.id })
      .from(entitlements)
      .where(eq(entitlements.userId, user.id))
      .limit(1);
    hasLibrary = rows.length > 0;
  }
  return (
    <LiffExternalProvider liffId={env().LIFF_ID}>
      <div className="flex flex-col min-h-screen">
        <SiteHeader user={user} hasLibrary={hasLibrary} />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <CartToast />
        <CookieNotice />
      </div>
    </LiffExternalProvider>
  );
}
