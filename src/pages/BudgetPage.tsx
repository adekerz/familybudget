import { useEffect, useState } from 'react';
import { Plus, CalendarBlank, PiggyBank, Clock, FilePdf } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useExpenseStore } from '../store/useExpenseStore';
import { useCategoryStore } from '../store/useCategoryStore';
import { Header } from '../components/layout/Header';
import { useEngine } from '../store/useFinanceEngine';
import { formatTenge } from '../lib/calculations';
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
import { usePullToRefresh } from '../hooks/usePullToRefresh';

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
  const { t } = useTranslation();
  const engine = useEngine();
  const { activePeriod, summary, isLoading, fetchActivePeriod } = usePayPeriodStore();
  const expenses = useExpenseStore(s => s.expenses);
  const getCategory = useCategoryStore(s => s.getCategory);
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

  usePullToRefresh();
  useEffect(() => { fetchActivePeriod(); }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 px-4 pt-4 pb-28 space-y-4">
          <div className="h-32 bg-sand rounded-2xl animate-pulse" />
          <div className="h-24 bg-sand rounded-2xl animate-pulse" />
          <div className="h-40 bg-sand rounded-2xl animate-pulse" />
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

  async function handleExportPDF() {
    if (!summary) return;
    const periodExpenses = expenses.filter(e =>
      e.date >= summary.period.startDate && e.date <= summary.period.endDate
    );
    const { generatePeriodPDF } = await import('../lib/pdfExport');
    generatePeriodPDF(summary, periodExpenses, (id) => getCategory(id)?.name ?? 'Прочее');
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-4">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-ink">Планирование</h1>
            <p className="text-[11px] text-muted">
              {summary.period.startDate} — {summary.period.endDate}
            </p>
          </div>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-ink border border-border rounded-xl px-3 py-2 transition-colors"
          >
            <FilePdf size={14} />
            PDF
          </button>
        </div>

        {/* Компактная строка баланса из единого движка — та же цифра что на главной */}
        {engine && (
          <div className={`rounded-2xl p-4 border flex items-center justify-between ${
            engine.isOverBudget ? 'bg-red-50 border-red-200' :
            engine.paceStatus === 'danger' ? 'bg-orange-50 border-orange-200' :
            'bg-green-50 border-green-200'
          }`}>
            <div>
              <p className="text-xs text-muted font-medium">{t('safe_to_spend')}</p>
              <p className={`text-2xl font-bold ${engine.isOverBudget ? 'text-red-600' : 'text-green-700'}`}>
                {formatTenge(engine.safeToSpend)}
              </p>
              <p className="text-xs text-muted mt-0.5">
                {t('daily_limit')}: {formatTenge(engine.dailyLimit)} · {engine.daysRemaining} дн.
              </p>
            </div>
            <div className={`text-sm font-bold px-3 py-2 rounded-xl text-center ${
              engine.paceStatus === 'on_track' ? 'bg-green-100 text-green-700' :
              engine.paceStatus === 'warning' ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
              {t(`pace_${engine.paceStatus}`)}
            </div>
          </div>
        )}

        {/* Предупреждение если период в будущем */}
        {new Date(summary.period.startDate) > new Date() && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-amber-700">
                Период создан неверно
              </p>
              <p className="text-[11px] text-amber-600 mt-0.5">
                Дата начала в будущем. Создай период с сегодняшней датой.
              </p>
            </div>
            <button
              onClick={() => {
                usePayPeriodStore.getState().closePeriod(summary.period.id);
                setShowCreate(true);
              }}
              className="shrink-0 text-xs font-semibold text-white bg-amber-500 px-3 py-2 rounded-xl"
            >
              Пересоздать
            </button>
          </div>
        )}

        <PaceIndicator pace={summary.pace} />

        {upcoming.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
              Ближайшие 7 дней
            </h3>
            <PlannedTransactionsList transactions={upcoming} />
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-4">
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
            const fmtDate = (s: string) => new Date(s).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
            const fmtMoney = (n: number) => new Intl.NumberFormat('ru-KZ', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(n);
            const days = Math.ceil(
              (new Date(p.endDate).getTime() - new Date(p.startDate).getTime()) / 86400000
            );
            return (
              <div key={p.id} className="mt-2 rounded-2xl border border-border bg-card p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-sm font-semibold text-ink">
                      {fmtDate(p.startDate)} — {fmtDate(p.endDate)}
                    </div>
                    <div className="text-xs text-muted mt-0.5">{days} дней</div>
                  </div>
                  <span className="text-xs bg-sand text-muted px-2 py-1 rounded-full">
                    Закрыт
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <div>
                    <div className="text-xs text-muted">ЗП</div>
                    <div className="font-semibold text-ink">{fmtMoney(p.salaryAmount)}</div>
                  </div>
                  {p.notes && (
                    <div className="text-xs text-muted italic max-w-[160px] text-right truncate">
                      {p.notes}
                    </div>
                  )}
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
