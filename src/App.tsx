import React, { useEffect, useState } from 'react';
import { AuthModal } from './components/AuthModal';
import { PublicShowcasePage } from './pages/PublicShowcasePage';
import { WorkspaceLayout } from './pages/WorkspaceLayout';
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
    <>
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

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={handleAuthenticated}
        onEnterDemo={handleExploreDemo}
      />
    </>
  );
}

export default App;
