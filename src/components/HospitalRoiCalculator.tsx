import React, { useMemo, useState } from 'react';
import { ArrowRight, Calculator, Download } from 'lucide-react';
import type { ImpactSummary } from '../types/domain';
import { triggerFileDownload } from '../services/api';

interface HospitalRoiCalculatorProps {
  impact: ImpactSummary;
  baselineFacilityCount: number;
  onExploreDemo: () => void;
}

export const HospitalRoiCalculator: React.FC<HospitalRoiCalculatorProps> = ({
  impact,
  baselineFacilityCount,
  onExploreDemo,
}) => {
  const [facilities, setFacilities] = useState(12);
  const [annualSpendPerFacilityK, setAnnualSpendPerFacilityK] = useState(450);
  const [currentWasteRatePct, setCurrentWasteRatePct] = useState(6);

  // Derive transparent scaling anchors directly from the live Engine D/E simulation
  const modeled = useMemo(() => {
    const recoveryCaptureRate = Math.min(
      0.85,
      Math.max(0.25, impact.simulatedOptimised.potentialWasteReductionPct / 100)
    );
    const totalAnnualSpendUsd = facilities * annualSpendPerFacilityK * 1000;
    const estimatedAnnualExpiryWasteUsd = totalAnnualSpendUsd * (currentWasteRatePct / 100);
    const grossAvoidedProcurementUsd = estimatedAnnualExpiryWasteUsd * recoveryCaptureRate;

    // Preserve the exact net-to-gross efficiency ratio from Engine D (courier deduction)
    const netToGrossRatio =
      impact.simulatedOptimised.potentialProcurementSavingsUsd > 0
        ? impact.simulatedOptimised.potentialNetSavingsUsd /
          impact.simulatedOptimised.potentialProcurementSavingsUsd
        : 0.9;
    const netAnnualSavingsUsd = Math.round(grossAvoidedProcurementUsd * netToGrossRatio);

    // Derive kg diverted and CO2e per USD of rescued consumables directly from Engine E
    const kgPerDollar =
      impact.simulatedOptimised.potentialProcurementSavingsUsd > 0
        ? impact.simulatedOptimised.potentialWasteDivertedKg /
          impact.simulatedOptimised.potentialProcurementSavingsUsd
        : 0.04;
    const co2PerKg =
      impact.simulatedOptimised.potentialWasteDivertedKg > 0
        ? impact.simulatedOptimised.potentialAvoidedCo2eKg /
          impact.simulatedOptimised.potentialWasteDivertedKg
        : 3.1;
    const episodesPerDollar =
      impact.simulatedOptimised.potentialProcurementSavingsUsd > 0
        ? impact.simulatedOptimised.potentialPatientEpisodesSupported /
          impact.simulatedOptimised.potentialProcurementSavingsUsd
        : 0.35;

    const wasteDivertedKg = Math.round(grossAvoidedProcurementUsd * kgPerDollar);
    const co2AvoidedTonnes = Number(((wasteDivertedKg * co2PerKg) / 1000).toFixed(2));
    const careEpisodesProtected = Math.round(grossAvoidedProcurementUsd * episodesPerDollar);

    return {
      recoveryCapturePct: Math.round(recoveryCaptureRate * 100),
      netToGrossPct: Math.round(netToGrossRatio * 100),
      totalAnnualSpendUsd,
      estimatedAnnualExpiryWasteUsd: Math.round(estimatedAnnualExpiryWasteUsd),
      netAnnualSavingsUsd,
      wasteDivertedKg,
      co2AvoidedTonnes,
      careEpisodesProtected,
    };
  }, [annualSpendPerFacilityK, currentWasteRatePct, facilities, impact]);

  const handleDownloadBusinessCase = () => {
    const content = [
      '# EcoMatch Health AI — Healthcare Network Pilot Impact Brief',
      '',
      'Generated from the live EcoMatch Health AI Public Showcase Estimator',
      'Provenance: Modeled extrapolation scaled transparently from the verified Engine D/E synthetic benchmark',
      '',
      '## Network Inputs',
      `- Partner Facilities: ${facilities}`,
      `- Annual Non-Regulated Consumables Spend per Facility: $${(annualSpendPerFacilityK * 1000).toLocaleString()}`,
      `- Total Annual Network Consumables Spend: $${modeled.totalAnnualSpendUsd.toLocaleString()}`,
      `- Baseline Estimated Expiry Waste Rate: ${currentWasteRatePct}% ($${modeled.estimatedAnnualExpiryWasteUsd.toLocaleString()}/year)`,
      '',
      '## Modeled Annual Circular Economy Outcomes',
      `- Estimated Net Operational Savings (after courier transit): $${modeled.netAnnualSavingsUsd.toLocaleString()} / year`,
      `- Estimated Medical Consumables Waste Diverted: ${modeled.wasteDivertedKg.toLocaleString()} kg / year`,
      `- Estimated Net CO2e Emissions Avoided: ${modeled.co2AvoidedTonnes} tonnes CO2e / year`,
      `- Estimated Clinical Care Episodes Capacity Protected: ${modeled.careEpisodesProtected.toLocaleString()} episodes / year`,
      '',
      '## Transparent Scaling Methodology',
      `- Reference Engine D Sandbox Size: ${baselineFacilityCount} facilities`,
      `- Modeled LP Expiry Capture Rate: ${modeled.recoveryCapturePct}% of eligible near-expiry waste`,
      `- Net-to-Gross Efficiency (after regional courier costs): ${modeled.netToGrossPct}%`,
      `- Scope Safeguard: Non-regulated medical consumables only; human approval mandatory for every transfer.`,
    ].join('\n');

    triggerFileDownload(
      `ecomatch-pilot-business-case-${facilities}-facilities.md`,
      content,
      'text/markdown;charset=utf-8'
    );
  };

  return (
    <section
      id="estimator"
      aria-labelledby="estimator-heading"
      className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#08101E] py-16"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="max-w-2xl">
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Network Value Estimator · Transparent Scaling from Engine D &amp; E
              </p>
              <h2
                id="estimator-heading"
                className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white text-balance"
              >
                Estimate circular savings for your own hospital or clinic network.
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Adjust network size and consumables spend below to project annual waste prevention and budget recovery scaled directly from our live {baselineFacilityCount}-facility LP solver capture rate ({modeled.recoveryCapturePct}%).
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadBusinessCase}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-emerald-600 text-white hover:bg-slate-800 dark:hover:bg-emerald-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Pilot Business Case (.md)</span>
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Interactive Sliders */}
            <div className="lg:col-span-5 space-y-5 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="roi-facilities" className="font-semibold text-slate-700 dark:text-slate-200">
                    Partner Facilities in Network
                  </label>
                  <span className="font-mono tabular-nums font-bold text-slate-950 dark:text-white">
                    {facilities} facilities
                  </span>
                </div>
                <input
                  id="roi-facilities"
                  type="range"
                  min={2}
                  max={40}
                  step={1}
                  value={facilities}
                  onChange={(e) => setFacilities(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
                <div className="mt-1 flex justify-between text-[11px] text-slate-400 font-mono tabular-nums">
                  <span>2 clinics</span>
                  <span>20 regional</span>
                  <span>40 ministry</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="roi-spend" className="font-semibold text-slate-700 dark:text-slate-200">
                    Annual Consumables Spend / Facility
                  </label>
                  <span className="font-mono tabular-nums font-bold text-slate-950 dark:text-white">
                    ${annualSpendPerFacilityK.toLocaleString()}k / yr
                  </span>
                </div>
                <input
                  id="roi-spend"
                  type="range"
                  min={150}
                  max={2500}
                  step={50}
                  value={annualSpendPerFacilityK}
                  onChange={(e) => setAnnualSpendPerFacilityK(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
                <div className="mt-1 flex justify-between text-[11px] text-slate-400 font-mono tabular-nums">
                  <span>$150k</span>
                  <span>$1.2M</span>
                  <span>$2.5M</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="roi-waste" className="font-semibold text-slate-700 dark:text-slate-200">
                    Current Unmanaged Expiry Waste Rate
                  </label>
                  <span className="font-mono tabular-nums font-bold text-slate-950 dark:text-white">
                    {currentWasteRatePct}%
                  </span>
                </div>
                <input
                  id="roi-waste"
                  type="range"
                  min={2}
                  max={12}
                  step={1}
                  value={currentWasteRatePct}
                  onChange={(e) => setCurrentWasteRatePct(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
                <div className="mt-1 flex justify-between text-[11px] text-slate-400 font-mono tabular-nums">
                  <span>2% lean</span>
                  <span>6% typical</span>
                  <span>12% high-risk</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Modeled extrapolation: applies our live Engine D capture rate ({modeled.recoveryCapturePct}%) and net-of-courier efficiency ({modeled.netToGrossPct}%) to your baseline spend. Actual pilot ROI depends on facility ERP data.
                </span>
              </div>
            </div>

            {/* Right: 4-Metric Modeled Projection Grid */}
            <div className="lg:col-span-7 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#08101E] p-5">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Net Annual Budget Reclaimed · Modeled
                  </p>
                  <p className="mt-2 text-3xl font-extrabold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                    ${modeled.netAnnualSavingsUsd.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    From ${modeled.estimatedAnnualExpiryWasteUsd.toLocaleString()}/yr projected expiry exposure
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#08101E] p-5">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Medical Consumables Diverted · Modeled
                  </p>
                  <p className="mt-2 text-3xl font-extrabold font-mono tabular-nums text-slate-950 dark:text-white">
                    {modeled.wasteDivertedKg.toLocaleString()} kg
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Sterile supplies kept out of clinical incineration annually
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#08101E] p-5">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Net Avoided Emissions · Estimated
                  </p>
                  <p className="mt-2 text-3xl font-extrabold font-mono tabular-nums text-teal-700 dark:text-teal-400">
                    {modeled.co2AvoidedTonnes} t CO2e
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Net of courier transit using EPA WARM emission factors
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#08101E] p-5">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Patient Care Episodes Protected · Proxy
                  </p>
                  <p className="mt-2 text-3xl font-extrabold font-mono tabular-nums text-slate-950 dark:text-white">
                    {modeled.careEpisodesProtected.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Supply-availability capacity proxy across receiving clinics
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  Total modeled network consumables spend: ${(modeled.totalAnnualSpendUsd / 1_000_000).toFixed(2)}M / year
                </p>
                <button
                  type="button"
                  onClick={onExploreDemo}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap"
                >
                  <span>Stress-test live LP allocations in Workspace</span>
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
