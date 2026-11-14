/** Normalized tokenized-stock record for Qubik's catalog. */
export type Asset = {
  symbol: string;
  name: string;
  mainnetAddress: string;
  multiplier: number;
  navPrice: number | null;
  navPriceUpdatedAt: string | null;
  prospectusUrl: string | null;
  /** false until BaseStonk is wired; unknown when BaseStonk fails. */
  hasMarket: boolean | "unknown";
  /** Coarse sector tags for exclusion chips (best-effort from name/theme). */
  sectors: string[];
};

export type AssetsResponse = {
  assets: Asset[];
  fetchedAt: string;
  source: "coinbase";
  /** Reminder: this is reference / NAV data, not a live tradable book. */
  disclaimer: string;
};
