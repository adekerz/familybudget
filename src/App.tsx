import { useState, useEffect } from 'react';
import { useAuthStore } from './store/useAuthStore';
import { useIncomeStore } from './store/useIncomeStore';
import { useExpenseStore } from './store/useExpenseStore';
import { useGoalsStore } from './store/useGoalsStore';
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

  const loadIncomes = useIncomeStore((s) => s.loadIncomes);
  const loadExpenses = useExpenseStore((s) => s.loadExpenses);
  const loadGoals = useGoalsStore((s) => s.loadGoals);

  useEffect(() => {
    if (isAuthenticated) {
      loadIncomes();
      loadExpenses();
      loadGoals();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <ErrorBoundary>
      <div className="relative min-h-screen">
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
