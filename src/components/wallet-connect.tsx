"use client";

import { AuthButton } from "@coinbase/cdp-react/components/AuthButton";
import { useEffect, useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { baseSepolia } from "wagmi/chains";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

/** Avoid calling wagmi hooks during SSR / before provider hydration. */
export function WalletConnect() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex w-full flex-col gap-2.5">
        <a href="/build" className="ui-btn ui-btn-primary h-11 w-full">
          Start composition
        </a>
        <div className="ui-btn ui-btn-secondary h-11 w-full opacity-50">
          Loading wallets…
        </div>
      </div>
    );
  }

  return <WalletConnectClient />;
}

function WalletConnectClient() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [toast, setToast] = useState<string | null>(null);
  const cdpReady = isUuid(process.env.NEXT_PUBLIC_CDP_PROJECT_ID ?? "");

  useEffect(() => {
    if (!isConnected || !address) return;
    setToast("Connected · ready to compose");
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [isConnected, address]);

  const wrongChain = isConnected && chainId !== baseSepolia.id;

  const externalConnectors = connectors.filter(
    (c) => c.id !== "cdpEmbeddedWallet" && c.type !== "cdpEmbeddedWallet",
  );

  return (
    <div className="flex w-full flex-col gap-2.5">
      {toast ? (
        <p
          className="animate-fade-in border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-[12px] font-medium text-[var(--ink)]"
          role="status"
        >
          {toast}
        </p>
      ) : null}

      {wrongChain ? (
        <button
          type="button"
          onClick={() => switchChain({ chainId: baseSepolia.id })}
          disabled={isSwitching}
          className="ui-btn ui-btn-accent h-11 w-full disabled:opacity-60"
        >
          {isSwitching ? "Switching network…" : "Switch to Base Sepolia"}
        </button>
      ) : null}

      {isConnected && address ? (
        <div className="ui-panel space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--muted)]">
                Wallet
              </p>
              <p className="font-mono mt-1 text-sm text-[var(--ink)]">
                {address.slice(0, 6)}…{address.slice(-4)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => disconnect()}
              className="text-[12px] font-medium text-[var(--muted)] underline-offset-2 hover:text-[var(--ink)] hover:underline"
            >
              Disconnect
            </button>
          </div>
          <a href="/build" className="ui-btn ui-btn-primary h-11 w-full">
            Start composition
          </a>
        </div>
      ) : (
        <>
          <a href="/build" className="ui-btn ui-btn-primary h-11 w-full">
            Start composition
          </a>
          {cdpReady ? (
            <div className="w-full [&_button]:!h-11 [&_button]:!w-full [&_button]:!rounded-[6px] [&_button]:!border [&_button]:!border-[var(--line)] [&_button]:!bg-[var(--surface)] [&_button]:!text-sm [&_button]:!font-medium [&_button]:!text-[var(--ink)]">
              <AuthButton />
            </div>
          ) : null}
          {externalConnectors.map((connector) => (
            <button
              key={connector.uid}
              type="button"
              disabled={isPending}
              onClick={() => connect({ connector, chainId: baseSepolia.id })}
              className="ui-btn ui-btn-secondary h-11 w-full disabled:opacity-60"
            >
              {connector.name}
            </button>
          ))}
          <p className="text-[11px] text-[var(--muted)]">
            Wallet optional for draft composition. Signing arrives in Phase C.
          </p>
        </>
      )}
    </div>
  );
}
