import type { Asset } from "./types";

/**
 * Coinbase tokenized stocks are for eligible jurisdictions outside the United
 * States. This API is read-only reference / NAV data — it does not trade, mint,
 * or custody anything. Presence in the list is NOT the same as a tradable market.
 */
const COINBASE_STOCKS_URL = "https://api.coinbase.com/v1/tokenized-stocks";

type CoinbaseStock = {
  symbol?: string;
  ticker?: string;
  name?: string;
  contract_address?: string;
  address?: string;
  multiplier?: number | string;
  nav_price?: number | string;
  nav_price_updated_at?: string;
  prospectus_url?: string;
  prospectus?: { url?: string };
  sector?: string;
  sectors?: string[];
  theme?: string;
  [key: string]: unknown;
};

type CoinbaseListResponse = {
  /** Official list field from api.coinbase.com/v1/tokenized-stocks */
  tokens?: CoinbaseStock[];
  data?: CoinbaseStock[];
  stocks?: CoinbaseStock[];
  next_page_token?: string | null;
  pagination?: { next_page_token?: string | null };
};

const CACHE_TTL_MS = 10 * 60 * 1000;

let cache: { assets: Asset[]; fetchedAt: number } | null = null;

function pickSymbol(row: CoinbaseStock): string {
  return String(row.symbol ?? row.ticker ?? "").toUpperCase().trim();
}

function pickAddress(row: CoinbaseStock): string {
  return String(row.contract_address ?? row.address ?? "");
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function inferSectors(row: CoinbaseStock, name: string): string[] {
  const explicit: string[] = [];
  if (typeof row.sector === "string" && row.sector) explicit.push(row.sector);
  if (Array.isArray(row.sectors)) {
    for (const s of row.sectors) if (typeof s === "string") explicit.push(s);
  }
  if (typeof row.theme === "string" && row.theme) explicit.push(row.theme);
  if (explicit.length) return [...new Set(explicit.map((s) => s.toLowerCase()))];

  const hay = ` ${name} ${pickSymbol(row)} `.toLowerCase();
  const tags: string[] = [];
  const has = (re: RegExp) => re.test(hay);
  // Word-ish boundaries so "ai" does not match "Entertainment".
  if (
    has(
      /(?:^|[^a-z0-9])(ai|nvidia|nvdac|amd|amdc|intel|intc|semiconductor|chip|software|cloud|microsoft|msftc|google|alphabet|googlc|meta|metac|amazon|amznc|apple|aaplc|oracle|orclc|salesforce|crmc|adobe|adbec|palantir|pltrc|soundhound|sharonai)(?:[^a-z0-9]|$)/,
    )
  )
    tags.push("ai", "tech");
  if (
    has(
      /(?:^|[^a-z0-9])(tesla|tslac|energy|solar|wind|clean|battery|nuclear|next.?era|enphase|enphc)(?:[^a-z0-9]|$)/,
    )
  )
    tags.push("energy");
  if (
    has(
      /(?:^|[^a-z0-9])(space|rocket|rktc|satellite|lockheed|boeing|northrop|rtx)(?:[^a-z0-9]|$)/,
    )
  )
    tags.push("space");
  if (
    has(
      /(?:^|[^a-z0-9])(bank|visa|visac|mastercard|jpmorgan|jpmc|goldman|fintech|payment|rocket companies)(?:[^a-z0-9]|$)/,
    )
  )
    tags.push("finance");
  if (
    has(
      /(?:^|[^a-z0-9])(health|pharma|biotech|unitedhealth|unhc|pfizer|pfec|moderna|mrnac)(?:[^a-z0-9]|$)/,
    )
  )
    tags.push("health");
  if (tags.length === 0) tags.push("other");
  return [...new Set(tags)];
}

function mapRow(row: CoinbaseStock): Asset | null {
  const symbol = pickSymbol(row);
  if (!symbol) return null;
  const name = String(row.name ?? symbol);
  const prospectusUrl =
    row.prospectus_url ??
    row.prospectus?.url ??
    (typeof row.prospectus === "string" ? row.prospectus : null);

  return {
    symbol,
    name,
    mainnetAddress: pickAddress(row),
    multiplier: toNumber(row.multiplier) ?? 1,
    navPrice: toNumber(row.nav_price),
    navPriceUpdatedAt:
      typeof row.nav_price_updated_at === "string"
        ? row.nav_price_updated_at
        : null,
    prospectusUrl: prospectusUrl || null,
    hasMarket: "unknown",
    sectors: inferSectors(row, name),
  };
}

/** Test helper: map a Coinbase list payload (`tokens`) into Asset[]. */
export function mapCoinbaseListPayload(body: CoinbaseListResponse): Asset[] {
  const rows = body.tokens ?? body.data ?? body.stocks ?? [];
  const all: Asset[] = [];
  for (const row of rows) {
    const mapped = mapRow(row);
    if (mapped) all.push(mapped);
  }
  return all;
}

export function clearAssetsCache() {
  cache = null;
}

export async function fetchCoinbaseAssets(options?: {
  force?: boolean;
}): Promise<Asset[]> {
  if (
    !options?.force &&
    cache &&
    Date.now() - cache.fetchedAt < CACHE_TTL_MS
  ) {
    return cache.assets;
  }

  const all: Asset[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(COINBASE_STOCKS_URL);
    url.searchParams.set("page_size", "500");
    if (pageToken) url.searchParams.set("page_token", pageToken);

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      if (cache) return cache.assets;
      throw new Error(`Coinbase Tokenized Stocks API error: ${res.status}`);
    }

    const body = (await res.json()) as CoinbaseListResponse;
    const rows = body.tokens ?? body.data ?? body.stocks ?? [];
    for (const row of rows) {
      const mapped = mapRow(row);
      if (mapped) all.push(mapped);
    }

    pageToken =
      body.next_page_token ??
      body.pagination?.next_page_token ??
      undefined;
  } while (pageToken);

  // Deduplicate by symbol (keep first)
  const seen = new Set<string>();
  const deduped: Asset[] = [];
  for (const a of all) {
    if (seen.has(a.symbol)) continue;
    seen.add(a.symbol);
    deduped.push(a);
  }

  cache = { assets: deduped, fetchedAt: Date.now() };
  return deduped;
}

export function getAssetsCacheMeta() {
  return cache
    ? { fetchedAt: new Date(cache.fetchedAt).toISOString(), count: cache.assets.length }
    : null;
}
