"use client";
import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import {
  RefreshCcw,
  Download,
  Check,
  AlertTriangle,
  X,
  CheckCheck,
  Trash2,
  Package,
  Users as UsersIcon,
  ShoppingBag,
  ListChecks,
  CircleSlash,
  ChevronLeft,
  ChevronRight,
  CornerDownLeft,
  Lightbulb,
  Ticket,
} from "lucide-react";
import { Select, type SelectOption } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { LineCsvCard } from "./line-csv-card";

type ProductType = "font" | "ebook" | "template";

const typeOptions: SelectOption<ProductType>[] = [
  { value: "font", label: "Font" },
  { value: "template", label: "Template" },
  { value: "ebook", label: "Ebook" },
];

type WcProduct = {
  id: number;
  name: string;
  slug: string;
  price: string;
  regular_price: string;
  sale_price: string;
  image: string | null;
  downloadable: boolean;
  downloadCount: number;
  categories: string[];
  alreadyImported: boolean;
};

type WcCustomer = {
  id: number;
  email: string;
  name: string;
  username: string;
  phone: string | null;
  hasLine: boolean;
  createdAt: string;
  alreadyImported: boolean;
};

type WcOrder = {
  id: number;
  number: string;
  status: string;
  total: string;
  currency: string;
  customerId: number;
  customerEmail: string | null;
  customerName: string;
  lineItems: number;
  paymentMethod: string | null;
  dateCreated: string;
  datePaid: string | null;
  alreadyImported: boolean;
};

type WcCoupon = {
  id: number;
  code: string;
  discountLabel: string;
  minSubtotalLabel: string;
  maxUses: number | null;
  usedCount: number;
  expiresAt: number | null;
  productCount: number;
  alreadyImported: boolean;
};

export function ImportView() {
  return (
    <TabGroup>
      <TabList className="inline-flex items-center bg-white border border-peach-100 rounded-full p-1 text-sm mb-6">
        <StepTab icon={<Package className="w-4 h-4" />} label="1. สินค้า" />
        <StepTab icon={<UsersIcon className="w-4 h-4" />} label="2. ลูกค้า" />
        <StepTab icon={<Ticket className="w-4 h-4" />} label="3. คูปอง" />
        <StepTab icon={<ShoppingBag className="w-4 h-4" />} label="4. คำสั่งซื้อ" />
      </TabList>
      <TabPanels>
        <TabPanel>
          <ProductsPanel />
        </TabPanel>
        <TabPanel>
          <CustomersPanel />
        </TabPanel>
        <TabPanel>
          <CouponsPanel />
        </TabPanel>
        <TabPanel>
          <OrdersPanel />
        </TabPanel>
      </TabPanels>
    </TabGroup>
  );
}

function StepTab({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <Tab className="inline-flex items-center gap-2 rounded-full px-4 py-2 data-[selected]:bg-peach-500 data-[selected]:text-white text-ink/60 hover:text-ink data-[selected]:hover:text-white transition focus:outline-none">
      {icon}
      {label}
    </Tab>
  );
}

// ===================== PRODUCTS =====================

function ProductsPanel() {
  const router = useRouter();
  const [rows, setRows] = useState<WcProduct[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [type, setType] = useState<ProductType>("font");
  const [banner, setBanner] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [confirmClear, setConfirmClear] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    page: number;
    totalPages: number;
    imported: number;
    skipped: number;
    running: boolean;
  } | null>(null);
  const abortRef = useRef(false);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/admin/import/wp");
      if (!r.ok) throw new Error(await r.text());
      const d = (await r.json()) as { products: WcProduct[] };
      setRows(d.products);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function toggle(id: number) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }
  function selectAllNew() {
    if (!rows) return;
    setSelected(new Set(rows.filter((r) => !r.alreadyImported).map((r) => r.id)));
  }

  /**
   * Import selected products in small batches (5/request) so the Worker
   * doesn't hit CPU time trying to download many WC files at once, and so
   * the UI can show live progress per batch.
   */
  async function runImport() {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    // Small batch — each product may have multiple files (cover + multiple
    // downloads). 2 products/request keeps us safely under the Worker's
    // 50-subrequest limit even for products with 4–6 files.
    const BATCH = 2;
    const totalBatches = Math.max(1, Math.ceil(ids.length / BATCH));
    abortRef.current = false;
    setErr(null);
    setBanner(null);
    let totalImported = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    let totalPartial = 0;
    const partialSlugs: string[] = [];
    setBatchProgress({
      page: 0,
      totalPages: totalBatches,
      imported: 0,
      skipped: 0,
      running: true,
    });
    for (let b = 0; b < totalBatches; b++) {
      if (abortRef.current) break;
      const slice = ids.slice(b * BATCH, (b + 1) * BATCH);
      setBatchProgress({
        page: b + 1,
        totalPages: totalBatches,
        imported: totalImported,
        skipped: totalSkipped,
        running: true,
      });
      try {
        const r = await fetch("/api/admin/import/wp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: slice, type }),
        });
        if (!r.ok) {
          setErr(await r.text());
          break;
        }
        const d = (await r.json()) as {
          results: Array<{ status: string; slug?: string }>;
        };
        for (const x of d.results) {
          if (x.status === "imported") totalImported++;
          else if (x.status === "imported_partial") {
            totalImported++;
            totalPartial++;
            if (x.slug && partialSlugs.length < 10) partialSlugs.push(x.slug);
          } else if (x.status === "skipped") totalSkipped++;
          else if (x.status === "failed") totalFailed++;
        }
      } catch (e) {
        setErr(String(e));
        break;
      }
    }
    setBatchProgress((prev) =>
      prev ? { ...prev, imported: totalImported, skipped: totalSkipped, running: false } : null,
    );
    const partialNote =
      totalPartial > 0
        ? ` · ไฟล์ไม่ครบ ${totalPartial} (${partialSlugs.slice(0, 3).join(", ")}${
            totalPartial > 3 ? "…" : ""
          }) — กด "ดึงไฟล์จาก WP ใหม่" ในหน้าสินค้าเพื่อ retry`
        : "";
    setBanner(
      `${abortRef.current ? "หยุดกลางคัน" : "เสร็จสมบูรณ์"} · นำเข้า ${totalImported} · ข้าม ${totalSkipped} · ล้มเหลว ${totalFailed}${partialNote}`,
    );
    setSelected(new Set());
    router.refresh();
    await load();
  }

  function stopBatch() {
    abortRef.current = true;
  }

  function runClear() {
    start(async () => {
      setErr(null);
      const r = await fetch("/api/admin/import/wp/clear?scope=products", { method: "POST" });
      const d = (await r.json().catch(() => ({}))) as {
        productsDeleted?: number;
        r2FilesDeleted?: number;
        error?: string;
        message?: string;
      };
      setConfirmClear(false);
      if (!r.ok) return setErr(d.message ?? d.error ?? "ล้างไม่สำเร็จ");
      setBanner(`ลบสินค้า ${d.productsDeleted ?? 0} · ลบไฟล์ R2 ${d.r2FilesDeleted ?? 0}`);
      router.refresh();
      await load();
    });
  }

  const newCount = rows?.filter((r) => !r.alreadyImported).length ?? 0;
  const allNewSelected = newCount > 0 && selected.size === newCount;

  return (
    <div>
      {err && <ErrorBanner text={err} onClose={() => setErr(null)} />}
      {banner && <SuccessBanner text={banner} onClose={() => setBanner(null)} />}
      {batchProgress && (
        <BatchProgressBar
          page={batchProgress.page}
          totalPages={batchProgress.totalPages}
          imported={batchProgress.imported}
          skipped={batchProgress.skipped}
          running={batchProgress.running}
          onDismiss={() => setBatchProgress(null)}
        />
      )}

      <div className="bg-white rounded-2xl border border-peach-100 overflow-hidden">
        <ToolbarRow>
          <ReloadBtn loading={loading} onClick={load} />
          {rows && (
            <SelectAllButton
              newCount={newCount}
              allSelected={allNewSelected}
              onSelectAll={selectAllNew}
              onClear={() => setSelected(new Set())}
            />
          )}
          <button
            onClick={() => setConfirmClear(true)}
            disabled={pending || batchProgress?.running}
            className="inline-flex items-center gap-1.5 rounded-full border border-red-100 bg-red-50 hover:bg-red-100 text-red-600 text-sm px-3 py-1.5 transition disabled:opacity-60"
          >
            <Trash2 className="w-3.5 h-3.5" /> ล้างสินค้าที่ import
          </button>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-ink/50">เลือก {selected.size} · ประเภท:</span>
            <div className="w-36">
              <Select<ProductType> value={type} onChange={setType} options={typeOptions} />
            </div>
            {batchProgress?.running ? (
              <button
                onClick={stopBatch}
                className="inline-flex items-center gap-1.5 rounded-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 text-sm font-medium shadow-sm"
              >
                <X className="w-4 h-4" /> หยุด
              </button>
            ) : (
              <button
                onClick={runImport}
                disabled={selected.size === 0}
                className="inline-flex items-center gap-1.5 rounded-full bg-peach-500 hover:bg-peach-600 text-white px-4 py-2 text-sm font-medium shadow-sm disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                นำเข้า {selected.size}
              </button>
            )}
          </div>
        </ToolbarRow>

        {loading ? (
          <LoadingState text="กำลังเชื่อมต่อ WooCommerce…" />
        ) : !rows || rows.length === 0 ? (
          <EmptyState icon={<Download className="w-6 h-6" />} label="ไม่พบสินค้าใน WooCommerce" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <TableHead>
                <th className="w-10 px-5 py-3">
                  <SelectAllCheckbox
                    allNewIds={rows.filter((r) => !r.alreadyImported).map((r) => r.id)}
                    selected={selected}
                    setSelected={setSelected}
                  />
                </th>
                <th className="text-left px-4 py-3 font-medium">สินค้า</th>
                <th className="text-left px-4 py-3 font-medium">ราคา</th>
                <th className="text-left px-4 py-3 font-medium">ไฟล์</th>
                <th className="text-left px-4 py-3 font-medium">หมวดหมู่</th>
                <th className="text-left px-4 py-3 font-medium">สถานะ</th>
              </TableHead>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr
                  key={p.id}
                  className={`border-b border-peach-100 last:border-0 transition ${
                    selected.has(p.id) ? "bg-peach-50/80" : "hover:bg-peach-50/40"
                  }`}
                >
                  <td className="px-5 py-3">
                    <Checkbox
                      disabled={p.alreadyImported}
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                      ariaLabel={`เลือก ${p.name}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-11 h-11 rounded-lg bg-cream overflow-hidden shrink-0">
                        {p.image && (
                          <Image src={p.image} alt="" fill className="object-cover" unoptimized />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-teal-800 truncate">{p.name}</div>
                        <div className="text-xs text-ink/40 font-mono">/{p.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {p.sale_price && p.sale_price !== p.regular_price ? (
                      <>
                        <span className="font-medium text-teal-700">{p.sale_price} บาท</span>{" "}
                        <span className="text-xs text-ink/40 line-through">{p.regular_price} บาท</span>
                      </>
                    ) : (
                      <span className="font-medium text-teal-700">
                        {p.price || p.regular_price || "-"} บาท
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink/60">
                    {p.downloadable ? `${p.downloadCount} ไฟล์` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink/60">
                    {p.categories.slice(0, 2).join(", ")}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge imported={p.alreadyImported} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="ล้างสินค้าที่ import"
        message="จะลบเฉพาะสินค้าจาก WP และไฟล์ R2 (ของที่สร้างเองไม่ถูกแตะ) — ถ้ามี order อ้างถึงจะปฏิเสธ"
        onClose={() => setConfirmClear(false)}
        onConfirm={runClear}
        pending={pending}
      />
    </div>
  );
}

// ===================== CUSTOMERS =====================

function CustomersPanel() {
  const [rows, setRows] = useState<WcCustomer[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [confirmClear, setConfirmClear] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [batchProgress, setBatchProgress] = useState<{
    page: number;
    totalPages: number;
    imported: number;
    skipped: number;
    running: boolean;
  } | null>(null);
  const abortRef = useRef(false);

  async function load(p = page) {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/admin/import/wp/customers?page=${p}&perPage=${perPage}`);
      if (!r.ok) throw new Error(await r.text());
      const d = (await r.json()) as {
        customers: WcCustomer[];
        total: number;
        totalPages: number;
        page: number;
      };
      setRows(d.customers);
      setTotal(d.total);
      setTotalPages(d.totalPages);
      setPage(d.page);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load(1);
  }, []);

  function toggle(id: number) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }
  function selectAllNewThisPage() {
    if (!rows) return;
    const next = new Set(selected);
    rows.filter((r) => !r.alreadyImported).forEach((r) => next.add(r.id));
    setSelected(next);
  }
  function clearSelectionThisPage() {
    if (!rows) return;
    const next = new Set(selected);
    rows.forEach((r) => next.delete(r.id));
    setSelected(next);
  }

  function runImportSelected() {
    start(async () => {
      setErr(null);
      const r = await fetch("/api/admin/import/wp/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      if (!r.ok) return setErr(await r.text());
      const d = (await r.json()) as { imported: number; skipped: number; total: number };
      setBanner(`นำเข้าลูกค้า ${d.imported} · ข้าม ${d.skipped} · รวม ${d.total}`);
      setSelected(new Set());
      await load();
    });
  }

  /**
   * Page-by-page batch import. Loops pages 1..N calling the single-page
   * endpoint; UI shows live progress and can be cancelled.
   */
  async function runImportAll() {
    setErr(null);
    setBanner(null);
    abortRef.current = false;
    let totalImported = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalLine = 0;
    // We drive the ceiling from the server's `totalPages` response (using the
    // same perPage we send). `pageCount` starts at 1 and gets replaced by
    // whatever the first successful POST returns.
    let pageCount = 1;
    setBatchProgress({
      page: 0,
      totalPages: 1,
      imported: 0,
      skipped: 0,
      running: true,
    });
    for (let p = 1; p <= pageCount; p++) {
      if (abortRef.current) break;
      setBatchProgress({
        page: p,
        totalPages: pageCount,
        imported: totalImported,
        skipped: totalSkipped,
        running: true,
      });
      try {
        const r = await fetch("/api/admin/import/wp/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page: p, perPage: 50 }),
        });
        if (!r.ok) {
          setErr(`หน้า ${p}: ${(await r.text()).slice(0, 200)}`);
          break;
        }
        const d = (await r.json()) as {
          imported: number;
          updated?: number;
          skipped: number;
          linkedLine?: number;
          total: number;
          totalPages: number;
        };
        totalImported += d.imported;
        totalUpdated += d.updated ?? 0;
        totalSkipped += d.skipped;
        totalLine += d.linkedLine ?? 0;
        // Sync ceiling to server's authoritative count.
        if (d.totalPages && d.totalPages !== pageCount) pageCount = d.totalPages;
        // Empty page → no more data even if totalPages says otherwise.
        if (d.total === 0) break;
      } catch (e) {
        setErr(`หน้า ${p}: ${String(e).slice(0, 200)}`);
        break;
      }
    }
    setBatchProgress((prev) =>
      prev ? { ...prev, imported: totalImported, skipped: totalSkipped, running: false } : null,
    );
    const summary = `นำเข้า ${totalImported} · อัปเดต ${totalUpdated} · ข้าม ${totalSkipped} · เชื่อม LINE ${totalLine}`;
    setBanner(
      abortRef.current
        ? `หยุดที่หน้า ${batchProgress?.page ?? "?"} · ${summary}`
        : `เสร็จสมบูรณ์ · ${summary}`,
    );
    await load();
  }

  function stopBatch() {
    abortRef.current = true;
  }
  function runClear() {
    start(async () => {
      setErr(null);
      const r = await fetch("/api/admin/import/wp/clear?scope=customers", { method: "POST" });
      const d = (await r.json().catch(() => ({}))) as { customersDeleted?: number; message?: string };
      setConfirmClear(false);
      if (!r.ok) return setErr(d.message ?? "ล้างไม่สำเร็จ");
      setBanner(`ลบลูกค้า ${d.customersDeleted ?? 0} คน`);
      await load();
    });
  }

  const newCount = rows?.filter((r) => !r.alreadyImported).length ?? 0;
  const allNewOnPageSelected =
    newCount > 0 && rows!.filter((r) => !r.alreadyImported).every((r) => selected.has(r.id));

  return (
    <div>
      {err && <ErrorBanner text={err} onClose={() => setErr(null)} />}
      {banner && <SuccessBanner text={banner} onClose={() => setBanner(null)} />}
      {batchProgress && (
        <BatchProgressBar
          page={batchProgress.page}
          totalPages={batchProgress.totalPages}
          imported={batchProgress.imported}
          skipped={batchProgress.skipped}
          running={batchProgress.running}
          onDismiss={() => setBatchProgress(null)}
        />
      )}

      <div className="bg-white rounded-2xl border border-peach-100 overflow-hidden">
        <ToolbarRow>
          <ReloadBtn loading={loading} onClick={() => load()} />
          {rows && (
            <SelectAllButton
              newCount={newCount}
              allSelected={allNewOnPageSelected}
              onSelectAll={selectAllNewThisPage}
              onClear={clearSelectionThisPage}
            />
          )}
          <button
            onClick={() => setConfirmClear(true)}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-full border border-red-100 bg-red-50 hover:bg-red-100 text-red-600 text-sm px-3 py-1.5 transition disabled:opacity-60"
          >
            <Trash2 className="w-3.5 h-3.5" /> ล้างลูกค้าที่ import
          </button>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-ink/50">
              เลือก {selected.size} · ทั้งหมด {total}
            </span>
            {selected.size > 0 ? (
              <button
                onClick={runImportSelected}
                disabled={pending || batchProgress?.running}
                className="inline-flex items-center gap-1.5 rounded-full bg-peach-500 hover:bg-peach-600 text-white px-4 py-2 text-sm font-medium shadow-sm disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {pending ? "กำลังนำเข้า…" : `นำเข้า ${selected.size}`}
              </button>
            ) : batchProgress?.running ? (
              <button
                onClick={stopBatch}
                className="inline-flex items-center gap-1.5 rounded-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 text-sm font-medium shadow-sm"
              >
                <X className="w-4 h-4" /> หยุด
              </button>
            ) : (
              <button
                onClick={runImportAll}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-full bg-peach-500 hover:bg-peach-600 text-white px-4 py-2 text-sm font-medium shadow-sm disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                นำเข้าทุกคน
              </button>
            )}
          </div>
        </ToolbarRow>

        {loading ? (
          <LoadingState text="กำลังดึงลูกค้าจาก WC…" />
        ) : !rows || rows.length === 0 ? (
          <EmptyState icon={<UsersIcon className="w-6 h-6" />} label="ไม่พบลูกค้า" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <TableHead>
                <th className="w-10 px-5 py-3">
                  <Checkbox
                    ariaLabel="เลือกทั้งหน้านี้"
                    checked={allNewOnPageSelected}
                    disabled={newCount === 0}
                    onChange={(v) => (v ? selectAllNewThisPage() : clearSelectionThisPage())}
                  />
                </th>
                <th className="text-left px-4 py-3 font-medium">ลูกค้า</th>
                <th className="text-left px-4 py-3 font-medium">อีเมล</th>
                <th className="text-left px-4 py-3 font-medium">เบอร์</th>
                <th className="text-left px-4 py-3 font-medium">LINE</th>
                <th className="text-left px-4 py-3 font-medium">สมัครเมื่อ</th>
                <th className="text-left px-4 py-3 font-medium">สถานะ</th>
              </TableHead>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr
                  key={c.id}
                  className={`border-b border-peach-100 last:border-0 transition ${
                    selected.has(c.id) ? "bg-peach-50/80" : "hover:bg-peach-50/40"
                  }`}
                >
                  <td className="px-5 py-3">
                    <Checkbox
                      ariaLabel={`เลือก ${c.name || c.email}`}
                      disabled={c.alreadyImported}
                      checked={selected.has(c.id)}
                      onChange={() => toggle(c.id)}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{c.name || "—"}</td>
                  <td className="px-4 py-3 text-ink/70">{c.email}</td>
                  <td className="px-4 py-3 text-ink/60">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    {c.hasLine ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-[#06C755]/10 text-[#06C755] rounded-full px-2 py-0.5 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#06C755]" /> LINE
                      </span>
                    ) : (
                      <span className="text-xs text-ink/30">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink/50 whitespace-nowrap">
                    {new Date(c.createdAt).toLocaleDateString("th-TH")}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge imported={c.alreadyImported} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {rows && rows.length > 0 && totalPages > 1 && (
          <Pagination page={page} totalPages={totalPages} total={total} onChange={(p) => load(p)} />
        )}
      </div>

      <LineCsvCard />

      <ConfirmDialog
        open={confirmClear}
        title="ล้างลูกค้าที่ import"
        message="ลบ user ที่มี source_wc_id (LINE / สมัครเอง ไม่ถูกแตะ) — ลูกค้าที่มี order จะไม่ถูกลบ"
        onClose={() => setConfirmClear(false)}
        onConfirm={runClear}
        pending={pending}
      />
    </div>
  );
}

// ===================== COUPONS =====================

function CouponsPanel() {
  const [rows, setRows] = useState<WcCoupon[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [confirmClear, setConfirmClear] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [batchProgress, setBatchProgress] = useState<{
    page: number;
    totalPages: number;
    imported: number;
    skipped: number;
    running: boolean;
  } | null>(null);
  const abortRef = useRef(false);

  async function load(p = page) {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(
        `/api/admin/import/wp/coupons?page=${p}&perPage=${perPage}`,
      );
      if (!r.ok) throw new Error(await r.text());
      const d = (await r.json()) as {
        coupons: WcCoupon[];
        total: number;
        totalPages: number;
        page: number;
      };
      setRows(d.coupons);
      setTotal(d.total);
      setTotalPages(d.totalPages);
      setPage(d.page);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load(1);
  }, []);

  /**
   * Page-by-page batch import. Loops pages 1..N calling the single-page
   * endpoint; UI shows live progress and can be cancelled.
   */
  async function runImportAll() {
    setErr(null);
    setBanner(null);
    abortRef.current = false;
    let totalImported = 0;
    let totalSkipped = 0;
    let pageCount = 1;
    setBatchProgress({
      page: 0,
      totalPages: 1,
      imported: 0,
      skipped: 0,
      running: true,
    });
    for (let p = 1; p <= pageCount; p++) {
      if (abortRef.current) break;
      setBatchProgress({
        page: p,
        totalPages: pageCount,
        imported: totalImported,
        skipped: totalSkipped,
        running: true,
      });
      try {
        const r = await fetch("/api/admin/import/wp/coupons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page: p, perPage: 50 }),
        });
        if (!r.ok) {
          setErr(`หน้า ${p}: ${(await r.text()).slice(0, 200)}`);
          break;
        }
        const d = (await r.json()) as {
          imported: number;
          skipped: number;
          total: number;
          totalPages: number;
        };
        totalImported += d.imported;
        totalSkipped += d.skipped;
        if (d.totalPages && d.totalPages !== pageCount) pageCount = d.totalPages;
        if (d.total === 0) break;
      } catch (e) {
        setErr(`หน้า ${p}: ${String(e).slice(0, 200)}`);
        break;
      }
    }
    setBatchProgress((prev) =>
      prev ? { ...prev, imported: totalImported, skipped: totalSkipped, running: false } : null,
    );
    setBanner(
      `${abortRef.current ? "หยุดกลางคัน" : "เสร็จสมบูรณ์"} · นำเข้า ${totalImported} · ข้าม ${totalSkipped}`,
    );
    await load();
  }

  function stopBatch() {
    abortRef.current = true;
  }
  function runClear() {
    start(async () => {
      setErr(null);
      const r = await fetch("/api/admin/import/wp/clear?scope=coupons", {
        method: "POST",
      });
      const d = (await r.json().catch(() => ({}))) as {
        couponsDeleted?: number;
        message?: string;
      };
      setConfirmClear(false);
      if (!r.ok) return setErr(d.message ?? "ล้างไม่สำเร็จ");
      setBanner(`ลบคูปอง ${d.couponsDeleted ?? 0} โค้ด`);
      await load();
    });
  }

  return (
    <div>
      {err && <ErrorBanner text={err} onClose={() => setErr(null)} />}
      {banner && <SuccessBanner text={banner} onClose={() => setBanner(null)} />}
      {batchProgress && (
        <BatchProgressBar
          page={batchProgress.page}
          totalPages={batchProgress.totalPages}
          imported={batchProgress.imported}
          skipped={batchProgress.skipped}
          running={batchProgress.running}
          onDismiss={() => setBatchProgress(null)}
        />
      )}

      <div className="bg-white rounded-2xl border border-peach-100 overflow-hidden">
        <ToolbarRow>
          <ReloadBtn loading={loading} onClick={() => load()} />
          <button
            onClick={() => setConfirmClear(true)}
            disabled={pending}
            className="text-sm text-red-600 hover:text-red-700 inline-flex items-center gap-1 disabled:opacity-60"
          >
            <Trash2 className="w-3.5 h-3.5" /> ล้างคูปองทั้งหมด
          </button>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-ink/50">ทั้งหมด {total} โค้ด</span>
            {batchProgress?.running ? (
              <button
                onClick={stopBatch}
                className="inline-flex items-center gap-1.5 rounded-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 text-sm font-medium shadow-sm"
              >
                <X className="w-4 h-4" /> หยุด
              </button>
            ) : (
              <button
                onClick={runImportAll}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-full bg-peach-500 hover:bg-peach-600 text-white px-4 py-2 text-sm font-medium shadow-sm disabled:opacity-50"
              >
                <Download className="w-4 h-4" /> นำเข้าทั้งหมด
              </button>
            )}
          </div>
        </ToolbarRow>

        {loading ? (
          <LoadingState text="กำลังดึงคูปองจาก WC…" />
        ) : !rows || rows.length === 0 ? (
          <EmptyState icon={<Ticket className="w-6 h-6" />} label="ไม่พบคูปอง" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <TableHead>
                <th className="text-left px-5 py-3 font-medium">โค้ด</th>
                <th className="text-left px-4 py-3 font-medium">ส่วนลด</th>
                <th className="text-left px-4 py-3 font-medium">ขั้นต่ำ</th>
                <th className="text-left px-4 py-3 font-medium">สินค้า</th>
                <th className="text-left px-4 py-3 font-medium">ใช้แล้ว</th>
                <th className="text-left px-4 py-3 font-medium">หมดอายุ</th>
                <th className="text-left px-4 py-3 font-medium">สถานะ</th>
              </TableHead>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-peach-100 last:border-0 hover:bg-peach-50/40 transition"
                >
                  <td className="px-5 py-3 font-mono font-semibold text-teal-800">
                    {c.code}
                  </td>
                  <td className="px-4 py-3 font-medium text-peach-700">
                    {c.discountLabel}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink/60">
                    {c.minSubtotalLabel}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink/60">
                    {c.productCount > 0 ? `${c.productCount} ชิ้น` : "ทุกสินค้า"}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink/60">
                    {c.usedCount}
                    {c.maxUses != null ? ` / ${c.maxUses}` : ""}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink/60 whitespace-nowrap">
                    {c.expiresAt
                      ? new Date(c.expiresAt).toLocaleDateString("th-TH")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge imported={c.alreadyImported} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {rows && rows.length > 0 && totalPages > 1 && (
          <Pagination page={page} totalPages={totalPages} total={total} onChange={(p) => load(p)} />
        )}
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="ล้างคูปองทั้งหมด"
        message="ลบคูปองทั้งหมดในระบบ (ไม่สามารถแยกที่มาจาก WP กับที่ admin สร้างเองได้) — order ที่เคยใช้คูปองจะไม่ถูกลบ"
        onClose={() => setConfirmClear(false)}
        onConfirm={runClear}
        pending={pending}
      />
    </div>
  );
}

// ===================== ORDERS =====================

function OrdersPanel() {
  const [rows, setRows] = useState<WcOrder[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [confirmClear, setConfirmClear] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [batchProgress, setBatchProgress] = useState<{
    page: number;
    totalPages: number;
    imported: number;
    skipped: number;
    running: boolean;
  } | null>(null);
  const abortRef = useRef(false);

  async function load(p = page) {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/admin/import/wp/orders?page=${p}&perPage=${perPage}`);
      if (!r.ok) throw new Error(await r.text());
      const d = (await r.json()) as {
        orders: WcOrder[];
        total: number;
        totalPages: number;
        page: number;
      };
      setRows(d.orders);
      setTotal(d.total);
      setTotalPages(d.totalPages);
      setPage(d.page);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load(1);
  }, []);

  async function runImportAll() {
    setErr(null);
    setBanner(null);
    abortRef.current = false;
    let totalImported = 0;
    let totalSkipped = 0;
    let totalEnt = 0;
    let pageCount = 1;
    setBatchProgress({
      page: 0,
      totalPages: 1,
      imported: 0,
      skipped: 0,
      running: true,
    });
    for (let p = 1; p <= pageCount; p++) {
      if (abortRef.current) break;
      setBatchProgress({
        page: p,
        totalPages: pageCount,
        imported: totalImported,
        skipped: totalSkipped,
        running: true,
      });
      try {
        const r = await fetch("/api/admin/import/wp/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page: p, perPage: 50 }),
        });
        if (!r.ok) {
          setErr(`หน้า ${p}: ${(await r.text()).slice(0, 200)}`);
          break;
        }
        const d = (await r.json()) as {
          imported: number;
          skipped: number;
          entitlementsCreated: number;
          total: number;
          totalPages: number;
        };
        totalImported += d.imported;
        totalSkipped += d.skipped;
        totalEnt += d.entitlementsCreated;
        if (d.totalPages && d.totalPages !== pageCount) pageCount = d.totalPages;
        if (d.total === 0) break;
      } catch (e) {
        setErr(`หน้า ${p}: ${String(e).slice(0, 200)}`);
        break;
      }
    }
    setBatchProgress((prev) =>
      prev ? { ...prev, imported: totalImported, skipped: totalSkipped, running: false } : null,
    );
    setBanner(
      `${abortRef.current ? "หยุดกลางคัน" : "เสร็จสมบูรณ์"} · นำเข้า ${totalImported} · ข้าม ${totalSkipped} · สิทธิ์ +${totalEnt}`,
    );
    await load();
  }

  function stopBatch() {
    abortRef.current = true;
  }
  function runClear() {
    start(async () => {
      setErr(null);
      const r = await fetch("/api/admin/import/wp/clear?scope=orders", { method: "POST" });
      const d = (await r.json().catch(() => ({}))) as { ordersDeleted?: number; message?: string };
      setConfirmClear(false);
      if (!r.ok) return setErr(d.message ?? "ล้างไม่สำเร็จ");
      setBanner(`ลบคำสั่งซื้อ ${d.ordersDeleted ?? 0} รายการ`);
      await load();
    });
  }

  const newCount = rows?.filter((r) => !r.alreadyImported).length ?? 0;

  return (
    <div>
      {err && <ErrorBanner text={err} onClose={() => setErr(null)} />}
      {banner && <SuccessBanner text={banner} onClose={() => setBanner(null)} />}
      {batchProgress && (
        <BatchProgressBar
          page={batchProgress.page}
          totalPages={batchProgress.totalPages}
          imported={batchProgress.imported}
          skipped={batchProgress.skipped}
          running={batchProgress.running}
          onDismiss={() => setBatchProgress(null)}
        />
      )}
      <div className="mb-4 rounded-xl bg-peach-50 border border-peach-100 px-4 py-3 text-sm text-ink/70 flex items-start gap-2">
        <Lightbulb className="w-4 h-4 mt-0.5 shrink-0 text-peach-500" />
        <div>
          ลำดับที่แนะนำ: <strong>สินค้า → ลูกค้า → คำสั่งซื้อ</strong> — order จะ match กับ
          product/user ที่ import แล้วเท่านั้น (ถ้า match ไม่ได้ จะผูกกับ &quot;Guest (import)&quot;)
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-peach-100 overflow-hidden">
        <ToolbarRow>
          <ReloadBtn loading={loading} onClick={load} />
          <button
            onClick={() => setConfirmClear(true)}
            disabled={pending}
            className="text-sm text-red-600 hover:text-red-700 inline-flex items-center gap-1 disabled:opacity-60"
          >
            <Trash2 className="w-3.5 h-3.5" /> ล้างคำสั่งซื้อที่ import
          </button>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-ink/50">ทั้งหมด {total} รายการ</span>
            {batchProgress?.running ? (
              <button
                onClick={stopBatch}
                className="inline-flex items-center gap-1.5 rounded-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 text-sm font-medium shadow-sm"
              >
                <X className="w-4 h-4" /> หยุด
              </button>
            ) : (
              <button
                onClick={runImportAll}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-full bg-peach-500 hover:bg-peach-600 text-white px-4 py-2 text-sm font-medium shadow-sm disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                นำเข้าทั้งหมด
              </button>
            )}
          </div>
        </ToolbarRow>

        {loading ? (
          <LoadingState text="กำลังดึงคำสั่งซื้อจาก WC…" />
        ) : !rows || rows.length === 0 ? (
          <EmptyState icon={<ShoppingBag className="w-6 h-6" />} label="ไม่พบคำสั่งซื้อ" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <TableHead>
                <th className="text-left px-5 py-3 font-medium">เลขที่</th>
                <th className="text-left px-4 py-3 font-medium">ลูกค้า</th>
                <th className="text-left px-4 py-3 font-medium">ยอด</th>
                <th className="text-left px-4 py-3 font-medium">สถานะ WC</th>
                <th className="text-left px-4 py-3 font-medium">ชำระเงิน</th>
                <th className="text-left px-4 py-3 font-medium">วันที่</th>
                <th className="text-left px-4 py-3 font-medium">สถานะ</th>
              </TableHead>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-peach-100 last:border-0 hover:bg-peach-50/40 transition"
                >
                  <td className="px-5 py-3 font-mono text-xs">#{o.number}</td>
                  <td className="px-4 py-3">
                    <div className="truncate">{o.customerName || o.customerEmail || "guest"}</div>
                    <div className="text-[11px] text-ink/40 truncate">{o.customerEmail}</div>
                  </td>
                  <td className="px-4 py-3 font-medium text-teal-700 whitespace-nowrap">{o.total} บาท</td>
                  <td className="px-4 py-3 text-xs">
                    <WcStatusPill status={o.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-ink/60">{o.paymentMethod ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-ink/50 whitespace-nowrap">
                    {new Date(o.dateCreated).toLocaleDateString("th-TH")}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge imported={o.alreadyImported} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {rows && rows.length > 0 && totalPages > 1 && (
          <Pagination page={page} totalPages={totalPages} total={total} onChange={(p) => load(p)} />
        )}
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="ล้างคำสั่งซื้อที่ import"
        message="ลบ order ที่มี source_wc_id พร้อม entitlements ที่ได้จาก order เหล่านั้น (ลูกค้าและสินค้าไม่ถูกแตะ)"
        onClose={() => setConfirmClear(false)}
        onConfirm={runClear}
        pending={pending}
      />
    </div>
  );
}

// ===================== Shared atoms =====================

function Pagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (p: number) => void;
}) {
  const items = pageItems(page, totalPages);
  return (
    <div className="px-5 py-3 border-t border-peach-100 flex items-center justify-between gap-3 flex-wrap text-sm bg-[#fcf8f1]">
      <span className="text-xs text-ink/50 whitespace-nowrap">
        หน้า {page} / {totalPages} · ทั้งหมด {total.toLocaleString("th-TH")} รายการ
      </span>
      <div className="inline-flex items-center gap-1 flex-wrap justify-end">
        <ArrowBtn onClick={() => onChange(page - 1)} disabled={page <= 1} dir="prev" />
        {items.map((it, i) =>
          it === "ellipsis" ? (
            <span key={`e-${i}`} className="px-2 text-ink/40 select-none">…</span>
          ) : it === page ? (
            <span
              key={it}
              className="inline-flex items-center justify-center min-w-9 h-9 rounded-full bg-peach-500 text-white text-sm font-medium"
            >
              {it}
            </span>
          ) : (
            <button
              key={it}
              onClick={() => onChange(it)}
              className="inline-flex items-center justify-center min-w-9 h-9 rounded-full border border-peach-200 bg-white hover:bg-peach-50 text-ink/70 text-sm transition"
            >
              {it}
            </button>
          ),
        )}
        <ArrowBtn onClick={() => onChange(page + 1)} disabled={page >= totalPages} dir="next" />
        <JumpInput totalPages={totalPages} onGo={onChange} />
      </div>
    </div>
  );
}

function JumpInput({
  totalPages,
  onGo,
}: {
  totalPages: number;
  onGo: (p: number) => void;
}) {
  const [value, setValue] = useState("");
  function submit() {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 1 && n <= totalPages) {
      onGo(n);
      setValue("");
    }
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="ml-2 inline-flex items-center gap-1"
    >
      <span className="text-xs text-ink/50">ไปหน้า</span>
      <input
        type="number"
        min={1}
        max={totalPages}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={String(totalPages)}
        className="w-14 text-center rounded-full border border-peach-200 bg-white px-2 py-1 text-sm outline-none focus:border-peach-500 focus:ring-3 focus:ring-peach-500/15 transition"
      />
      <button
        type="submit"
        aria-label="ไปหน้าที่กำหนด"
        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-peach-500 hover:bg-peach-600 text-white transition"
      >
        <CornerDownLeft className="w-3.5 h-3.5" />
      </button>
    </form>
  );
}

function ArrowBtn({
  onClick,
  disabled,
  dir,
}: {
  onClick: () => void;
  disabled: boolean;
  dir: "prev" | "next";
}) {
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "prev" ? "ก่อนหน้า" : "ถัดไป"}
      className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-peach-200 bg-white hover:bg-peach-50 text-ink/70 transition disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

function pageItems(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set<number>([1, total, current, current - 1, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((n) => set.add(n));
  if (current >= total - 2) [total - 3, total - 2, total - 1].forEach((n) => set.add(n));
  const sorted = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | "ellipsis")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push("ellipsis");
    out.push(sorted[i]);
  }
  return out;
}

function ToolbarRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 py-3 border-b border-peach-100 flex flex-wrap items-center gap-3">
      {children}
    </div>
  );
}

function ReloadBtn({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-sm text-ink/70 hover:text-peach-600 disabled:opacity-60"
    >
      <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
      รีเฟรช
    </button>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <tr className="text-xs uppercase tracking-wider text-ink/50 border-b border-peach-100 bg-[#fcf8f1]">
      {children}
    </tr>
  );
}

function LoadingState({ text }: { text: string }) {
  return <div className="py-20 text-center text-ink/40 text-sm">{text}</div>;
}

function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="py-20 text-center">
      <div className="w-14 h-14 rounded-full bg-peach-100 text-peach-600 flex items-center justify-center mx-auto">
        {icon}
      </div>
      <div className="mt-4 font-medium text-ink/70">{label}</div>
    </div>
  );
}

function SelectAllButton({
  newCount,
  allSelected,
  onSelectAll,
  onClear,
}: {
  newCount: number;
  allSelected: boolean;
  onSelectAll: () => void;
  onClear: () => void;
}) {
  if (newCount === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-ink/40 px-3 py-1.5">
        <CircleSlash className="w-3.5 h-3.5" />
        ไม่มีรายการใหม่ให้เลือก
      </span>
    );
  }
  if (allSelected) {
    return (
      <button
        type="button"
        onClick={onClear}
        className="inline-flex items-center gap-1.5 rounded-full border border-peach-300 bg-peach-50 hover:bg-peach-100 text-peach-700 text-sm font-medium px-3 py-1.5 transition"
      >
        <CircleSlash className="w-3.5 h-3.5" />
        ยกเลิกทั้งหมด
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onSelectAll}
      className="inline-flex items-center gap-1.5 rounded-full border border-peach-200 bg-white hover:border-peach-400 hover:bg-peach-50 text-peach-700 text-sm font-medium px-3 py-1.5 transition"
    >
      <ListChecks className="w-3.5 h-3.5" />
      เลือกทั้งหมด ({newCount})
    </button>
  );
}

function SelectAllCheckbox({
  allNewIds,
  selected,
  setSelected,
}: {
  allNewIds: number[];
  selected: Set<number>;
  setSelected: (s: Set<number>) => void;
}) {
  const allSelected =
    allNewIds.length > 0 && allNewIds.every((id) => selected.has(id));
  const someSelected = !allSelected && allNewIds.some((id) => selected.has(id));
  return (
    <Checkbox
      ariaLabel="เลือกทั้งหมด"
      checked={allSelected}
      indeterminate={someSelected}
      disabled={allNewIds.length === 0}
      onChange={(v) => {
        if (v) setSelected(new Set(allNewIds));
        else setSelected(new Set());
      }}
    />
  );
}

function StatusBadge({ imported }: { imported: boolean }) {
  return imported ? (
    <span className="inline-flex items-center gap-1 text-xs bg-ink/10 text-ink/60 rounded-full px-2 py-0.5">
      <Check className="w-3 h-3" /> มีแล้ว
    </span>
  ) : (
    <span className="text-xs bg-teal-100 text-teal-700 rounded-full px-2 py-0.5">ใหม่</span>
  );
}

function WcStatusPill({ status }: { status: string }) {
  const paid = ["completed", "processing"].includes(status);
  const cls = paid
    ? "bg-teal-100 text-teal-700"
    : status === "pending"
    ? "bg-peach-200 text-peach-800"
    : "bg-ink/10 text-ink/60";
  return <span className={`rounded-full px-2 py-0.5 ${cls}`}>{status}</span>;
}

function BatchProgressBar({
  page,
  totalPages,
  imported,
  skipped,
  running,
  onDismiss,
}: {
  page: number;
  totalPages: number;
  imported: number;
  skipped: number;
  running: boolean;
  onDismiss: () => void;
}) {
  const pct = totalPages > 0 ? Math.min(100, Math.round((page / totalPages) * 100)) : 0;
  return (
    <div className="mb-4 rounded-xl bg-peach-50 border border-peach-200 px-4 py-3">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-peach-800">
            {running
              ? `กำลังนำเข้าหน้า ${page} / ${totalPages}…`
              : `นำเข้าเสร็จสิ้น (${page} / ${totalPages} หน้า)`}
          </div>
          <div className="text-xs text-ink/60 mt-0.5">
            นำเข้าแล้ว <strong>{imported}</strong> · ข้าม <strong>{skipped}</strong>
          </div>
          <div className="mt-2 h-2 rounded-full bg-white overflow-hidden">
            <div
              className={`h-full rounded-full bg-peach-500 transition-all duration-300 ${
                running ? "animate-pulse" : ""
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        {!running && (
          <button onClick={onDismiss} className="text-ink/40 hover:text-ink">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function ErrorBanner({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="flex-1">{text}</div>
      <button onClick={onClose} className="text-red-500 hover:text-red-700">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function SuccessBanner({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <div className="mb-4 rounded-xl bg-teal-50 border border-teal-100 px-4 py-3 text-sm text-teal-800 flex items-start gap-2">
      <CheckCheck className="w-4 h-4 mt-0.5 shrink-0 text-teal-600" />
      <div className="flex-1">{text}</div>
      <button onClick={onClose} className="text-ink/40 hover:text-ink">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function ConfirmDialog({
  open,
  title,
  message,
  onClose,
  onConfirm,
  pending,
}: {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
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
            <DialogPanel className="w-full max-w-md rounded-2xl bg-white border border-peach-100 shadow-xl p-6">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
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
                  className="inline-flex items-center gap-1.5 rounded-full bg-red-500 hover:bg-red-600 text-white px-5 py-2 text-sm font-medium disabled:opacity-60"
                >
                  <Trash2 className="w-4 h-4" />
                  {pending ? "กำลังล้าง…" : "ยืนยันล้าง"}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
