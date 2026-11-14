/**
 * Tiny smoke check: GET /api/assets returns at least one record.
 * Usage: node scripts/check-assets.mjs [baseUrl]
 */
const base = process.argv[2] ?? "http://localhost:3000";

const res = await fetch(`${base}/api/assets`);
if (!res.ok) {
  console.error("FAIL: status", res.status, await res.text());
  process.exit(1);
}
const body = await res.json();
const count = Array.isArray(body.assets) ? body.assets.length : 0;
if (count < 1) {
  console.error("FAIL: expected at least one asset, got", count);
  process.exit(1);
}
console.log(`OK: ${count} assets from ${body.source} (fetched ${body.fetchedAt})`);
console.log("sample:", body.assets[0]?.symbol, body.assets[0]?.name);
