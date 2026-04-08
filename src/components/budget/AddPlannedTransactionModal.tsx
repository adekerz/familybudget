import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePayPeriodStore } from '../../store/usePayPeriodStore';
import { useCategoryStore } from '../../store/useCategoryStore';
import BottomSheet from '../ui/BottomSheet';

interface Props { onClose: () => void; }

export function AddPlannedTransactionModal({ onClose }: Props) {
  const { t } = useTranslation();
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
    if (!title.trim()) { setError(t('specify_title')); return; }
    const amt = parseInt(amount);
    if (!amt || amt <= 0) { setError(t('specify_amount')); return; }

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
    else setError(res.error ?? t('error'));
  };

  const expenseCategories = categories.filter(c => c.type !== 'transfer');

  return (
    <BottomSheet isOpen={true} onClose={onClose} title={t('add_to_plan')} showDragHandle={false}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex rounded-xl overflow-hidden border border-border">
          {(['expense', 'income'] as const).map(typeVal => (
            <button key={typeVal} type="button" onClick={() => setType(typeVal)}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                type === typeVal ? 'bg-accent text-white' : 'text-muted'
              }`}>
              {typeVal === 'expense' ? t('expense') : t('income')}
            </button>
          ))}
        </div>

        <div>
          <label className="text-xs text-muted font-medium">{t('source_name')}</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Аренда, продукты, зарплата..."
            className="mt-1 w-full border border-border rounded-xl px-3 py-2.5 bg-card text-sm outline-none focus:border-accent" />
        </div>

        <div>
          <label className="text-xs text-muted font-medium">{t('amount_currency_label')}</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="0"
            className="mt-1 w-full border border-border rounded-xl px-3 py-2.5 bg-card text-sm outline-none focus:border-accent" />
        </div>

        <div>
          <label className="text-xs text-muted font-medium">{t('date_label')}</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="mt-1 w-full border border-border rounded-xl px-3 py-2.5 bg-card text-sm outline-none focus:border-accent" />
        </div>

        {type === 'expense' && expenseCategories.length > 0 && (
          <div>
            <label className="text-xs text-muted font-medium">{t('category')}</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
              className="mt-1 w-full border border-border rounded-xl px-3 py-2.5 bg-card text-sm outline-none focus:border-accent">
              <option value="">{t('no_category')}</option>
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
            {t('fixed_type')}
          </label>
          <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)}
              className="w-4 h-4 accent-accent rounded" />
            {t('recurring_type')}
          </label>
        </div>

        {error && <p className="text-red-500 text-xs">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full py-3 bg-accent text-white rounded-2xl font-semibold text-sm disabled:opacity-50">
          {loading ? t('adding') : t('add_label')}
        </button>
      </form>
    </BottomSheet>
  );
}
