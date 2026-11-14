"use client";

import { createCDPEmbeddedWalletConnector } from "@coinbase/cdp-wagmi";
import { http, createConfig, type CreateConnectorFn } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { coinbaseWallet, injected } from "wagmi/connectors";
import { cdpCoreConfig } from "./cdp";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

const connectors: CreateConnectorFn[] = [];

if (isUuid(cdpCoreConfig.projectId ?? "")) {
  connectors.push(
    createCDPEmbeddedWalletConnector({
      cdpConfig: cdpCoreConfig,
      providerConfig: {
        chains: [baseSepolia],
        transports: {
          [baseSepolia.id]: http(),
        },
      },
    }),
  );
}

connectors.push(
  coinbaseWallet({
    appName: "Qubik",
    preference: "all",
  }),
  injected({ shimDisconnect: true }),
);

/**
 * Wagmi is locked to Base Sepolia (84532) for v1.
 * Do NOT add @coinbase/onchainkit — it is retired; use wagmi + viem + CDP.
 */
export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors,
  transports: {
    [baseSepolia.id]: http(),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
