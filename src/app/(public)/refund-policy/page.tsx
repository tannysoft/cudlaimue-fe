import { notFound } from "next/navigation";
import { wpGetPageBySlug } from "@/lib/wp/client";

export const revalidate = 600;

export const metadata = { title: "นโยบายการคืนเงิน" };

export default async function RefundPolicyPage() {
  const p = await wpGetPageBySlug("refund-policy").catch(() => null);
  if (!p) return notFound();
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1
        className="font-[family-name:var(--font-display)] text-3xl md:text-4xl text-teal-700 font-extrabold leading-tight"
        dangerouslySetInnerHTML={{ __html: p.title.rendered }}
      />
      <div
        className="prose prose-cudlaimue mt-6 max-w-none"
        dangerouslySetInnerHTML={{ __html: p.content.rendered }}
      />
    </article>
  );
}
