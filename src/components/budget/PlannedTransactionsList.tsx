import { Check, Lock } from '@phosphor-icons/react';
import { usePayPeriodStore } from '../../store/usePayPeriodStore';
import type { PlannedTransaction } from '../../types';

const fmt = (n: number) =>
  new Intl.NumberFormat('ru-KZ', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(n);

function TxItem({ tx }: { tx: PlannedTransaction }) {
  const mark = usePayPeriodStore(s => s.markTransactionStatus);
  const isIncome = tx.type === 'income';

  return (
    <div className={`flex items-center gap-3 py-2.5 ${tx.status === 'paid' ? 'opacity-50' : ''}`}>
      <button
        onClick={() => mark(tx.id, tx.status === 'paid' ? 'pending' : 'paid')}
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          tx.status === 'paid' ? 'bg-green-500 border-green-500' : 'border-border'
        }`}
      >
        {tx.status === 'paid' && <Check size={12} weight="bold" color="white" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-ink truncate">{tx.title}</span>
          {tx.isFixed && <Lock size={11} className="text-muted flex-shrink-0" />}
        </div>
        <div className="text-xs text-muted">{tx.scheduledDate}</div>
      </div>
      <span className={`text-sm font-semibold ${isIncome ? 'text-green-600' : 'text-ink'}`}>
        {isIncome ? '+' : '−'}{fmt(tx.amount)}
      </span>
    </div>
  );
}

export function PlannedTransactionsList({ transactions }: { transactions: PlannedTransaction[] }) {
  const incomes  = transactions.filter(t => t.type === 'income');
  const expenses = transactions.filter(t => t.type === 'expense');

  if (transactions.length === 0) {
    return <p className="text-muted text-sm text-center py-4">Нет запланированных операций</p>;
  }

  return (
    <div className="space-y-4">
      {incomes.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Доходы</h4>
          <div className="divide-y divide-border">
            {incomes.map(tx => <TxItem key={tx.id} tx={tx} />)}
          </div>
        </div>
      )}
      {expenses.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Расходы</h4>
          <div className="divide-y divide-border">
            {expenses.map(tx => <TxItem key={tx.id} tx={tx} />)}
          </div>
        </div>
      )}
    </div>
  );
}
