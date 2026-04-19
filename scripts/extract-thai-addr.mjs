#!/usr/bin/env node
/**
 * One-time extractor for the Thai address dataset bundled inside
 * `react-thailand-address-typeahead`. Reads the lib's webpack bundle, finds
 * the `__WEBPACK_DEFAULT_EXPORT__` array (province → district → subdistrict
 * → [postcode] tree), flattens to a flat records list, and writes a clean
 * JSON file to src/lib/thai-addresses.json.
 *
 * After this we can drop the `react-thailand-address-typeahead` dependency
 * entirely — the dataset is the only thing we needed.
 *
 *   node scripts/extract-thai-addr.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const SRC = resolve(
  "node_modules/react-thailand-address-typeahead/dist/index.js",
);
const OUT = resolve("src/lib/thai-addresses.json");

const js = readFileSync(SRC, "utf8");

// The bundled file has exactly one occurrence of the static-source default
// export. Find it and slice out the array literal.
const marker = "/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (";
const start = js.indexOf(marker);
if (start < 0) {
  console.error("❌ marker not found — lib internals changed?");
  process.exit(1);
}
let depth = 0;
let i = start + marker.length;
const arrayStart = i; // points at the first `[`
for (; i < js.length; i++) {
  const ch = js[i];
  if (ch === "(") depth++;
  else if (ch === ")") {
    if (depth === 0) break;
    depth--;
  }
}
if (i >= js.length) {
  console.error("❌ failed to balance parens");
  process.exit(1);
}
const arrayLiteral = js.slice(arrayStart, i);

// Use Function (sandbox-ish eval) to materialize the array literal. Safe
// because we control the source file (npm package contents).
let tree;
try {
  // eslint-disable-next-line no-new-func
  tree = new Function(`return (${arrayLiteral});`)();
} catch (e) {
  console.error("❌ failed to eval array literal:", e);
  process.exit(1);
}

// Tree shape: [ [province, [ [district, [ [subdistrict, [postcode]], ... ] ], ... ] ], ... ]
// Output ONLY district-level records (drop subdistricts) so the dropdown
// stays short and the JSON is small. Province + district pair is unique.
const records = [];
for (const [province, districts] of tree) {
  for (const [district] of districts) {
    records.push({ d: district, p: province });
  }
}

writeFileSync(OUT, JSON.stringify(records));
console.log(`✅ wrote ${records.length} records → ${OUT}`);
console.log(`   size: ${(JSON.stringify(records).length / 1024).toFixed(1)} KB`);
