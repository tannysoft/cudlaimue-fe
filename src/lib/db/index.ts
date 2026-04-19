import { drizzle } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "./schema";

/**
 * Returns a Drizzle client bound to the D1 binding `DB`.
 * Must be called inside a request context — relies on `getCloudflareContext`.
 */
export function db() {
  const { env } = getCloudflareContext();
  return drizzle(env.DB, { schema });
}

export { schema };
