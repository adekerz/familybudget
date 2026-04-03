import { useEffect, useState } from 'react';
import { Plus, CalendarBlank, PiggyBank, Clock } from '@phosphor-icons/react';
import { Header } from '../components/layout/Header';
import { SafeToSpendWidget } from '../components/budget/SafeToSpendWidget';
import { PaceIndicator } from '../components/budget/PaceIndicator';
import { PlannedTransactionsList } from '../components/budget/PlannedTransactionsList';
import { SinkingFundCard } from '../components/budget/SinkingFundCard';
import { CreatePayPeriodModal } from '../components/budget/CreatePayPeriodModal';
import { AddPlannedTransactionModal } from '../components/budget/AddPlannedTransactionModal';
import { AddSinkingFundModal } from '../components/budget/AddSinkingFundModal';
import { usePayPeriodStore } from '../store/usePayPeriodStore';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';
import type { PayPeriod } from '../types';

function mapPeriodLocal(r: Record<string, unknown>): PayPeriod {
  return {
    id: r.id as string,
    spaceId: r.space_id as string,
    startDate: r.start_date as string,
    endDate: r.end_date as string,
    salaryAmount: r.salary_amount as number,
    status: r.status as PayPeriod['status'],
    notes: r.notes as string | undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export function BudgetPage() {
  const { activePeriod, summary, isLoading, fetchActivePeriod } = usePayPeriodStore();
  const [showCreate, setShowCreate] = useState(false);
  const [showAddTx, setShowAddTx] = useState(false);
  const [showAddFund, setShowAddFund] = useState(false);
  const [history, setHistory] = useState<PayPeriod[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const loadHistory = async () => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return;
    const { data } = await supabase
      .from('pay_periods')
      .select('*')
      .eq('space_id', spaceId)
      .eq('status', 'closed')
      .order('start_date', { ascending: false })
      .limit(6);
    if (data) setHistory((data as Record<string, unknown>[]).map(mapPeriodLocal));
  };

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

        <div>
          <button
            onClick={() => { setShowHistory(v => !v); if (!showHistory) loadHistory(); }}
            className="w-full py-3 border border-border rounded-2xl text-sm text-muted font-medium flex items-center justify-center gap-2"
          >
            <Clock size={14} />
            {showHistory ? 'Скрыть историю' : 'История периодов'}
          </button>

          {showHistory && history.length === 0 && (
            <p className="text-center text-muted text-sm py-4">Закрытых периодов нет</p>
          )}

          {showHistory && history.map(p => {
            const fmt = (n: number) => new Intl.NumberFormat('ru-KZ', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(n);
            return (
              <div key={p.id} className="mt-2 rounded-2xl border border-border bg-surface p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-semibold text-ink">
                      {p.startDate} — {p.endDate}
                    </div>
                    <div className="text-xs text-muted mt-0.5">ЗП: {fmt(p.salaryAmount)}</div>
                  </div>
                  <span className="text-xs bg-surface-alt text-muted px-2 py-1 rounded-full">
                    Закрыт
                  </span>
                </div>
              </div>
            );
          })}
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
