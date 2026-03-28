import { useState, useEffect } from 'react';
import { registerSetTab, getTabFromPath, listenPopState } from './lib/navigation';
import { useAuthStore } from './store/useAuthStore';
import { useIncomeStore } from './store/useIncomeStore';
import { useExpenseStore } from './store/useExpenseStore';
import { useGoalsStore } from './store/useGoalsStore';
import { useFixedExpenseStore } from './store/useFixedExpenseStore';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { IncomePage } from './pages/IncomePage';
import { ExpensesPage } from './pages/ExpensesPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { GoalsPage } from './pages/GoalsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AssistantPage } from './pages/AssistantPage';
import { AdminPage } from './pages/AdminPage';
import { BottomNav } from './components/layout/BottomNav';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toast } from './components/ui/Toast';
import { UndoSnackbar } from './components/ui/UndoSnackbar';
import { useSettingsStore } from './store/useSettingsStore';
import { useThemeStore } from './store/useThemeStore';
import type { PageTab } from './types';

export function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<PageTab>(getTabFromPath);

  useEffect(() => {
    registerSetTab((tab) => {
      setActiveTab(tab);
    });
    // Синхронизировать URL при первой загрузке
    const initialTab = getTabFromPath();
    const path = {
      dashboard: '/dashboard', income: '/income', expenses: '/expenses',
      analytics: '/analytics', goals: '/goals', settings: '/settings',
      assistant: '/assistant', admin: '/admin',
    }[initialTab] ?? '/dashboard';
    if (window.location.pathname !== path && window.location.pathname !== '/') {
      // уже правильный путь, ничего не делаем
    } else if (window.location.pathname === '/') {
      window.history.replaceState({ tab: initialTab }, '', path);
    }
    // Слушаем popstate для кнопок "назад/вперёд"
    return listenPopState((tab) => setActiveTab(tab));
  }, []);

  const loadIncomes = useIncomeStore((s) => s.loadIncomes);
  const loadExpenses = useExpenseStore((s) => s.loadExpenses);
  const loadGoals = useGoalsStore((s) => s.loadGoals);
  const loadFixedExpenses = useFixedExpenseStore((s) => s.loadFixedExpenses);
  const subscribeExpenses = useExpenseStore((s) => s.subscribeRealtime);
  const subscribeIncomes = useIncomeStore((s) => s.subscribeRealtime);
  const subscribeGoals = useGoalsStore((s) => s.subscribeRealtime);
  const subscribeFixedExpenses = useFixedExpenseStore((s) => s.subscribeRealtime);

  // Проверка сессии при монтировании
  useEffect(() => {
    useAuthStore.getState().checkSession();
  }, []);

  // Проверка сессии каждые 5 минут
  useEffect(() => {
    const interval = setInterval(() => {
      useAuthStore.getState().checkSession();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isAuthenticated && user && !user.mustChangePassword) {
      const isFamily = user.spaceName?.toLowerCase() === 'family';
      useSettingsStore.getState().initForSpace(user.spaceId, isFamily);
      useThemeStore.getState().initTheme();
    }
  }, [isAuthenticated, user?.spaceId, user?.mustChangePassword]);

  useEffect(() => {
    if (isAuthenticated) {
      loadIncomes();
      loadExpenses();
      loadGoals();
      loadFixedExpenses();
      const unsubExpenses = subscribeExpenses();
      const unsubIncomes = subscribeIncomes();
      const unsubGoals = subscribeGoals();
      const unsubFixedExpenses = subscribeFixedExpenses();
      return () => {
        unsubExpenses();
        unsubIncomes();
        unsubGoals();
        unsubFixedExpenses();
      };
    }
  }, [isAuthenticated]);

  if (!isAuthenticated || user?.mustChangePassword) {
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
        {activeTab === 'assistant' && <AssistantPage />}
        {activeTab === 'admin'     && user?.role === 'admin' && <AdminPage />}
        <BottomNav activeTab={activeTab} onChange={setActiveTab} />
        <Toast />
        <UndoSnackbar />
      </div>
    </ErrorBoundary>
  );
}
