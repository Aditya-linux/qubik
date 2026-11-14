import { describe, expect, it } from "vitest";
import type { Asset } from "@/lib/assets/types";
import { composeBasket } from "./compose";
import type { ComposeRules } from "./types";

function asset(
  symbol: string,
  name: string,
  sectors: string[] = ["tech"],
): Asset {
  return {
    symbol,
    name,
    mainnetAddress: `0x${symbol.padEnd(40, "0")}`,
    multiplier: 1,
    navPrice: 100,
    navPriceUpdatedAt: "2026-11-14T00:00:00Z",
    prospectusUrl: null,
    hasMarket: "unknown",
    sectors,
  };
}

const AI_LIST: Asset[] = [
  asset("NVDA", "NVIDIA Corporation", ["ai", "tech"]),
  asset("MSFT", "Microsoft Corporation", ["ai", "tech", "big_tech"]),
  asset("GOOGL", "Alphabet Inc", ["ai", "tech", "big_tech"]),
  asset("META", "Meta Platforms", ["ai", "tech", "big_tech"]),
  asset("AMZN", "Amazon.com Inc", ["ai", "tech", "big_tech"]),
  asset("AAPL", "Apple Inc", ["tech", "big_tech"]),
  asset("TSLA", "Tesla Inc", ["energy", "tech"]),
  asset("AMD", "Advanced Micro Devices", ["ai", "tech"]),
];

const baseRules = (over: Partial<ComposeRules> = {}): ComposeRules => ({
  theme: "ai",
  exclusions: [],
  maxWeightBps: 2000,
  cashBps: 1000,
  ...over,
});

describe("composeBasket", () => {
  it("flags a symbol not in the list as unavailable (Continue would be blocked)", () => {
    const result = composeBasket({
      rules: baseRules({
        preferredSymbols: ["FAKENAME"],
        weightOverrides: { FAKENAME: 2000 },
      }),
      assets: AI_LIST,
    });

    expect(result.flags.some((f) => f.type === "unavailable" && f.symbol === "FAKENAME")).toBe(
      true,
    );
    expect(result.isValid).toBe(false);
    // Never silently substitute
    expect(result.constituents.find((c) => c.symbol === "FAKENAME")).toBeUndefined();
  });

  it("flags a 26% weight against a 20% cap", () => {
    const result = composeBasket({
      rules: baseRules({
        preferredSymbols: ["NVDA", "MSFT", "GOOGL", "META"],
        weightOverrides: {
          NVDA: 2600,
          MSFT: 2200,
          GOOGL: 2100,
          META: 2100,
        },
        cashBps: 1000,
      }),
      assets: AI_LIST,
    });

    const over = result.flags.find(
      (f) => f.type === "over_cap" && f.symbol === "NVDA",
    );
    expect(over).toBeDefined();
    if (over && over.type === "over_cap") {
      expect(over.weightBps).toBe(2600);
      expect(over.capBps).toBe(2000);
    }
    expect(result.isValid).toBe(false);
  });

  it("valid AI mix with 10% cash and 20% cap has no flags and sums to 10000", () => {
    const result = composeBasket({
      rules: baseRules({
        theme: "ai",
        maxWeightBps: 2000,
        cashBps: 1000,
      }),
      assets: AI_LIST,
    });

    expect(result.flags).toEqual([]);
    expect(result.cashBps).toBe(1000);
    const stockSum = result.constituents.reduce((s, c) => s + c.weightBps, 0);
    expect(stockSum + result.cashBps).toBe(10_000);
    expect(result.totalWeightBps).toBe(10_000);
    expect(result.isValid).toBe(true);
    for (const c of result.constituents) {
      expect(c.weightBps).toBeLessThanOrEqual(2000);
      expect(c.weightBps).toBeGreaterThan(0);
    }
  });

  it("never absorbs the cash sleeve into stocks automatically", () => {
    const result = composeBasket({
      rules: baseRules({ cashBps: 1500, maxWeightBps: 2500 }),
      assets: AI_LIST,
    });
    expect(result.cashBps).toBe(1500);
    const stockSum = result.constituents.reduce((s, c) => s + c.weightBps, 0);
    expect(stockSum).toBe(8500);
  });

  it("honours exclusions", () => {
    const result = composeBasket({
      rules: baseRules({ exclusions: ["energy"] }),
      assets: AI_LIST,
    });
    expect(result.constituents.find((c) => c.symbol === "TSLA")).toBeUndefined();
  });

  it("can surface unavailable and over_cap flags together", () => {
    const result = composeBasket({
      rules: baseRules({
        preferredSymbols: ["MISSING"],
        weightOverrides: {
          MISSING: 1000,
          NVDA: 3000,
          MSFT: 2000,
          GOOGL: 2000,
          META: 2000,
        },
        cashBps: 1000,
      }),
      assets: AI_LIST,
    });
    expect(result.flags.some((f) => f.type === "unavailable")).toBe(true);
    expect(result.flags.some((f) => f.type === "over_cap")).toBe(true);
  });

  it("flags an empty vibe match instead of inventing names", () => {
    const result = composeBasket({
      rules: baseRules({
        theme: "space",
        exclusions: ["space", "rocket", "boeing", "satellite"],
      }),
      assets: AI_LIST,
    });
    expect(result.constituents).toHaveLength(0);
    expect(result.isValid).toBe(false);
    expect(result.flags.some((f) => f.type === "unavailable")).toBe(true);
  });

  it("rejects a zero weight instead of keeping a silent empty slot", () => {
    const result = composeBasket({
      rules: baseRules({
        preferredSymbols: ["NVDA", "MSFT"],
        weightOverrides: {
          NVDA: 9000,
          MSFT: 0,
        },
        cashBps: 1000,
      }),
      assets: AI_LIST,
    });
    expect(result.flags.some((f) => f.type === "zero_weight" && f.symbol === "MSFT")).toBe(
      true,
    );
    expect(result.isValid).toBe(false);
  });
});

