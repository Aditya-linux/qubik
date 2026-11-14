import type { Config as CdpCoreConfig } from "@coinbase/cdp-core";
import type { Config as CdpReactConfig } from "@coinbase/cdp-react";

/**
 * CDP config for embedded wallets.
 * createOnLogin: "smart" enables ERC-4337 smart accounts (Paymaster-ready later).
 */
const projectId = process.env.NEXT_PUBLIC_CDP_PROJECT_ID ?? "";

export const cdpCoreConfig: CdpCoreConfig = {
  projectId,
  ethereum: {
    createOnLogin: "smart",
  },
};

export const cdpReactConfig: CdpReactConfig = {
  ...cdpCoreConfig,
  appName: "Qubik",
};
