import { useState, useEffect } from 'react';
import { Repeat, Plus, Trash } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useRecurringStore } from '../../store/useRecurringStore';
import { useCategoryStore } from '../../store/useCategoryStore';
import { formatMoney } from '../../lib/format';
import BottomSheet from '../ui/BottomSheet';
import { EmptyState } from '../ui/EmptyState';

type FreqKey = 'daily' | 'weekly' | 'monthly' | 'yearly';

export function RecurringSection() {
  const { t } = useTranslation();
  const { items, loading, load, add, remove } = useRecurringStore();
  const categories = useCategoryStore(s => s.categories);

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: '',
    amount: '',
    frequency: 'monthly' as FreqKey,
    dayOfMonth: '1',
    categoryId: '',
  });

  useEffect(() => { if (items.length === 0) load(); }, []);

  function handleAdd() {
    const amt = parseInt(form.amount.replace(/\D/g, ''), 10) || 0;
    if (!form.name.trim() || amt <= 0) return;
    add({
      name: form.name.trim(),
      amount: amt,
      frequency: form.frequency,
      dayOfMonth: parseInt(form.dayOfMonth) || 1,
      categoryId: form.categoryId,
      type: 'flexible',
      isActive: true,
    });
    setForm({ name: '', amount: '', frequency: 'monthly', dayOfMonth: '1', categoryId: '' });
    setShowAdd(false);
  }

  const freqLabels: Record<FreqKey, string> = {
    daily: t('freq_daily'),
    weekly: t('freq_weekly'),
    monthly: t('freq_monthly'),
    yearly: t('freq_yearly'),
  };

  return (
    <>
      <section className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Repeat size={16} className="text-accent" />
            <p className="font-semibold text-ink text-sm">{t('recurring_title')}</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="text-accent text-xs flex items-center gap-1 hover:text-accent/80 transition-colors"
          >
            <Plus size={14} />{t('add_label')}
          </button>
        </div>

        {loading ? (
          <div className="px-4 py-6 text-center">
            <p className="text-muted text-xs">{t('recurring_loading')}</p>
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Repeat}
            title={t('no_recurring')}
            hint={t('recurring_name_placeholder')}
            actionLabel={t('add_label')}
            onAction={() => setShowAdd(true)}
          />
        ) : (
          <div className="divide-y divide-border">
            {items.map((item) => {
              const cat = categories.find(c => c.id === item.categoryId);
              return (
                <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{item.name}</p>
                    <p className="text-[10px] text-muted">
                      {freqLabels[(item.frequency ?? 'monthly') as FreqKey]}
                      {item.frequency === 'monthly' && ` · ${item.dayOfMonth}${t('day_suffix')}`}
                      {cat && ` · ${cat.name}`}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-ink">{formatMoney(item.amount)}</p>
                  <button
                    onClick={() => remove(item.id)}
                    className="text-muted hover:text-danger transition-colors p-1 shrink-0"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <BottomSheet isOpen={showAdd} onClose={() => setShowAdd(false)} title={t('recurring_title')}>
        <div>
          <label className="block text-xs text-muted mb-1">{t('name_label')}</label>
          <input
            value={form.name}
            onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder={t('recurring_name_placeholder')}
            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">{t('amount_label')}</label>
          <input
            type="number"
            value={form.amount}
            onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
            placeholder={t('recurring_amount_placeholder')}
            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">{t('category_label') ?? 'Категория'}</label>
          <select
            value={form.categoryId}
            onChange={(e) => setForm(f => ({ ...f, categoryId: e.target.value }))}
            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-accent"
          >
            <option value="">{t('no_category')}</option>
            {categories.filter(c => c.type !== 'transfer').map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted mb-2">{t('category_placeholder')}</label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(freqLabels) as FreqKey[]).map((freq) => (
              <button
                key={freq}
                type="button"
                onClick={() => setForm(f => ({ ...f, frequency: freq }))}
                className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                  form.frequency === freq
                    ? 'bg-accent text-white'
                    : 'bg-alice border border-alice-dark text-ink hover:border-accent/40'
                }`}
              >
                {freqLabels[freq]}
              </button>
            ))}
          </div>
        </div>
        {form.frequency === 'monthly' && (
          <div>
            <label className="block text-xs text-muted mb-1">{t('day_of_month_placeholder')}</label>
            <input
              type="number"
              min="1"
              max="31"
              value={form.dayOfMonth}
              onChange={(e) => setForm(f => ({ ...f, dayOfMonth: e.target.value }))}
              className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-accent"
            />
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => setShowAdd(false)}
            className="flex-1 py-3 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--sand)', color: 'var(--text2)' }}
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleAdd}
            className="flex-1 py-3 rounded-xl text-sm font-bold"
            style={{ background: 'var(--cer)', color: '#fff' }}
          >
            {t('save')}
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
