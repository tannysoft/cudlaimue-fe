import { ImportView } from "@/components/admin/import-view";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  return (
    <div>
      <header className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-800 font-bold">
          นำเข้าจาก WordPress
        </h1>
        <p className="text-ink/60 text-sm mt-1">
          ดึงสินค้าจาก WooCommerce ของ cudlaimue.com — รูปปก + ไฟล์ดาวน์โหลดจะถูกอัปโหลดขึ้น R2 อัตโนมัติ
        </p>
      </header>
      <ImportView />
    </div>
  );
}
