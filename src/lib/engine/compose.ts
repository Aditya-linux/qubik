import type { Asset } from "@/lib/assets/types";
import type {
  ComposeFlag,
  ComposeInput,
  ComposeResult,
  ComposeRules,
  Constituent,
  ThemeId,
} from "./types";

const TOTAL_BPS = 10_000;

/** Match Coinbase tickers (often suffixed with c, e.g. NVDAc) and company names. */
const THEME_KEYWORDS: Record<Exclude<ThemeId, "even" | "surprise">, string[]> = {
  ai: ["ai", "nvidia", "nvdac", "amd", "amdc", "intel", "intc", "microsoft", "msftc", "google", "alphabet", "googlc", "meta", "metac", "amazon", "amznc", "oracle", "orclc", "salesforce", "crmc", "adobe", "adbec", "palantir", "pltrc", "snowflake", "snowc", "broadcom", "avgoc", "semiconductor", "chip", "software", "cloud"],
  big_tech: ["apple", "aaplc", "microsoft", "msftc", "google", "alphabet", "googlc", "amazon", "amznc", "meta", "metac", "nvidia", "nvdac", "tesla", "tslac", "broadcom", "avgoc", "oracle", "orclc"],
  clean_energy: ["energy", "solar", "wind", "clean", "battery", "enphase", "enphc", "next.?era", "nee", "first solar", "fslrc", "tesla", "tslac", "nuclear"],
  space: ["space", "rocket", "rktc", "satellite", "lockheed", "boeing", "northrop", "nocc", "rtx", "rtxc", "spacex"],
};

function keywordRegex(kw: string): RegExp {
  // Prefer word-ish boundaries so "ai" does not match "Entertainment".
  if (kw.includes("?") || kw.includes(".") || kw.includes("\\") || kw.includes("|")) {
    return new RegExp(kw, "i");
  }
  return new RegExp(`(?:^|[^a-z0-9])${kw}(?:[^a-z0-9]|$)`, "i");
}

function matchesTheme(asset: Asset, theme: ThemeId): boolean {
  if (theme === "even" || theme === "surprise") return true;
  const hay = `${asset.symbol} ${asset.name} ${asset.sectors.join(" ")}`.toLowerCase();
  return THEME_KEYWORDS[theme].some((kw) => keywordRegex(kw).test(hay));
}

function isExcluded(asset: Asset, exclusions: string[]): boolean {
  if (!exclusions.length) return false;
  const hay = `${asset.symbol} ${asset.name} ${asset.sectors.join(" ")}`.toLowerCase();
  return exclusions.some((ex) => {
    const e = ex.trim().toLowerCase();
    if (!e) return false;
    if (asset.symbol.toLowerCase() === e) return true;
    return hay.includes(e) || asset.sectors.some((s) => s.includes(e));
  });
}

function isAvailable(asset: Asset): boolean {
  // Until BaseStonk: presence in Coinbase catalog counts as "known".
  // hasMarket === false means listed but no market (Phase D).
  return asset.hasMarket !== false;
}

function pickCandidates(rules: ComposeRules, assets: Asset[]): {
  selected: Asset[];
  unavailablePreferred: { symbol: string; reason: string }[];
} {
  const bySymbol = new Map(assets.map((a) => [a.symbol.toUpperCase(), a]));
  const removed = new Set((rules.removedSymbols ?? []).map((s) => s.toUpperCase()));
  const unavailablePreferred: { symbol: string; reason: string }[] = [];

  // Preferred symbols the user explicitly wanted (e.g. from overrides / demo)
  for (const sym of rules.preferredSymbols ?? []) {
    const key = sym.toUpperCase();
    if (removed.has(key)) continue;
    const asset = bySymbol.get(key);
    if (!asset) {
      unavailablePreferred.push({
        symbol: key,
        reason: `${key} isn't available as a token on Base.`,
      });
    } else if (!isAvailable(asset)) {
      unavailablePreferred.push({
        symbol: key,
        reason: `${key} is listed but has no market on Base.`,
      });
    }
  }

  let pool = assets.filter(
    (a) =>
      !removed.has(a.symbol) &&
      !isExcluded(a, rules.exclusions) &&
      matchesTheme(a, rules.theme) &&
      isAvailable(a),
  );

  if (rules.theme === "surprise") {
    pool = [...pool].sort((a, b) => a.symbol.localeCompare(b.symbol));
    // Deterministic pseudo-shuffle from symbol hashes
    pool = pool
      .map((a, i) => ({ a, k: (a.symbol.charCodeAt(0) * 31 + i * 17) % 97 }))
      .sort((x, y) => x.k - y.k)
      .map((x) => x.a);
  }

  // Cap how many names we propose for a readable pie
  const targetCount = rules.theme === "even" ? 8 : 6;
  let selected = pool.slice(0, targetCount);

  // If preferred symbols exist and are available, ensure they are included
  for (const sym of rules.preferredSymbols ?? []) {
    const key = sym.toUpperCase();
    if (removed.has(key)) continue;
    const asset = bySymbol.get(key);
    if (!asset || !isAvailable(asset) || isExcluded(asset, rules.exclusions)) continue;
    if (!selected.find((s) => s.symbol === key)) {
      selected = [asset, ...selected].slice(0, targetCount + 1);
    }
  }

  // Also include any override symbols that exist
  for (const sym of Object.keys(rules.weightOverrides ?? {})) {
    const key = sym.toUpperCase();
    if (removed.has(key)) continue;
    const asset = bySymbol.get(key);
    if (!asset) {
      if (!unavailablePreferred.find((u) => u.symbol === key)) {
        unavailablePreferred.push({
          symbol: key,
          reason: `${key} isn't available as a token on Base.`,
        });
      }
      continue;
    }
    if (!isAvailable(asset)) {
      if (!unavailablePreferred.find((u) => u.symbol === key)) {
        unavailablePreferred.push({
          symbol: key,
          reason: `${key} is listed but has no market on Base.`,
        });
      }
      continue;
    }
    if (!selected.find((s) => s.symbol === key)) {
      selected = [...selected, asset];
    }
  }

  return { selected, unavailablePreferred };
}

function equalWeightBps(count: number, stockBudget: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(stockBudget / count);
  const weights = Array.from({ length: count }, () => base);
  let remainder = stockBudget - base * count;
  for (let i = 0; i < weights.length && remainder > 0; i++) {
    weights[i] += 1;
    remainder -= 1;
  }
  return weights;
}

/**
 * Pure basket engine. Never silently substitutes unavailable names.
 * Never auto-caps over-cap weights — only flags them.
 */
export function composeBasket({ rules, assets }: ComposeInput): ComposeResult {
  const cashBps = Math.max(0, Math.min(TOTAL_BPS, Math.round(rules.cashBps)));
  const maxWeightBps = Math.max(0, Math.round(rules.maxWeightBps));
  const stockBudget = TOTAL_BPS - cashBps;

  const flags: ComposeFlag[] = [];
  const { selected, unavailablePreferred } = pickCandidates(rules, assets);

  for (const u of unavailablePreferred) {
    flags.push({ type: "unavailable", symbol: u.symbol, reason: u.reason });
  }

  const overrides = rules.weightOverrides ?? {};
  const hasOverrides = Object.keys(overrides).length > 0;

  let rawWeights: number[];
  if (hasOverrides && selected.length > 0) {
    rawWeights = selected.map((a) => {
      const o = overrides[a.symbol] ?? overrides[a.symbol.toUpperCase()];
      return o !== undefined ? Math.round(o) : 0;
    });
    // If some selected have no override, distribute leftover equally among them
    const assigned = rawWeights.reduce((s, w) => s + w, 0);
    const unsetIdx = selected
      .map((a, i) =>
        overrides[a.symbol] === undefined &&
        overrides[a.symbol.toUpperCase()] === undefined
          ? i
          : -1,
      )
      .filter((i) => i >= 0);
    const leftover = stockBudget - assigned;
    if (unsetIdx.length > 0 && leftover > 0) {
      const parts = equalWeightBps(unsetIdx.length, leftover);
      unsetIdx.forEach((idx, j) => {
        rawWeights[idx] = parts[j];
      });
    }
  } else {
    rawWeights = equalWeightBps(selected.length, stockBudget);
  }

  const constituents: Constituent[] = selected.map((a, i) => ({
    symbol: a.symbol,
    name: a.name,
    mainnetAddress: a.mainnetAddress,
    weightBps: rawWeights[i] ?? 0,
    available: true,
  }));

  // Auto-weighted zeros are dropped; user-forced zero overrides are flagged (never silent).
  const filtered = hasOverrides
    ? constituents
    : constituents.filter((c) => c.weightBps > 0);

  for (const c of filtered) {
    if (c.weightBps <= 0) {
      flags.push({ type: "zero_weight", symbol: c.symbol });
    } else if (c.weightBps > maxWeightBps) {
      flags.push({
        type: "over_cap",
        symbol: c.symbol,
        weightBps: c.weightBps,
        capBps: maxWeightBps,
      });
    }
  }

  const stockSum = filtered.reduce((s, c) => s + c.weightBps, 0);
  const totalWeightBps = stockSum + cashBps;

  if (filtered.length === 0 && unavailablePreferred.length === 0) {
    flags.push({
      type: "unavailable",
      symbol: "(mix)",
      reason:
        "No names matched this vibe with your exclusions. Loosen a rule or pick another vibe.",
    });
  }

  const isValid =
    flags.length === 0 &&
    filtered.length > 0 &&
    totalWeightBps === TOTAL_BPS;

  return {
    constituents: filtered,
    cashBps,
    flags,
    totalWeightBps,
    isValid,
    theme: rules.theme,
    maxWeightBps,
    exclusions: rules.exclusions,
  };
}

/** Apply Adjust-to-cap: clamp over-cap names and redistribute leftover visibly. */
export function adjustOverCapToLimit(
  result: ComposeResult,
): { constituents: Constituent[]; cashBps: number } {
  const cap = result.maxWeightBps;
  let freed = 0;
  const next = result.constituents.map((c) => {
    if (c.weightBps > cap) {
      freed += c.weightBps - cap;
      return { ...c, weightBps: cap };
    }
    return { ...c };
  });

  // Redistribute freed bps to under-cap names proportionally (user-visible on next compose)
  const under = next.filter((c) => c.weightBps < cap);
  if (freed > 0 && under.length > 0) {
    const room = under.map((c) => cap - c.weightBps);
    const totalRoom = room.reduce((s, r) => s + r, 0);
    let left = Math.min(freed, totalRoom);
    for (let i = 0; i < under.length && left > 0; i++) {
      const add = Math.min(
        room[i],
        Math.max(1, Math.floor((left * room[i]) / totalRoom)),
      );
      under[i].weightBps += add;
      left -= add;
    }
    // Fix rounding remainder
    for (let i = 0; i < under.length && left > 0; i++) {
      const can = cap - under[i].weightBps;
      if (can <= 0) continue;
      const add = Math.min(can, left);
      under[i].weightBps += add;
      left -= add;
    }
  }

  return { constituents: next, cashBps: result.cashBps };
}
