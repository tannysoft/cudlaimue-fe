"use client";
import { Fragment, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import {
  Package,
  Pencil,
  Plus,
  MoreHorizontal,
  Trash2,
  AlertTriangle,
  Star,
  X,
} from "lucide-react";
import { formatTHB } from "@/lib/utils";
import { Pager } from "@/components/admin/pager";
import { SearchBox } from "@/components/admin/search-box";

type Row = {
  id: string;
  type: "font" | "ebook" | "template";
  slug: string;
  name: string;
  coverImageKey: string | null;
  priceSatang: number;
  compareAtPriceSatang: number | null;
  isPublished: boolean;
  isFeatured: boolean;
};

export function ProductsView({
  products,
  page,
  totalPages,
  total,
  q,
  counts,
}: {
  products: Row[];
  page: number;
  totalPages: number;
  total: number;
  q: string;
  counts: { fonts: number; ebooks: number; templates: number };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState<Row | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function doDelete() {
    if (!confirmDelete) return;
    start(async () => {
      setErr(null);
      const r = await fetch(`/api/admin/products/${confirmDelete.id}`, {
        method: "DELETE",
      });
      if (!r.ok) {
        const data = (await r.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
        };
        setErr(data.message ?? data.error ?? `ลบไม่สำเร็จ (HTTP ${r.status})`);
        setConfirmDelete(null);
      } else {
        setConfirmDelete(null);
        router.refresh();
      }
    });
  }

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-800 font-bold">
            สินค้า
          </h1>
          <p className="text-ink/60 text-sm mt-1">
            ทั้งหมด {total} รายการ · หน้า {page}: ฟอนต์ {counts.fonts} · เทมเพลต{" "}
            {counts.templates} · อีบุ๊ก {counts.ebooks}
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-2 bg-peach-500 hover:bg-peach-600 text-white rounded-full px-5 py-2.5 text-sm font-medium shadow-sm"
        >
          <Plus className="w-4 h-4" /> เพิ่มสินค้า
        </Link>
      </header>

      {err && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1">{err}</div>
          <button
            onClick={() => setErr(null)}
            className="text-red-500 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-peach-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-peach-100 flex items-center gap-3">
          <SearchBox
            baseHref="/admin/products"
            q={q}
            placeholder="ค้นหาจากชื่อหรือ slug…"
          />
        </div>

        {products.length === 0 ? (
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-ink/50 border-b border-peach-100 bg-[#fcf8f1]">
                  <th className="text-left px-5 py-3 font-medium">สินค้า</th>
                  <th className="text-left px-4 py-3 font-medium">ประเภท</th>
                  <th className="text-left px-4 py-3 font-medium">ราคา</th>
                  <th className="text-left px-4 py-3 font-medium">สถานะ</th>
                  <th className="text-left px-4 py-3 font-medium">เด่น</th>
                  <th className="w-24 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
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
                          <div className="text-xs text-ink/40 font-mono">
                            /{p.slug}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <TypePill type={p.type} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-teal-700">
                        {formatTHB(p.priceSatang)}
                      </div>
                      {p.compareAtPriceSatang ? (
                        <div className="text-xs text-ink/40 line-through">
                          {formatTHB(p.compareAtPriceSatang)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {p.isPublished ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-teal-100 text-teal-700 rounded-full px-2 py-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />{" "}
                          เผยแพร่
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs bg-ink/10 text-ink/60 rounded-full px-2 py-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-ink/30" />{" "}
                          ฉบับร่าง
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
                      <div className="inline-flex items-center gap-1 justify-end">
                        <Link
                          href={`/admin/products/${p.id}`}
                          title="แก้ไข"
                          className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-ink/50 hover:text-peach-600 hover:bg-peach-50 transition"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <RowMenu
                          onDelete={() => setConfirmDelete(p)}
                          disabled={pending}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

      <ConfirmDialog
        open={!!confirmDelete}
        title={confirmDelete ? `ลบสินค้า "${confirmDelete.name}"?` : ""}
        message="การลบย้อนกลับไม่ได้ จะลบรูปปก รูปตัวอย่าง และไฟล์สินค้าทั้งหมดออกจาก R2 ด้วย หากสินค้านี้เคยถูกสั่งซื้อแล้วจะไม่สามารถลบได้ — ให้ปิดการเผยแพร่แทน"
        confirmLabel="ลบสินค้า"
        pending={pending}
        onClose={() => setConfirmDelete(null)}
        onConfirm={doDelete}
      />
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

function RowMenu({
  onDelete,
  disabled,
}: {
  onDelete: () => void;
  disabled: boolean;
}) {
  return (
    <Menu as="div" className="relative inline-block">
      <MenuButton
        disabled={disabled}
        className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-ink/50 hover:text-ink hover:bg-peach-100 transition"
      >
        <MoreHorizontal className="w-4 h-4" />
      </MenuButton>
      <MenuItems
        anchor={{ to: "bottom end", gap: 4 }}
        className="w-44 rounded-xl bg-white border border-peach-100 shadow-lg p-1 z-50 focus:outline-none"
      >
        <MenuItem>
          {({ focus }) => (
            <button
              onClick={onDelete}
              className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                focus ? "bg-red-50 text-red-700" : "text-red-600"
              }`}
            >
              <Trash2 className="w-4 h-4" />
              ลบสินค้า
            </button>
          )}
        </MenuItem>
      </MenuItems>
    </Menu>
  );
}

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  pending,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm" aria-hidden />
        </TransitionChild>
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <DialogPanel className="w-full max-w-sm rounded-2xl bg-white border border-peach-100 shadow-xl p-6">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <DialogTitle className="font-semibold text-ink/90">
                    {title}
                  </DialogTitle>
                  <p className="mt-1.5 text-sm text-ink/60">{message}</p>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={onClose}
                  disabled={pending}
                  className="rounded-full px-4 py-2 text-sm text-ink/60 hover:text-ink disabled:opacity-60"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={onConfirm}
                  disabled={pending}
                  className="rounded-full bg-red-500 hover:bg-red-600 text-white px-5 py-2 text-sm font-medium disabled:opacity-60"
                >
                  {pending ? "กำลังลบ…" : confirmLabel}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
