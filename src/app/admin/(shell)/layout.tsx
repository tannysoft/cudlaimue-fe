import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { AdminSidebar } from "@/components/admin/sidebar";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "admin") redirect("/");

  return (
    <div className="min-h-screen bg-[#f6efe5] text-ink">
      <div className="flex">
        <AdminSidebar
          user={{
            displayName: user.displayName ?? "Admin",
            email: user.email ?? "",
            avatarUrl: user.avatarUrl ?? null,
          }}
        />
        <div className="flex-1 min-w-0">
          <main className="px-6 md:px-10 py-8 max-w-[1400px]">{children}</main>
        </div>
      </div>
    </div>
  );
}
