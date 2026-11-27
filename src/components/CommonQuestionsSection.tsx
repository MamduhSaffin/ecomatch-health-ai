import React, { useMemo, useState } from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import type { getNetworkModelBenchmark } from '../engines/index';
import type { ImpactSummary } from '../types/domain';

interface CommonQuestionsSectionProps {
  impact: ImpactSummary;
  benchmark: ReturnType<typeof getNetworkModelBenchmark>;
  ineligibleCount: number;
  facilityCount: number;
  skuCount: number;
  onExploreDemo: () => void;
}

type QuestionCategory = 'all' | 'methodology' | 'accuracy' | 'governance';

interface FaqItem {
  id: string;
  category: Exclude<QuestionCategory, 'all'>;
  categoryLabel: string;
  question: string;
  answer: string;
  evidenceNote: string;
}

export const CommonQuestionsSection: React.FC<CommonQuestionsSectionProps> = ({
  impact,
  benchmark,
  ineligibleCount,
  facilityCount,
  skuCount,
  onExploreDemo,
}) => {
  const [activeCategory, setActiveCategory] = useState<QuestionCategory>('all');
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({
    'forecast-leakage': true,
  });

  const bestModel = useMemo(() => {
    return [...benchmark.models].sort((a, b) => a.avgTestWape - b.avgTestWape)[0];
  }, [benchmark.models]);

  const baselineModel = useMemo(() => {
    return benchmark.models.find((m) => m.role === 'Baseline') ?? benchmark.models[0];
  }, [benchmark.models]);

  const faqItems: FaqItem[] = useMemo(
    () => [
      {
        id: 'forecast-leakage',
        category: 'accuracy',
        categoryLabel: 'Forecasting Accuracy',
        question: 'How does EcoMatch Health AI validate demand forecasting accuracy without data leakage?',
        answer: `Every facility-SKU consumption series is partitioned along a strict chronological timeline: 72 weeks for training, 16 weeks for model selection, and a locked 16-week holdout test window. Four distinct forecasting models (4-Week Moving Average baseline, Holt-Winters Seasonal Smoothing, Ridge Lag-Fourier Regression, and Gradient Boosted Decision Ensemble) are benchmarked per series across all ${facilityCount * skuCount} facility-SKU combinations. In the current holdout benchmark, ${bestModel?.modelName ?? 'Ridge Lag-Fourier Regression'} achieves ${bestModel?.avgTestWape ?? 7.44}% average WAPE compared to ${baselineModel?.avgTestWape ?? 8.06}% for the naive moving-average baseline.`,
        evidenceNote: `Holdout evaluation · ${facilityCount * skuCount} series · 72w / 16w / 16w chronological split`,
      },
      {
        id: 'redistribution-precision',
        category: 'accuracy',
        categoryLabel: 'Redistribution Accuracy',
        question: 'How accurately does the prescriptive solver prevent expiry waste without causing donor stockouts?',
        answer: `Engine B allocates forecasted demand across lot batches in strict First-Expiry-First-Out (FEFO) order to isolate units projected to remain unused past their expiration date. Engine D then solves a capacitated redistribution and procurement linear programme that strictly protects each donor facility's safety-stock reserve before recommending any outbound quantity. Across the active ${facilityCount}-facility sandbox, this balances courier distance, shelf-life remaining, and receiving clinic demand to model a ${impact.simulatedOptimised.potentialWasteReductionPct}% expiry waste reduction (${impact.simulatedOptimised.potentialWasteDivertedKg.toLocaleString()} kg diverted) and $${impact.simulatedOptimised.potentialNetSavingsUsd.toLocaleString()} in net operational savings.`,
        evidenceNote: `FEFO depletion + capacitated LP · Safety-stock reserve enforced on every donor lot`,
      },
      {
        id: 'eligibility-gates',
        category: 'governance',
        categoryLabel: 'Safety & Governance',
        question: 'Which healthcare supplies are eligible for redistribution, and how are unsafe lots excluded?',
        answer: `EcoMatch Health AI is strictly scoped to non-regulated medical consumables—such as sterile nitrile gloves, surgical dressings, diagnostic test strips, IV administration sets, and protective consumables across ${skuCount} catalogued SKUs. Controlled pharmaceuticals, biologics, and patient-specific prescriptions are excluded by design. Before matchmaking scores are computed, Engine C applies hard compliance gates that automatically block expired, recalled, damaged, quarantined, or storage-incompatible lots (${ineligibleCount} ineligible batches are automatically quarantined in the live sandbox audit log).`,
        evidenceNote: `Hard compliance gates · Zero controlled medicines · ${ineligibleCount} lots blocked automatically`,
      },
      {
        id: 'human-in-the-loop',
        category: 'governance',
        categoryLabel: 'Operational Control',
        question: 'Are transfers dispatched automatically, or do healthcare teams retain final approval?',
        answer: 'No inventory transfer is ever executed autonomously. Every recommended corridor presents an explainable 0–100 compatibility score (broken down by expiry urgency, receiving demand fit, courier distance, and storage match) and enters a human-governed approval workflow requiring authorised supply-chain sign-off. Similarly, Engine F (the AI Resource Operations Assistant) cites live operational records to propose draft actions and is strictly constrained to decline clinical diagnosis, dosing, or medical treatment queries.',
        evidenceNote: 'Human-in-the-loop approval required · Full transfer ledger audit trail',
      },
      {
        id: 'carbon-accounting',
        category: 'methodology',
        categoryLabel: 'SDG 12 Methodology',
        question: 'How are avoided CO2e emissions and economic savings calculated transparently?',
        answer: `Engine E strictly separates four provenance tiers—Observed Ledger transfers, Model Predictions, Simulated LP Outcomes, and Estimated Environmental Benefits—so projected values are never conflated with executed transfers. Avoided carbon emissions (${impact.simulatedOptimised.potentialAvoidedCo2eKg.toLocaleString()} kg CO2e est. in simulation) are calculated from documented per-pack consumable weights and published EPA WARM material/incineration factors, minus road-courier transport emissions based on actual inter-facility corridor kilometres.`,
        evidenceNote: `${impact.methodologyNotes.emissionFactorRange} · Net of courier transit emissions`,
      },
      {
        id: 'data-provenance-erp',
        category: 'methodology',
        categoryLabel: 'Data & Integration',
        question: 'Does the public demo use real patient data, and how would hospital groups integrate real stock?',
        answer: 'The public Judge Demo runs on a reproducible synthetic healthcare consumables dataset (seed 20261012, 8,320 weekly records calibrated against public WHO, UNICEF Supply Division, and World Bank reference ranges) containing zero protected health information or identifiable patient records. For production pilots, the platform ships with a multi-tenant PostgreSQL Row-Level Security schema designed for read-only CSV or ERP inventory connectors so each health authority retains full tenant isolation.',
        evidenceNote: 'Zero PHI · Reproducible synthetic sandbox (seed 20261012) · Multi-tenant RLS ready',
      },
    ],
    [
      baselineModel?.avgTestWape,
      bestModel?.avgTestWape,
      bestModel?.modelName,
      facilityCount,
      impact.methodologyNotes.emissionFactorRange,
      impact.simulatedOptimised.potentialAvoidedCo2eKg,
      impact.simulatedOptimised.potentialNetSavingsUsd,
      impact.simulatedOptimised.potentialWasteDivertedKg,
      impact.simulatedOptimised.potentialWasteReductionPct,
      ineligibleCount,
      skuCount,
    ]
  );

  const visibleItems = useMemo(() => {
    if (activeCategory === 'all') {
      return faqItems;
    }
    return faqItems.filter((item) => item.category === activeCategory);
  }, [activeCategory, faqItems]);

  const allVisibleOpen =
    visibleItems.length > 0 && visibleItems.every((item) => Boolean(openIds[item.id]));

  const toggleItem = (id: string) => {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggleAll = () => {
    const nextValue = !allVisibleOpen;
    setOpenIds((prev) => {
      const updated = { ...prev };
      for (const item of visibleItems) {
        updated[item.id] = nextValue;
      }
      return updated;
    });
  };

  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1526] py-16"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column: Editorial Lead & Category Controls */}
          <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-24">
            <div>
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Common Questions · Methodology &amp; Verification
              </p>
              <h2
                id="faq-heading"
                className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white text-balance"
              >
                Answers on forecasting accuracy, safety gates, and impact math.
              </h2>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Built for scrutiny by clinical supply leads, sustainability auditors, and hackathon judges. Filter by topic or expand all items to inspect how every metric is derived.
              </p>
            </div>

            {/* Interactive Category Filter Segmented Control */}
            <div
              role="group"
              aria-label="Filter common questions by topic"
              className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900"
            >
              {(
                [
                  ['all', 'All'],
                  ['accuracy', 'Accuracy'],
                  ['methodology', 'Methodology'],
                  ['governance', 'Governance'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveCategory(key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    activeCategory === key
                      ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleToggleAll}
                className="text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors whitespace-nowrap"
              >
                {allVisibleOpen ? 'Collapse all answers' : 'Expand all answers'}
              </button>
              <button
                type="button"
                onClick={onExploreDemo}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap"
              >
                <span>Verify in Judge Demo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right Column: Collapsible Hairline Accordion */}
          <div className="lg:col-span-8">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#08101E] divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden">
              {visibleItems.map((item, idx) => {
                const isOpen = Boolean(openIds[item.id]);
                const panelId = `faq-panel-${item.id}`;
                const buttonId = `faq-button-${item.id}`;
                const orderLabel = String(idx + 1).padStart(2, '0');

                return (
                  <div key={item.id} className="bg-white dark:bg-[#0D192B]">
                    <h3>
                      <button
                        id={buttonId}
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => toggleItem(item.id)}
                        className="w-full px-6 py-5 text-left flex items-start justify-between gap-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-600 transition-colors"
                      >
                        <div className="space-y-1 pr-2">
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                              {orderLabel}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{item.categoryLabel}</span>
                          </div>
                          <span className="block text-base font-semibold text-slate-950 dark:text-white leading-snug">
                            {item.question}
                          </span>
                        </div>
                        <ChevronDown
                          aria-hidden="true"
                          className={`w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0 mt-1 transition-transform duration-200 ${
                            isOpen ? 'rotate-180 text-emerald-700 dark:text-emerald-400' : ''
                          }`}
                        />
                      </button>
                    </h3>

                    {isOpen && (
                      <div
                        id={panelId}
                        role="region"
                        aria-labelledby={buttonId}
                        className="px-6 pb-6 pt-0 space-y-3"
                      >
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed tabular-nums">
                          {item.answer}
                        </p>
                        <p className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums pt-2 border-t border-slate-100 dark:border-slate-800/80">
                          {item.evidenceNote}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
