import { describe, expect, it } from "vitest";
import { mapCoinbaseListPayload } from "./fetch-coinbase";

describe("mapCoinbaseListPayload", () => {
  it("reads the official tokens[] shape and normalizes fields", () => {
    const assets = mapCoinbaseListPayload({
      tokens: [
        {
          symbol: "NVDAc",
          name: "NVIDIA Corporation",
          contract_address: "0xabc",
          multiplier: 1,
          nav_price: 120.5,
          nav_price_updated_at: "2026-11-14T00:00:00Z",
          prospectus_url: "https://example.com/nvda",
        },
        { symbol: "", name: "skip me" },
      ],
      next_page_token: "page-2",
    });

    expect(assets).toHaveLength(1);
    expect(assets[0]).toMatchObject({
      symbol: "NVDAC",
      name: "NVIDIA Corporation",
      mainnetAddress: "0xabc",
      multiplier: 1,
      navPrice: 120.5,
      navPriceUpdatedAt: "2026-11-14T00:00:00Z",
      prospectusUrl: "https://example.com/nvda",
      hasMarket: "unknown",
    });
    expect(assets[0].sectors).toContain("ai");
  });

  it("does not tag Entertainment as AI", () => {
    const assets = mapCoinbaseListPayload({
      tokens: [
        {
          symbol: "FUNc",
          name: "Six Flags Entertainment Corporation",
          contract_address: "0xfun",
        },
      ],
    });
    expect(assets[0].sectors).not.toContain("ai");
    expect(assets[0].sectors).toContain("other");
  });
});
