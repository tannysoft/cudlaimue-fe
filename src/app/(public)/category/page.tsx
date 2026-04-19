import Link from "next/link";
import { Folder, ArrowRight } from "lucide-react";
import { wpListCategories } from "@/lib/wp/client";

export const metadata = { title: "หมวดหมู่บทความทั้งหมด" };
export const revalidate = 300;

export default async function CategoriesIndexPage() {
  let categories: Awaited<ReturnType<typeof wpListCategories>> = [];
  try {
    categories = await wpListCategories();
  } catch {
    // WP unreachable — render an empty list rather than 500.
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <Link href="/articles" className="text-sm text-peach-600 hover:underline">
          ← กลับไปบทความทั้งหมด
        </Link>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-teal-700 font-bold">
          หมวดหมู่บทความ
        </h1>
        <p className="text-ink/60 mt-1 text-sm">เลือกหมวดที่สนใจเพื่ออ่านบทความที่เกี่ยวข้อง</p>
      </header>

      {categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-peach-200 py-16 text-center text-ink/50">
          ยังไม่มีหมวดหมู่
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/category/${c.slug}`}
              className="group flex items-center gap-3 rounded-2xl bg-white border border-peach-100 p-4 hover:border-peach-300 hover:shadow-md transition"
            >
              <div className="w-10 h-10 rounded-xl bg-peach-100 text-peach-600 flex items-center justify-center shrink-0">
                <Folder className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-[family-name:var(--font-display)] text-lg text-teal-700 font-semibold truncate">
                  {c.name}
                </div>
                <div className="text-xs text-ink/50">{c.count} บทความ</div>
              </div>
              <ArrowRight className="w-4 h-4 text-ink/30 group-hover:text-peach-600 transition" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
