#!/usr/bin/env node
/**
 * Transform the subdistrict-level address JSON down to district-level
 * records (drop ตำบล/แขวง + postcode). Run after extract-thai-addr.mjs OR
 * directly on the existing JSON when you don't want to re-install the lib.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const FILE = resolve("src/lib/thai-addresses.json");

const raw = JSON.parse(readFileSync(FILE, "utf8"));
const seen = new Set();
const out = [];
for (const r of raw) {
  const key = `${r.d}|${r.p}`;
  if (seen.has(key)) continue;
  seen.add(key);
  out.push({ d: r.d, p: r.p });
}

writeFileSync(FILE, JSON.stringify(out));
console.log(`✅ ${raw.length} subdistricts → ${out.length} districts`);
console.log(`   size: ${(JSON.stringify(out).length / 1024).toFixed(1)} KB`);
