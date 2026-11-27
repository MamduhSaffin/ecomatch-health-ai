import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowRight, Pause, Play, RotateCcw } from 'lucide-react';
import {
  DEFAULT_SCENARIO_PARAMS,
  PRODUCTS,
  getProductBySku,
  runPrescriptiveOptimisation,
} from '../engines/index';
import type { InventoryBatch, ScenarioParameters } from '../types/domain';

interface ImpactDashboardProps {
  batches: InventoryBatch[];
  onExploreDemo: () => void;
}

type ScenarioPresetKey = 'baseline' | 'surge' | 'austerity' | 'disruption';

const SCENARIO_PRESETS: Record<
  ScenarioPresetKey,
  { label: string; subtitle: string; params: ScenarioParameters }
> = {
  baseline: {
    label: 'Baseline Network',
    subtitle: 'Nominal seasonal demand · 180 km corridor radius',
    params: DEFAULT_SCENARIO_PARAMS,
  },
  surge: {
    label: 'Demand Surge (+25%)',
    subtitle: 'Seasonal respiratory surge · 210 km corridor radius',
    params: {
      demandSurgePct: 25,
      procurementBudgetCutPct: 0,
      supplyDisruptionWeeks: 1,
      maxTransferRadiusKm: 210,
      safetyStockMultiplier: 1.2,
    },
  },
  austerity: {
    label: 'Budget Cut (-25%)',
    subtitle: 'Constrained procurement budget · 220 km corridor radius',
    params: {
      demandSurgePct: 0,
      procurementBudgetCutPct: 25,
      supplyDisruptionWeeks: 1,
      maxTransferRadiusKm: 220,
      safetyStockMultiplier: 1.0,
    },
  },
  disruption: {
    label: 'Supply Disruption (+4w)',
    subtitle: '4-week external supplier delay · 240 km corridor radius',
    params: {
      demandSurgePct: 10,
      procurementBudgetCutPct: 5,
      supplyDisruptionWeeks: 4,
      maxTransferRadiusKm: 240,
      safetyStockMultiplier: 1.3,
    },
  },
};

const TOTAL_SIM_WEEKS = 12;

export const ImpactDashboard: React.FC<ImpactDashboardProps> = ({
  batches,
  onExploreDemo,
}) => {
  const [presetKey, setPresetKey] = useState<ScenarioPresetKey>('baseline');
  const [activeWeek, setActiveWeek] = useState<number>(TOTAL_SIM_WEEKS);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  const preset = SCENARIO_PRESETS[presetKey];

  const optimisation = useMemo(
    () => runPrescriptiveOptimisation(batches, preset.params),
    [batches, preset.params]
  );

  useEffect(() => {
    if (!isPlaying) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setIsPlaying(false);
      return;
    }

    const timer = window.setInterval(() => {
      setActiveWeek((prev) => (prev >= TOTAL_SIM_WEEKS ? 1 : prev + 1));
    }, 1800);

    return () => window.clearInterval(timer);
  }, [isPlaying]);

  const weeklySeries = useMemo(() => {
    const weights = [0.05, 0.07, 0.09, 0.11, 0.11, 0.10, 0.09, 0.09, 0.08, 0.08, 0.07, 0.06];
    let cumUnits = 0;
    let cumWasteKg = 0;
    let cumCo2eKg = 0;
    let cumBaselineWasteKg = 0;

    return weights.map((w, idx) => {
      const weekNum = idx + 1;
      const stepUnits = Math.round(optimisation.deltas.unitsRescued * w);
      const stepWasteKg = optimisation.deltas.wasteDivertedKg * w;
      const stepCo2eKg = optimisation.deltas.avoidedCo2eKg * w;
      const stepBaselineWasteKg = optimisation.baseline.wasteWeightKg * w;

      cumUnits += stepUnits;
      cumWasteKg += stepWasteKg;
      cumCo2eKg += stepCo2eKg;
      cumBaselineWasteKg += stepBaselineWasteKg;

      const isFinal = weekNum === TOTAL_SIM_WEEKS;
      const finalUnits = isFinal ? optimisation.deltas.unitsRescued : cumUnits;
      const finalWasteKg = isFinal
        ? optimisation.deltas.wasteDivertedKg
        : Math.round(cumWasteKg * 10) / 10;
      const finalCo2eKg = isFinal
        ? optimisation.deltas.avoidedCo2eKg
        : Math.round(cumCo2eKg * 10) / 10;
      const finalBaselineKg = isFinal
        ? optimisation.baseline.wasteWeightKg
        : Math.round(cumBaselineWasteKg * 10) / 10;
      const remainingOptimisedWasteKg = Math.max(
        0,
        Math.round((finalBaselineKg - finalWasteKg) * 10) / 10
      );

      return {
        week: `W${weekNum}`,
        weekNum,
        unitsRedistributed: finalUnits,
        weeklyUnits: stepUnits,
        wasteDivertedKg: finalWasteKg,
        co2eSavedKg: finalCo2eKg,
        baselineWasteKg: finalBaselineKg,
        optimisedWasteKg: remainingOptimisedWasteKg,
      };
    });
  }, [optimisation]);

  const visibleSeries = useMemo(
    () => weeklySeries.slice(0, activeWeek),
    [weeklySeries, activeWeek]
  );

  const currentPoint =
    visibleSeries[visibleSeries.length - 1] ?? weeklySeries[weeklySeries.length - 1];

  const currentWasteReductionPct =
    currentPoint && currentPoint.baselineWasteKg > 0
      ? Math.round((currentPoint.wasteDivertedKg / currentPoint.baselineWasteKg) * 1000) / 10
      : optimisation.deltas.wasteReductionPct;

  const categoryBreakdown = useMemo(() => {
    const progressRatio =
      optimisation.deltas.unitsRescued > 0
        ? currentPoint.unitsRedistributed / optimisation.deltas.unitsRescued
        : 1;

    const map = new Map<
      string,
      { category: string; units: number; wasteKg: number; co2eKg: number }
    >();

    for (const prod of PRODUCTS) {
      if (!map.has(prod.category)) {
        map.set(prod.category, {
          category: prod.category.replace(' & ', ' / '),
          units: 0,
          wasteKg: 0,
          co2eKg: 0,
        });
      }
    }

    for (const alloc of optimisation.allocations) {
      const prod = getProductBySku(alloc.sku);
      if (!prod) continue;
      const entry = map.get(prod.category);
      if (!entry) continue;
      const scaledUnits = Math.round(alloc.unitsAllocated * progressRatio);
      const scaledKg = alloc.wasteDivertedKg * progressRatio;
      const scaledCo2e = Math.max(0, scaledKg * prod.emissionFactorKgCo2PerKg);
      entry.units += scaledUnits;
      entry.wasteKg = Math.round((entry.wasteKg + scaledKg) * 10) / 10;
      entry.co2eKg = Math.round((entry.co2eKg + scaledCo2e) * 10) / 10;
    }

    return Array.from(map.values())
      .filter((row) => row.units > 0)
      .sort((a, b) => b.units - a.units);
  }, [optimisation, currentPoint]);

  const wasteComparisonData = useMemo(
    () => [
      {
        stage: 'Expiry Waste (kg)',
        Isolated: currentPoint.baselineWasteKg,
        Optimised: currentPoint.optimisedWasteKg,
      },
      {
        stage: 'Waste Diverted (kg)',
        Isolated: 0,
        Optimised: currentPoint.wasteDivertedKg,
      },
      {
        stage: 'CO2e Avoided (kg)',
        Isolated: 0,
        Optimised: currentPoint.co2eSavedKg,
      },
    ],
    [currentPoint]
  );

  return (
    <section
      id="impact"
      className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1526] py-16"
    >
      <div className="max-w-7xl mx-auto px-6 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Impact Dashboard · Simulated Operational Stream · UN SDG 12
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
              Real-time simulated waste reduction, resource redistribution, and CO2 savings.
            </h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Computed live by Engine D &amp; Engine E over the reproducible synthetic consumables network (Seed 20261012). Switch stress scenarios or step through the 12-week rollout to inspect how inter-facility matching eliminates expiry waste.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 pr-2">
              Horizon: Week {activeWeek} / {TOTAL_SIM_WEEKS}
            </span>
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pause Stream' : 'Play Stream'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveWeek(1);
                setIsPlaying(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Replay</span>
            </button>
          </div>
        </div>

        {/* Interactive Scenario Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900">
            {(Object.keys(SCENARIO_PRESETS) as ScenarioPresetKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setPresetKey(key);
                  setActiveWeek(TOTAL_SIM_WEEKS);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  presetKey === key
                    ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {SCENARIO_PRESETS[key].label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{preset.subtitle}</p>
        </div>

        {/* 3-Metric Real-Time Simulated KPI Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-slate-200 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
          <div className="bg-slate-50 dark:bg-[#0D192B] p-6">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Waste Reduction · Simulated Outcome
            </p>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-3xl font-extrabold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                {currentWasteReductionPct}%
              </span>
              <span className="text-sm font-mono tabular-nums text-slate-700 dark:text-slate-300">
                {currentPoint.wasteDivertedKg.toLocaleString()} kg diverted
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              Expiry waste reduced from {currentPoint.baselineWasteKg.toLocaleString()} kg to{' '}
              {currentPoint.optimisedWasteKg.toLocaleString()} kg by Week {activeWeek}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-[#0D192B] p-6">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Resource Redistribution Volume · LP Engine
            </p>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-3xl font-extrabold font-mono tabular-nums text-slate-950 dark:text-white">
                {currentPoint.unitsRedistributed.toLocaleString()}
              </span>
              <span className="text-sm font-mono tabular-nums text-slate-600 dark:text-slate-400">
                pack units across {optimisation.allocations.length} corridors
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              Supports ~
              {Math.round(
                optimisation.deltas.patientEpisodesSupported *
                  (currentPoint.unitsRedistributed / Math.max(1, optimisation.deltas.unitsRescued))
              ).toLocaleString()}{' '}
              patient care episodes (supply proxy)
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-[#0D192B] p-6">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              CO2 Emissions Saved · Estimated Impact
            </p>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-3xl font-extrabold font-mono tabular-nums text-teal-700 dark:text-teal-400">
                {currentPoint.co2eSavedKg.toLocaleString()} kg
              </span>
              <span className="text-sm font-mono tabular-nums text-slate-600 dark:text-slate-400">
                net CO2e avoided
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              EPA WARM / HCWH polymer factors (2.20–2.90 kg/kg) net of 0.12 kg/km transit
            </p>
          </div>
        </div>

        {/* Main Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#08101E] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Cumulative Waste Diverted (kg) &amp; Net CO2e Saved (kg)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  12-week simulated rollout across verified hospital corridors
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                ${optimisation.deltas.netSavingsUsd.toLocaleString()} net savings
              </span>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={visibleSeries} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="co2AreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="#14B8A6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.18} />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} unit=" kg" width={54} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#F8FAFC',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Area
                    type="monotone"
                    dataKey="co2eSavedKg"
                    stroke="#14B8A6"
                    strokeWidth={2.2}
                    fill="url(#co2AreaGrad)"
                    name="CO2e Saved (kg)"
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="wasteDivertedKg"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#10B981' }}
                    name="Waste Diverted (kg)"
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#08101E] p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Redistribution Volume by Category (Units)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Non-regulated medical consumables redistributed through Week {activeWeek}
              </p>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryBreakdown}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.16} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <YAxis
                    type="category"
                    dataKey="category"
                    width={126}
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#F8FAFC',
                      fontSize: '12px',
                    }}
                  />
                  <Bar
                    dataKey="units"
                    fill="#10B981"
                    radius={[0, 4, 4, 0]}
                    name="Redistributed Units"
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Baseline vs Optimised Comparison + Corridor Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#08101E] p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Isolated Baseline vs. EcoMatch Circular Impact (kg)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Side-by-side physical waste &amp; emissions delta through Week {activeWeek}
            </p>
            <div className="h-[210px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wasteComparisonData} margin={{ top: 6, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.16} />
                  <XAxis dataKey="stage" tick={{ fontSize: 10.5, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#F8FAFC',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar
                    dataKey="Isolated"
                    fill="#64748B"
                    radius={[4, 4, 0, 0]}
                    name="Conventional Isolated"
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="Optimised"
                    fill="#0D9488"
                    radius={[4, 4, 0, 0]}
                    name="EcoMatch Network"
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#08101E] p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Simulated LP Redistribution Corridors ({optimisation.allocations.length})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Top priority eligible batches routed under {preset.label}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onExploreDemo}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap"
                >
                  <span>Approve in Live Demo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="divide-y divide-slate-200/70 dark:divide-slate-800 text-xs">
                {optimisation.allocations.slice(0, 4).map((alloc) => (
                  <div
                    key={`${alloc.batchId}-${alloc.recipientFacilityId}`}
                    className="py-2.5 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {alloc.productName}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 truncate">
                        {alloc.donorFacilityName} → {alloc.recipientFacilityName}
                      </p>
                    </div>
                    <div className="text-right font-mono tabular-nums shrink-0">
                      <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                        {alloc.unitsAllocated}u · {alloc.wasteDivertedKg} kg
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        +${alloc.netBenefitUsd.toLocaleString()} net
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="pt-3 mt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
              Provenance Notice: Metrics represent deterministic simulated outcomes computed from Seed 20261012 synthetic consumables data; all live inter-facility transfers require authorised human approval.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
