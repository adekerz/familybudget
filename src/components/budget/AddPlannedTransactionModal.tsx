import { useState } from 'react';
import { X } from '@phosphor-icons/react';
import { usePayPeriodStore } from '../../store/usePayPeriodStore';
import { useCategoryStore } from '../../store/useCategoryStore';

interface Props { onClose: () => void; }

export function AddPlannedTransactionModal({ onClose }: Props) {
  const [title, setTitle]             = useState('');
  const [amount, setAmount]           = useState('');
  const [type, setType]               = useState<'income' | 'expense'>('expense');
  const [date, setDate]               = useState(new Date().toISOString().split('T')[0]);
  const [isFixed, setIsFixed]         = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [categoryId, setCategoryId]   = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  const addPlannedTransaction = usePayPeriodStore(s => s.addPlannedTransaction);
  const categories = useCategoryStore(s => s.categories);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) { setError('Укажи название'); return; }
    const amt = parseInt(amount);
    if (!amt || amt <= 0) { setError('Укажи сумму'); return; }

    setLoading(true);
    const res = await addPlannedTransaction({
      title: title.trim(),
      amount: amt,
      type,
      scheduledDate: date,
      isFixed,
      isRecurring,
      categoryId: categoryId || undefined,
    });
    setLoading(false);
    if (res.ok) onClose();
    else setError(res.error ?? 'Ошибка');
  };

  const expenseCategories = categories.filter(c => c.type !== 'transfer');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4 pb-safe">
      <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 space-y-4 shadow-2xl animate-modal-in">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Добавить в план</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-alice">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex rounded-xl overflow-hidden border border-border">
            {(['expense', 'income'] as const).map(t => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  type === t ? 'bg-accent text-white' : 'text-muted'
                }`}>
                {t === 'expense' ? 'Расход' : 'Доход'}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs text-muted font-medium">Название</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Аренда, продукты, зарплата..."
              className="mt-1 w-full border border-border rounded-xl px-3 py-2.5 bg-card text-sm outline-none focus:border-accent" />
          </div>

          <div>
            <label className="text-xs text-muted font-medium">Сумма (₸)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0"
              className="mt-1 w-full border border-border rounded-xl px-3 py-2.5 bg-card text-sm outline-none focus:border-accent" />
          </div>

          <div>
            <label className="text-xs text-muted font-medium">Планируемая дата</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="mt-1 w-full border border-border rounded-xl px-3 py-2.5 bg-card text-sm outline-none focus:border-accent" />
          </div>

          {type === 'expense' && expenseCategories.length > 0 && (
            <div>
              <label className="text-xs text-muted font-medium">Категория (необязательно)</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
                className="mt-1 w-full border border-border rounded-xl px-3 py-2.5 bg-card text-sm outline-none focus:border-accent">
                <option value="">Без категории</option>
                {expenseCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
              <input type="checkbox" checked={isFixed} onChange={e => setIsFixed(e.target.checked)}
                className="w-4 h-4 accent-accent rounded" />
              Фиксированный
            </label>
            <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
              <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)}
                className="w-4 h-4 accent-accent rounded" />
              Повторяющийся
            </label>
          </div>

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-accent text-white rounded-2xl font-semibold text-sm disabled:opacity-50">
            {loading ? 'Добавляем...' : 'Добавить'}
          </button>
        </form>
      </div>
    </div>
  );
}
