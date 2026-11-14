"use client";

import { motion } from "motion/react";
import { SamplePie } from "@/components/sample-pie";
import { WalletConnect } from "@/components/wallet-connect";

const STEPS = [
  { n: "01", title: "Define rules", body: "Theme, exclusions, weight cap, cash sleeve." },
  { n: "02", title: "Compose basket", body: "Live allocation with availability and cap checks." },
  { n: "03", title: "Approve changes", body: "Wallet signature required before any onchain action." },
];

const ease = [0.22, 1, 0.36, 1] as const;

export function LandingHero() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-5 py-10 lg:flex-row lg:items-start lg:gap-14 lg:py-14">
      <section className="flex flex-1 flex-col gap-8 pt-2">
        <motion.div
          className="space-y-5"
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease }}
        >
          <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--accent)]">
            Qubik
          </p>
          <h1 className="font-display max-w-xl text-[2.35rem] font-semibold leading-[1.12] text-[var(--ink)] sm:text-[2.75rem]">
            Rules-based stock baskets on Base — you approve every change.
          </h1>
          <p className="max-w-lg text-[15px] leading-relaxed text-[var(--muted)]">
            Compose a personal index from tokenized-stock reference data, enforce
            caps and exclusions in the UI, then record permissions onchain. Nothing
            executes outside the grant you sign.
          </p>
        </motion.div>

        <ol className="divide-y divide-[var(--line)] border border-[var(--line)] bg-[var(--surface)]">
          {STEPS.map((step) => (
            <li key={step.n} className="flex gap-4 px-4 py-3.5">
              <span className="font-mono w-8 shrink-0 pt-0.5 text-[12px] font-medium text-[var(--accent)]">
                {step.n}
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">
                  {step.title}
                </p>
                <p className="mt-0.5 text-[13px] text-[var(--muted)]">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="w-full max-w-md">
          <WalletConnect />
        </div>
      </section>

      <aside className="flex w-full flex-1 justify-center lg:justify-end lg:pt-6">
        <SamplePie />
      </aside>
    </main>
  );
}
