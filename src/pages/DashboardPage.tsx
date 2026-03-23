import { useState } from 'react';
import { PlusCircle, TrendingUp } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { BalanceWidget } from '../components/dashboard/BalanceWidget';
import { CategoryCards } from '../components/dashboard/CategoryCards';
import { QuickExpenseBar } from '../components/dashboard/QuickExpenseBar';
import { RecentExpenses } from '../components/dashboard/RecentExpenses';
import { IncomeTimeline } from '../components/dashboard/IncomeTimeline';
import { OverBudgetAlert } from '../components/dashboard/OverBudgetAlert';
import { ExpenseForm } from '../components/expenses/ExpenseForm';
import { useIncomeStore } from '../store/useIncomeStore';

export function DashboardPage() {
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const incomes = useIncomeStore((s) => s.incomes);

  return (
    <div className="flex flex-col min-h-screen bg-primary">
      <Header />
      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-4">
        {incomes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 bg-accent/10 border border-accent/20 rounded-3xl flex items-center justify-center mb-5">
              <TrendingUp size={36} className="text-accent" />
            </div>
            <h2 className="text-white font-bold text-lg mb-2">Добро пожаловать!</h2>
            <p className="text-muted text-sm max-w-xs">
              Добавьте первый доход, чтобы начать планирование бюджета по формуле 50/30/20
            </p>
          </div>
        ) : (
          <>
            <BalanceWidget />
            <OverBudgetAlert />
            <CategoryCards />
          </>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider">
              Быстрый расход
            </p>
            <button
              onClick={() => setShowExpenseForm(true)}
              className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
            >
              <PlusCircle size={14} />
              Подробно
            </button>
          </div>
          <QuickExpenseBar />
        </div>

        <RecentExpenses />
        <IncomeTimeline />
      </main>

      {showExpenseForm && (
        <ExpenseForm onClose={() => setShowExpenseForm(false)} />
      )}
    </div>
  );
}
