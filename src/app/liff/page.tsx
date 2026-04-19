import { LiffBootstrap } from "@/components/liff/bootstrap";
import { env } from "@/lib/cf";

export const metadata = { title: "คัดลายมือ · LIFF" };
export const dynamic = "force-dynamic";

export default function LiffPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const liffId = env().LIFF_ID;
  return <LiffBootstrap liffId={liffId} searchParams={searchParams} />;
}
