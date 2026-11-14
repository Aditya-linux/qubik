"use client";

import { motion } from "motion/react";

type Slice = {
  key: string;
  label: string;
  weightBps: number;
  color: string;
};

const PALETTE = [
  "#0f766e",
  "#134e4a",
  "#115e59",
  "#0d9488",
  "#2dd4bf",
  "#5eead4",
  "#99f6e4",
  "#64748b",
  "#94a3b8",
];

export function slicesFromBasket(
  constituents: { symbol: string; weightBps: number }[],
  cashBps: number,
): Slice[] {
  const slices: Slice[] = constituents.map((c, i) => ({
    key: c.symbol,
    label: c.symbol,
    weightBps: c.weightBps,
    color: PALETTE[i % PALETTE.length],
  }));
  if (cashBps > 0) {
    slices.push({
      key: "CASH",
      label: "Cash",
      weightBps: cashBps,
      color: "#d1d5db",
    });
  }
  return slices;
}

function conic(slices: Slice[]) {
  const total = slices.reduce((s, x) => s + x.weightBps, 0) || 1;
  let cursor = 0;
  const parts: string[] = [];
  for (const s of slices) {
    const start = (cursor / total) * 100;
    cursor += s.weightBps;
    const end = (cursor / total) * 100;
    parts.push(`${s.color} ${start}% ${end}%`);
  }
  return `conic-gradient(${parts.join(", ")})`;
}

export function DonutChart({
  slices,
  size = 200,
}: {
  slices: Slice[];
  size?: number;
}) {
  const total = slices.reduce((s, x) => s + x.weightBps, 0);
  const gradientKey = slices.map((s) => `${s.key}:${s.weightBps}`).join("|");

  return (
    <div className="ui-panel flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--muted)]">
          Allocation
        </p>
        <p className="font-mono text-[12px] tabular text-[var(--muted)]">
          {(total / 100).toFixed(1)}% total
        </p>
      </div>

      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <motion.div
          key={gradientKey}
          initial={{ opacity: 0.85 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="relative shrink-0"
          style={{
            width: size,
            height: size,
            borderRadius: "9999px",
            background:
              total > 0 ? conic(slices) : "conic-gradient(#e5e7eb 0% 100%)",
          }}
          aria-label="Basket weight chart"
        >
          <div className="absolute inset-[24%] flex flex-col items-center justify-center rounded-full bg-[var(--surface)] text-center">
            <span className="font-mono text-lg font-semibold tabular text-[var(--ink)]">
              {(total / 100).toFixed(0)}%
            </span>
            <span className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
              allocated
            </span>
          </div>
        </motion.div>

        <ul className="w-full flex-1 space-y-1.5">
          {slices.map((s) => (
            <li
              key={s.key}
              className="flex items-center justify-between gap-3 text-[12px]"
            >
              <span className="flex min-w-0 items-center gap-2 text-[var(--ink)]">
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-[2px]"
                  style={{ background: s.color }}
                />
                <span className="truncate">{s.label}</span>
              </span>
              <span className="font-mono shrink-0 tabular text-[var(--muted)]">
                {(s.weightBps / 100).toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
