import Link from "next/link";
import Image from "next/image";
import { desc, count, or, like } from "drizzle-orm";
import { Plus, Pencil, Package, Star } from "lucide-react";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { formatTHB } from "@/lib/utils";
import { Pager, paginationParams } from "@/components/admin/pager";
import { SearchBox } from "@/components/admin/search-box";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const { page, perPage, offset } = paginationParams(sp, 25);
  const q = (sp.q ?? "").trim();
  const pat = `%${q}%`;

  const where = q
    ? or(like(products.name, pat), like(products.slug, pat))
    : undefined;

  const [list, [{ n: total }]] = await Promise.all([
    db()
      .select()
      .from(products)
      .where(where)
      .orderBy(desc(products.createdAt))
      .limit(perPage)
      .offset(offset),
    db().select({ n: count() }).from(products).where(where),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const fonts = list.filter((p) => p.type === "font").length;
  const ebooks = list.filter((p) => p.type === "ebook").length;
  const templates = list.filter((p) => p.type === "template").length;

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-800 font-bold">
            สินค้า
          </h1>
          <p className="text-ink/60 text-sm mt-1">
            ทั้งหมด {total} รายการ · หน้า {page}: ฟอนต์ {fonts} · เทมเพลต {templates} · อีบุ๊ก {ebooks}
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-2 bg-peach-500 hover:bg-peach-600 text-white rounded-full px-5 py-2.5 text-sm font-medium shadow-sm"
        >
          <Plus className="w-4 h-4" /> เพิ่มสินค้า
        </Link>
      </header>

      <div className="bg-white rounded-2xl border border-peach-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-peach-100 flex items-center gap-3">
          <SearchBox
            baseHref="/admin/products"
            q={q}
            placeholder="ค้นหาจากชื่อหรือ slug…"
          />
        </div>

        {list.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-peach-100 text-peach-600 flex items-center justify-center mx-auto">
              <Package className="w-6 h-6" />
            </div>
            <div className="mt-4 font-medium text-ink/70">
              {q ? `ไม่พบสินค้าที่ตรงกับ "${q}"` : "ยังไม่มีสินค้า"}
            </div>
            {!q && (
              <>
                <p className="text-sm text-ink/50 mt-1">
                  เพิ่มฟอนต์หรืออีบุ๊กแรกของคุณเพื่อเริ่มขาย
                </p>
                <Link
                  href="/admin/products/new"
                  className="mt-4 inline-flex items-center gap-1.5 bg-peach-500 hover:bg-peach-600 text-white rounded-full px-4 py-2 text-sm"
                >
                  <Plus className="w-4 h-4" /> เพิ่มสินค้าแรก
                </Link>
              </>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-ink/50 border-b border-peach-100 bg-[#fcf8f1]">
                <th className="text-left px-5 py-3 font-medium">สินค้า</th>
                <th className="text-left px-4 py-3 font-medium">ประเภท</th>
                <th className="text-left px-4 py-3 font-medium">ราคา</th>
                <th className="text-left px-4 py-3 font-medium">สถานะ</th>
                <th className="text-left px-4 py-3 font-medium">เด่น</th>
                <th className="w-20 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-peach-100 last:border-0 hover:bg-peach-50/60 transition"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-11 h-11 rounded-lg bg-cream overflow-hidden shrink-0">
                        {p.coverImageKey && (
                          <Image
                            src={`/api/assets/${p.coverImageKey}`}
                            alt=""
                            fill
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="font-medium text-teal-800 hover:text-peach-600 line-clamp-1"
                        >
                          {p.name}
                        </Link>
                        <div className="text-xs text-ink/40 font-mono">/{p.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <TypePill type={p.type as "font" | "ebook" | "template"} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-teal-700">{formatTHB(p.priceSatang)}</div>
                    {p.compareAtPriceSatang ? (
                      <div className="text-xs text-ink/40 line-through">
                        {formatTHB(p.compareAtPriceSatang)}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {p.isPublished ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-teal-100 text-teal-700 rounded-full px-2 py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500" /> เผยแพร่
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs bg-ink/10 text-ink/60 rounded-full px-2 py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-ink/30" /> ฉบับร่าง
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.isFeatured ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-peach-100 text-peach-700 rounded-full px-2 py-0.5">
                        <Star className="w-3 h-3 fill-current" /> เด่น
                      </span>
                    ) : (
                      <span className="text-xs text-ink/30">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="inline-flex items-center gap-1 text-ink/60 hover:text-peach-600 text-sm"
                    >
                      <Pencil className="w-3.5 h-3.5" /> แก้ไข
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pager
          page={page}
          totalPages={totalPages}
          total={total}
          baseHref="/admin/products"
          label="รายการ"
          extraParams={{ q }}
        />
      </div>
    </div>
  );
}

function TypePill({ type }: { type: "font" | "ebook" | "template" }) {
  const cls =
    type === "font"
      ? "bg-peach-100 text-peach-700"
      : type === "template"
      ? "bg-amber-100 text-amber-700"
      : "bg-teal-100 text-teal-700";
  return (
    <span
      className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium ${cls}`}
    >
      {type}
    </span>
  );
}
