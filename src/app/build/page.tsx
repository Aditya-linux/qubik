"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { BasketBuilder } from "@/components/basket-builder";
import { VibeQuiz, type QuizRules } from "@/components/vibe-quiz";
import type { ComposeResult } from "@/lib/engine/types";

type Stage = "quiz" | "basket" | "preview";

const ease = [0.22, 1, 0.36, 1] as const;

const STAGE_LABEL: Record<Stage, string> = {
  quiz: "01 Rules",
  basket: "02 Basket",
  preview: "03 Review",
};

export default function BuildPage() {
  const [stage, setStage] = useState<Stage>("quiz");
  const [rules, setRules] = useState<QuizRules | null>(null);
  const [basket, setBasket] = useState<ComposeResult | null>(null);
  const [building, setBuilding] = useState(false);

  return (
    <AppShell
      right={
        <span className="hidden font-mono text-[11px] uppercase tracking-wider text-[var(--muted)] sm:inline">
          {STAGE_LABEL[stage]}
        </span>
      }
    >
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
        <AnimatePresence mode="wait">
          {stage === "quiz" ? (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease }}
            >
              <div className="mb-6">
                <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink)]">
                  Define index rules
                </h1>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Theme, exclusions, concentration limit, and cash sleeve.
                </p>
              </div>
              <VibeQuiz
                building={building}
                onBuild={(r) => {
                  setBuilding(true);
                  setRules(r);
                  setStage("basket");
                  setBuilding(false);
                }}
              />
            </motion.div>
          ) : null}

          {stage === "basket" && rules ? (
            <motion.div
              key="basket"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease }}
            >
              <div className="mb-6">
                <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink)]">
                  Review proposed basket
                </h1>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Adjust weights, clear validation issues, then continue. No
                  onchain transaction yet.
                </p>
              </div>
              <BasketBuilder
                rules={rules}
                onBack={() => setStage("quiz")}
                onContinue={(b) => {
                  setBasket(b);
                  setStage("preview");
                }}
              />
            </motion.div>
          ) : null}

          {stage === "preview" && basket && rules ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease }}
              className="mx-auto max-w-xl"
            >
              <div className="ui-panel overflow-hidden">
                <div className="border-b border-[var(--line)] px-5 py-4">
                  <h1 className="text-xl font-semibold tracking-tight text-[var(--ink)]">
                    Draft ready for signature
                  </h1>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Phase A mock review · {basket.constituents.length} names ·{" "}
                    {(basket.cashBps / 100).toFixed(0)}% cash
                  </p>
                </div>
                <ul className="divide-y divide-[var(--line)] px-5">
                  {basket.constituents.map((c) => (
                    <li
                      key={c.symbol}
                      className="flex justify-between py-3 text-sm"
                    >
                      <span className="font-medium text-[var(--ink)]">
                        {c.symbol}
                      </span>
                      <span className="font-mono tabular text-[var(--muted)]">
                        {(c.weightBps / 100).toFixed(1)}%
                      </span>
                    </li>
                  ))}
                  <li className="flex justify-between py-3 text-sm">
                    <span className="text-[var(--muted)]">Cash</span>
                    <span className="font-mono tabular text-[var(--muted)]">
                      {(basket.cashBps / 100).toFixed(1)}%
                    </span>
                  </li>
                </ul>
                <div className="space-y-2 border-t border-[var(--line)] px-5 py-4">
                  <button
                    type="button"
                    disabled
                    className="ui-btn h-10 w-full cursor-not-allowed bg-[var(--surface-muted)] text-[var(--muted)]"
                  >
                    Sign (available in Phase C)
                  </button>
                  <p className="text-[12px] text-[var(--muted)]">
                    Nothing executes until wallet signature. createIndex and
                    grantPermissions ship with the Sepolia contract.
                  </p>
                  <button
                    type="button"
                    onClick={() => setStage("basket")}
                    className="ui-btn ui-btn-secondary h-10 w-full"
                  >
                    Back to basket
                  </button>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>
    </AppShell>
  );
}
