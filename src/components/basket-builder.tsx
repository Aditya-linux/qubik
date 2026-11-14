"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DonutChart, slicesFromBasket } from "@/components/donut-chart";
import type { QuizRules } from "@/components/vibe-quiz";
import { themeLabel } from "@/lib/engine/themes";
import type { ComposeFlag, ComposeResult, ThemeId } from "@/lib/engine/types";

type Props = {
  rules: QuizRules;
  onBack: () => void;
  onContinue: (
    basket: ComposeResult,
    rules: QuizRules & {
      weightOverrides?: Record<string, number>;
      removedSymbols?: string[];
    },
  ) => void;
};

async function postCompose(
  body: Record<string, unknown>,
): Promise<ComposeResult & { dataLabel?: string }> {
  const res = await fetch("/api/compose", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? `Compose failed (${res.status})`,
    );
  }
  return res.json();
}

function redistribute(
  weights: Record<string, number>,
  stockBudget: number,
): Record<string, number> {
  const keys = Object.keys(weights);
  if (keys.length === 0) return {};
  const sum = keys.reduce((s, k) => s + Math.max(0, weights[k]), 0) || 1;
  const out: Record<string, number> = {};
  let assigned = 0;
  keys.forEach((k, i) => {
    if (i === keys.length - 1) {
      out[k] = Math.max(0, stockBudget - assigned);
    } else {
      const w = Math.round((Math.max(0, weights[k]) / sum) * stockBudget);
      out[k] = w;
      assigned += w;
    }
  });
  return out;
}

export function BasketBuilder({ rules, onBack, onContinue }: Props) {
  const [basket, setBasket] = useState<
    (ComposeResult & { dataLabel?: string }) | null
  >(null);
  const [weightOverrides, setWeightOverrides] = useState<
    Record<string, number>
  >({});
  const [removedSymbols, setRemovedSymbols] = useState<string[]>([]);
  const [preferredSymbols, setPreferredSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragSymbol, setDragSymbol] = useState<string | null>(null);
  const [clearedFlash, setClearedFlash] = useState(false);
  const prevFlagCount = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);

  const runCompose = useCallback(
    async (immediate = false) => {
      const exec = async () => {
        const id = ++requestId.current;
        setLoading(true);
        setError(null);
        try {
          const result = await postCompose({
            theme: rules.theme,
            exclusions: rules.exclusions,
            maxWeightBps: rules.maxWeightBps,
            cashBps: rules.cashBps,
            weightOverrides:
              Object.keys(weightOverrides).length > 0
                ? weightOverrides
                : undefined,
            removedSymbols: removedSymbols.length
              ? removedSymbols
              : undefined,
            preferredSymbols: preferredSymbols.length
              ? preferredSymbols
              : undefined,
          });
          if (id !== requestId.current) return;
          setBasket(result);
        } catch (e) {
          if (id !== requestId.current) return;
          setError(e instanceof Error ? e.message : "Compose failed");
        } finally {
          if (id === requestId.current) setLoading(false);
        }
      };

      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (immediate) {
        await exec();
        return;
      }
      debounceRef.current = setTimeout(() => {
        void exec();
      }, 280);
    },
    [rules, weightOverrides, removedSymbols, preferredSymbols],
  );

  useEffect(() => {
    void runCompose(false);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [runCompose]);

  useEffect(() => {
    const count = basket?.flags.length ?? 0;
    if (prevFlagCount.current > 0 && count === 0) {
      setClearedFlash(true);
      const t = setTimeout(() => setClearedFlash(false), 600);
      prevFlagCount.current = count;
      return () => clearTimeout(t);
    }
    prevFlagCount.current = count;
  }, [basket?.flags.length]);

  const slices = useMemo(() => {
    if (!basket) return [];
    return slicesFromBasket(basket.constituents, basket.cashBps);
  }, [basket]);

  const hasFlags = (basket?.flags.length ?? 0) > 0;

  const syncOverridesFromBasket = (next: Record<string, number>) => {
    setWeightOverrides(
      redistribute(next, 10_000 - rules.cashBps),
    );
  };

  const adjustToCap = (symbol: string) => {
    if (!basket) return;
    const next: Record<string, number> = {};
    for (const c of basket.constituents) {
      next[c.symbol] =
        c.symbol === symbol ? rules.maxWeightBps : c.weightBps;
    }
    const capped = basket.constituents.find((c) => c.symbol === symbol);
    if (capped && capped.weightBps > rules.maxWeightBps) {
      let freed = capped.weightBps - rules.maxWeightBps;
      const others = basket.constituents.filter(
        (c) => c.symbol !== symbol && c.weightBps < rules.maxWeightBps,
      );
      for (const o of others) {
        if (freed <= 0) break;
        const room = rules.maxWeightBps - next[o.symbol];
        const add = Math.min(room, freed);
        next[o.symbol] += add;
        freed -= add;
      }
    }
    syncOverridesFromBasket(next);
  };

  const removeSymbol = (symbol: string) => {
    setRemovedSymbols((prev) => [...new Set([...prev, symbol])]);
    setPreferredSymbols((prev) => prev.filter((s) => s !== symbol));
    setWeightOverrides((prev) => {
      if (!basket) {
        const next = { ...prev };
        delete next[symbol];
        return next;
      }
      const next: Record<string, number> = {};
      for (const c of basket.constituents) {
        if (c.symbol === symbol) continue;
        next[c.symbol] = prev[c.symbol] ?? c.weightBps;
      }
      return redistribute(next, 10_000 - rules.cashBps);
    });
  };

  const dismissUnavailable = (symbol: string) => {
    if (symbol === "(mix)") return;
    setPreferredSymbols((prev) => prev.filter((s) => s !== symbol));
    setWeightOverrides((prev) => {
      const next = { ...prev };
      delete next[symbol];
      if (basket && Object.keys(next).length > 0) {
        const kept: Record<string, number> = {};
        for (const c of basket.constituents) {
          kept[c.symbol] = next[c.symbol] ?? c.weightBps;
        }
        return redistribute(kept, 10_000 - rules.cashBps);
      }
      return next;
    });
  };

  const onWeightDrag = (symbol: string, deltaBps: number) => {
    if (!basket || deltaBps === 0) return;
    const current = Object.fromEntries(
      basket.constituents.map((c) => [
        c.symbol,
        weightOverrides[c.symbol] ?? c.weightBps,
      ]),
    );
    current[symbol] = Math.max(100, (current[symbol] ?? 0) + deltaBps);
    syncOverridesFromBasket(current);
  };

  const nudgeWeight = (symbol: string, deltaBps: number) => {
    if (!basket) return;
    const current = Object.fromEntries(
      basket.constituents.map((c) => [
        c.symbol,
        weightOverrides[c.symbol] ?? c.weightBps,
      ]),
    );
    current[symbol] = Math.max(100, (current[symbol] ?? 0) + deltaBps);
    syncOverridesFromBasket(current);
  };

  /** Live demo helpers for Show-us flags (not hard-coded fixtures in the engine). */
  const demoUnavailable = () => {
    setPreferredSymbols((prev) => [...new Set([...prev, "ZZZZ"])]);
  };

  const demoOverCap = () => {
    if (!basket || basket.constituents.length === 0) return;
    const first = basket.constituents[0].symbol;
    const next: Record<string, number> = {};
    const stockBudget = 10_000 - rules.cashBps;
    const over = Math.min(stockBudget, Math.max(rules.maxWeightBps + 600, 2600));
    next[first] = over;
    const rest = basket.constituents.slice(1);
    const leftover = Math.max(0, stockBudget - over);
    if (rest.length === 0) {
      setWeightOverrides(next);
      return;
    }
    const each = Math.floor(leftover / rest.length);
    let assigned = 0;
    rest.forEach((c, i) => {
      if (i === rest.length - 1) next[c.symbol] = leftover - assigned;
      else {
        next[c.symbol] = each;
        assigned += each;
      }
    });
    setWeightOverrides(next);
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div className="ui-panel flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-[12px]">
        <Meta label="Theme" value={themeLabel(rules.theme as ThemeId)} />
        <Meta label="Max weight" value={`${(rules.maxWeightBps / 100).toFixed(0)}%`} />
        <Meta label="Cash" value={`${(rules.cashBps / 100).toFixed(0)}%`} />
        {rules.exclusions.map((ex) => (
          <Meta key={ex} label="Exclude" value={ex} />
        ))}
        <span className="ml-auto font-mono text-[11px] text-[var(--muted)]">
          {loading ? "Updating…" : "Reference data"}
        </span>
      </div>

      {error ? (
        <p className="border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.15fr] lg:items-start">
        <div className={clearedFlash ? "animate-fade-in" : undefined}>
          {loading && !basket ? (
            <div className="ui-panel p-8 text-sm text-[var(--muted)]">
              Composing basket…
            </div>
          ) : (
            <DonutChart slices={slices} />
          )}
        </div>

        <div className="space-y-2">
          {basket?.flags.map((flag) => (
            <FlagBanner
              key={`${flag.type}-${flag.symbol}`}
              flag={flag}
              onDismiss={
                flag.type === "unavailable" && flag.symbol !== "(mix)"
                  ? () => dismissUnavailable(flag.symbol)
                  : undefined
              }
              onAdjust={
                flag.type === "over_cap"
                  ? () => adjustToCap(flag.symbol)
                  : undefined
              }
            />
          ))}

          <div className="ui-panel overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-[var(--line)] bg-[var(--surface-muted)] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
              <span>Constituent</span>
              <span className="w-28 text-center">Weight</span>
              <span className="w-16 text-right">Actions</span>
            </div>

            <AnimatePresence initial={false}>
              {basket?.constituents.map((c) => {
                const over = basket.flags.some(
                  (f) => f.type === "over_cap" && f.symbol === c.symbol,
                );
                const zero = basket.flags.some(
                  (f) => f.type === "zero_weight" && f.symbol === c.symbol,
                );
                return (
                  <motion.div
                    key={c.symbol}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b border-[var(--line)] px-4 py-3 last:border-0"
                  >
                    <div
                      className="min-w-0 cursor-ew-resize touch-none"
                      onPointerDown={(e) => {
                        (e.currentTarget as HTMLElement).setPointerCapture(
                          e.pointerId,
                        );
                        setDragSymbol(c.symbol);
                      }}
                      onPointerUp={() => setDragSymbol(null)}
                      onPointerCancel={() => setDragSymbol(null)}
                      onPointerMove={(e) => {
                        if (dragSymbol !== c.symbol || e.buttons !== 1) return;
                        onWeightDrag(c.symbol, Math.round(e.movementX * 8));
                      }}
                    >
                      <p className="truncate text-sm font-semibold text-[var(--ink)]">
                        {c.symbol}
                      </p>
                      <p className="truncate text-[12px] text-[var(--muted)]">
                        {c.name}
                      </p>
                    </div>

                    <div className="flex w-28 items-center justify-center gap-1">
                      <button
                        type="button"
                        aria-label={`Decrease ${c.symbol}`}
                        onClick={() => nudgeWeight(c.symbol, -100)}
                        className="flex h-7 w-7 items-center justify-center border border-[var(--line)] text-sm hover:bg-[var(--surface-muted)]"
                      >
                        −
                      </button>
                      <span
                        className={`font-mono min-w-[3rem] text-center text-sm tabular ${
                          over || zero
                            ? "text-[var(--danger)]"
                            : "text-[var(--ink)]"
                        }`}
                      >
                        {(c.weightBps / 100).toFixed(1)}%
                      </span>
                      <button
                        type="button"
                        aria-label={`Increase ${c.symbol}`}
                        onClick={() => nudgeWeight(c.symbol, 100)}
                        className="flex h-7 w-7 items-center justify-center border border-[var(--line)] text-sm hover:bg-[var(--surface-muted)]"
                      >
                        +
                      </button>
                    </div>

                    <div className="flex w-16 flex-col items-end gap-1">
                      {over ? (
                        <button
                          type="button"
                          onClick={() => adjustToCap(c.symbol)}
                          className="text-[11px] font-medium text-[var(--accent)]"
                        >
                          Cap
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => removeSymbol(c.symbol)}
                        className="text-[11px] text-[var(--muted)] hover:text-[var(--danger)]"
                      >
                        Remove
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {basket && basket.cashBps > 0 ? (
              <div className="flex items-center justify-between bg-[var(--surface-muted)] px-4 py-3">
                <p className="text-sm font-medium text-[var(--ink)]">
                  Cash sleeve
                </p>
                <p className="font-mono text-sm tabular text-[var(--ink)]">
                  {(basket.cashBps / 100).toFixed(1)}%
                </p>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-4 pt-1 text-[11px] text-[var(--muted)]">
            <button
              type="button"
              onClick={demoUnavailable}
              className="underline-offset-2 hover:text-[var(--ink)] hover:underline"
            >
              Simulate unavailable symbol
            </button>
            <button
              type="button"
              onClick={demoOverCap}
              className="underline-offset-2 hover:text-[var(--ink)] hover:underline"
            >
              Simulate over-cap weight
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          className="ui-btn ui-btn-secondary h-10 px-5"
        >
          Back
        </button>
        <button
          type="button"
          disabled={hasFlags || !basket?.isValid || loading}
          onClick={() => {
            if (!basket?.isValid) return;
            onContinue(basket, {
              ...rules,
              weightOverrides,
              removedSymbols,
            });
          }}
          className="ui-btn ui-btn-primary h-10 flex-1 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {hasFlags ? "Resolve validation issues" : "Review draft"}
        </button>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="font-medium text-[var(--ink)]">{value}</span>
    </span>
  );
}

function FlagBanner({
  flag,
  onDismiss,
  onAdjust,
}: {
  flag: ComposeFlag;
  onDismiss?: () => void;
  onAdjust?: () => void;
}) {
  switch (flag.type) {
    case "unavailable":
      return (
        <div className="border border-[var(--warn)] bg-[var(--warn-soft)] px-4 py-3 text-sm text-[var(--warn)]">
          <p className="font-semibold">Validation · unavailable</p>
          <p className="mt-1 text-[13px] opacity-90">{flag.reason}</p>
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              className="mt-2 text-[12px] font-medium underline-offset-2 hover:underline"
            >
              Remove {flag.symbol}
            </button>
          ) : null}
        </div>
      );
    case "over_cap":
      return (
        <div className="border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          <p className="font-semibold">Validation · weight cap</p>
          <p className="mt-1 text-[13px]">
            {flag.symbol} is {(flag.weightBps / 100).toFixed(1)}%, above the{" "}
            {(flag.capBps / 100).toFixed(0)}% maximum.
          </p>
          {onAdjust ? (
            <button
              type="button"
              onClick={onAdjust}
              className="mt-2 text-[12px] font-medium underline-offset-2 hover:underline"
            >
              Adjust to cap
            </button>
          ) : null}
        </div>
      );
    case "zero_weight":
      return (
        <div className="border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          <p className="font-semibold">Validation · zero weight</p>
          <p className="mt-1 text-[13px]">
            {flag.symbol} is 0%. Remove it or assign a positive weight.
          </p>
        </div>
      );
    default: {
      const _exhaustive: never = flag;
      return _exhaustive;
    }
  }
}
