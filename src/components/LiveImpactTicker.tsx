import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Pause, Play } from 'lucide-react';
import type { ImpactSummary, ResourceMatch } from '../types/domain';

interface LiveImpactTickerProps {
  matches: ResourceMatch[];
  impact: ImpactSummary;
}

export const LiveImpactTicker: React.FC<LiveImpactTickerProps> = ({ matches, impact }) => {
  const [paused, setPaused] = useState(false);
  const [tickCount, setTickCount] = useState(0);

  // Respect prefers-reduced-motion on initial mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPaused(true);
    }
  }, []);

  // Derive realistic per-cycle baseline from Engine C/E matches
  const baseStats = useMemo(() => {
    const matchUnits = matches.reduce((sum, m) => sum + m.recommendedTransferQty, 0);
    const baseUnits = Math.max(matchUnits, 180) + impact.observed.completedUnitsTransferred;
    const avgWeightPerUnit =
      baseUnits > 0 ? impact.simulatedOptimised.potentialWasteDivertedKg / Math.max(1, matchUnits) : 0.42;
    const avgCo2PerUnit =
      baseUnits > 0 ? impact.simulatedOptimised.potentialAvoidedCo2eKg / Math.max(1, matchUnits) : 1.3;
    const increments =
      matches.length > 0
        ? matches.map((m) => Math.max(4, Math.min(28, Math.round(m.recommendedTransferQty / 3))))
        : [12, 8, 15, 10];
    return { baseUnits, avgWeightPerUnit, avgCo2PerUnit, increments };
  }, [impact, matches]);

  // Increment growing simulated redistribution count smoothly every 2.4s when active
  useEffect(() => {
    if (paused) return;
    const interval = window.setInterval(() => {
      setTickCount((prev) => prev + 1);
    }, 2400);
    return () => window.clearInterval(interval);
  }, [paused]);

  const addedUnits = useMemo(() => {
    let total = 0;
    for (let i = 0; i < tickCount; i += 1) {
      total += baseStats.increments[i % baseStats.increments.length];
    }
    return total;
  }, [baseStats.increments, tickCount]);

  const totalUnitsRedistributed = baseStats.baseUnits + addedUnits;
  const totalWasteDivertedKg = Math.round(
    impact.simulatedOptimised.potentialWasteDivertedKg + addedUnits * baseStats.avgWeightPerUnit
  );
  const totalCo2SavedKg = Math.round(
    impact.simulatedOptimised.potentialAvoidedCo2eKg + addedUnits * baseStats.avgCo2PerUnit
  );

  const tickerItems = useMemo(() => {
    if (matches.length === 0) {
      return [
        {
          id: 'fallback-1',
          text: 'Metropolitan General → Riverview Clinic · Sterile IV Infusion Sets · +60 units redistributed',
        },
        {
          id: 'fallback-2',
          text: 'St. Jude Regional → Harbourside Clinic · Nitrile Exam Gloves · +95 units redistributed',
        },
      ];
    }
    return matches.slice(0, 6).map((m) => ({
      id: m.matchId,
      text: `${m.donorFacilityName} → ${m.recipientFacilityName} · ${m.productName} · +${m.recommendedTransferQty} units (${m.wasteDivertedKg} kg diverted)`,
    }));
  }, [matches]);

  return (
    <section
      aria-label="Live simulated redistribution impact ticker"
      className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1526]"
    >
      <div className="max-w-7xl mx-auto px-6 py-2.5 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6">
        {/* Left: Growing Real-Time Simulated Counter */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 shrink-0">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
              Live Impact Ticker
            </span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
              ·
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
              Simulated Network Rollout
            </span>
          </div>

          <div className="flex items-baseline gap-3 font-mono tabular-nums text-xs">
            <div className="flex items-baseline gap-1.5">
              <span
                key={`units-${totalUnitsRedistributed}`}
                className="animate-digit-roll text-sm font-bold text-slate-950 dark:text-white"
              >
                {totalUnitsRedistributed.toLocaleString()}
              </span>
              <span className="font-sans text-slate-500 dark:text-slate-400 whitespace-nowrap">
                supplies redistributed
              </span>
            </div>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700 hidden sm:inline">
              /
            </span>
            <span className="hidden sm:inline text-emerald-700 dark:text-emerald-400 font-semibold whitespace-nowrap">
              {totalWasteDivertedKg.toLocaleString()} kg diverted
            </span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700 hidden md:inline">
              /
            </span>
            <span className="hidden md:inline text-slate-700 dark:text-slate-300 whitespace-nowrap">
              {totalCo2SavedKg.toLocaleString()} kg CO2e est.
            </span>
          </div>
        </div>

        {/* Center: CSS-Animated Scrolling Corridor Stream */}
        <div className="relative flex-1 min-w-0 overflow-hidden py-0.5 [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
          <div
            className={`animate-impact-ticker gap-8 text-xs text-slate-600 dark:text-slate-300 ${
              paused ? 'animate-impact-ticker-paused' : ''
            }`}
          >
            {[...tickerItems, ...tickerItems].map((item, idx) => (
              <span key={`${item.id}-${idx}`} className="inline-flex items-center gap-3 whitespace-nowrap">
                <span className="font-mono text-emerald-700 dark:text-emerald-400">
                  {String((idx % tickerItems.length) + 1).padStart(2, '0')}
                </span>
                <span>{item.text}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Right: Motion Control & Jump Link */}
        <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0 text-xs">
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? 'Resume live impact ticker animation' : 'Pause live impact ticker animation'}
            className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap"
          >
            {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{paused ? 'Resume' : 'Pause'}</span>
          </button>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
            ·
          </span>
          <a
            href="#impact"
            className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap"
          >
            <span>Impact Charts</span>
            <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      </div>
    </section>
  );
};
