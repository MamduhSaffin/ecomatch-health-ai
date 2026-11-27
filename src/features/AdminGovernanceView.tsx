import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { api, type SubmissionManifest, type WorkspaceSnapshot } from '../services/api';

interface AdminGovernanceViewProps {
  snapshot: WorkspaceSnapshot;
  onOpenAuth: () => void;
}

const RBAC_MATRIX = [
  { role: 'Founder / Admin', scope: 'All Organisations', inventory: 'Read / Write', approval: 'Full Approval', admin: 'Full Access' },
  { role: 'Facility Manager', scope: 'Assigned Org', inventory: 'Read / Write', approval: 'Approve Transfers', admin: 'Org Settings' },
  { role: 'Inventory Manager', scope: 'Assigned Org', inventory: 'Read / Write / CSV', approval: 'Propose Only', admin: 'None' },
  { role: 'Procurement Officer', scope: 'Assigned Org', inventory: 'Read Only', approval: 'Approve Transfers', admin: 'None' },
  { role: 'Sustainability Analyst', scope: 'Assigned Org', inventory: 'Read Only', approval: 'Export Reports', admin: 'None' },
  { role: 'Read-Only Reviewer', scope: 'Assigned Org', inventory: 'Read Only', approval: 'View Audit', admin: 'None' },
  { role: 'Public Judge Demo', scope: 'Isolated Sandbox', inventory: 'Sandbox Only', approval: 'Sandbox Only', admin: 'Blocked (Prod)' },
];

export const AdminGovernanceView: React.FC<AdminGovernanceViewProps> = ({
  snapshot,
  onOpenAuth,
}) => {
  const [manifest, setManifest] = useState<SubmissionManifest | null>(null);

  useEffect(() => {
    api
      .getSubmissionManifest()
      .then((m) => setManifest(m))
      .catch(() => setManifest(null));
  }, []);

  return (
    <div className="space-y-6">
      {/* Governance Summary Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Active Session Identity</p>
          <p className="mt-1.5 text-base font-bold text-slate-950 dark:text-white">
            {snapshot.actor.name}
          </p>
          <p className="mt-1 text-xs font-mono text-slate-500 dark:text-slate-400">
            Role: {snapshot.actor.role} · Scope: {snapshot.actor.orgId}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Production Isolation</p>
          <p className="mt-1.5 text-base font-bold text-emerald-700 dark:text-emerald-400">
            {snapshot.isDemo ? 'Isolated Judge Sandbox Active' : 'Authenticated Org Session'}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {snapshot.isDemo
              ? 'Demo actions never mutate production records or expose admin keys.'
              : 'Bearer token verified server-side; organisation isolation active.'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-5 flex flex-col justify-between">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Account & Role Switching</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Sign in as an organisation operator or claim first-run admin credentials.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAuth}
            className="mt-3 self-start px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-emerald-600 text-white hover:bg-slate-800 dark:hover:bg-emerald-700 transition-colors"
          >
            Open Auth & Role Manager
          </button>
        </div>
      </div>

      {/* RBAC Matrix */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Role-Based Access Control (RBAC) & PostgreSQL RLS Policy Matrix
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mirrored in server-side Express authorisation middleware and `supabase/migrations/001_initial_schema.sql`
            </p>
          </div>
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-5 font-semibold">Role</th>
                <th className="py-2.5 px-4 font-semibold">Data Isolation Scope</th>
                <th className="py-2.5 px-4 font-semibold">Inventory</th>
                <th className="py-2.5 px-4 font-semibold">Transfer Approval</th>
                <th className="py-2.5 px-5 font-semibold">Administration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {RBAC_MATRIX.map((r) => (
                <tr key={r.role}>
                  <td className="py-2.5 px-5 font-semibold text-slate-900 dark:text-white">{r.role}</td>
                  <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">{r.scope}</td>
                  <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">{r.inventory}</td>
                  <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">{r.approval}</td>
                  <td className="py-2.5 px-5 text-slate-600 dark:text-slate-300">{r.admin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Immutable Audit Trail */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Operational & Security Audit Trail ({snapshot.auditLogs.length} Recent Events)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Records inventory mutations, transfer approvals, agent queries, and authentication events
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-5 font-semibold">Timestamp</th>
                <th className="py-2.5 px-4 font-semibold">Actor · Role</th>
                <th className="py-2.5 px-4 font-semibold">Action</th>
                <th className="py-2.5 px-4 font-semibold">Target</th>
                <th className="py-2.5 px-5 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {snapshot.auditLogs.slice(0, 15).map((log) => (
                <tr key={log.id}>
                  <td className="py-2.5 px-5 font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {log.timestamp.replace('T', ' ').slice(0, 19)}
                  </td>
                  <td className="py-2.5 px-4 text-slate-800 dark:text-slate-200">
                    {log.actor} <span className="text-slate-400">({log.role})</span>
                  </td>
                  <td className="py-2.5 px-4 font-mono font-semibold text-slate-900 dark:text-white">
                    {log.action}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-600 dark:text-slate-300">{log.target}</td>
                  <td className="py-2.5 px-5 text-slate-600 dark:text-slate-400">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Competition Submission Manifest */}
      {manifest && (
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              10Alytics Global Hackathon 2026 — Submission Manifest
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Honest completion & verification status loaded from `submission/submission-manifest.json`
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-5 font-semibold">Deliverable</th>
                  <th className="py-2.5 px-4 font-semibold">Location</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                  <th className="py-2.5 px-5 font-semibold">Outstanding Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {manifest.deliverables.map((d) => (
                  <tr key={d.id}>
                    <td className="py-2.5 px-5 font-semibold text-slate-900 dark:text-white">{d.name}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-600 dark:text-slate-400">{d.fileLocation}</td>
                    <td className="py-2.5 px-4 font-semibold">
                      <span
                        className={
                          d.completionStatus === 'Verified' || d.completionStatus === 'Tested'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : d.completionStatus === 'Implemented'
                            ? 'text-sky-600 dark:text-sky-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }
                      >
                        {d.completionStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-5 text-slate-600 dark:text-slate-400">{d.outstandingAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
