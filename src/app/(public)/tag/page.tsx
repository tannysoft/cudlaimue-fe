import Link from "next/link";
import { Hash } from "lucide-react";
import { wpListTags } from "@/lib/wp/client";

export const metadata = { title: "แท็กบทความทั้งหมด" };
export const revalidate = 300;

export default async function TagsIndexPage() {
  let tags: Awaited<ReturnType<typeof wpListTags>> = [];
  try {
    tags = await wpListTags();
  } catch {
    // empty
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <Link href="/articles" className="text-sm text-peach-600 hover:underline">
          ← กลับไปบทความทั้งหมด
        </Link>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-teal-700 font-bold">
          แท็กบทความ
        </h1>
        <p className="text-ink/60 mt-1 text-sm">คลิกแท็กที่สนใจเพื่อดูบทความที่เกี่ยวข้อง</p>
      </header>

      {tags.length === 0 ? (
        <div className="rounded-xl border border-dashed border-peach-200 py-16 text-center text-ink/50">
          ยังไม่มีแท็ก
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <Link
              key={t.id}
              href={`/tag/${t.slug}`}
              className="group inline-flex items-center gap-1.5 rounded-full bg-white border border-peach-200 hover:border-peach-400 hover:bg-peach-50 transition px-3.5 py-1.5"
            >
              <Hash className="w-3.5 h-3.5 text-peach-500" />
              <span className="text-sm text-ink/80 group-hover:text-peach-700">
                {t.name}
              </span>
              <span className="text-[11px] text-ink/40">{t.count}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
