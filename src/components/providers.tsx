"use client";

import { CDPReactProvider } from "@coinbase/cdp-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { cdpReactConfig } from "@/lib/cdp";
import { wagmiConfig } from "@/lib/wagmi";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [cdpReady, setCdpReady] = useState(false);

  useEffect(() => {
    // CDP UI needs the browser; wagmi must wrap from the first client render.
    setCdpReady(isUuid(cdpReactConfig.projectId ?? ""));
  }, []);

  const tree = (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );

  if (!cdpReady) {
    return tree;
  }

  return <CDPReactProvider config={cdpReactConfig}>{tree}</CDPReactProvider>;
}
