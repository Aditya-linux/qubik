import { NextResponse } from "next/server";
import { fetchCoinbaseAssets } from "@/lib/assets/fetch-coinbase";
import { composeBasket } from "@/lib/engine/compose";
import type { ComposeRules, ThemeId } from "@/lib/engine/types";

const THEMES = new Set<ThemeId>([
  "ai",
  "big_tech",
  "clean_energy",
  "space",
  "even",
  "surprise",
]);

function parseRules(body: unknown): ComposeRules | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const theme = b.theme as ThemeId;
  if (!THEMES.has(theme)) return null;

  const exclusions = Array.isArray(b.exclusions)
    ? b.exclusions.filter((x): x is string => typeof x === "string")
    : [];
  const maxWeightBps = Number(b.maxWeightBps);
  const cashBps = Number(b.cashBps);
  if (!Number.isFinite(maxWeightBps) || !Number.isFinite(cashBps)) return null;

  const preferredSymbols = Array.isArray(b.preferredSymbols)
    ? b.preferredSymbols.filter((x): x is string => typeof x === "string")
    : undefined;
  const removedSymbols = Array.isArray(b.removedSymbols)
    ? b.removedSymbols.filter((x): x is string => typeof x === "string")
    : undefined;
  const weightOverrides =
    b.weightOverrides && typeof b.weightOverrides === "object"
      ? Object.fromEntries(
          Object.entries(b.weightOverrides as Record<string, unknown>)
            .filter(([, v]) => Number.isFinite(Number(v)))
            .map(([k, v]) => [k.toUpperCase(), Math.round(Number(v))]),
        )
      : undefined;

  return {
    theme,
    exclusions,
    maxWeightBps: Math.round(maxWeightBps),
    cashBps: Math.round(cashBps),
    preferredSymbols,
    removedSymbols,
    weightOverrides,
  };
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const rules = parseRules(json);
    if (!rules) {
      return NextResponse.json({ error: "Invalid compose rules" }, { status: 400 });
    }

    const assets = await fetchCoinbaseAssets();
    const result = composeBasket({ rules, assets });

    return NextResponse.json({
      ...result,
      dataLabel: "reference data — not a live market",
      disclaimer:
        "NAV / reference values from Coinbase Tokenized Stocks API. Not trading.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Compose failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
