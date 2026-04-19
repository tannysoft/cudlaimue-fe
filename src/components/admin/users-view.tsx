"use client";
import { useState, useTransition } from "react";
import Image from "next/image";
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
  Users as UsersIcon,
  Shield,
  Plus,
  MoreHorizontal,
  Ban,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Image as ImageIcon,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";
import { initial } from "@/lib/utils";
import { Pager } from "@/components/admin/pager";
import { SearchBox } from "@/components/admin/search-box";

type Row = {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  lineUserId: string | null;
  role: string;
  isBanned: boolean;
  createdAt: number;
  orderCount: number;
  paidCount: number;
};

export function UsersView({
  users,
  currentAdminId,
  page,
  totalPages,
  total,
  q,
}: {
  users: Row[];
  currentAdminId: string;
  page: number;
  totalPages: number;
  total: number;
  q: string;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Row | null>(null);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const admins = users.filter((u) => u.role === "admin").length;

  function toggleBan(u: Row) {
    start(async () => {
      setErr(null);
      const r = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBanned: !u.isBanned }),
      });
      if (!r.ok) setErr(await r.text());
      router.refresh();
    });
  }

  function fetchLineAvatars() {
    start(async () => {
      setErr(null);
      const r = await fetch("/api/admin/users/fetch-line-avatars", { method: "POST" });
      const d = (await r.json().catch(() => ({}))) as {
        attempted?: number;
        success?: number;
        notFound?: number;
        failed?: number;
        remaining?: number;
        message?: string;
        error?: string;
      };
      if (!r.ok) {
        setErr(d.message ?? d.error ?? "ดึง avatar ไม่สำเร็จ");
        return;
      }
      router.refresh();
      alert(
        `ดึงแล้ว ${d.attempted ?? 0} คน · สำเร็จ ${d.success ?? 0} · ` +
          `ไม่พบ (ไม่ใช่เพื่อน OA) ${d.notFound ?? 0} · ล้มเหลว ${d.failed ?? 0}\n` +
          `เหลือที่ยังไม่มี avatar: ${d.remaining ?? 0}`,
      );
    });
  }

  function doDelete() {
    if (!confirmDelete) return;
    start(async () => {
      setErr(null);
      const r = await fetch(`/api/admin/users/${confirmDelete.id}`, { method: "DELETE" });
      if (!r.ok) {
        const data = (await r.json().catch(() => ({}))) as { message?: string; error?: string };
        setErr(data.message ?? data.error ?? "ลบไม่สำเร็จ");
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
            ผู้ใช้
          </h1>
          <p className="text-ink/60 text-sm mt-1">
            ทั้งหมด {total} คน · หน้า {page}: แอดมิน {admins}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchLineAvatars}
            disabled={pending}
            title="ดึงรูป + ชื่อของ user ที่มี LINE ID แต่ยังไม่มี avatar ผ่าน Messaging API"
            className="inline-flex items-center gap-2 bg-[#06C755]/10 hover:bg-[#06C755]/20 text-[#06C755] rounded-full px-4 py-2.5 text-sm font-medium disabled:opacity-60"
          >
            <ImageIcon className="w-4 h-4" /> ดึงรูปจาก LINE
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 bg-peach-500 hover:bg-peach-600 text-white rounded-full px-5 py-2.5 text-sm font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" /> เพิ่มแอดมิน
          </button>
        </div>
      </header>

      {err && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1">{err}</div>
          <button onClick={() => setErr(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-peach-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-peach-100 flex items-center gap-3">
          <SearchBox
            baseHref="/admin/users"
            q={q}
            placeholder="ค้นหาจากอีเมล / ชื่อ / เบอร์ / LINE ID…"
          />
        </div>
        {users.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-peach-100 text-peach-600 flex items-center justify-center mx-auto">
              <UsersIcon className="w-6 h-6" />
            </div>
            <div className="mt-4 font-medium text-ink/70">
              {q ? `ไม่พบผู้ใช้ที่ตรงกับ "${q}"` : "ยังไม่มีผู้ใช้"}
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-ink/50 border-b border-peach-100 bg-[#fcf8f1]">
                <th className="text-left px-5 py-3 font-medium">ผู้ใช้</th>
                <th className="text-left px-4 py-3 font-medium">อีเมล</th>
                <th className="text-left px-4 py-3 font-medium">คำสั่งซื้อ</th>
                <th className="text-left px-4 py-3 font-medium">บทบาท</th>
                <th className="text-left px-4 py-3 font-medium">สถานะ</th>
                <th className="text-left px-4 py-3 font-medium">สมัครเมื่อ</th>
                <th className="w-12 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-peach-100 last:border-0 hover:bg-peach-50/60 transition"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {u.avatarUrl ? (
                        <Image
                          src={u.avatarUrl}
                          alt=""
                          width={32}
                          height={32}
                          className="rounded-full"
                          unoptimized
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-peach-300 to-peach-500 text-white flex items-center justify-center text-xs font-semibold">
                          {initial(u.displayName ?? u.email)}
                        </div>
                      )}
                      <span className="font-medium">
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="text-teal-800 hover:text-peach-600"
                        >
                          {u.displayName ?? "—"}
                        </Link>
                        {u.id === currentAdminId && (
                          <span className="ml-2 text-[10px] bg-teal-100 text-teal-700 rounded-full px-2 py-0.5">
                            คุณ
                          </span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink/70">{u.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <OrderStats total={u.orderCount} paid={u.paidCount} />
                  </td>
                  <td className="px-4 py-3">
                    {u.role === "admin" ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-peach-500 text-white rounded-full px-2 py-0.5">
                        <Shield className="w-3 h-3" /> admin
                      </span>
                    ) : (
                      <span className="text-xs bg-ink/10 text-ink/60 rounded-full px-2 py-0.5">user</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.isBanned ? (
                      <span className="text-xs bg-red-100 text-red-700 rounded-full px-2 py-0.5">
                        ถูกแบน
                      </span>
                    ) : (
                      <span className="text-xs bg-teal-100 text-teal-700 rounded-full px-2 py-0.5">
                        ปกติ
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink/50 whitespace-nowrap">
                    {new Date(u.createdAt).toLocaleString("th-TH", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1 justify-end">
                      <Link
                        href={`/admin/users/${u.id}`}
                        title="ดูรายละเอียด"
                        className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-ink/50 hover:text-peach-600 hover:bg-peach-50 transition"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      {u.id !== currentAdminId && (
                        <RowMenu
                          user={u}
                          onBan={() => toggleBan(u)}
                          onDelete={() => setConfirmDelete(u)}
                          disabled={pending}
                        />
                      )}
                    </div>
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
          baseHref="/admin/users"
          label="คน"
          extraParams={{ q }}
        />
      </div>

      <AddAdminDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => {
          setAddOpen(false);
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="ลบผู้ใช้"
        message={
          confirmDelete
            ? `คุณต้องการลบ "${confirmDelete.displayName ?? confirmDelete.email}" ถาวรใช่ไหม? การดำเนินการนี้ย้อนกลับไม่ได้`
            : ""
        }
        confirmLabel="ลบผู้ใช้"
        confirmVariant="danger"
        pending={pending}
        onClose={() => setConfirmDelete(null)}
        onConfirm={doDelete}
      />
    </div>
  );
}

function OrderStats({ total, paid }: { total: number; paid: number }) {
  if (total === 0) {
    return <span className="text-xs text-ink/30">—</span>;
  }
  const other = total - paid;
  return (
    <div className="flex items-center gap-1.5">
      {paid > 0 && (
        <span className="inline-flex items-center gap-1 text-xs bg-teal-100 text-teal-700 rounded-full px-2 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
          {paid} จ่าย
        </span>
      )}
      {other > 0 && (
        <span className="inline-flex items-center gap-1 text-xs bg-ink/5 text-ink/50 rounded-full px-2 py-0.5">
          {other} รอ/อื่น
        </span>
      )}
    </div>
  );
}

function RowMenu({
  user,
  onBan,
  onDelete,
  disabled,
}: {
  user: Row;
  onBan: () => void;
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
        className="w-48 rounded-xl bg-white border border-peach-100 shadow-lg p-1 z-50 focus:outline-none"
      >
        <MenuItem>
          {({ focus }) => (
            <button
              onClick={onBan}
              className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                focus ? "bg-peach-50 text-peach-700" : "text-ink/80"
              }`}
            >
              <Ban className="w-4 h-4" />
              {user.isBanned ? "ยกเลิกแบน" : "แบนผู้ใช้"}
            </button>
          )}
        </MenuItem>
        <MenuItem>
          {({ focus }) => (
            <button
              onClick={onDelete}
              className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                focus ? "bg-red-50 text-red-700" : "text-red-600"
              }`}
            >
              <Trash2 className="w-4 h-4" />
              ลบผู้ใช้
            </button>
          )}
        </MenuItem>
      </MenuItems>
    </Menu>
  );
}

function AddAdminDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const form = new FormData(e.currentTarget);
    start(async () => {
      const r = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email") ?? ""),
          displayName: String(form.get("displayName") ?? ""),
          password: String(form.get("password") ?? ""),
          role: "admin",
        }),
      });
      if (!r.ok) {
        const data = (await r.json().catch(() => ({}))) as { error?: string };
        if (data.error === "email_in_use") setErr("อีเมลนี้ถูกใช้แล้ว");
        else setErr(data.error ?? "สร้างไม่สำเร็จ");
      } else {
        onCreated();
      }
    });
  }

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
            enterFrom="opacity-0 scale-95 translate-y-2"
            enterTo="opacity-100 scale-100 translate-y-0"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <DialogPanel className="w-full max-w-md rounded-2xl bg-white border border-peach-100 shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-peach-100">
                <DialogTitle className="font-[family-name:var(--font-display)] text-lg text-teal-700 font-bold">
                  เพิ่มแอดมินใหม่
                </DialogTitle>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg text-ink/50 hover:bg-peach-100 hover:text-ink inline-flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={submit} className="p-5 space-y-3">
                <label className="block">
                  <span className="text-xs font-medium text-ink/70">ชื่อที่แสดง</span>
                  <input
                    required
                    name="displayName"
                    className="mt-1.5 w-full rounded-xl border border-peach-200 bg-cream/40 px-3 py-2.5 text-sm outline-none focus:border-peach-500 focus:bg-white focus:ring-3 focus:ring-peach-500/15 transition"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-ink/70">อีเมล</span>
                  <input
                    required
                    type="email"
                    name="email"
                    autoComplete="off"
                    className="mt-1.5 w-full rounded-xl border border-peach-200 bg-cream/40 px-3 py-2.5 text-sm outline-none focus:border-peach-500 focus:bg-white focus:ring-3 focus:ring-peach-500/15 transition"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-ink/70">รหัสผ่าน (อย่างน้อย 8 ตัว)</span>
                  <input
                    required
                    type="password"
                    name="password"
                    minLength={8}
                    autoComplete="new-password"
                    className="mt-1.5 w-full rounded-xl border border-peach-200 bg-cream/40 px-3 py-2.5 text-sm outline-none focus:border-peach-500 focus:bg-white focus:ring-3 focus:ring-peach-500/15 transition"
                  />
                </label>
                {err && (
                  <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600">
                    {err}
                  </div>
                )}
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full px-4 py-2 text-sm text-ink/60 hover:text-ink"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="inline-flex items-center gap-1.5 rounded-full bg-peach-500 hover:bg-peach-600 text-white px-5 py-2 text-sm font-medium disabled:opacity-60"
                  >
                    <Check className="w-4 h-4" /> {pending ? "กำลังสร้าง…" : "สร้างแอดมิน"}
                  </button>
                </div>
              </form>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  confirmVariant = "primary",
  pending,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant?: "primary" | "danger";
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const confirmCls =
    confirmVariant === "danger"
      ? "bg-red-500 hover:bg-red-600"
      : "bg-peach-500 hover:bg-peach-600";
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
                  <DialogTitle className="font-semibold text-ink/90">{title}</DialogTitle>
                  <p className="mt-1.5 text-sm text-ink/60">{message}</p>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={onClose}
                  className="rounded-full px-4 py-2 text-sm text-ink/60 hover:text-ink"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={onConfirm}
                  disabled={pending}
                  className={`rounded-full text-white px-5 py-2 text-sm font-medium disabled:opacity-60 ${confirmCls}`}
                >
                  {pending ? "กำลังดำเนินการ…" : confirmLabel}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
