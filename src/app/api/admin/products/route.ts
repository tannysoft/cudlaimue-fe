import { NextRequest, NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { products, adminAudit } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { newId, now, slugify } from "@/lib/utils";

function slugTaken(slug: string) {
  return NextResponse.json(
    { error: "slug_taken", message: `Slug "${slug}" ถูกใช้ไปแล้ว — กรุณาเปลี่ยน slug` },
    { status: 409 },
  );
}

function isUniqueSlugError(e: unknown) {
  const msg = String((e as { message?: string })?.message ?? e);
  return msg.includes("UNIQUE") && msg.includes("products.slug");
}


const JsonArrayString = z.string().optional(); // expected to be JSON-encoded string[]

const CreateSchema = z.object({
  type: z.enum(["font", "ebook", "template"]),
  slug: z.string().min(1).optional(),
  name: z.string().min(1),
  tagline: z.string().optional(),
  description: z.string().optional(),
  priceSatang: z.number().int().nonnegative(),
  compareAtPriceSatang: z.number().int().nonnegative().nullable().optional(),
  tags: JsonArrayString,
  categories: JsonArrayString,
  previewImageKeys: JsonArrayString,
  files: JsonArrayString,
  isPublished: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const PatchSchema = z.object({
  id: z.string(),
  type: z.enum(["font", "ebook", "template"]).optional(),
  slug: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  tagline: z.string().optional(),
  description: z.string().optional(),
  priceSatang: z.number().int().nonnegative().optional(),
  compareAtPriceSatang: z.number().int().nonnegative().nullable().optional(),
  coverImageKey: z.string().optional(),
  previewImageKeys: JsonArrayString,
  tags: JsonArrayString,
  categories: JsonArrayString,
  files: JsonArrayString,
  fileKey: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().int().optional(),
  pageCount: z.number().int().optional(),
  isPublished: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  let body: z.infer<typeof CreateSchema>;
  try {
    body = CreateSchema.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "invalid_payload", message: "ข้อมูลไม่ถูกต้อง", issues: e.issues },
        { status: 400 },
      );
    }
    throw e;
  }
  const ts = now();
  const id = newId("prd");
  const slug = slugify(body.slug ?? body.name);

  const existing = await db()
    .select({ id: products.id })
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);
  if (existing.length) return slugTaken(slug);

  try {
    await db().insert(products).values({
      id,
      type: body.type,
      slug,
      name: body.name,
      tagline: body.tagline ?? null,
      description: body.description ?? null,
      priceSatang: body.priceSatang,
      compareAtPriceSatang: body.compareAtPriceSatang ?? null,
      tags: body.tags ?? null,
      categories: body.categories ?? null,
      previewImageKeys: body.previewImageKeys ?? null,
      files: body.files ?? null,
      isPublished: body.isPublished ?? false,
      isFeatured: body.isFeatured ?? false,
      sortOrder: body.sortOrder ?? 0,
      createdAt: ts,
      updatedAt: ts,
    });
  } catch (e) {
    if (isUniqueSlugError(e)) return slugTaken(slug);
    throw e;
  }
  await audit(admin.id, "product.create", id, body);
  return NextResponse.json({ id });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  let body: z.infer<typeof PatchSchema>;
  try {
    body = PatchSchema.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "invalid_payload", message: "ข้อมูลไม่ถูกต้อง", issues: e.issues },
        { status: 400 },
      );
    }
    throw e;
  }
  const { id, ...rest } = body;
  if (rest.slug) {
    rest.slug = slugify(rest.slug);
    const clash = await db()
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.slug, rest.slug), ne(products.id, id)))
      .limit(1);
    if (clash.length) return slugTaken(rest.slug);
  }
  try {
    await db()
      .update(products)
      .set({ ...rest, updatedAt: now() })
      .where(eq(products.id, id));
  } catch (e) {
    if (isUniqueSlugError(e) && rest.slug) return slugTaken(rest.slug);
    throw e;
  }
  await audit(admin.id, "product.update", id, rest);
  return NextResponse.json({ id });
}

async function audit(adminId: string, action: string, target: string, payload: unknown) {
  await db().insert(adminAudit).values({
    id: newId("au"),
    adminId,
    action,
    target,
    payload: JSON.stringify(payload),
    createdAt: now(),
  });
}
