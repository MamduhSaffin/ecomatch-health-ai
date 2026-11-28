import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  ExternalLink,
  Moon,
  Share2,
  Sun,
} from 'lucide-react';
import {
  FACILITIES,
  PRODUCTS,
  computeImpactSummary,
  computeIntelligentMatches,
  createInitialInventoryBatches,
  getNetworkModelBenchmark,
} from '../engines/index';
import { BrandMark } from '../components/BrandMark';
import { CommonQuestionsSection } from '../components/CommonQuestionsSection';
import { HeroOverviewVideo } from '../components/HeroOverviewVideo';
import { HospitalRoiCalculator } from '../components/HospitalRoiCalculator';
import { ImpactDashboard } from '../components/ImpactDashboard';
import { LiveImpactTicker } from '../components/LiveImpactTicker';
import { MeetTheInnovatorsSection } from '../components/MeetTheInnovatorsSection';
import { RegionalDistributionMap } from '../components/RegionalDistributionMap';
import { Sdg12AlignmentSection } from '../components/Sdg12AlignmentSection';
import { SocialShareMetaConfigurator } from '../components/SocialShareMetaConfigurator';
import { triggerFileDownload } from '../services/api';

interface PublicShowcasePageProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onExploreDemo: () => void;
  onOpenAuth: () => void;
}

export const PublicShowcasePage: React.FC<PublicShowcasePageProps> = ({
  darkMode,
  onToggleDarkMode,
  onExploreDemo,
  onOpenAuth,
}) => {
  const [copiedShare, setCopiedShare] = useState(false);
  const [activeDocTab, setActiveDocTab] = useState<'methodology' | 'datasets' | 'pitch' | 'video'>('methodology');

  // Compute live reproducible metrics directly from the core intelligence engines (never hardcoded)
  const preview = useMemo(() => {
    const batches = createInitialInventoryBatches();
    const { matches, ineligibleAudit } = computeIntelligentMatches(batches);
    const impact = computeImpactSummary(batches, []);
    const benchmark = getNetworkModelBenchmark();
    return { batches, matches, ineligibleAudit, impact, benchmark };
  }, []);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : 'https://ecomatch.tgpu.tech';
  const shareText =
    'EcoMatch Health AI — Predicting medical supply waste and redistributing eligible consumables across healthcare facilities for UN SDG 12 (10Alytics Global Hackathon 2026).';

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2200);
    } catch {
      setCopiedShare(false);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: 'EcoMatch Health AI — 10Alytics Global Hackathon 2026',
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // User cancelled share sheet
      }
    } else {
      handleCopyShareLink();
    }
  };

  const handleDownloadMethodologyPack = () => {
    const summary = [
      'EcoMatch Health AI — Reproducible Dataset & Methodology Summary',
      'Competition: 10Alytics Global Hackathon 2026 | Health Track | UN SDG 12',
      'Data Provenance: Reproducible Synthetic Healthcare Consumables Dataset (Seed 20261012)',
      '',
      `Facilities Modeled: ${FACILITIES.length} demonstration facilities across 3 regional corridors`,
      `Eligible Consumable SKUs: ${PRODUCTS.length} non-regulated medical consumables (zero controlled medicines)`,
      `Historical Consumption Horizon: 104 weeks (Train: 72w | Validation: 16w | Holdout Test: 16w)`,
      `Simulated Net Operational Savings: $${preview.impact.simulatedOptimised.potentialNetSavingsUsd.toLocaleString()}`,
      `Simulated Waste Diverted: ${preview.impact.simulatedOptimised.potentialWasteDivertedKg} kg`,
      `Estimated Avoided Emissions: ${preview.impact.simulatedOptimised.potentialAvoidedCo2eKg} kg CO2e`,
      '',
      'Model Benchmark (80 Facility-SKU Series, Holdout Test WAPE):',
      ...preview.benchmark.models.map(
        (m) => `- ${m.modelName} (${m.role}): Test MAE=${m.avgTestMae}, RMSE=${m.avgTestRMSE}, WAPE=${m.avgTestWape}%, Selected=${m.winCount}/80`
      ),
    ].join('\n');
    triggerFileDownload('ecomatch-health-ai-methodology-summary.txt', summary, 'text/plain;charset=utf-8');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#08101E] text-slate-900 dark:text-slate-100">
      {/* STRICT 3-ZONE TOP BAR CONTRACT */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#08101E]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line brand wordmark */}
          <a
            href="#top"
            className="flex items-center gap-2.5 text-base font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
          >
            <BrandMark className="w-7 h-7" />
            <span>EcoMatch Health AI</span>
          </a>

          {/* Zone 2: 5 concise single-line nav links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#redistribution-network" className="hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
              Network
            </a>
            <a href="#impact" className="hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
              Impact
            </a>
            <a href="#intelligence" className="hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
              Engines
            </a>
            <a href="#faq" className="hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
              FAQ
            </a>
            <a href="#innovators" className="hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
              Team
            </a>
          </nav>

          {/* Zone 3: 1 primary CTA */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onExploreDemo}
              className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Explore Live Demo
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        <div className="max-w-7xl mx-auto px-6 py-3 text-sm text-slate-700 dark:text-slate-300">
          <strong>Data provenance:</strong> Fictional facilities and reproducible synthetic stock and demand records. All scenario savings and environmental impacts are estimates, not measured hospital outcomes. <a className="underline" href="#data-provenance">View sources and limitations</a>.
        </div>
        {/* LIVE IMPACT TICKER — CSS-animated growing count of redistributed supplies */}
        <LiveImpactTicker matches={preview.matches} impact={preview.impact} />

        {/* HERO SECTION — Communicates problem, innovation, solution & impact in <30s */}
        <section className="max-w-7xl mx-auto px-6 pt-12 pb-16 lg:pt-16 lg:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-5 flex flex-col justify-between gap-6">
              <div>
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  10Alytics Global Hackathon 2026 · Health Track · UN SDG 12
                </p>
                <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-950 dark:text-white leading-[1.08]">
                  Predict Waste. Redistribute Resources. Expand Healthcare Capacity.
                </h1>
                <p className="mt-5 text-base leading-relaxed text-slate-600 dark:text-slate-300">
                  Healthcare facilities discard expiring medical consumables while neighbouring clinics face urgent stockouts. EcoMatch Health AI unifies chronological demand forecasting, FEFO expiry-risk scoring, explainable matchmaking, and constrained greedy redistribution into one human-governed circular network.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={onExploreDemo}
                    className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors whitespace-nowrap"
                  >
                    <span>Explore Live Demo</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/70 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Sign In to Workspace
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No account or credentials required for Judge Demo Mode · Isolated synthetic consumables sandbox (non-regulated supplies only)
                </p>
              </div>
            </div>

            {/* Dominant Visual Anchor: Responsive Auto-Playing Muted 30-Second Value Overview Video */}
            <div className="lg:col-span-7 flex flex-col">
              <HeroOverviewVideo
                impact={preview.impact}
                matchCount={preview.matches.length}
                facilityCount={FACILITIES.length}
                onExploreDemo={onExploreDemo}
              />
            </div>
          </div>

          {/* Full-width 4-Column Transparent Proof Strip directly below Hero Split */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="bg-white dark:bg-[#0D192B] p-5">
              <p className="text-xs text-slate-500 dark:text-slate-400">Inventory At Risk · Model Prediction</p>
              <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-950 dark:text-white">
                ${preview.impact.predicted.inventoryAtRiskUsd.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {preview.impact.predicted.unitsAtRiskOfExpiry.toLocaleString()} projected unused units across {FACILITIES.length} facilities
              </p>
            </div>
            <div className="bg-white dark:bg-[#0D192B] p-5">
              <p className="text-xs text-slate-500 dark:text-slate-400">Simulated Net Savings · greedy allocation Engine</p>
              <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                ${preview.impact.simulatedOptimised.potentialNetSavingsUsd.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                ${preview.impact.simulatedOptimised.potentialProcurementSavingsUsd.toLocaleString()} avoided procurement net of transit
              </p>
            </div>
            <div className="bg-white dark:bg-[#0D192B] p-5">
              <p className="text-xs text-slate-500 dark:text-slate-400">Waste Diverted · Simulated Outcome</p>
              <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-950 dark:text-white">
                {preview.impact.simulatedOptimised.potentialWasteDivertedKg.toLocaleString()} kg
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {preview.impact.simulatedOptimised.potentialWasteReductionPct}% expiry waste reduction · {preview.impact.simulatedOptimised.potentialAvoidedCo2eKg} kg CO2e est.
              </p>
            </div>
            <div className="bg-white dark:bg-[#0D192B] p-5">
              <p className="text-xs text-slate-500 dark:text-slate-400">Verified Matches · Eligibility Gated</p>
              <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-950 dark:text-white">
                {preview.matches.length} corridors
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {preview.ineligibleAudit.length} expired/recalled lots blocked automatically
              </p>
            </div>
          </div>
        </section>

        <section id="data-provenance" className="max-w-7xl mx-auto px-6 py-8 space-y-3">
          <h2 className="text-xl font-bold">Data Sources &amp; Provenance</h2>
          <p className="text-sm">Operational data: synthetic seed 20261012; 8 fictional facilities, 10 SKUs, 104 weeks. Forecasts and allocation estimates are computed from these records. No live hospital feed is connected.</p>
          <p className="text-sm">Public contextual references (not live operational feeds or validated SKU-specific factors):</p>
          <ul className="list-disc pl-5 text-sm space-y-1">
            <li><a className="underline" href="https://www.who.int/news-room/fact-sheets/detail/health-care-waste">WHO healthcare waste fact sheet</a> — sector context.</li>
            <li><a className="underline" href="https://supply.unicef.org/">UNICEF Supply Catalogue</a> — product reference.</li>
            <li><a className="underline" href="https://www.epa.gov/warm">EPA WARM</a> — environmental modelling reference; not a validated product lifecycle assessment.</li>
          </ul>
          <p className="text-sm">Institutional inventory uploads require authorised records. Uploaded stock alone does not replace the synthetic historical demand series.</p>
        </section>
        {/* SECTION 2: INTERACTIVE REGIONAL REDISTRIBUTION NETWORK MAP (SVG FLOWS) */}
        <RegionalDistributionMap
          facilities={FACILITIES}
          matches={preview.matches}
          onExploreDemo={onExploreDemo}
        />

        {/* SECTION 3: THE PROBLEM & UN SDG 12 ALIGNMENT */}
        <section id="problem" className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#08101E] py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="max-w-3xl">
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Health Track Problem Statement · UN SDG 12 Alignment
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                Isolated procurement creates simultaneous expiry waste and clinical shortages.
              </h2>
              <p className="mt-4 text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                Across public and private healthcare networks, hospitals order consumables in silos using static reorder rules. When seasonal demand shifts or surgical schedules change, one facility accumulates near-expiry sterile supplies while a clinic kilometres away delays care or pays emergency spot prices.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-[#0D192B]">
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">01. Fragmented Visibility</p>
                <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                  No Cross-Facility Batch Intelligence
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  ERP and ward-level spreadsheets track stock inside single institutions without FEFO depletion forecasting or verified regional surplus discovery.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-[#0D192B]">
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">02. Avoidable Clinical Waste</p>
                <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                  Direct SDG 12.5 Waste Prevention
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  World Health Organization guidance highlights that healthcare supply chains contribute substantially to avoidable plastic and incineration waste; preventing expiry before disposal directly advances UN SDG 12.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-[#0D192B]">
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">03. Constrained Patient Capacity</p>
                <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                  Reclaiming Budget for Essential Care
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Redirecting eligible, non-expired consumables reduces emergency procurement expenditure and safeguards continuous supply availability for community clinics.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: LIVE SIMULATED IMPACT DASHBOARD (Recharts) */}
        <ImpactDashboard batches={preview.batches} onExploreDemo={onExploreDemo} />

        {/* SECTION 5: UN SDG 12 COMPLIANCE BADGE & ALIGNMENT */}
        <Sdg12AlignmentSection impact={preview.impact} onExploreDemo={onExploreDemo} />

        {/* SECTION 6: SIX INTERCONNECTED INTELLIGENCE ENGINES (Asymmetric Bento) */}
        <section id="intelligence" className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1526] py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="max-w-2xl">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  Core Intelligence Architecture
                </p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                  Six interconnected engines built for explainable operational decisions.
                </h2>
              </div>
              <button
                type="button"
                onClick={onExploreDemo}
                className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap"
              >
                Inspect live engine outputs →
              </button>
            </div>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#08101E] p-6">
                <p className="text-xs font-mono text-emerald-700 dark:text-emerald-400">01. Engine A · Predictive Demand Intelligence</p>
                <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                  Chronological ML Forecasting with Uncertainty Intervals
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Evaluates four real models per facility-SKU series (4-Week Moving Average baseline, Holt-Winters Seasonal Smoothing, Ridge Lag-Fourier Regression, and Gradient Boosted Decision Ensemble) on strict chronological train/validation/test splits (72w / 16w / 16w) with zero data leakage.
                </p>
                <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-200/70 dark:border-slate-800 text-xs font-mono tabular-nums">
                  {preview.benchmark.models.map((m) => (
                    <div key={m.modelId}>
                      <div className="text-slate-500 dark:text-slate-400 truncate">{m.modelName.split(' ')[0]} {m.modelName.split(' ')[1]}</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                        {m.avgTestWape}% WAPE
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="md:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#08101E] p-6">
                <p className="text-xs font-mono text-emerald-700 dark:text-emerald-400">02. Engine B · Waste & Expiry Risk</p>
                <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                  FEFO Depletion & Explainable Risk Scoring
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Allocates forecasted demand across batches in strict First-Expiry-First-Out order to pinpoint unused units before expiration. Every 0–100 score breaks down into expiry proximity, unused ratio, capital exposure, and demand velocity.
                </p>
              </div>

              <div className="md:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#08101E] p-6">
                <p className="text-xs font-mono text-emerald-700 dark:text-emerald-400">03. Engine C · Intelligent Matchmaking</p>
                <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                  Safety-Gated Inter-Facility Matching
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Hard compliance gates automatically exclude expired, recalled, damaged, restricted, or storage-incompatible lots before calculating transparent 0–100 compatibility scores and requiring authorised human approval.
                </p>
              </div>

              <div className="md:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#08101E] p-6">
                <p className="text-xs font-mono text-emerald-700 dark:text-emerald-400">04. Engine D · Prescriptive Optimisation</p>
                <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                  Capacitated Multi-Facility Redistribution Solver
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Solves a minimum-cost capacitated redistribution and procurement optimisation programme balancing courier distance, safety-stock compliance, budget constraints, and expiry deadlines—benchmarked side-by-side against conventional isolated procurement.
                </p>
              </div>

              <div className="md:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#08101E] p-6">
                <p className="text-xs font-mono text-emerald-700 dark:text-emerald-400">05. Engine E · Environmental & Economic Impact</p>
                <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                  Audit-Ready SDG 12 Attribution
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Explicitly separates Observed Ledger transfers, Model Predictions, Simulated greedy allocation outcomes, and Estimated CO2e savings (net of courier transport emissions) using documented weight and emission factors.
                </p>
              </div>

              <div className="md:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#08101E] p-6">
                <p className="text-xs font-mono text-emerald-700 dark:text-emerald-400">06. Engine F · AI Resource Operations Agent</p>
                <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                  Evidence-Grounded Operations Assistant
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Retrieves live batch risks, active matches, and greedy allocation savings to answer executive supply questions with cited evidence and proposed approval actions—strictly refusing clinical diagnosis or treatment advice.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 7: INTERACTIVE HOSPITAL NETWORK VALUE ESTIMATOR */}
        <HospitalRoiCalculator
          impact={preview.impact}
          baselineFacilityCount={FACILITIES.length}
          onExploreDemo={onExploreDemo}
        />

        {/* SECTION 6: PUBLIC COMPETITION SHOWCASE & ARTIFACT HUB (Section 28) */}
        <section id="showcase" className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1526] py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="max-w-2xl">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  Public Competition Showcase · 10Alytics Global Hackathon 2026
                </p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                  Transparent evidence, reproducible artifacts, and open evaluation.
                </h2>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                  Every calculation in EcoMatch Health AI is inspectable, reproducible, and clearly labelled. Explore the 12-step guided Judge Demo without signing up, or inspect the methodology and deliverables below.
                </p>
              </div>

              {/* Authentic Social Sharing Controls (zero simulated engagement) */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Project</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                >
                  {copiedShare ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedShare ? 'Link Copied' : 'Copy Link'}</span>
                </button>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                >
                  <span>LinkedIn</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Interactive Deliverables & Methodology Tabs */}
            <div className="mt-8">
              <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900">
                {(
                  [
                    ['methodology', 'Impact Methodology'],
                    ['datasets', 'Datasets & Notebooks'],
                    ['pitch', '12-Slide Pitch Deck'],
                    ['video', 'Demo Video & Voting'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveDocTab(key)}
                    className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      activeDocTab === key
                        ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-6">
                {activeDocTab === 'methodology' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Transparent Formulas & Provenance Separation
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {preview.impact.methodologyNotes.syntheticDataDisclosure}. All metrics are strictly separated into Observed Ledger values, Model Predictions, Simulated greedy allocation Outcomes, and Estimated Environmental Benefits.
                      </p>
                      <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 font-mono">
                        <li>• Emission Factors: {preview.impact.methodologyNotes.emissionFactorRange}</li>
                        <li>• Transit Deduction: {preview.impact.methodologyNotes.transportEmissionAdjustment}</li>
                        <li>• Service Proxy: {preview.impact.methodologyNotes.serviceCapacityNote}</li>
                      </ul>
                    </div>
                    <div className="flex flex-col justify-between gap-4 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 pt-4 lg:pt-0 lg:pl-8">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                          Download Verified Methodology Summary
                        </h4>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                          Includes real holdout WAPE benchmarks across all 80 series and exact simulated savings deltas.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={handleDownloadMethodologyPack}
                          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-emerald-600 text-white hover:bg-slate-800 dark:hover:bg-emerald-700 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Methodology Summary</span>
                        </button>
                        <button
                          type="button"
                          onClick={onExploreDemo}
                          className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          Open Analytics Lab
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeDocTab === 'datasets' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">
                        Reproducible Data Science Pipeline
                      </h3>
                      <p className="mt-2 text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                        Repository includes executable Python scripts (`scripts/`), 6 structured Jupyter Notebooks (`notebooks/01–06`), data dictionary (`data/data_dictionary.csv`), generated synthetic CSV datasets (`data/synthetic/`), and verified model evaluation artifacts (`models/evaluation_report.json`).
                      </p>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">
                        Public Reference Sources & Licensing
                      </h3>
                      <p className="mt-2 text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                        Calibrated against publicly documented healthcare supply references (WHO Global Health Observatory, UNICEF Supply Division Catalogue, World Bank Open Data, EPA WARM emission factors). Zero patient-identifiable records or unverified hospital files are used.
                      </p>
                    </div>
                  </div>
                )}

                {activeDocTab === 'pitch' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600 dark:text-slate-300">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Strict 12-Slide Competition Pitch Deck
                      </h3>
                      <p className="mt-2 leading-relaxed">
                        Full 12-slide executive pitch narrative prepared in `docs/pitch-deck-12-slides.md` covering Title, Problem, Evidence & SDG 12, Solution, Innovation, Data & Analysis, Machine Learning, Architecture, Live Demo, Measurable Impact, Scalability, and Conclusion.
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Team & Submission Manifest Status
                      </h3>
                      <p className="mt-2 leading-relaxed">
                        Product Family: TGPU Innovator Labs (Proposed Repo: `tgpu-ecomatch-health`). Registered team name and individual contributor names are tracked in `submission/submission-manifest.json` as pending final team confirmation prior to LMS PDF export.
                      </p>
                    </div>
                  </div>
                )}

                {activeDocTab === 'video' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600 dark:text-slate-300">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Demonstration Video (&lt;10 MB Spec)
                      </h3>
                      <p className="mt-2 leading-relaxed">
                        Complete 75-second scene-by-scene narration script, live-demo recording checklist, and FFmpeg H.264 encoding recipe targeting ≤ 9.0 MB are documented in `docs/demo-video-storyboard.md`. Final screen-captured MP4 is tracked as outstanding in the submission manifest.
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Official 10Alytics Competition Voting Integrity
                      </h3>
                      <p className="mt-2 leading-relaxed">
                        Official public voting link will be linked here once published and verified by 10Alytics Global Hackathon 2026 organisers. All community voting occurs exclusively through the official 10Alytics platform — zero simulated voting or artificial engagement exists in this application.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Dynamic LinkedIn & Twitter Meta-Tag Configurator and Live Share Preview */}
            <SocialShareMetaConfigurator
              impact={preview.impact}
              benchmark={preview.benchmark}
              shareUrl={shareUrl}
            />
          </div>
        </section>

        {/* SECTION 9: MEET THE INNOVATORS */}
        <MeetTheInnovatorsSection />

        {/* SECTION 10: COLLAPSIBLE COMMON QUESTIONS (METHODOLOGY & ACCURACY) */}
        <CommonQuestionsSection
          impact={preview.impact}
          benchmark={preview.benchmark}
          ineligibleCount={preview.ineligibleAudit.length}
          facilityCount={FACILITIES.length}
          skuCount={PRODUCTS.length}
          onExploreDemo={onExploreDemo}
        />

        {/* SECTION 11: COMMERCIAL B2B SAAS ROADMAP */}
        <section id="commercial" className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#08101E] py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Commercial Viability & Implementation Roadmap
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white text-balance">
                Built as a multi-tenant B2B healthcare resource SaaS.
              </h2>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                Designed for hospital groups, public health authorities, community clinics, and humanitarian supply chains with organisation-level Row-Level Security and phased pilot onboarding.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  phase: 'Phase 01',
                  title: 'Isolated Demo & Validation',
                  desc: 'Public Judge Demo sandbox with reproducible synthetic consumables dataset, verified ML benchmarks, and transparent greedy allocation optimisation.',
                },
                {
                  phase: 'Phase 02',
                  title: 'Controlled Facility Pilot',
                  desc: 'Onboard 3–5 partner clinics via CSV / ERP read-only sync for non-regulated consumables expiry alerting and supervised transfers.',
                },
                {
                  phase: 'Phase 03',
                  title: 'Multi-Facility Integration',
                  desc: 'Direct inventory API connectors, automated FEFO procurement advisories, and audited ESG / SDG 12 sustainability reporting.',
                },
                {
                  phase: 'Phase 04',
                  title: 'Regional Circular Network',
                  desc: 'Cross-organisation exchange marketplace with verified courier logistics and public health resilience stress-testing.',
                },
              ].map((step) => (
                <div
                  key={step.phase}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-5"
                >
                  <p className="text-xs font-mono text-emerald-700 dark:text-emerald-400">{step.phase}</p>
                  <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">{step.title}</h3>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* QUIET FOOTER */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1526]">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2.5">
            <BrandMark className="w-5 h-5" />
            <span>EcoMatch Health AI · TGPU Innovator Labs · 10Alytics Global Hackathon 2026</span>
          </div>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={onExploreDemo}
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Judge Demo Mode
            </button>
            <button
              type="button"
              onClick={onOpenAuth}
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Workspace Login
            </button>
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors"
              aria-label="Toggle light and dark theme"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{darkMode ? 'Light' : 'Dark'}</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
