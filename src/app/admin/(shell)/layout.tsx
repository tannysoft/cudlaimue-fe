import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { AdminSidebar, AdminMobileBar } from "@/components/admin/sidebar";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "admin") redirect("/");

  const userProfile = {
    displayName: user.displayName ?? "Admin",
    email: user.email ?? "",
    avatarUrl: user.avatarUrl ?? null,
  };

  return (
    <div className="min-h-screen bg-[#f6efe5] text-ink overflow-x-hidden">
      <AdminMobileBar user={userProfile} />
      <div className="flex">
        <AdminSidebar user={userProfile} />
        <div className="flex-1 min-w-0">
          <main className="px-4 md:px-10 py-6 md:py-8 max-w-[1400px]">{children}</main>
        </div>
      </div>
    </div>
  );
}
