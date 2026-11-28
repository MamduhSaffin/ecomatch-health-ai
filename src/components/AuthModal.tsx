import React, { useEffect, useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { api, setAuthSession, type AuthUserClient } from '../services/api';
import type { Organisation, UserRole } from '../types/domain';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuthenticated: (user: AuthUserClient, token: string) => void;
  onEnterDemo: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  open,
  onClose,
  onAuthenticated,
  onEnterDemo,
}) => {
  const [tab, setTab] = useState<'login' | 'register' | 'claim_admin'>('login');
  const [adminClaimed, setAdminClaimed] = useState(true);
  const [inviteOnly, setInviteOnly] = useState(true);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Exclude<UserRole, 'founder_admin' | 'judge_demo'>>('facility_manager');
  const [orgId, setOrgId] = useState('ORG-METRO');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    api
      .getAuthStatus()
      .then((status) => {
        setInviteOnly(status.inviteOnly === true);
        setAdminClaimed(status.adminConfig.claimed);
        if (status.inviteOnly) setTab('login');
        setOrganisations(status.organisations);
        if (!status.inviteOnly && !status.adminConfig.claimed) {
          setTab('claim_admin');
        }
      })
      .catch(() => {
        // Ignore if status fetch fails transiently
      });
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      let res: { token: string; user: AuthUserClient };
      if (tab === 'claim_admin') {
        res = await api.claimAdmin(email, password);
      } else if (tab === 'register') {
        res = await api.registerAccount({ email, name, password, role, orgId });
      } else {
        res = await api.login(email, password);
      }
      setAuthSession(res.token, false);
      onAuthenticated(res.user, res.token);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="auth-modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Workspace Access
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Sign in to your approved workspace or launch the isolated Judge Demo sandbox.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Interactive segmented mode tabs */}
        <div className="mt-5 flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setError(null);
            }}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              tab === 'login'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          {!inviteOnly && (
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setError(null);
            }}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              tab === 'register'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Create Account
          </button>
          )}
          {!inviteOnly && !adminClaimed && (
            <button
              type="button"
              onClick={() => {
                setTab('claim_admin');
                setError(null);
              }}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                tab === 'claim_admin'
                  ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Claim Admin
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {tab === 'claim_admin' && (
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/30 p-3 text-xs text-emerald-900 dark:text-emerald-200">
              First-run setup: Set the initial administrator password (hashed server-side with scrypt). This one-time bootstrap locks immediately after claim.
            </div>
          )}

          {tab === 'register' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Amina Okafor"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Work Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="director@hospital-network.org"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={tab === 'login' ? 1 : 8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={tab === 'login' ? 'Enter password' : 'Minimum 8 characters'}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {tab === 'register' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Operational Role
                </label>
                <select
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value as Exclude<UserRole, 'founder_admin' | 'judge_demo'>)
                  }
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="facility_manager">Facility Manager</option>
                  <option value="inventory_manager">Inventory Manager</option>
                  <option value="procurement_officer">Procurement Officer</option>
                  <option value="sustainability_analyst">Sustainability Analyst</option>
                  <option value="read_only_reviewer">Read-Only Reviewer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Organisation Scope
                </label>
                <select
                  value={orgId}
                  onChange={(e) => setOrgId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {organisations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-rose-600 dark:text-rose-400" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            {loading
              ? 'Verifying...'
              : tab === 'claim_admin'
              ? 'Claim Administrator Access'
              : tab === 'register'
              ? 'Create Organisation Account'
              : 'Sign In to Workspace'}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Evaluating for 10Alytics Hackathon?</span>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              onEnterDemo();
            }}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline whitespace-nowrap shrink-0"
          >
            Explore Live Demo
          </button>
        </div>
      </div>
    </div>
  );
};
