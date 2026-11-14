import type { Asset } from "@/lib/assets/types";

export type ThemeId =
  | "ai"
  | "big_tech"
  | "clean_energy"
  | "space"
  | "even"
  | "surprise";

export type ComposeRules = {
  theme: ThemeId;
  /** Sector tags or exact symbols to leave out. */
  exclusions: string[];
  maxWeightBps: number;
  cashBps: number;
  /** Optional preferred symbols the user asked for (may be unavailable). */
  preferredSymbols?: string[];
  /** Optional manual weight overrides keyed by symbol (bps). */
  weightOverrides?: Record<string, number>;
  /** Symbols the user removed from the draft. */
  removedSymbols?: string[];
};

export type Constituent = {
  symbol: string;
  name: string;
  mainnetAddress: string;
  weightBps: number;
  available: boolean;
};

export type UnavailableFlag = {
  type: "unavailable";
  symbol: string;
  reason: string;
};

export type OverCapFlag = {
  type: "over_cap";
  symbol: string;
  weightBps: number;
  capBps: number;
};

export type ZeroWeightFlag = {
  type: "zero_weight";
  symbol: string;
};

export type ComposeFlag = UnavailableFlag | OverCapFlag | ZeroWeightFlag;

export type ComposeResult = {
  constituents: Constituent[];
  cashBps: number;
  flags: ComposeFlag[];
  totalWeightBps: number;
  /** true when flags.length === 0 and cash + stock weights === 10000 */
  isValid: boolean;
  theme: ThemeId;
  maxWeightBps: number;
  exclusions: string[];
};

export type ComposeInput = {
  rules: ComposeRules;
  assets: Asset[];
};
