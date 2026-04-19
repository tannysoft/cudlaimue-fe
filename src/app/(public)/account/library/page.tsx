import { redirect } from "next/navigation";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { entitlements, products } from "@/lib/db/schema";
import { BookOpen, LayoutTemplate } from "lucide-react";
import { thumbUrl } from "@/lib/img";
import { productFiles } from "@/lib/product-files";
import { FileDownloadButton } from "@/components/shop/file-download-button";

export const metadata = { title: "ไฟล์ดาวน์โหลดของฉัน" };

export default async function LibraryPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login?next=/account/library");

  const rows = await db()
    .select({ ent: entitlements, p: products })
    .from(entitlements)
    .innerJoin(products, eq(products.id, entitlements.productId))
    .where(eq(entitlements.userId, user.id))
    .orderBy(desc(entitlements.grantedAt));

  const fonts = rows.filter((r) => r.p.type === "font");
  const ebooks = rows.filter((r) => r.p.type === "ebook");
  const templates = rows.filter((r) => r.p.type === "template");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-600 font-bold">
        ไฟล์ดาวน์โหลดของฉัน
      </h1>

      <section className="mt-8">
        <h2 className="font-semibold text-teal-600 mb-3">ฟอนต์ ({fonts.length})</h2>
        {fonts.length === 0 ? (
          <EmptyMsg kind="ฟอนต์" href="/fonts" />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {fonts.map(({ p }) => (
              <LibraryCard
                key={p.id}
                p={p}
                baseHref={`/api/library/fonts/${p.id}`}
                detailHref={`/fonts/${p.slug}`}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-semibold text-teal-600 mb-3 inline-flex items-center gap-1.5">
          <LayoutTemplate className="w-4 h-4" /> เทมเพลต ({templates.length})
        </h2>
        {templates.length === 0 ? (
          <EmptyMsg kind="เทมเพลต" href="/templates" />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(({ p }) => (
              <LibraryCard
                key={p.id}
                p={p}
                baseHref={`/api/library/templates/${p.id}`}
                detailHref={`/templates/${p.slug}`}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-semibold text-teal-600 mb-3">อีบุ๊ก ({ebooks.length})</h2>
        {ebooks.length === 0 ? (
          <EmptyMsg kind="อีบุ๊ก" href="/ebooks" />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ebooks.map(({ p }) => (
              <div
                key={p.id}
                className="bg-white rounded-xl border border-peach-100 p-3 flex gap-3 items-center"
              >
                <div className="relative w-14 h-20 rounded-md overflow-hidden bg-cream shadow shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbUrl(p.coverImageKey)}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-[family-name:var(--font-display)] text-teal-600 line-clamp-2">
                    {p.name}
                  </div>
                  <div className="text-xs text-ink/50">{p.pageCount ?? "?"} หน้า</div>
                </div>
                <Link
                  href={`/read/${p.id}`}
                  className="inline-flex items-center gap-1 rounded-full bg-teal-500 text-white text-sm px-3 py-1.5 hover:bg-teal-600"
                >
                  <BookOpen className="w-4 h-4" /> อ่าน
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function LibraryCard({
  p,
  baseHref,
  detailHref,
}: {
  p: typeof products.$inferSelect;
  baseHref: string;
  detailHref: string;
}) {
  const files = productFiles(p);
  return (
    <div className="bg-white rounded-xl border border-peach-100 p-3 flex gap-3 items-center">
      <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-cream shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbUrl(p.coverImageKey)}
          alt=""
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <Link
          href={detailHref}
          className="font-[family-name:var(--font-display)] text-teal-600 line-clamp-1"
        >
          {p.name}
        </Link>
        <div className="text-xs text-ink/50">
          {files.length > 1
            ? `${files.length} ไฟล์`
            : files[0]?.name ?? "—"}
        </div>
      </div>
      <FileDownloadButton files={files} baseHref={baseHref} />
    </div>
  );
}

function EmptyMsg({ kind, href }: { kind: string; href: string }) {
  return (
    <div className="rounded-xl border border-dashed border-peach-200 py-10 text-center text-ink/50">
      ยังไม่มี{kind}ในคลัง{" "}
      <Link href={href} className="text-peach-600 hover:underline">
        เลือกซื้อ
      </Link>
    </div>
  );
}
