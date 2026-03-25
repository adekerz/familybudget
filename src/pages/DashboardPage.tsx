import { useState } from 'react';
import { Plus, TrendingUp } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { BalanceWidget } from '../components/dashboard/BalanceWidget';
import { CategoryCards } from '../components/dashboard/CategoryCards';
import { QuickExpenseBar } from '../components/dashboard/QuickExpenseBar';
import { RecentExpenses } from '../components/dashboard/RecentExpenses';
import { IncomeTimeline } from '../components/dashboard/IncomeTimeline';
import { OverBudgetAlert } from '../components/dashboard/OverBudgetAlert';
import { SetupChecklist } from '../components/dashboard/SetupChecklist';
import { ExpenseForm } from '../components/expenses/ExpenseForm';
import { Skeleton } from '../components/ui/Skeleton';
import { useIncomeStore } from '../store/useIncomeStore';
import { useExpenseStore } from '../store/useExpenseStore';

export function DashboardPage() {
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const incomes = useIncomeStore((s) => s.incomes);
  const incomeLoading = useIncomeStore((s) => s.loading);
  const expenseLoading = useExpenseStore((s) => s.loading);
  const isLoading = incomeLoading || expenseLoading;

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
              <TrendingUp size={36} className="text-accent" />
            </div>
            <h2 className="text-ink font-bold text-lg mb-2">Добро пожаловать!</h2>
            <p className="text-muted text-sm max-w-xs">
              Добавьте первый доход, чтобы начать планирование бюджета по формуле 50/30/20
            </p>
          </div>
        ) : (
          <>
            <BalanceWidget />
            <OverBudgetAlert />
            <SetupChecklist />
            <CategoryCards />
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
