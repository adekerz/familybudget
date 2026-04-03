import { useState } from 'react';
import { Check, Lock, Trash } from '@phosphor-icons/react';
import { usePayPeriodStore } from '../../store/usePayPeriodStore';
import type { PlannedTransaction } from '../../types';

const fmt = (n: number) =>
  new Intl.NumberFormat('ru-KZ', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(n);

function TxItem({ tx }: { tx: PlannedTransaction }) {
  const mark = usePayPeriodStore(s => s.markTransactionStatus);
  const remove = usePayPeriodStore(s => s.removePlannedTransaction);
  const [confirmDelete, setConfirmDelete] = useState(false);
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

      <span className={`text-sm font-semibold flex-shrink-0 ${isIncome ? 'text-green-600' : 'text-ink'}`}>
        {isIncome ? '+' : '−'}{fmt(tx.amount)}
      </span>

      {!confirmDelete ? (
        <button onClick={() => setConfirmDelete(true)}
          className="p-1 rounded-lg hover:bg-red-50 text-muted hover:text-red-500 flex-shrink-0">
          <Trash size={14} />
        </button>
      ) : (
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => remove(tx.id)}
            className="px-2 py-1 text-xs bg-red-500 text-white rounded-lg">
            Да
          </button>
          <button onClick={() => setConfirmDelete(false)}
            className="px-2 py-1 text-xs border border-border rounded-lg text-muted">
            Нет
          </button>
        </div>
      )}
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
