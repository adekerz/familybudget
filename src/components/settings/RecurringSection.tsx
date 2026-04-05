import { useState, useEffect } from 'react';
import { Plus, Trash, ToggleLeft, ToggleRight } from '@phosphor-icons/react';
import { useRecurringStore } from '../../store/useRecurringStore';
import { useCategoryStore } from '../../store/useCategoryStore';
import type { RecurringExpense } from '../../types';
import { formatMoney } from '../../lib/format';

const FREQ_LABELS: Record<RecurringExpense['frequency'], string> = {
  daily: 'Каждый день',
  weekly: 'Каждую неделю',
  monthly: 'Каждый месяц',
  yearly: 'Каждый год',
};

export function RecurringSection() {
  const { items, loading, load, add, toggle, remove } = useRecurringStore();
  const categories = useCategoryStore((s) => s.categories);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    amount: '',
    categoryId: '',
    frequency: 'monthly' as RecurringExpense['frequency'],
    dayOfMonth: '1',
  });

  useEffect(() => { load(); }, []);

  async function handleAdd() {
    if (!form.name || !form.amount || !form.categoryId) return;
    const cat = categories.find((c) => c.id === form.categoryId);
    await add({
      name: form.name,
      amount: Number(form.amount),
      categoryId: form.categoryId,
      type: cat?.type ?? 'flexible',
      frequency: form.frequency,
      dayOfMonth: form.frequency === 'monthly' ? Number(form.dayOfMonth) : undefined,
      isActive: true,
    });
    setForm({ name: '', amount: '', categoryId: '', frequency: 'monthly', dayOfMonth: '1' });
    setShowForm(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold" style={{ color: 'var(--ink)' }}>Повторяющиеся платежи</h3>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: 'var(--cer-light)', color: 'var(--cer)' }}
        >
          <Plus size={14} weight="bold" />
          Добавить
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--card)' }}>
          <input
            placeholder="Название (напр. Абонемент в спортзал)"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--sand)', color: 'var(--ink)' }}
          />
          <input
            type="number"
            placeholder="Сумма ₸"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--sand)', color: 'var(--ink)' }}
          />
          <select
            value={form.categoryId}
            onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--sand)', color: 'var(--ink)' }}
          >
            <option value="">Категория…</option>
            {categories.filter((c) => c.type !== 'transfer').map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={form.frequency}
            onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value as RecurringExpense['frequency'] }))}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--sand)', color: 'var(--ink)' }}
          >
            {(Object.entries(FREQ_LABELS) as [RecurringExpense['frequency'], string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {form.frequency === 'monthly' && (
            <input
              type="number"
              placeholder="День месяца (1-31)"
              min={1}
              max={31}
              value={form.dayOfMonth}
              onChange={(e) => setForm((f) => ({ ...f, dayOfMonth: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--sand)', color: 'var(--ink)' }}
            />
          )}
          <div className="flex gap-3">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--sand)', color: 'var(--text2)' }}
            >
              Отмена
            </button>
            <button
              onClick={handleAdd}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: 'var(--cer)', color: '#fff' }}
            >
              Сохранить
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--text3)' }}>Загрузка…</p>
      ) : items.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text3)' }}>Нет повторяющихся платежей</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const cat = categories.find((c) => c.id === item.categoryId);
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: 'var(--card)' }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>{item.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text3)' }}>
                    {FREQ_LABELS[item.frequency]}
                    {item.frequency === 'monthly' && item.dayOfMonth && ` · ${item.dayOfMonth}-го`}
                    {cat && ` · ${cat.name}`}
                  </p>
                </div>
                <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: 'var(--ink)' }}>
                  {formatMoney(item.amount)}
                </span>
                <button
                  onClick={() => toggle(item.id, !item.isActive)}
                  className="shrink-0 p-1.5 rounded-lg transition-all"
                  style={{ color: item.isActive ? 'var(--cer)' : 'var(--text3)' }}
                >
                  {item.isActive ? <ToggleRight size={20} weight="fill" /> : <ToggleLeft size={20} />}
                </button>
                <button
                  onClick={() => remove(item.id)}
                  className="shrink-0 p-1.5 rounded-lg"
                  style={{ color: 'var(--text3)' }}
                >
                  <Trash size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
