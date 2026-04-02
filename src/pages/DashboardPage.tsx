import { useState, useMemo } from 'react';
import { Plus, TrendUp } from '@phosphor-icons/react';
import { Header } from '../components/layout/Header';
import { BalanceWidget } from '../components/dashboard/BalanceWidget';
import { CategoryCards } from '../components/dashboard/CategoryCards';
import { QuickExpenseBar } from '../components/dashboard/QuickExpenseBar';
import { RecentExpenses } from '../components/dashboard/RecentExpenses';
import { IncomeTimeline } from '../components/dashboard/IncomeTimeline';
import { PaceIndicator } from '../components/budget/PaceIndicator';
import { SetupChecklist } from '../components/dashboard/SetupChecklist';
import { HealthScoreCard } from '../components/dashboard/HealthScoreCard';
import { ExpenseForm } from '../components/expenses/ExpenseForm';
import { Skeleton } from '../components/ui/Skeleton';
import { AIInsightCard } from '../components/ui/AIInsightCard';
import { useIncomeStore } from '../store/useIncomeStore';
import { useExpenseStore } from '../store/useExpenseStore';
import { useBudgetSummary } from '../store/useBudgetStore';
import { SafeToSpendWidget } from '../components/budget/SafeToSpendWidget';
import { usePayPeriodStore } from '../store/usePayPeriodStore';
import { useCategoryStore } from '../store/useCategoryStore';
import { buildDashboardPrompt } from '../lib/aiPrompts';
import { useAIInsight } from '../hooks/useAIInsight';

export function DashboardPage() {
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const incomes = useIncomeStore((s) => s.incomes);
  const incomeLoading = useIncomeStore((s) => s.loading);
  const expenseLoading = useExpenseStore((s) => s.loading);
  const isLoading = incomeLoading || expenseLoading;

  const summary    = useBudgetSummary();
  const expenses   = useExpenseStore((s) => s.expenses);
  const payPeriodSummary = usePayPeriodStore(s => s.summary);
  const categories = useCategoryStore((s) => s.categories);

  // Есть ли реальный перерасход (не просто предупреждение)
  const hasOverspend = summary.mandatoryRemaining < 0 || summary.flexibleRemaining < 0;

  const prompt = useMemo(
    () => buildDashboardPrompt(summary, expenses, categories),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expenses.length, categories.length, summary.totalBalance]
  );

  const { insight: dashboardInsight } = useAIInsight('dashboard', () => prompt, [prompt]);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 px-4 pt-4 pb-28 space-y-4">
          <Skeleton className="h-32 w-full" />
          <div className="flex gap-3">
            <Skeleton className="h-24 flex-1" />
            <Skeleton className="h-24 flex-1" />
            <Skeleton className="h-24 flex-1" />
          </div>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-40 w-full" />
        </main>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-4">
        {incomes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 bg-alice border border-alice-dark rounded-3xl flex items-center justify-center mb-5">
              <TrendUp size={36} className="text-accent" />
            </div>
            <h2 className="text-ink font-bold text-lg mb-2">Добро пожаловать!</h2>
            <p className="text-muted text-sm max-w-xs">
              Добавьте первый доход, чтобы начать планирование бюджета по формуле 50/30/20
            </p>
          </div>
        ) : (
          <>
            {/* Hero: Остаток + 3 метрики */}
            <BalanceWidget />

            {/* Pay Period: безопасный остаток */}
            {payPeriodSummary && (
              <SafeToSpendWidget summary={payPeriodSummary} compact />
            )}

            {/* Onboarding checklist */}
            <SetupChecklist />

            {/* Темп трат (Pay Period) */}
            {payPeriodSummary && <PaceIndicator pace={payPeriodSummary.pace} />}

            {/* AI совет на дашборде — только если нет перерасхода (не дублируем) */}
            {!hasOverspend && (
              <AIInsightCard insight={dashboardInsight} isLoading={!dashboardInsight} />
            )}

            {/* Budget categories breakdown */}
            <CategoryCards />

            {/* Health score — только в конце, не перебивает основной поток */}
            <HealthScoreCard />
          </>
        )}

        <div>
          <p className="section-lbl mb-2">Быстрый расход</p>
          <QuickExpenseBar />
        </div>

        <RecentExpenses />
        <IncomeTimeline />
      </main>

      {/* FAB */}
      <button
        onClick={() => setShowExpenseForm(true)}
        className="fixed bottom-[84px] right-4 w-14 h-14 rounded-full bg-accent text-white shadow-lg flex items-center justify-center active:scale-95 transition-all z-30"
        aria-label="Добавить расход"
      >
        <Plus size={24} />
      </button>

      {showExpenseForm && (
        <ExpenseForm onClose={() => setShowExpenseForm(false)} />
      )}
    </div>
  );
}
