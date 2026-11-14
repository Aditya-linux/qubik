"use client";

const SLICES = [
  { label: "NVDA", pct: 18, color: "#0f766e" },
  { label: "MSFT", pct: 16, color: "#134e4a" },
  { label: "GOOGL", pct: 14, color: "#115e59" },
  { label: "AMZN", pct: 14, color: "#0d9488" },
  { label: "META", pct: 12, color: "#5eead4" },
  { label: "AAPL", pct: 11, color: "#99f6e4" },
  { label: "Cash", pct: 15, color: "#d1d5db" },
];

function conicGradient() {
  let cursor = 0;
  const parts: string[] = [];
  for (const s of SLICES) {
    const start = cursor;
    cursor += s.pct;
    parts.push(`${s.color} ${start}% ${cursor}%`);
  }
  return `conic-gradient(${parts.join(", ")})`;
}

/** Static sample allocation — labelled example, not a live market. */
export function SamplePie() {
  return (
    <div className="ui-panel w-full max-w-md p-5 shadow-[0_1px_0_rgba(11,18,32,0.04)]">
      <div className="mb-4 flex items-start justify-between gap-3 border-b border-[var(--line)] pb-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
            Sample allocation
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--ink)]">
            AI theme · 20% cap · 15% cash
          </p>
        </div>
        <span className="font-mono rounded border border-[var(--line)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--muted)]">
          Example
        </span>
      </div>

      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        <div
          className="relative h-40 w-40 shrink-0 rounded-full"
          style={{ background: conicGradient() }}
          aria-hidden
        >
          <div className="absolute inset-[26%] flex flex-col items-center justify-center rounded-full bg-[var(--surface)] text-center">
            <span className="font-mono text-lg font-semibold tabular text-[var(--ink)]">
              100%
            </span>
            <span className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
              allocated
            </span>
          </div>
        </div>

        <ul className="w-full flex-1 space-y-1.5">
          {SLICES.map((s) => (
            <li
              key={s.label}
              className="flex items-center justify-between gap-3 text-[12px]"
            >
              <span className="flex items-center gap-2 text-[var(--ink)]">
                <span
                  className="inline-block h-2 w-2 rounded-[2px]"
                  style={{ background: s.color }}
                />
                {s.label}
              </span>
              <span className="font-mono tabular text-[var(--muted)]">
                {s.pct.toFixed(0)}.0%
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 border-t border-[var(--line)] pt-3 text-[11px] text-[var(--muted)]">
        Not a live market. Reference illustration for product flow only.
      </p>
    </div>
  );
}
