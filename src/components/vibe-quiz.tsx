"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { EXCLUSION_CHIPS, THEME_OPTIONS, themeLabel } from "@/lib/engine/themes";
import type { ThemeId } from "@/lib/engine/types";

export type QuizRules = {
  theme: ThemeId;
  exclusions: string[];
  maxWeightBps: number;
  cashBps: number;
};

type Props = {
  onBuild: (rules: QuizRules) => void;
  building?: boolean;
};

const QUESTIONS = ["vibe", "exclude", "cap", "cash"] as const;
const ease = [0.22, 1, 0.36, 1] as const;

export function VibeQuiz({ onBuild, building }: Props) {
  const [step, setStep] = useState(0);
  const [theme, setTheme] = useState<ThemeId>("ai");
  const [exclusions, setExclusions] = useState<string[]>([]);
  const [maxWeightBps, setMaxWeightBps] = useState(2000);
  const [cashBps, setCashBps] = useState(1000);

  const progress = ((step + 1) / QUESTIONS.length) * 100;
  const q = QUESTIONS[step];

  const summary = useMemo(
    () => [
      { k: "Theme", v: themeLabel(theme) },
      {
        k: "Exclusions",
        v: exclusions.length
          ? exclusions
              .map(
                (id) => EXCLUSION_CHIPS.find((c) => c.id === id)?.label ?? id,
              )
              .join(", ")
          : "None",
      },
      { k: "Max weight", v: `${(maxWeightBps / 100).toFixed(0)}%` },
      { k: "Cash sleeve", v: `${(cashBps / 100).toFixed(0)}% USDC` },
    ],
    [theme, exclusions, maxWeightBps, cashBps],
  );

  const toggleExclusion = (id: string) => {
    setExclusions((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-5 lg:grid-cols-[1.4fr_1fr]">
      <div className="ui-panel overflow-hidden">
        <div className="border-b border-[var(--line)] px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--muted)]">
              Composition wizard
            </p>
            <p className="font-mono text-[12px] text-[var(--muted)]">
              {step + 1} / {QUESTIONS.length}
            </p>
          </div>
          <div className="h-1 overflow-hidden rounded-sm bg-[var(--surface-muted)]">
            <motion.div
              className="h-full bg-[var(--accent)]"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.25, ease }}
            />
          </div>
        </div>

        <div className="min-h-[240px] px-5 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={q}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease }}
            >
              {q === "vibe" ? (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold tracking-tight text-[var(--ink)]">
                    Select theme
                  </h2>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {THEME_OPTIONS.map((opt) => {
                      const on = theme === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setTheme(opt.id)}
                          className={`border px-3 py-3 text-left text-sm font-medium transition ${
                            on
                              ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                              : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-muted)]"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {q === "exclude" ? (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold tracking-tight text-[var(--ink)]">
                    Exclusions
                  </h2>
                  <p className="text-[13px] text-[var(--muted)]">
                    Optional. Selected sectors are omitted from the draft basket.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {EXCLUSION_CHIPS.map((chip) => {
                      const on = exclusions.includes(chip.id);
                      return (
                        <button
                          key={chip.id}
                          type="button"
                          onClick={() => toggleExclusion(chip.id)}
                          className={`border px-3 py-2 text-sm font-medium transition ${
                            on
                              ? "border-[var(--warn)] bg-[var(--warn-soft)] text-[var(--warn)]"
                              : "border-[var(--line)] text-[var(--ink)] hover:bg-[var(--surface-muted)]"
                          }`}
                        >
                          {chip.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {q === "cap" ? (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold tracking-tight text-[var(--ink)]">
                    Maximum single-name weight
                  </h2>
                  <p className="font-mono text-4xl font-semibold tabular text-[var(--ink)]">
                    {(maxWeightBps / 100).toFixed(0)}
                    <span className="text-lg text-[var(--muted)]">%</span>
                  </p>
                  <input
                    type="range"
                    min={500}
                    max={5000}
                    step={100}
                    value={maxWeightBps}
                    onChange={(e) => setMaxWeightBps(Number(e.target.value))}
                    className="w-full accent-[var(--accent)]"
                  />
                  {maxWeightBps >= 4500 ? (
                    <p className="text-[13px] text-[var(--warn)]">
                      High concentration risk above 45%.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {q === "cash" ? (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold tracking-tight text-[var(--ink)]">
                    Cash sleeve
                  </h2>
                  <p className="font-mono text-4xl font-semibold tabular text-[var(--ink)]">
                    {(cashBps / 100).toFixed(0)}
                    <span className="text-lg text-[var(--muted)]">% USDC</span>
                  </p>
                  <input
                    type="range"
                    min={0}
                    max={4000}
                    step={100}
                    value={cashBps}
                    onChange={(e) => setCashBps(Number(e.target.value))}
                    className="w-full accent-[var(--accent)]"
                  />
                  <p className="text-[13px] text-[var(--muted)]">
                    Cash is reserved separately and is not absorbed into stock
                    weights.
                  </p>
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex gap-2 border-t border-[var(--line)] px-5 py-4">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="ui-btn ui-btn-secondary h-10 px-4"
            >
              Back
            </button>
          ) : null}
          {step < QUESTIONS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="ui-btn ui-btn-primary h-10 flex-1"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              disabled={building}
              onClick={() =>
                onBuild({ theme, exclusions, maxWeightBps, cashBps })
              }
              className="ui-btn ui-btn-accent h-10 flex-1 disabled:opacity-60"
            >
              {building ? "Composing…" : "Generate basket"}
            </button>
          )}
        </div>
      </div>

      <aside className="ui-panel h-fit p-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--muted)]">
          Rules draft
        </p>
        <dl className="mt-4 space-y-3">
          {summary.map((row) => (
            <div
              key={row.k}
              className="flex items-baseline justify-between gap-3 border-b border-[var(--line)] pb-2 last:border-0"
            >
              <dt className="text-[12px] text-[var(--muted)]">{row.k}</dt>
              <dd className="text-right text-[13px] font-medium text-[var(--ink)]">
                {row.v}
              </dd>
            </div>
          ))}
        </dl>
      </aside>
    </div>
  );
}
