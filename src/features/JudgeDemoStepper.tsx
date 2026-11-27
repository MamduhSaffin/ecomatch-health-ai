import React from 'react';
import { ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import type { WorkspaceTab } from '../pages/WorkspaceLayout';

export interface DemoStepDef {
  step: number;
  title: string;
  description: string;
  targetTab: WorkspaceTab;
  actionHint: string;
}

export const JUDGE_DEMO_STEPS: DemoStepDef[] = [
  {
    step: 1,
    title: 'Analyse Historical Consumption',
    description: 'Inspect 104 weeks of synthetic weekly consumption across 8 facilities evaluated on strict chronological train/val/test splits.',
    targetTab: 'analytics',
    actionHint: 'Inspect Engine A model benchmarks & 12-week forecast intervals.',
  },
  {
    step: 2,
    title: 'Detect Facility A Predicted Surplus',
    description: 'Metropolitan General Hospital holds batch BCH-IVS-2601 (Sterile IV Infusion Sets) expiring in 44 days with projected unused surplus under FEFO.',
    targetTab: 'inventory',
    actionHint: 'Review Metropolitan General FEFO expiry exposure.',
  },
  {
    step: 3,
    title: 'Detect Facility B Predicted Shortage',
    description: 'Riverview Community Clinic has only 18 units of Sterile IV Sets on hand (<1.2 weeks coverage) with elevated stockout probability.',
    targetTab: 'network',
    actionHint: 'Inspect corridor distance (10.5 km) between Facility A and Facility B.',
  },
  {
    step: 4,
    title: 'Calculate Potential Inventory Waste',
    description: 'Engine B decomposes every batch into a transparent 0–100 Waste Risk Score (Expiry Proximity, Unused Ratio, Financial Exposure, Velocity Deficit).',
    targetTab: 'inventory',
    actionHint: 'Expand any batch row to inspect its 4-factor risk explanation.',
  },
  {
    step: 5,
    title: 'Verify Eligible Matching Supplies',
    description: 'Hard eligibility gates run BEFORE scoring—blocking recalled lot BCH-REC-9901 and expired lot BCH-EXP-9902 automatically.',
    targetTab: 'exchange',
    actionHint: 'Verify the Ineligible Lot Exclusion Audit panel.',
  },
  {
    step: 6,
    title: 'Generate Explainable Match Score (0–100)',
    description: 'Engine C scores SKU compatibility, shelf-life adequacy vs. recipient burn rate, Haversine distance, urgency, and net financial recovery.',
    targetTab: 'exchange',
    actionHint: 'Inspect the 5-factor score breakdown for BCH-IVS-2601 → Riverview.',
  },
  {
    step: 7,
    title: 'Recommend Optimised Transfer Quantity',
    description: 'Engine D solves capacitated redistribution to cap transfer quantity at what the recipient can safely consume before expiration.',
    targetTab: 'exchange',
    actionHint: 'Review the recommended transfer quantity and transport cost estimate.',
  },
  {
    step: 8,
    title: 'Human Approval Workflow',
    description: 'No transfer moves automatically—click "Propose Transfer" then "Approve Transfer" as an authorised operator.',
    targetTab: 'exchange',
    actionHint: 'Submit and approve a transfer in the Marketplace Approval Queue.',
  },
  {
    step: 9,
    title: 'Simulate Approved Transfer Execution',
    description: 'Upon approval, stock deducts from Facility A, credits Facility B preserving the original expiry date, and writes an immutable audit log.',
    targetTab: 'exchange',
    actionHint: 'Confirm the live status transition & stock balance update.',
  },
  {
    step: 10,
    title: 'Compare Conventional vs. Redistribution',
    description: 'Engine D benchmarks isolated procurement against multi-facility redistribution under stress scenarios (demand surges, budget cuts).',
    targetTab: 'simulation',
    actionHint: 'Adjust scenario sliders in the Simulation Lab to observe LP re-optimisation.',
  },
  {
    step: 11,
    title: 'Calculate Financial & Environmental Impact',
    description: 'Engine E separates Observed Ledger transfers, Model Predictions, Simulated Outcomes, and Estimated CO2e savings net of courier emissions.',
    targetTab: 'impact',
    actionHint: 'Review transparent formulas & export the SDG 12 Impact Report.',
  },
  {
    step: 12,
    title: 'Updated Executive Command Centre',
    description: 'Return to the Command Centre to view updated Observed Savings, reduced Inventory at Risk, and query Engine F (AI Operations Agent).',
    targetTab: 'command',
    actionHint: 'Inspect updated KPIs or ask Engine F for an executive briefing.',
  },
];

interface JudgeDemoStepperProps {
  currentStep: number; // 1..12
  onSelectStep: (step: number, tab: WorkspaceTab) => void;
  onResetDemo: () => void;
  resetting: boolean;
  completedTransfersCount: number;
}

export const JudgeDemoStepper: React.FC<JudgeDemoStepperProps> = ({
  currentStep,
  onSelectStep,
  onResetDemo,
  resetting,
  completedTransfersCount,
}) => {
  const def = JUDGE_DEMO_STEPS[currentStep - 1] ?? JUDGE_DEMO_STEPS[0];

  return (
    <div className="mb-6 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/25 p-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
            <span className="font-mono tabular-nums font-semibold">
              Judge Demo Walkthrough · Step {def.step} of {JUDGE_DEMO_STEPS.length}
            </span>
            <span aria-hidden="true">·</span>
            <span>Isolated Synthetic Sandbox</span>
            {completedTransfersCount > 1 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Transfer Approved Live
                </span>
              </>
            )}
          </div>
          <h2 className="mt-1 text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            {def.step}. {def.title}
          </h2>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
            {def.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={currentStep <= 1}
            onClick={() => {
              const prev = JUDGE_DEMO_STEPS[currentStep - 2];
              if (prev) onSelectStep(prev.step, prev.targetTab);
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors whitespace-nowrap"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          {currentStep < JUDGE_DEMO_STEPS.length ? (
            <button
              type="button"
              onClick={() => {
                const next = JUDGE_DEMO_STEPS[currentStep];
                if (next) onSelectStep(next.step, next.targetTab);
              }}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors whitespace-nowrap"
            >
              <span>Next Step</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSelectStep(1, 'analytics')}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors whitespace-nowrap"
            >
              <span>Restart Walkthrough</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            disabled={resetting}
            onClick={onResetDemo}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
            <span>{resetting ? 'Resetting...' : 'Reset Demo'}</span>
          </button>
        </div>
      </div>

      {/* Progress segment bar */}
      <div className="mt-3 grid grid-cols-12 gap-1">
        {JUDGE_DEMO_STEPS.map((s) => (
          <button
            key={s.step}
            type="button"
            title={`Step ${s.step}: ${s.title}`}
            onClick={() => onSelectStep(s.step, s.targetTab)}
            className={`h-1.5 rounded-xs transition-colors ${
              s.step <= currentStep
                ? 'bg-emerald-600 dark:bg-emerald-400'
                : 'bg-emerald-200/80 dark:bg-slate-800 hover:bg-emerald-300 dark:hover:bg-slate-700'
            }`}
            aria-label={`Jump to Step ${s.step}: ${s.title}`}
          />
        ))}
      </div>
    </div>
  );
};
