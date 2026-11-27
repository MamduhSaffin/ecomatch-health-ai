import React, { lazy, Suspense, useEffect, useState } from 'react';
const AuthModal = lazy(() => import('./components/AuthModal').then(module => ({ default: module.AuthModal })));
import { PublicShowcasePage } from './pages/PublicShowcasePage';
const WorkspaceLayout = lazy(() => import('./pages/WorkspaceLayout').then(module => ({ default: module.WorkspaceLayout })));
import { setAuthSession, type AuthUserClient } from './services/api';

export function App() {
  const [view, setView] = useState<'public' | 'workspace'>('public');
  const [isDemo, setIsDemo] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUserClient | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  const handleExploreDemo = () => {
    setAuthSession(null, true);
    setIsDemo(true);
    setView('workspace');
  };

  const handleAuthenticated = (user: AuthUserClient, token: string) => {
    setAuthSession(token, false);
    setAuthUser(user);
    setIsDemo(false);
    setView('workspace');
  };

  const handleSignOut = () => {
    setAuthSession(null, true);
    setAuthUser(null);
    setIsDemo(true);
    setView('public');
  };

  void authUser;

  return (
    <Suspense fallback={<div role="status" className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#08101E] text-slate-700 dark:text-slate-200">Loading EcoMatch…</div>}>
      {view === 'public' ? (
        <PublicShowcasePage
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((d) => !d)}
          onExploreDemo={handleExploreDemo}
          onOpenAuth={() => setAuthModalOpen(true)}
        />
      ) : (
        <WorkspaceLayout
          isDemo={isDemo}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((d) => !d)}
          onExitToPublic={() => setView('public')}
          onOpenAuth={() => setAuthModalOpen(true)}
          onSignOut={handleSignOut}
        />
      )}

      {authModalOpen && <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={handleAuthenticated}
        onEnterDemo={handleExploreDemo}
      />}
    </Suspense>
  );
}

export default App;
