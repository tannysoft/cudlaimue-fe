import { redirect, notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { entitlements, products } from "@/lib/db/schema";
import { EbookViewer } from "@/components/ebook-viewer/viewer";

export const metadata = { title: "อ่านอีบุ๊ก" };

export default async function ReadPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    const { id } = await params;
    redirect(`/auth/login?next=/read/${id}`);
  }
  const { id } = await params;

  const rows = await db()
    .select({ p: products, ent: entitlements })
    .from(entitlements)
    .innerJoin(products, eq(products.id, entitlements.productId))
    .where(and(eq(entitlements.userId, user!.id), eq(entitlements.productId, id)))
    .limit(1);
  if (!rows.length) return notFound();
  const { p, ent } = rows[0];
  if (p.type !== "ebook") return notFound();

  const totalPages = p.pageCount ?? 1;

  return (
    <div className="h-[100dvh] bg-ink/95 text-white overflow-hidden">
      <EbookViewer
        productId={p.id}
        title={p.name}
        totalPages={totalPages}
        userLabel={`#${ent.orderId.slice(-10)}`}
      />
    </div>
  );
}
