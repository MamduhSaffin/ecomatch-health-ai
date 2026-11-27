import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import type { ImpactSummary } from '../types/domain';

interface Sdg12AlignmentSectionProps {
  impact: ImpactSummary;
  onExploreDemo: () => void;
}

export const Sdg12AlignmentSection: React.FC<Sdg12AlignmentSectionProps> = ({
  impact,
  onExploreDemo,
}) => {
  return (
    <section
      id="sdg12"
      aria-labelledby="sdg12-heading"
      className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#08101E] py-16"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-6 sm:p-8 lg:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Prominent Styled UN SDG 12 Compliance Badge */}
            <div className="lg:col-span-4 flex flex-col items-start">
              <div className="w-full max-w-[280px] rounded-xl overflow-hidden border border-[#BF8B2E]/50 bg-[#BF8B2E] text-white shadow-sm">
                <div className="p-5 flex flex-col justify-between gap-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-5xl font-extrabold font-display leading-none tracking-tight">
                      12
                    </span>
                    <div className="text-right text-[11px] font-bold leading-snug tracking-wide uppercase">
                      <div>Responsible</div>
                      <div>Consumption</div>
                      <div>&amp; Production</div>
                    </div>
                  </div>

                  {/* Iconic Circular Infinity Loop Emblem (UN SDG 12 motif) */}
                  <div className="py-2 flex items-center justify-center">
                    <svg
                      viewBox="0 0 140 64"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-32 h-14"
                      aria-hidden="true"
                    >
                      <path
                        d="M36 14C20.536 14 10 22.059 10 32C10 41.941 20.536 50 36 50C51.464 50 61.5 39.5 70 32C78.5 24.5 88.536 14 104 14C119.464 14 130 22.059 130 32C130 41.941 119.464 50 104 50C91.5 50 83 43.2 76.2 37"
                        stroke="white"
                        strokeWidth="8.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M78 24L68 33.5L80 39"
                        stroke="white"
                        strokeWidth="6.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  <div className="pt-3 border-t border-white/25 flex items-center justify-between text-[11px] font-mono">
                    <span>UN SDG ALIGNED</span>
                    <span>TARGETS 12.5 · 12.7</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Verified compliance scope: non-regulated medical consumables</span>
              </div>
            </div>

            {/* Explanatory Alignment Narrative & Operational Mapping */}
            <div className="lg:col-span-8 space-y-6">
              <div>
                <p className="text-xs font-medium text-[#9A6E1F] dark:text-[#E5B763]">
                  United Nations Sustainable Development Goal 12 · Health Track Alignment
                </p>
                <h2
                  id="sdg12-heading"
                  className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white"
                >
                  Engineered directly for responsible healthcare consumption and circular supply resilience.
                </h2>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  EcoMatch Health AI operationalises UN SDG 12 inside hospital supply chains by shifting facilities from reactive single-institution purchasing to predictive, circular redistribution. Every eligible batch rescued ahead of expiration eliminates avoidable clinical incineration while conserving public health budgets.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                    Target 12.5 · Waste Prevention
                  </p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    FEFO expiry forecasting intercepts{' '}
                    <span className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                      {impact.simulatedOptimised.potentialWasteReductionPct}%
                    </span>{' '}
                    of projected expiry waste ({impact.simulatedOptimised.potentialWasteDivertedKg} kg diverted in simulation) before disposal.
                  </p>
                </div>

                <div>
                  <p className="text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                    Target 12.7 · Smart Procurement
                  </p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    LP redistribution avoids{' '}
                    <span className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                      ${impact.simulatedOptimised.potentialProcurementSavingsUsd.toLocaleString()}
                    </span>{' '}
                    in duplicate external orders while enforcing strict safety-stock levels.
                  </p>
                </div>

                <div>
                  <p className="text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                    Target 12.6 · Auditable Impact
                  </p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Generates transparent, exportable ESG reports separating observed ledger savings from simulated{' '}
                    <span className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                      {impact.simulatedOptimised.potentialAvoidedCo2eKg} kg CO2e
                    </span>{' '}
                    avoidance.
                  </p>
                </div>
              </div>

              <div className="pt-1 flex flex-wrap items-center justify-between gap-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  10Alytics Global Hackathon 2026 · Health Track Official Alignment
                </p>
                <button
                  type="button"
                  onClick={onExploreDemo}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap"
                >
                  <span>Inspect SDG 12 Impact Centre in Live Demo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
