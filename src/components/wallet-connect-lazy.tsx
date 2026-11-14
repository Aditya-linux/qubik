"use client";

import dynamic from "next/dynamic";

export const WalletConnect = dynamic(
  () =>
    import("@/components/wallet-connect").then((m) => m.WalletConnect),
  {
    ssr: false,
    loading: () => (
      <div className="h-12 w-full max-w-md animate-pulse rounded-2xl bg-[var(--line)]/50" />
    ),
  },
);
