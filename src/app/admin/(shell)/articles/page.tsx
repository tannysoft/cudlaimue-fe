import Link from "next/link";
import { ExternalLink, FileText } from "lucide-react";
import { wpListArticles } from "@/lib/wp/client";

export const dynamic = "force-dynamic";

export default async function AdminArticlesPage() {
  let posts: Awaited<ReturnType<typeof wpListArticles>>["posts"] = [];
  let err: string | null = null;
  try {
    const r = await wpListArticles({ perPage: 50 });
    posts = r.posts;
  } catch (e) {
    err = String(e);
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-800 font-bold">
          บทความ
        </h1>
        <p className="text-ink/60 text-sm mt-1">
          ดึงจาก WordPress แบบ headless — จัดการเนื้อหาผ่าน WP เดิม{" "}
          <a
            href="https://www.cudlaimue.com/wp-admin"
            target="_blank"
            className="text-peach-600 hover:underline inline-flex items-center gap-1"
          >
            เปิด WP Admin <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </header>

      <div className="bg-white rounded-2xl border border-peach-100 overflow-hidden">
        {err ? (
          <div className="py-16 text-center text-red-500 text-sm px-6">
            ไม่สามารถเชื่อมต่อ WordPress ได้: {err}
          </div>
        ) : posts.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-peach-100 text-peach-600 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <div className="mt-4 font-medium text-ink/70">ยังไม่มีบทความ</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-ink/50 border-b border-peach-100 bg-[#fcf8f1]">
                <th className="text-left px-5 py-3 font-medium">ชื่อเรื่อง</th>
                <th className="text-left px-4 py-3 font-medium">Slug</th>
                <th className="text-left px-4 py-3 font-medium">วันที่</th>
                <th className="w-32 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {posts.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-peach-100 last:border-0 hover:bg-peach-50/60 transition"
                >
                  <td
                    className="px-5 py-3 font-medium"
                    dangerouslySetInnerHTML={{ __html: a.title.rendered }}
                  />
                  <td className="px-4 py-3 text-xs font-mono text-ink/50">{a.slug}</td>
                  <td className="px-4 py-3 text-xs text-ink/50 whitespace-nowrap">
                    {new Date(a.date).toLocaleDateString("th-TH")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/articles/${a.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-peach-600 hover:underline text-sm"
                    >
                      ดูหน้าเว็บ <ExternalLink className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
