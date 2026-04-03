import { useEffect, useState } from 'react';
import { Plus, CalendarBlank, PiggyBank } from '@phosphor-icons/react';
import { Header } from '../components/layout/Header';
import { SafeToSpendWidget } from '../components/budget/SafeToSpendWidget';
import { PaceIndicator } from '../components/budget/PaceIndicator';
import { PlannedTransactionsList } from '../components/budget/PlannedTransactionsList';
import { SinkingFundCard } from '../components/budget/SinkingFundCard';
import { CreatePayPeriodModal } from '../components/budget/CreatePayPeriodModal';
import { AddPlannedTransactionModal } from '../components/budget/AddPlannedTransactionModal';
import { AddSinkingFundModal } from '../components/budget/AddSinkingFundModal';
import { usePayPeriodStore } from '../store/usePayPeriodStore';

export function BudgetPage() {
  const { activePeriod, summary, isLoading, fetchActivePeriod } = usePayPeriodStore();
  const [showCreate, setShowCreate] = useState(false);
  const [showAddTx, setShowAddTx] = useState(false);
  const [showAddFund, setShowAddFund] = useState(false);

  useEffect(() => { fetchActivePeriod(); }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 px-4 pt-4 pb-28 space-y-4">
          <div className="h-32 bg-surface-alt rounded-2xl animate-pulse" />
          <div className="h-24 bg-surface-alt rounded-2xl animate-pulse" />
          <div className="h-40 bg-surface-alt rounded-2xl animate-pulse" />
        </main>
      </div>
    );
  }

  if (!activePeriod || !summary) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center px-4 text-center gap-4">
          <div className="w-20 h-20 rounded-3xl bg-accent/10 flex items-center justify-center">
            <CalendarBlank size={40} className="text-accent" />
          </div>
          <h2 className="text-xl font-bold text-ink">Начни новый период</h2>
          <p className="text-muted text-sm max-w-xs">
            Укажи дату ЗП, следующую ЗП и сумму — система будет считать безопасный остаток в реальном времени
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-6 py-3 bg-accent text-white rounded-2xl font-semibold"
          >
            Создать период
          </button>
        </main>
        {showCreate && <CreatePayPeriodModal onClose={() => setShowCreate(false)} />}
      </div>
    );
  }

  const upcoming = summary.upcomingDays7;

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-4">

        <SafeToSpendWidget summary={summary} />
        <PaceIndicator pace={summary.pace} />

        {upcoming.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
              Ближайшие 7 дней
            </h3>
            <PlannedTransactionsList transactions={upcoming} />
          </div>
        )}

        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-ink">Планы периода</h3>
            <button
              onClick={() => setShowAddTx(true)}
              className="flex items-center gap-1 text-xs text-accent font-medium"
            >
              <Plus size={14} /> Добавить
            </button>
          </div>
          <PlannedTransactionsList transactions={summary.plannedTransactions} />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-ink mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <PiggyBank size={16} className="text-accent" /> Накопительные фонды
            </span>
            <button onClick={() => setShowAddFund(true)}
              className="flex items-center gap-1 text-xs text-accent font-medium">
              <Plus size={14} /> Добавить
            </button>
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {summary.sinkingFunds.map(f => <SinkingFundCard key={f.id} fund={f} />)}
          </div>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="w-full py-3 border border-border rounded-2xl text-sm text-muted font-medium"
        >
          Закрыть период и начать новый
        </button>
      </main>

      {showCreate && <CreatePayPeriodModal onClose={() => setShowCreate(false)} />}
      {showAddTx && <AddPlannedTransactionModal onClose={() => setShowAddTx(false)} />}
      {showAddFund && <AddSinkingFundModal onClose={() => setShowAddFund(false)} />}
    </div>
  );
}
