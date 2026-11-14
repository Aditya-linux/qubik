import { NextResponse } from "next/server";
import {
  clearAssetsCache,
  fetchCoinbaseAssets,
} from "@/lib/assets/fetch-coinbase";
import type { AssetsResponse } from "@/lib/assets/types";

const DISCLAIMER =
  "Coinbase tokenized stocks are for eligible jurisdictions outside the United States. This API returns reference / NAV data only — not trading, minting, or custody. A listing is not a tradable market.";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const force = url.searchParams.get("refresh") === "1";
    if (force) clearAssetsCache();
    const assets = await fetchCoinbaseAssets({ force });
    const body: AssetsResponse = {
      assets,
      fetchedAt: new Date().toISOString(),
      source: "coinbase",
      disclaimer: DISCLAIMER,
    };
    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch assets";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
