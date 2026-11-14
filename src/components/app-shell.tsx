import type { ReactNode } from "react";

export function AppShell({
  children,
  right,
}: {
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div
        className="border-b border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-center text-[12px] font-medium tracking-wide text-[var(--muted)]"
        role="status"
      >
        Not available in the United States · Eligible non-US persons only
      </div>

      <header className="border-b border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-5">
          <a
            href="/"
            className="font-display text-[1.35rem] font-semibold tracking-tight text-[var(--ink)]"
          >
            Qubik
          </a>
          <div className="flex items-center gap-3">
            {right}
            <span className="font-mono rounded border border-[var(--line)] bg-[var(--surface-muted)] px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
              Base Sepolia
            </span>
          </div>
        </div>
      </header>

      {children}

      <footer className="mt-auto border-t border-[var(--line)] bg-[var(--surface)] px-5 py-5">
        <p className="mx-auto max-w-6xl text-[11px] leading-relaxed text-[var(--muted)]">
          Reference data only. Tokenized stock references convey no shareholder
          or voting rights. Not endorsed by Base, Coinbase, issuers, or listed
          companies. v1 records index rules on Base Sepolia and does not hold or
          swap real stock tokens.
        </p>
      </footer>
    </div>
  );
}
