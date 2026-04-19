import { desc, count, inArray, sql, eq, or, like } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, orders } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { UsersView } from "@/components/admin/users-view";
import { paginationParams } from "@/components/admin/pager";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const { page, perPage, offset } = paginationParams(sp, 25);
  const q = (sp.q ?? "").trim();
  const pat = `%${q}%`;

  const where = q
    ? or(
        like(users.email, pat),
        like(users.displayName, pat),
        like(users.phone, pat),
        like(users.lineUserId, pat),
      )
    : undefined;

  const [list, [{ n: total }]] = await Promise.all([
    db()
      .select()
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(perPage)
      .offset(offset),
    db().select({ n: count() }).from(users).where(where),
  ]);

  // Aggregate order stats only for users on this page — avoids scanning the
  // whole `orders` table.
  const userIds = list.map((u) => u.id);
  const stats = userIds.length
    ? await db()
        .select({
          userId: orders.userId,
          orderCount: count(),
          paidCount: sql<number>`sum(case when ${orders.status} = 'paid' then 1 else 0 end)`,
        })
        .from(orders)
        .where(inArray(orders.userId, userIds))
        .groupBy(orders.userId)
    : [];
  const statsById = new Map(
    stats.map((s) => [s.userId, { orders: s.orderCount, paid: Number(s.paidCount ?? 0) }]),
  );

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const me = await getSessionUser();

  return (
    <UsersView
      currentAdminId={me?.id ?? ""}
      page={page}
      totalPages={totalPages}
      total={total}
      q={q}
      users={list.map((u) => {
        const s = statsById.get(u.id);
        return {
          id: u.id,
          email: u.email,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
          lineUserId: u.lineUserId,
          role: u.role,
          isBanned: u.isBanned,
          createdAt: u.createdAt,
          orderCount: s?.orders ?? 0,
          paidCount: s?.paid ?? 0,
        };
      })}
    />
  );

  // silence unused import
  void eq;
}
