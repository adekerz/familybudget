import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { QuickAddSheet } from './components/QuickAddSheet';
import { InstallPrompt } from './components/InstallPrompt';
import { OnboardingPage } from './pages/OnboardingPage';
import type { BankId } from './constants/banks';
import { registerSetTab, getTabFromPath, listenPopState } from './lib/navigation';
import { useAuthStore } from './store/useAuthStore';
import { useIncomeStore } from './store/useIncomeStore';
import { useExpenseStore } from './store/useExpenseStore';
import { useGoalsStore } from './store/useGoalsStore';
import { useCategoryStore } from './store/useCategoryStore';
import { useAIStore } from './store/useAIStore';
import { clearAllRateLimits } from './lib/ai';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
const IncomePage    = lazy(() => import('./pages/IncomePage').then(m => ({ default: m.IncomePage })));
const ExpensesPage  = lazy(() => import('./pages/ExpensesPage').then(m => ({ default: m.ExpensesPage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const GoalsPage     = lazy(() => import('./pages/GoalsPage').then(m => ({ default: m.GoalsPage })));
const SettingsPage  = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const AssistantPage = lazy(() => import('./pages/AssistantPage').then(m => ({ default: m.AssistantPage })));
const AdminPage     = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })));
const BudgetPage    = lazy(() => import('./pages/BudgetPage').then(m => ({ default: m.BudgetPage })));
const DebtsPage     = lazy(() => import('./pages/DebtsPage').then(m => ({ default: m.DebtsPage })));
const DepositsPage  = lazy(() => import('./pages/DepositsPage').then(m => ({ default: m.DepositsPage })));
import { BottomNav } from './components/layout/BottomNav';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toast } from './components/ui/Toast';
import { UndoSnackbar } from './components/ui/UndoSnackbar';
import { useSettingsStore } from './store/useSettingsStore';
import { useThemeStore } from './store/useThemeStore';
import { useAccountStore } from './store/useAccountStore';
import { usePayPeriodStore } from './store/usePayPeriodStore';
import { usePlannedFixedStore } from './store/usePlannedFixedStore';
import { useRecurringStore } from './store/useRecurringStore';
import { useDebtStore } from './store/useDebtStore';
import { useDepositStore } from './store/useDepositStore';
import { checkAndNotifyUpcoming } from './lib/notifyUpcoming';
import type { PageTab } from './types';

export function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<PageTab>(getTabFromPath);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [deepLinkParams, setDeepLinkParams] = useState<{ amount?: number; bank?: BankId; type?: 'expense' | 'income' }>({});

  useEffect(() => {
    registerSetTab((tab) => {
      setActiveTab(tab);
    });
    // Синхронизировать URL при первой загрузке
    const initialTab = getTabFromPath();
    const path = {
      dashboard: '/dashboard', income: '/income', expenses: '/expenses',
      analytics: '/analytics', goals: '/goals', settings: '/settings',
      assistant: '/assistant', admin: '/admin', budget: '/budget', debts: '/debts', deposits: '/deposits',
    }[initialTab] ?? '/dashboard';
    if (window.location.pathname !== path && window.location.pathname !== '/') {
      // уже правильный путь, ничего не делаем
    } else if (window.location.pathname === '/') {
      window.history.replaceState({ tab: initialTab }, '', path);
    }
    // Слушаем popstate для кнопок "назад/вперёд"
    const unsubPop = listenPopState((tab) => setActiveTab(tab));

    // Deep link обработка
    const url = new URL(window.location.href);
    const amount = url.searchParams.get('amount');
    const bank = url.searchParams.get('bank');
    const type = url.searchParams.get('type');
    if (amount || bank || type) {
      setDeepLinkParams({
        amount: amount ? parseInt(amount) : undefined,
        bank: (bank as BankId) || undefined,
        type: (type as 'expense' | 'income') || undefined,
      });
      setShowQuickAdd(true);
      window.history.replaceState({}, '', '/dashboard');
    }

    return unsubPop;
  }, []);

  const loadIncomes = useIncomeStore((s) => s.loadIncomes);
  const loadExpenses = useExpenseStore((s) => s.loadExpenses);
  const loadGoals = useGoalsStore((s) => s.loadGoals);
  const loadCategories = useCategoryStore((s) => s.loadCategories);
  const subscribeExpenses = useExpenseStore((s) => s.subscribeRealtime);
  const subscribeIncomes = useIncomeStore((s) => s.subscribeRealtime);
  const subscribeGoals = useGoalsStore((s) => s.subscribeRealtime);
  const subscribeCategories = useCategoryStore((s) => s.subscribeRealtime);
  const subscribeSettings = useSettingsStore((s) => s.subscribeRealtime);
  const subscribeAuth = useAuthStore((s) => s.subscribeRealtime);
  const loadAccounts = useAccountStore((s) => s.loadAccounts);
  const subscribeAccounts = useAccountStore((s) => s.subscribeRealtime);

  // Проверка сессии при монтировании + сброс AI rate limits
  useEffect(() => {
    useAuthStore.getState().checkSession();
    if (useAuthStore.getState().isAuthenticated) {
      clearAllRateLimits();
    }
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
      useSettingsStore.getState().loadSettings(user.spaceId, isFamily);
      useThemeStore.getState().initTheme();
    }
  }, [isAuthenticated, user?.spaceId, user?.mustChangePassword]);

  const lastVisibleRef = useRef<number>(Date.now());

  useEffect(() => {
    if (isAuthenticated) {
      loadIncomes();
      loadExpenses();
      loadGoals();
      loadCategories();
      loadAccounts();
      useAIStore.getState().loadChats();
      usePlannedFixedStore.getState().load();
      const unsubExpenses = subscribeExpenses();
      const unsubIncomes = subscribeIncomes();
      const unsubGoals = subscribeGoals();
      const unsubCategories = subscribeCategories();
      const unsubSettings = subscribeSettings();
      const unsubAuth = subscribeAuth();
      const unsubAccounts = subscribeAccounts();
      usePayPeriodStore.getState().fetchActivePeriod();
      const unsubPayPeriod = usePayPeriodStore.getState().subscribeRealtime();
      const unsubPlannedFixed = usePlannedFixedStore.getState().subscribeRealtime();
      // Загружаем повторяющиеся платежи и генерируем просроченные
      useRecurringStore.getState().load().then(() => {
        useRecurringStore.getState().generateDue();
      });
      // Загружаем долги и депозиты при старте (для dashboard виджетов)
      useDebtStore.getState().loadDebts();
      useDepositStore.getState().loadDeposits();
      // Проверяем предстоящие платежи через 3 секунды после загрузки
      const notifyTimer = setTimeout(() => {
        checkAndNotifyUpcoming();
      }, 3000);
      return () => {
        unsubExpenses();
        unsubIncomes();
        unsubGoals();
        unsubCategories();
        unsubSettings();
        unsubAuth();
        unsubAccounts();
        unsubPayPeriod();
        unsubPlannedFixed();
        clearTimeout(notifyTimer);
      };
    }
  }, [isAuthenticated]);

  // Рефреш данных при возврате на вкладку (если прошло > 5 мин)
  useEffect(() => {
    if (!isAuthenticated) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - lastVisibleRef.current;
        if (elapsed > 5 * 60 * 1000) {
          useAuthStore.getState().checkSession();
          loadIncomes();
          loadExpenses();
          loadGoals();
          loadCategories();
          loadAccounts();
          usePlannedFixedStore.getState().load();
          checkAndNotifyUpcoming();
        }
        lastVisibleRef.current = Date.now();
      } else {
        lastVisibleRef.current = Date.now();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isAuthenticated]);

  if (!isAuthenticated || user?.mustChangePassword) {
    return <AuthPage />;
  }

  if (user && user.onboarded === false) {
    return (
      <OnboardingPage onComplete={() => {
        useAuthStore.setState(s => ({
          user: s.user ? { ...s.user, onboarded: true } : s.user,
        }));
      }} />
    );
  }

  return (
    <ErrorBoundary>
      <AppShell activeTab={activeTab} onChange={setActiveTab} onAddClick={() => setShowQuickAdd(true)}>
        <div className="relative min-h-screen">
          {activeTab === 'dashboard' && <DashboardPage />}
          <Suspense fallback={<div className="flex-1 flex items-center justify-center h-screen"><div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" /></div>}>
            {activeTab === 'income'    && <IncomePage />}
            {activeTab === 'expenses'  && <ExpensesPage />}
            {activeTab === 'goals'     && <GoalsPage />}
            {activeTab === 'analytics' && <AnalyticsPage />}
            {activeTab === 'settings'  && <SettingsPage />}
            {activeTab === 'assistant' && <AssistantPage />}
            {activeTab === 'budget'    && <BudgetPage />}
            {activeTab === 'debts'     && <DebtsPage />}
            {activeTab === 'deposits'  && <DepositsPage />}
            {activeTab === 'admin'     && user?.role === 'admin' && <AdminPage />}
          </Suspense>
          {/* BottomNav — только на mobile */}
          <div className="md:hidden">
            <BottomNav activeTab={activeTab} onChange={setActiveTab} onAddClick={() => setShowQuickAdd(true)} />
          </div>
          <QuickAddSheet
            isOpen={showQuickAdd}
            onClose={() => { setShowQuickAdd(false); setDeepLinkParams({}); }}
            prefilledAmount={deepLinkParams.amount}
            prefilledBank={deepLinkParams.bank}
            prefilledType={deepLinkParams.type}
          />
          <InstallPrompt />
          <Toast />
          <UndoSnackbar />
        </div>
      </AppShell>
    </ErrorBoundary>
  );
}
