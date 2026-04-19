import { ProductEditor } from "@/components/admin/product-editor";

export default function NewProductPage() {
  return (
    <div>
      <header className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-800 font-bold">
          เพิ่มสินค้าใหม่
        </h1>
        <p className="text-ink/60 text-sm mt-1">
          กรอกรายละเอียดสินค้า อัปโหลดไฟล์ แล้วตั้งสถานะเผยแพร่เมื่อพร้อมขาย
        </p>
      </header>
      <ProductEditor />
    </div>
  );
}
