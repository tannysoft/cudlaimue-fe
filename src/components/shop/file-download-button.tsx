"use client";
import { Fragment, useEffect, useState } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import {
  Download,
  ChevronDown,
  ExternalLink,
  Loader2,
  X,
} from "lucide-react";
import { useLiffExternal } from "@/components/liff/liff-external-provider";

type File = { key: string; name: string; size: number | null };

/**
 * Download button. One-file products render a single pill; multi-file products
 * render a dropdown with `?file=<key>` per item.
 *
 * Inside LINE LIFF: clicking the button doesn't navigate. It asks the server
 * for a 5-minute signed URL and shows a modal with the download link plus a
 * live countdown — the buyer then opens it in the system browser (LIFF's
 * WebView blocks file downloads, and escaping via `liff.openWindow` loses the
 * session cookie, which is why we need an in-URL credential).
 */
export function FileDownloadButton({
  files,
  baseHref,
  label = "โหลด",
  className,
}: {
  files: File[];
  baseHref: string; // e.g. /api/library/fonts/{id}
  label?: string;
  className?: string;
}) {
  const { isInClient, openExternal } = useLiffExternal();
  const productId = decodeURIComponent(baseHref.split("/").pop() ?? "");

  const [modal, setModal] = useState<{
    file: File;
    loading: boolean;
    url: string | null;
    expiresAt: number | null;
    error: string | null;
  } | null>(null);

  async function beginLiffDownload(file: File) {
    setModal({ file, loading: true, url: null, expiresAt: null, error: null });
    try {
      const res = await fetch("/api/library/download-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, fileKey: file.key }),
      });
      if (!res.ok) {
        const msg = res.status === 401 ? "กรุณาเข้าสู่ระบบใหม่" : "ขอลิงก์ไม่สำเร็จ";
        setModal({ file, loading: false, url: null, expiresAt: null, error: msg });
        return;
      }
      const data = (await res.json()) as { url: string; expiresAt: number };
      setModal({
        file,
        loading: false,
        url: data.url,
        expiresAt: data.expiresAt,
        error: null,
      });
    } catch {
      setModal({ file, loading: false, url: null, expiresAt: null, error: "เกิดข้อผิดพลาด" });
    }
  }

  const handleClick =
    (file: File, url: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (!isInClient) return;
      e.preventDefault();
      void beginLiffDownload(file);
      // url unused inside LIFF; we re-derive with token
      void url;
    };

  if (files.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-ink/10 text-ink/40 text-sm px-3 py-1.5">
        ไม่มีไฟล์
      </span>
    );
  }

  const buttonClass =
    className ??
    "inline-flex items-center gap-1 rounded-full bg-peach-500 text-white text-sm px-3 py-1.5 hover:bg-peach-600";

  return (
    <>
      {files.length === 1 ? (
        (() => {
          const f = files[0];
          const url = `${baseHref}?file=${encodeURIComponent(f.key)}`;
          return (
            <a href={url} onClick={handleClick(f, url)} className={buttonClass}>
              <Download className="w-4 h-4" /> {label}
            </a>
          );
        })()
      ) : (
        <Menu as="div" className="relative inline-block">
          <MenuButton className={buttonClass}>
            <Download className="w-4 h-4" /> {label} ({files.length})
            <ChevronDown className="w-3 h-3 -mr-1" />
          </MenuButton>
          <MenuItems
            anchor={{ to: "bottom end", gap: 6 }}
            className="w-64 rounded-xl bg-white border border-peach-100 shadow-xl p-1 z-50 focus:outline-none"
          >
            {files.map((f) => {
              const url = `${baseHref}?file=${encodeURIComponent(f.key)}`;
              return (
                <MenuItem key={f.key}>
                  {({ focus }) => (
                    <a
                      href={url}
                      onClick={handleClick(f, url)}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                        focus ? "bg-peach-50 text-peach-700" : "text-ink/80"
                      }`}
                    >
                      <Download className="w-3.5 h-3.5 shrink-0 text-ink/40" />
                      <span className="flex-1 truncate">{f.name}</span>
                      {f.size && (
                        <span className="text-[10px] text-ink/40 shrink-0">
                          {(f.size / 1024 / 1024).toFixed(1)}MB
                        </span>
                      )}
                    </a>
                  )}
                </MenuItem>
              );
            })}
          </MenuItems>
        </Menu>
      )}

      <LiffDownloadModal
        state={modal}
        onClose={() => setModal(null)}
        onOpen={(url) => openExternal(url)}
      />
    </>
  );
}

/** Bottom-sheet modal shown inside LIFF while the signed URL is valid. */
function LiffDownloadModal({
  state,
  onClose,
  onOpen,
}: {
  state: {
    file: File;
    loading: boolean;
    url: string | null;
    expiresAt: number | null;
    error: string | null;
  } | null;
  onClose: () => void;
  onOpen: (url: string) => void;
}) {
  const open = state !== null;
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (!state?.expiresAt) return;
    const tick = () => setRemainingMs(Math.max(0, state.expiresAt! - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state?.expiresAt]);

  const expired = !!state?.expiresAt && remainingMs <= 0;
  const mm = Math.floor(remainingMs / 60000);
  const ss = Math.floor((remainingMs % 60000) / 1000);
  const countdown = `${mm}:${String(ss).padStart(2, "0")}`;

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-end sm:items-center justify-center p-3 sm:p-4">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-4 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:scale-95"
            >
              <DialogPanel className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-peach-100 overflow-hidden">
                <div className="flex items-start justify-between px-5 pt-5 pb-3">
                  <DialogTitle className="font-[family-name:var(--font-display)] text-lg text-teal-700 font-bold">
                    ลิงก์ดาวน์โหลดพร้อมแล้ว
                  </DialogTitle>
                  <button
                    onClick={onClose}
                    className="rounded-lg p-1 text-ink/40 hover:bg-peach-50"
                    aria-label="ปิด"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="px-5 pb-5 space-y-4">
                  {state?.file && (
                    <div className="text-sm text-ink/70 truncate">
                      ไฟล์: <span className="text-ink">{state.file.name}</span>
                    </div>
                  )}

                  {state?.loading && (
                    <div className="flex items-center gap-2 text-sm text-ink/60">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      กำลังสร้างลิงก์…
                    </div>
                  )}

                  {state?.error && (
                    <div className="rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm px-3 py-2">
                      {state.error}
                    </div>
                  )}

                  {state?.url && !state.error && (
                    <>
                      <div
                        className={`rounded-lg px-3 py-2 text-sm ${
                          expired
                            ? "bg-ink/5 text-ink/50"
                            : "bg-peach-50 text-peach-800"
                        }`}
                      >
                        {expired ? (
                          <>ลิงก์หมดอายุแล้ว กดปุ่มด้านล่างเพื่อขอลิงก์ใหม่</>
                        ) : (
                          <>
                            ใช้ได้ภายใน{" "}
                            <span className="font-semibold tabular-nums">{countdown}</span>{" "}
                            นาที — เปิดในเบราว์เซอร์เพื่อบันทึกไฟล์
                          </>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          if (!state.url) return;
                          onOpen(state.url);
                        }}
                        disabled={expired}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-peach-500 text-white text-sm px-4 py-2.5 hover:bg-peach-600 disabled:bg-ink/10 disabled:text-ink/40"
                      >
                        <ExternalLink className="w-4 h-4" />
                        {expired ? "ลิงก์หมดอายุ" : "เปิดในเบราว์เซอร์"}
                      </button>
                    </>
                  )}
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
