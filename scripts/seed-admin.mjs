#!/usr/bin/env node
/**
 * Seed / reset the admin user in D1.
 *
 *   pnpm seed:admin        <email> <password>   → local (default, for dev)
 *   pnpm seed:admin:remote <email> <password>   → remote (production D1)
 *
 * Generates bcrypt hash, self-verifies the compare, writes a temp SQL file,
 * and runs `wrangler d1 execute`.
 */
import { hash, compare } from "bcryptjs";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const remote = args.includes("--remote");
const pos = args.filter((a) => !a.startsWith("--"));
const [email, password] = pos;

if (!email || !password) {
  console.error("Usage: pnpm seed:admin <email> <password> [--remote]");
  process.exit(1);
}

const h = await hash(password, 10);
if (h.length !== 60 || !(await compare(password, h))) {
  console.error("hash self-check failed");
  process.exit(1);
}

const sql = `DELETE FROM users WHERE role='admin';
INSERT INTO users (id, email, password_hash, display_name, role, created_at, updated_at)
VALUES ('usr_admin', '${email.replace(/'/g, "''")}', '${h}', 'Admin', 'admin',
  CAST(strftime('%s','now') AS INTEGER)*1000,
  CAST(strftime('%s','now') AS INTEGER)*1000);
`;

const dir = mkdtempSync(join(tmpdir(), "cudlaimue-seed-"));
const file = join(dir, "admin.sql");
writeFileSync(file, sql);

const where = remote ? "--remote" : "--local";
console.log(`→ seeding admin to ${remote ? "REMOTE (production)" : "LOCAL"} D1`);

const res = spawnSync(
  "pnpm",
  ["wrangler", "d1", "execute", "cudlaimue-db", where, "--file", file],
  { stdio: "inherit" },
);
process.exit(res.status ?? 1);
