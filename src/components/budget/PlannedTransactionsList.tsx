import { useState } from 'react';
import { Check, Lock, Trash } from '@phosphor-icons/react';
import { usePayPeriodStore } from '../../store/usePayPeriodStore';
import type { PlannedTransaction } from '../../types';

const fmt = (n: number) =>
  new Intl.NumberFormat('ru-KZ', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(n);

function TxItem({ tx }: { tx: PlannedTransaction }) {
  const mark   = usePayPeriodStore(s => s.markTransactionStatus);
  const remove = usePayPeriodStore(s => s.removePlannedTransaction);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isIncome = tx.type === 'income';

  return (
    <div className={`py-3 transition-opacity ${tx.status === 'paid' ? 'opacity-50' : ''}`}>
      {/* Верхняя строка: чекбокс + название + сумма */}
      <div className="flex items-start gap-3">

        {/* Чекбокс оплаты */}
        <button
          onClick={() => mark(tx.id, tx.status === 'paid' ? 'pending' : 'paid')}
          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            tx.status === 'paid'
              ? 'bg-green-500 border-green-500'
              : 'border-border'
          }`}
        >
          {tx.status === 'paid' && <Check size={10} weight="bold" color="white" />}
        </button>

        {/* Название и дата */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-ink leading-tight">{tx.title}</span>
            {tx.isFixed && <Lock size={10} className="text-muted flex-shrink-0" />}
            {tx.isRecurring && (
              <span className="text-[9px] text-muted bg-alice px-1 rounded">повтор</span>
            )}
          </div>
          <div className="text-xs text-muted mt-0.5">{tx.scheduledDate}</div>
        </div>

        {/* Сумма */}
        <span className={`text-sm font-bold flex-shrink-0 ${
          isIncome ? 'text-green-600' : 'text-ink'
        }`}>
          {isIncome ? '+' : '−'}{fmt(tx.amount)}
        </span>
      </div>

      {/* Нижняя строка: кнопки действий */}
      <div className="flex items-center gap-2 mt-2 ml-8">
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1 text-xs text-muted
                       hover:text-red-500 transition-colors px-2 py-1
                       rounded-lg hover:bg-red-50"
          >
            <Trash size={13} />
            Удалить
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Удалить?</span>
            <button
              onClick={() => remove(tx.id)}
              className="px-3 py-1 text-xs bg-red-500 text-white
                         rounded-lg font-medium active:scale-95"
            >
              Да
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1 text-xs border border-border
                         rounded-lg text-muted"
            >
              Нет
            </button>
          </div>
        )}

        {/* Статус оплаты — подсказка */}
        {tx.status === 'paid' && (
          <span className="text-xs text-green-600 font-medium">✓ Оплачено</span>
        )}
        {tx.status === 'skipped' && (
          <span className="text-xs text-muted">Пропущено</span>
        )}
      </div>
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
