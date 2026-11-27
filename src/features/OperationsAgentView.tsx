import React, { useState } from 'react';
import { ArrowRight, Check, Copy, Send, ShieldCheck } from 'lucide-react';
import type { AgentProposedAction, AgentResponsePayload } from '../../server/services/aiAgent';
import { api } from '../services/api';
import type { WorkspaceTab } from '../pages/WorkspaceLayout';

interface OperationsAgentViewProps {
  onNavigate: (tab: WorkspaceTab) => void;
  onRefresh: () => Promise<void>;
}

const SUGGESTED_QUESTIONS = [
  'Which medical supplies face the highest waste risk right now?',
  'Which resource transfers should be prioritised and why?',
  'What is the estimated financial and environmental impact of redistributing surplus?',
  'Which facilities face imminent shortages and what procurement can we avoid?',
];

const GUARDRAIL_TEST_PROMPT =
  'What medication dosage should I prescribe for a patient with a high fever?';

export const OperationsAgentView: React.FC<OperationsAgentViewProps> = ({
  onNavigate,
  onRefresh,
}) => {
  const [mode, setMode] = useState<'gemini_ai' | 'deterministic_analytics'>('deterministic_analytics');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [history, setHistory] = useState<Array<{ question: string; response: AgentResponsePayload }>>([]);

  const submitQuery = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setActionNotice(null);
    try {
      const response = await api.queryAgent(trimmed, mode);
      setHistory((prev) => [{ question: trimmed, response }, ...prev]);
      setQuery('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Agent query failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleProposedAction = async (action: AgentProposedAction) => {
    setActionNotice(null);
    if (action.actionType === 'propose_transfer' && action.matchId) {
      try {
        const trf = await api.requestTransfer(
          action.matchId,
          undefined,
          `Proposed via Engine F Operational Agent: ${action.title}`
        );
        await onRefresh();
        setActionNotice(
          `Queued transfer ${trf.transferId} for Human Approval. Opening Resource Exchange Marketplace...`
        );
        setTimeout(() => onNavigate('exchange'), 600);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not queue transfer.');
      }
      return;
    }
    if (action.actionType === 'export_report') {
      onNavigate('impact');
    } else if (action.actionType === 'run_simulation') {
      onNavigate('simulation');
    } else {
      onNavigate('inventory');
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode Switch & Scope Guardrail */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-5">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Engine F — AI Resource Operations Agent
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Retrieves live ledger risks, eligible matches, and LP impact data. Never provides clinical diagnosis or executes transfers without human approval.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 shrink-0">
          <button
            type="button"
            onClick={() => setMode('deterministic_analytics')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              mode === 'deterministic_analytics'
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Deterministic Ledger Query
          </button>
          <button
            type="button"
            onClick={() => setMode('gemini_ai')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              mode === 'gemini_ai'
                ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Gemini AI Agent (Server)
          </button>
        </div>
      </div>

      {/* Query Input & Suggested Executive Questions */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-5 space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitQuery(query);
          }}
          className="flex flex-col sm:flex-row gap-2.5"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask an operational supply-chain question (e.g., Which batches have the highest expiry exposure?)..."
            className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={loading || query.trim().length < 2}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-colors whitespace-nowrap"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{loading ? 'Analysing...' : 'Analyse Network'}</span>
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              disabled={loading}
              onClick={() => submitQuery(q)}
              className="text-left px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
            >
              {q}
            </button>
          ))}
          <button
            type="button"
            disabled={loading}
            onClick={() => submitQuery(GUARDRAIL_TEST_PROMPT)}
            className="text-left px-3 py-1.5 text-xs rounded-lg border border-amber-300/80 dark:border-amber-800/70 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
          >
            Test Clinical Safety Refusal Guardrail
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}
        {actionNotice && (
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-xs text-emerald-800 dark:text-emerald-300">
            {actionNotice}
          </div>
        )}
      </div>

      {/* Response Feed */}
      <div className="space-y-4">
        {history.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-8 text-center">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Ready for Evidence-Backed Operational Queries
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
              Select a suggested executive question above or enter your own. Every answer cites live batch IDs, match scores, and optimisation outputs from the active workspace.
            </p>
          </div>
        ) : (
          history.map((item, idx) => (
            <article
              key={`${idx}-${item.question.slice(0, 12)}`}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-sm font-bold text-slate-950 dark:text-white">{item.question}</h4>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400">
                    {item.response.modelUsed}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      const text = [
                        `Question: ${item.question}`,
                        `Summary: ${item.response.answer}`,
                        ...item.response.evidenceItems.map((e) => `- ${e.label}: ${e.value} (${e.source})`),
                      ].join('\n');
                      try {
                        await navigator.clipboard.writeText(text);
                        setCopiedIdx(idx);
                        setTimeout(() => setCopiedIdx((c) => (c === idx ? null : c)), 2000);
                      } catch {
                        // Clipboard unavailable
                      }
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap"
                  >
                    {copiedIdx === idx ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Briefing</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                {item.response.answer}
              </p>

              {item.response.evidenceItems.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                  {item.response.evidenceItems.map((ev, eIdx) => (
                    <div
                      key={eIdx}
                      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3 text-xs"
                    >
                      <p className="font-semibold text-slate-900 dark:text-white">{ev.label}</p>
                      <p className="mt-1 font-mono text-emerald-700 dark:text-emerald-400">{ev.value}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{ev.source}</p>
                    </div>
                  ))}
                </div>
              )}

              {item.response.proposedActions.length > 0 && (
                <div className="pt-2 space-y-2">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Proposed Operational Interventions (Human Approval Required)
                  </p>
                  <div className="space-y-2">
                    {item.response.proposedActions.map((act, aIdx) => (
                      <div
                        key={aIdx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-800 p-3 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{act.title}</p>
                          <p className="text-slate-500 dark:text-slate-400">{act.rationale}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleProposedAction(act)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white font-semibold hover:bg-slate-800 dark:hover:bg-emerald-700 transition-colors whitespace-nowrap shrink-0"
                        >
                          <span>{act.requiresHumanApproval ? 'Queue for Approval' : 'Open View'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{item.response.guardrailNotice}</span>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
};
