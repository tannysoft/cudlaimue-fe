import { getSiteSettings } from "@/lib/site-settings";
import { HeroSettingsCard } from "@/components/admin/hero-settings-card";

export const dynamic = "force-dynamic";
export const metadata = { title: "ตั้งค่าเว็บไซต์" };

export default async function AdminSettingsPage() {
  const settings = await getSiteSettings();
  return (
    <div className="max-w-3xl">
      <header className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-800 font-bold">
          ตั้งค่าเว็บไซต์
        </h1>
        <p className="text-ink/60 text-sm mt-1">
          ค่าที่ปรับได้จากหลังบ้าน — มีผลกับหน้าเว็บภายในไม่กี่นาที (cache 2 นาที)
        </p>
      </header>

      <HeroSettingsCard initialHeroKey={settings.heroImageKey ?? null} />
    </div>
  );
}
