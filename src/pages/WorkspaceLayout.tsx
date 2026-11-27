import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  Bot,
  Building2,
  Leaf,
  LogOut,
  Menu,
  Moon,
  Package,
  Shield,
  SlidersHorizontal,
  Sun,
  X,
} from 'lucide-react';
import { BrandMark } from '../components/BrandMark';
import { AdminGovernanceView } from '../features/AdminGovernanceView';
import { CommandCentreView } from '../features/CommandCentreView';
import { FacilityNetworkView } from '../features/FacilityNetworkView';
import { InventoryIntelligenceView } from '../features/InventoryIntelligenceView';
import { JudgeDemoStepper } from '../features/JudgeDemoStepper';
import { OperationsAgentView } from '../features/OperationsAgentView';
import { PredictiveAnalyticsView } from '../features/PredictiveAnalyticsView';
import { ResourceExchangeView } from '../features/ResourceExchangeView';
import { ScenarioSimulationView } from '../features/ScenarioSimulationView';
import { SustainabilityImpactView } from '../features/SustainabilityImpactView';
import { api, type WorkspaceSnapshot } from '../services/api';

export type WorkspaceTab =
  | 'command'
  | 'network'
  | 'inventory'
  | 'exchange'
  | 'analytics'
  | 'impact'
  | 'simulation'
  | 'agent'
  | 'governance';

interface WorkspaceLayoutProps {
  isDemo: boolean;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onExitToPublic: () => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
}

const NAV_ITEMS: Array<{ id: WorkspaceTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'command', label: 'Command Centre', icon: Activity },
  { id: 'network', label: 'Facility Network', icon: Building2 },
  { id: 'inventory', label: 'Inventory Intelligence', icon: Package },
  { id: 'exchange', label: 'Resource Exchange', icon: ArrowLeftRight },
  { id: 'analytics', label: 'Predictive Analytics', icon: BarChart3 },
  { id: 'impact', label: 'Sustainability Impact', icon: Leaf },
  { id: 'simulation', label: 'Scenario Simulation', icon: SlidersHorizontal },
  { id: 'agent', label: 'AI Operations Agent', icon: Bot },
  { id: 'governance', label: 'Governance & Audit', icon: Shield },
];

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  isDemo,
  darkMode,
  onToggleDarkMode,
  onExitToPublic,
  onOpenAuth,
  onSignOut,
}) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('command');
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoStep, setDemoStep] = useState(1);
  const [resettingDemo, setResettingDemo] = useState(false);

  const loadSnapshot = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getSnapshot();
      setSnapshot(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspace data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadSnapshot();
  }, [isDemo, loadSnapshot]);

  const handleResetDemo = async () => {
    setResettingDemo(true);
    try {
      await api.resetDemo();
      setDemoStep(1);
      setActiveTab('command');
      await loadSnapshot();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset demo.');
    } finally {
      setResettingDemo(false);
    }
  };

  const activeNav = NAV_ITEMS.find((item) => item.id === activeTab) ?? NAV_ITEMS[0];

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={onExitToPublic}
          className="flex items-center gap-2.5 text-sm font-bold tracking-tight text-slate-950 dark:text-white whitespace-nowrap"
        >
          <BrandMark className="w-6 h-6" />
          <span>EcoMatch Health AI</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Close navigation"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Workspace modules">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.id === activeTab;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveTab(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                active
                  ? 'bg-emerald-600/12 text-emerald-800 dark:text-emerald-300 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-950 dark:hover:text-slate-100'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-emerald-600 dark:text-emerald-400' : ''}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3 text-xs">
        <div>
          <p className="font-semibold text-slate-900 dark:text-white truncate">
            {snapshot?.actor.name ?? (isDemo ? 'Competition Judge' : 'Authenticated Operator')}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
            {isDemo ? 'Public Judge Demo Sandbox' : snapshot?.actor.role ?? 'operator'}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onExitToPublic}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Public Showcase
          </button>
          {isDemo ? (
            <button
              type="button"
              onClick={onOpenAuth}
              className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              Sign In
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-rose-600"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#08101E] text-slate-900 dark:text-slate-100">
      {/* Desktop Sidebar (248px) */}
      <aside className="hidden lg:block w-[248px] shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1526] sticky top-0 h-screen">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 w-[264px] max-w-[85vw] bg-white dark:bg-[#0B1526] h-full shadow-2xl">
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Contextual Breadcrumb Top Bar */}
        <header className="sticky top-0 z-30 h-16 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-[#08101E]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Workspace / <span className="text-slate-900 dark:text-white font-semibold">{activeNav.label}</span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                Synthetic Demonstration Dataset · Non-regulated medical consumables · UN SDG 12
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle light and dark theme"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('agent')}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors whitespace-nowrap"
            >
              Ask AI Agent
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">
          {isDemo && (
            <JudgeDemoStepper
              currentStep={demoStep}
              onSelectStep={(step, tab) => {
                setDemoStep(step);
                setActiveTab(tab);
              }}
              onResetDemo={handleResetDemo}
              resetting={resettingDemo}
              completedTransfersCount={snapshot?.impact.observed.completedTransfersCount ?? 0}
            />
          )}

          {loading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-28 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] animate-pulse"
                  />
                ))}
              </div>
              <div className="h-80 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] animate-pulse" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-6 text-sm text-rose-700 dark:text-rose-300 space-y-3">
              <p className="font-semibold">Unable to load operational workspace</p>
              <p className="text-xs">{error}</p>
              <button
                type="button"
                onClick={loadSnapshot}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700"
              >
                Retry Connection
              </button>
            </div>
          ) : snapshot ? (
            <>
              {activeTab === 'command' && (
                <CommandCentreView snapshot={snapshot} onNavigate={setActiveTab} />
              )}
              {activeTab === 'network' && (
                <FacilityNetworkView snapshot={snapshot} onNavigate={setActiveTab} />
              )}
              {activeTab === 'inventory' && (
                <InventoryIntelligenceView snapshot={snapshot} onRefresh={loadSnapshot} />
              )}
              {activeTab === 'exchange' && (
                <ResourceExchangeView snapshot={snapshot} onRefresh={loadSnapshot} />
              )}
              {activeTab === 'analytics' && <PredictiveAnalyticsView snapshot={snapshot} />}
              {activeTab === 'impact' && <SustainabilityImpactView snapshot={snapshot} />}
              {activeTab === 'simulation' && <ScenarioSimulationView snapshot={snapshot} />}
              {activeTab === 'agent' && (
                <OperationsAgentView onNavigate={setActiveTab} onRefresh={loadSnapshot} />
              )}
              {activeTab === 'governance' && (
                <AdminGovernanceView snapshot={snapshot} onOpenAuth={onOpenAuth} />
              )}
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
};
