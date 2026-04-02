import { Plus } from '@phosphor-icons/react';
import { useState } from 'react';
import { usePayPeriodStore } from '../../store/usePayPeriodStore';
import type { SinkingFund } from '../../types';

const fmt = (n: number) =>
  new Intl.NumberFormat('ru-KZ', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(n);

export function SinkingFundCard({ fund }: { fund: SinkingFund }) {
  const [adding, setAdding] = useState(false);
  const [amount, setAmount] = useState('');
  const addContribution = usePayPeriodStore(s => s.addSinkingContribution);
  const isComplete = (fund.progressPercent ?? 0) >= 100;

  const handleAdd = async () => {
    const v = parseInt(amount);
    if (!v || v <= 0) return;
    await addContribution(fund.id, v);
    setAmount('');
    setAdding(false);
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-semibold text-ink text-sm">{fund.name}</div>
          <div className="text-xs text-muted">{fund.targetDate} · взнос {fmt(fund.monthlyContribution ?? 0)}/мес</div>
        </div>
        {!isComplete && (
          <button onClick={() => setAdding(v => !v)} className="p-1.5 rounded-full bg-accent/10 text-accent">
            <Plus size={14} weight="bold" />
          </button>
        )}
      </div>
      <div className="h-2 rounded-full bg-surface-alt overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all ${isComplete ? 'bg-green-500' : 'bg-accent'}`}
          style={{ width: `${fund.progressPercent ?? 0}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted">
        <span>{fmt(fund.currentSaved)}</span>
        <span>{fund.progressPercent ?? 0}% · осталось {fmt(Math.max(0, fund.targetAmount - fund.currentSaved))}</span>
      </div>
      {adding && (
        <div className="mt-3 flex gap-2">
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="Сумма ₸"
            autoFocus
            className="flex-1 text-sm border border-border rounded-xl px-3 py-2 bg-surface outline-none focus:border-accent"
          />
          <button onClick={handleAdd} className="px-4 py-2 bg-accent text-white text-sm rounded-xl font-medium">
            OK
          </button>
        </div>
      )}
    </div>
  );
}
