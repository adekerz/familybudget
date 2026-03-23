import { useState } from 'react';
import { useAuthStore } from './store/useAuthStore';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { IncomePage } from './pages/IncomePage';
import { ExpensesPage } from './pages/ExpensesPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { GoalsPage } from './pages/GoalsPage';
import { SettingsPage } from './pages/SettingsPage';
import { BottomNav } from './components/layout/BottomNav';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { PageTab } from './types';

export function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [activeTab, setActiveTab] = useState<PageTab>('dashboard');

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <ErrorBoundary>
      <div className="relative min-h-screen bg-primary">
        {activeTab === 'dashboard' && <DashboardPage />}
        {activeTab === 'income'    && <IncomePage />}
        {activeTab === 'expenses'  && <ExpensesPage />}
        {activeTab === 'goals'     && <GoalsPage />}
        {activeTab === 'analytics' && <AnalyticsPage />}
        {activeTab === 'settings'  && <SettingsPage />}
        <BottomNav activeTab={activeTab} onChange={setActiveTab} />
      </div>
    </ErrorBoundary>
  );
}
