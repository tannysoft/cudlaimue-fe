"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Upload,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  AlertTriangle,
  Trash2,
  Type,
  BookOpen,
  LayoutTemplate,
  RefreshCcw,
} from "lucide-react";
import type { Product } from "@/lib/db/schema";
import { Select, type SelectOption } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RichEditor } from "@/components/ui/rich-editor";
import { TagInput } from "@/components/ui/tag-input";
import { GalleryUpload } from "@/components/ui/gallery-upload";
import { FilesUpload, type UploadedFile } from "@/components/ui/files-upload";
import { productFiles } from "@/lib/product-files";

type ProductType = "font" | "ebook" | "template";

const typeOptions: SelectOption<ProductType>[] = [
  {
    value: "font",
    label: "Font",
    description: "ไฟล์ .ttf / .otf ดาวน์โหลดได้หลังซื้อ",
    icon: <Type className="w-4 h-4 text-peach-500" />,
  },
  {
    value: "ebook",
    label: "Ebook",
    description: "อ่านออนไลน์ ฝังลายน้ำรายผู้ซื้อ",
    icon: <BookOpen className="w-4 h-4 text-teal-500" />,
  },
  {
    value: "template",
    label: "Template",
    description: "ไฟล์เทมเพลต .psd / .ai / .zip ดาวน์โหลดได้หลังซื้อ",
    icon: <LayoutTemplate className="w-4 h-4 text-teal-600" />,
  },
];

const ACCEPT_BY_TYPE: Record<ProductType, { accept: string; label: string }> = {
  font: { accept: ".ttf,.otf,.woff,.woff2", label: ".ttf / .otf / .woff" },
  ebook: { accept: ".pdf", label: ".pdf" },
  template: {
    accept:
      ".rar,.7z,.psd,.ai,.eps,.pdf,.pptx,.docx,.xlsx,.fig,.xd,.sketch,.key,.pages,.numbers,.indd,.png,.jpg,.jpeg,.webp,.gif,.svg,.tif,.tiff,.avif",
    label: ".psd / .ai / .pdf / .png / .svg / …",
  },
};

function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function ProductEditor({ product }: { product?: Product }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [type, setType] = useState<ProductType>((product?.type as ProductType) ?? "font");
  const [published, setPublished] = useState<boolean>(product?.isPublished ?? false);
  const [featured, setFeatured] = useState<boolean>(product?.isFeatured ?? false);
  const [error, setError] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(
    product?.coverImageKey ? `/api/assets/${product.coverImageKey}` : null,
  );
  const [assetName, setAssetName] = useState<string | null>(product?.fileName ?? null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const initialTags = parseJsonArray(product?.tags);
  const initialCategories = parseJsonArray(product?.categories);
  const initialPreviews = parseJsonArray(product?.previewImageKeys);
  const initialFiles: UploadedFile[] = product
    ? productFiles(product).map((f) => ({ key: f.key, name: f.name, size: f.size }))
    : [];

  const accept = ACCEPT_BY_TYPE[type];
  const multiFile = type === "font" || type === "template";

  async function upload(kind: "cover" | "file", file: File): Promise<string> {
    const fd = new FormData();
    fd.append("kind", kind);
    fd.append("productId", product?.id ?? "new");
    fd.append("file", file);
    const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
    if (!r.ok) throw new Error(await r.text());
    const d = (await r.json()) as { key: string };
    return d.key;
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    start(async () => {
      try {
        const payload = {
          id: product?.id,
          type,
          slug: String(form.get("slug") ?? ""),
          name: String(form.get("name") ?? ""),
          tagline: String(form.get("tagline") ?? ""),
          description: String(form.get("description") ?? ""),
          priceSatang: Math.round(Number(form.get("price") ?? 0) * 100),
          compareAtPriceSatang: form.get("compareAt")
            ? Math.round(Number(form.get("compareAt")) * 100)
            : null,
          tags: String(form.get("tags") ?? "[]"),
          categories: String(form.get("categories") ?? "[]"),
          previewImageKeys: String(form.get("previewImageKeys") ?? "[]"),
          // For font/template the FilesUpload widget already uploaded every
          // file and emits the final JSON list as the `files` hidden input.
          // For ebook we keep the legacy single-file flow below.
          files: multiFile ? String(form.get("files") ?? "[]") : undefined,
          isPublished: published,
          isFeatured: featured,
          sortOrder: Number(form.get("sortOrder") ?? 0),
        };

        const coverFile = (form.get("coverFile") as File) ?? null;
        const assetFile = (form.get("assetFile") as File) ?? null;

        const res = await fetch("/api/admin/products", {
          method: product ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        const saved = (await res.json()) as { id: string };
        const pid = saved.id;

        if (coverFile && coverFile.size > 0) {
          const coverKey = await upload("cover", coverFile);
          await fetch("/api/admin/products", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: pid, coverImageKey: coverKey }),
          });
        }
        if (!multiFile && assetFile && assetFile.size > 0) {
          // Ebook: single PDF for rasterize
          const key = await upload("file", assetFile);
          await fetch("/api/admin/products", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: pid,
              fileKey: key,
              fileName: assetFile.name,
              fileSize: assetFile.size,
            }),
          });
          if (type === "ebook") {
            await fetch(`/api/admin/ebooks/${pid}/rasterize`, { method: "POST" });
          }
        }
        router.push("/admin/products");
        router.refresh();
      } catch (err) {
        setError(String(err));
      }
    });
  }

  function doDelete() {
    if (!product) return;
    setError(null);
    start(async () => {
      try {
        const r = await fetch(`/api/admin/products/${product.id}`, {
          method: "DELETE",
        });
        if (!r.ok) {
          const d = (await r.json().catch(() => ({}))) as {
            message?: string;
            error?: string;
          };
          throw new Error(d.message ?? d.error ?? `HTTP ${r.status}`);
        }
        router.push("/admin/products");
        router.refresh();
      } catch (err) {
        setConfirmDelete(false);
        setError(String(err instanceof Error ? err.message : err));
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6 pb-32">
      <div>
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1 text-sm text-ink/60 hover:text-peach-600"
        >
          <ArrowLeft className="w-4 h-4" /> กลับไปรายการสินค้า
        </Link>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
        {/* LEFT — main fields */}
        <div className="space-y-6">
          <Card title="ข้อมูลพื้นฐาน" subtitle="ชื่อ คำอธิบาย และ slug สำหรับลิงก์หน้าเว็บ">
            <div className="grid grid-cols-3 gap-3">
              <Field label="ประเภท" className="col-span-1">
                <Select<ProductType> value={type} onChange={setType} options={typeOptions} />
              </Field>
              <Field label="ชื่อสินค้า" className="col-span-2">
                <input required name="name" defaultValue={product?.name ?? ""} className="ipt" />
              </Field>
            </div>
            <Field label="Slug (URL)">
              <div className="flex items-center rounded-xl border border-peach-200 bg-cream/40 overflow-hidden focus-within:border-peach-500 focus-within:bg-white focus-within:ring-3 focus-within:ring-peach-500/15 transition">
                <span className="pl-3 pr-1 text-xs text-ink/50">
                  /{type === "font" ? "fonts" : type === "ebook" ? "ebooks" : "templates"}/
                </span>
                <input
                  required
                  name="slug"
                  defaultValue={product?.slug ?? ""}
                  className="flex-1 bg-transparent px-1 py-2.5 text-sm outline-none"
                  placeholder="my-awesome-font"
                />
              </div>
            </Field>
            <Field label="หัวข้อย่อย (tagline)">
              <input
                name="tagline"
                defaultValue={product?.tagline ?? ""}
                className="ipt"
                placeholder="ฟอนต์ลายมือที่ใช้ได้ทุกโอกาส"
              />
            </Field>
            <Field label="คำอธิบาย">
              <RichEditor
                name="description"
                defaultValue={product?.description ?? ""}
                placeholder="เขียนรายละเอียดสินค้า ข้อมูลจำเพาะ เงื่อนไขการใช้งาน…"
              />
            </Field>
          </Card>

          <Card title="หมวดหมู่ & แท็ก" subtitle="ใช้จัดกลุ่มและกรองสินค้าในหน้าร้าน">
            <Field label="หมวดหมู่">
              <TagInput
                name="categories"
                defaultValues={initialCategories}
                placeholder="เช่น ฟอนต์ลายมือ, ฟอนต์วินเทจ"
                accent="teal"
              />
            </Field>
            <Field label="แท็ก">
              <TagInput
                name="tags"
                defaultValues={initialTags}
                placeholder="เช่น น่ารัก, หวาน, มินิมอล"
                accent="peach"
              />
            </Field>
          </Card>

          <Card title="สื่อ" subtitle="รูปปก รูปในแกลเลอรี และไฟล์สินค้าจริง">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-ink/70 mb-2 block">รูปปก</label>
                <label className="group cursor-pointer block rounded-xl border-2 border-dashed border-peach-200 hover:border-peach-400 hover:bg-peach-50/40 transition overflow-hidden">
                  {coverPreview ? (
                    <div className="relative aspect-[4/3]">
                      <Image src={coverPreview} alt="" fill className="object-cover" unoptimized />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center text-white opacity-0 group-hover:opacity-100 text-sm">
                        เปลี่ยนรูป
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-[4/3] flex flex-col items-center justify-center text-ink/50 gap-2">
                      <ImageIcon className="w-7 h-7" />
                      <span className="text-xs">คลิกเพื่ออัปโหลด (jpg/png/webp)</span>
                    </div>
                  )}
                  <input
                    name="coverFile"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setCoverPreview(URL.createObjectURL(f));
                    }}
                  />
                </label>
              </div>

              <div>
                <label className="text-xs font-medium text-ink/70 mb-2 block">
                  {type === "font"
                    ? `ไฟล์ฟอนต์ (${accept.label}) — หลายไฟล์ได้`
                    : type === "ebook"
                    ? "ไฟล์อีบุ๊ก (.pdf)"
                    : `ไฟล์เทมเพลต (${accept.label}) — หลายไฟล์ได้`}
                </label>
                {multiFile ? (
                  <FilesUpload
                    name="files"
                    productId={product?.id ?? "new"}
                    defaultFiles={initialFiles}
                    accept={accept.accept}
                  />
                ) : (
                  <label className="group cursor-pointer block rounded-xl border-2 border-dashed border-peach-200 hover:border-peach-400 hover:bg-peach-50/40 transition">
                    <div className="aspect-[4/3] flex flex-col items-center justify-center text-ink/50 gap-2 px-3 text-center">
                      {assetName ? (
                        <>
                          <FileText className="w-7 h-7 text-peach-500" />
                          <div className="text-xs font-medium text-ink/80 truncate max-w-full">
                            {assetName}
                          </div>
                          {product?.fileSize && (
                            <div className="text-[10px] text-ink/50">
                              {(product.fileSize / 1024 / 1024).toFixed(1)} MB
                              {product.pageCount ? ` · ${product.pageCount} หน้า` : null}
                            </div>
                          )}
                          <div className="text-[10px] text-peach-600 mt-1">คลิกเพื่อเปลี่ยนไฟล์</div>
                        </>
                      ) : (
                        <>
                          <Upload className="w-7 h-7" />
                          <span className="text-xs">คลิกเพื่ออัปโหลด {accept.label}</span>
                        </>
                      )}
                    </div>
                    <input
                      name="assetFile"
                      type="file"
                      accept={accept.accept}
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setAssetName(f.name);
                      }}
                    />
                  </label>
                )}
                {type === "ebook" && (
                  <p className="mt-2 text-[11px] text-ink/50 leading-relaxed">
                    ระบบจะแปลงแต่ละหน้า PDF → ภาพ PNG ฝังลายน้ำรายผู้ซื้ออัตโนมัติ
                    ไฟล์ต้นฉบับจะไม่ถูกส่งให้ผู้อ่าน
                  </p>
                )}
                {product?.sourceWcId && <RefetchWcFiles productId={product.id} />}
              </div>
            </div>

            <Field label="แกลเลอรีตัวอย่าง">
              <GalleryUpload
                name="previewImageKeys"
                productId={product?.id ?? "new"}
                defaultKeys={initialPreviews}
                max={8}
              />
            </Field>
          </Card>
        </div>

        {/* RIGHT — pricing + visibility */}
        <div className="space-y-6 lg:sticky lg:top-6">
          <Card title="ราคา" subtitle="ระบุเป็นบาท">
            <Field label="ราคาขาย (บาท)">
              <input
                required
                type="number"
                step="0.01"
                name="price"
                defaultValue={((product?.priceSatang ?? 0) / 100).toString()}
                className="ipt text-lg font-semibold"
                placeholder="89"
              />
            </Field>
            <Field label="ราคาก่อนลด (บาท) — ไม่บังคับ">
              <input
                type="number"
                step="0.01"
                name="compareAt"
                defaultValue={
                  product?.compareAtPriceSatang
                    ? (product.compareAtPriceSatang / 100).toString()
                    : ""
                }
                className="ipt"
                placeholder="129"
              />
            </Field>
          </Card>

          <Card title="การแสดงผล">
            <Switch
              checked={published}
              onChange={setPublished}
              label="เผยแพร่"
              description="ให้ผู้ซื้อเห็นในหน้าเว็บ"
            />
            <Switch
              checked={featured}
              onChange={setFeatured}
              label="แนะนำในหน้าแรก"
              description="แสดงใน section สินค้าแนะนำ"
            />
            <Field label="ลำดับการแสดง (sort order)">
              <input
                type="number"
                name="sortOrder"
                defaultValue={product?.sortOrder ?? 0}
                className="ipt"
              />
              <p className="text-[11px] text-ink/50 mt-1">ค่าที่มากขึ้น = อยู่บนสุด</p>
            </Field>
          </Card>

          {product && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={pending}
                className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 disabled:opacity-60"
              >
                <Trash2 className="w-4 h-4" /> ลบสินค้านี้
              </button>
            </div>
          )}
        </div>
      </div>

      {confirmDelete && product && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-ink/90">
                  ลบสินค้า &ldquo;{product.name}&rdquo;?
                </h3>
                <p className="mt-1.5 text-sm text-ink/60">
                  การลบนี้ย้อนกลับไม่ได้ จะลบรายการดังต่อไปนี้อย่างถาวร:
                </p>
                <ul className="mt-2 text-sm text-ink/70 list-disc pl-5 space-y-1">
                  <li>รูปปกและรูปตัวอย่างทั้งหมด</li>
                  <li>
                    ไฟล์สินค้าที่อัปโหลดไว้
                    {product.type === "ebook" ? " (รวมหน้า PDF ที่แปลงแล้ว)" : ""}
                  </li>
                  <li>สิทธิ์การเข้าถึง (entitlements) ของผู้ใช้ที่เคยรับของฟรี</li>
                </ul>
                <p className="mt-2 text-xs text-ink/50">
                  * หากมีออเดอร์ที่เคยซื้อสินค้านี้ ระบบจะไม่ให้ลบ —
                  ให้ปิดการเผยแพร่แทน
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={pending}
                className="rounded-full px-4 py-2 text-sm text-ink/60 hover:text-ink disabled:opacity-60"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={doDelete}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-full bg-red-500 hover:bg-red-600 text-white px-5 py-2 text-sm font-medium disabled:opacity-60"
              >
                <Trash2 className="w-4 h-4" />
                {pending ? "กำลังลบ…" : "ยืนยันลบ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky footer bar */}
      <div className="fixed bottom-0 left-0 lg:left-64 right-0 z-20 bg-[#faf6ec] border-t border-peach-100 shadow-[0_-8px_24px_rgba(0,0,0,0.04)]">
        <div className="max-w-[1400px] px-4 md:px-10 py-3 flex items-center gap-3">
            {error && (
              <div className="flex-1 flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            <div className="ml-auto flex items-center gap-3">
              <Link
                href="/admin/products"
                className="text-sm text-ink/60 hover:text-ink px-4 py-2.5"
              >
                ยกเลิก
              </Link>
              <button
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-full bg-peach-500 hover:bg-peach-600 text-white px-6 py-2.5 text-sm font-medium shadow-sm disabled:opacity-60"
              >
                {pending ? (
                  <>กำลังบันทึก…</>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> บันทึก
                  </>
                )}
              </button>
            </div>
          </div>
      </div>

      <style>{`
        .ipt {
          width: 100%;
          border: 1px solid #f7cfa5;
          background: rgba(250, 244, 236, 0.4);
          padding: 10px 12px;
          border-radius: 12px;
          outline: none;
          font-size: 14px;
          transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
        }
        .ipt:focus {
          border-color: #ee9050;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(238, 144, 80, 0.12);
        }
      `}</style>
    </form>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-peach-100 p-5">
      <header className="mb-4">
        <h3 className="font-semibold text-teal-700">{title}</h3>
        {subtitle && <p className="text-xs text-ink/50 mt-0.5">{subtitle}</p>}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-medium text-ink/70">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function RefetchWcFiles({ productId }: { productId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [detail, setDetail] = useState<unknown>(null);

  async function run() {
    setPending(true);
    setMsg(null);
    setDetail(null);
    try {
      const r = await fetch(`/api/admin/products/${productId}/refetch-wc-files`, {
        method: "POST",
      });
      const d = (await r.json().catch(() => ({}))) as {
        uploaded?: number;
        errors?: Array<{ file: string; error: string }>;
        message?: string;
        error?: string;
        wcDownloadable?: boolean;
        wcDownloadsRaw?: Array<{ name?: string; file?: string }>;
      };
      if (!r.ok) {
        setMsg(d.message ?? d.error ?? `HTTP ${r.status}`);
        setDetail({
          wcDownloadable: d.wcDownloadable,
          wcDownloadsRaw: d.wcDownloadsRaw,
        });
        return;
      }
      const errSuffix = d.errors?.length
        ? ` · ล้มเหลว ${d.errors.length} ไฟล์`
        : "";
      setMsg(`ดึงไฟล์สำเร็จ ${d.uploaded ?? 0} ไฟล์${errSuffix}`);
      if (d.errors?.length) setDetail({ errors: d.errors });
      router.refresh();
    } catch (e) {
      setMsg(String(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl bg-cream/60 border border-peach-100 p-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-full border border-peach-200 bg-white hover:border-peach-400 hover:bg-peach-50 text-peach-700 text-xs font-medium px-3 py-1.5 transition disabled:opacity-60"
        >
          <RefreshCcw className={`w-3.5 h-3.5 ${pending ? "animate-spin" : ""}`} />
          {pending ? "กำลังดึง…" : "ดึงไฟล์จาก WP ใหม่"}
        </button>
        <span className="text-[11px] text-ink/50">
          ใช้กรณีไฟล์หายหรือ import ไม่ครบ
        </span>
      </div>
      {msg && (
        <div className="mt-2 text-[11px] text-ink/70 leading-relaxed">{msg}</div>
      )}
      {detail !== null && (
        <pre className="mt-2 bg-white/60 rounded-md p-2 text-[10px] text-ink/60 overflow-x-auto max-h-40">
          {JSON.stringify(detail, null, 2)}
        </pre>
      )}
    </div>
  );
}
