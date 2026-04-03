import { useState, useEffect } from 'react';
import { Lock, Plus, Trash } from '@phosphor-icons/react';
import { usePlannedFixedStore } from '../../store/usePlannedFixedStore';
import { useCategoryStore } from '../../store/useCategoryStore';
import { formatMoney } from '../../lib/format';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

export function SettingsFixedExpensesSection() {
  const { items, loading, load, add, remove, toggle } = usePlannedFixedStore();
  const categories = useCategoryStore(s => s.categories);

  const [showAdd, setShowAdd]       = useState(false);
  const [title, setTitle]           = useState('');
  const [amount, setAmount]         = useState('');
  const [categoryId, setCategoryId] = useState('');

  useEffect(() => { load(); }, []);

  function handleAdd() {
    const amt = parseInt(amount.replace(/\D/g, ''), 10) || 0;
    if (!title.trim() || amt <= 0) return;
    add({ title: title.trim(), amount: amt, categoryId: categoryId || undefined });
    setTitle(''); setAmount(''); setCategoryId('');
    setShowAdd(false);
  }

  const expenseCategories = categories.filter(c => c.type !== 'transfer');
  const activeTotal = items
    .filter(x => x.isActive)
    .reduce((s, x) => s + x.amount, 0);

  return (
    <>
      <section className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-accent" />
            <p className="font-semibold text-ink text-sm">Фиксированные расходы</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="text-accent text-xs flex items-center gap-1 hover:text-accent/80 transition-colors"
          >
            <Plus size={14} />Добавить
          </button>
        </div>

        {loading ? (
          <div className="px-4 py-6 text-center">
            <p className="text-muted text-xs">Загрузка...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-muted text-xs">Нет фиксированных расходов</p>
            <p className="text-muted text-[10px] mt-1">
              Аренда, коммуналка, интернет — вычитаются из бюджета каждого периода
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium text-ink ${!item.isActive ? 'line-through opacity-50' : ''}`}>
                    {item.title}
                  </p>
                  {item.categoryId && (
                    <p className="text-[10px] text-muted">
                      {categories.find(c => c.id === item.categoryId)?.name ?? ''}
                    </p>
                  )}
                </div>
                <p className={`text-sm font-bold text-ink ${!item.isActive ? 'opacity-50' : ''}`}>
                  {formatMoney(item.amount)}
                </p>
                {/* Toggle */}
                <button
                  onClick={() => toggle(item.id)}
                  className={`w-8 h-5 rounded-full transition-colors shrink-0 ${
                    item.isActive ? 'bg-accent' : 'bg-border'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform mx-0.5 ${
                    item.isActive ? 'translate-x-3' : 'translate-x-0'
                  }`} />
                </button>
                {/* Удалить */}
                <button
                  onClick={() => remove(item.id)}
                  className="text-muted hover:text-danger transition-colors p-1 shrink-0"
                >
                  <Trash size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="px-4 py-2 border-t border-border flex justify-between items-center">
          <p className="text-[10px] text-muted">
            Резервируются при создании каждого нового периода
          </p>
          {activeTotal > 0 && (
            <p className="text-[10px] font-semibold text-ink">
              {formatMoney(activeTotal)}/мес
            </p>
          )}
        </div>
      </section>

      <Modal
        isOpen={showAdd}
        onClose={() => { setShowAdd(false); setTitle(''); setAmount(''); setCategoryId(''); }}
        title="Фиксированный расход"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-muted mb-1">Название</label>
            <input
              type="text" value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Аренда квартиры"
              className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink font-semibold focus:outline-none focus:border-accent placeholder:text-muted"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Сумма</label>
            <div className="relative">
              <input
                type="text" inputMode="numeric" value={amount}
                onChange={(e) => {
                  const d = e.target.value.replace(/\D/g, '');
                  setAmount(d ? parseInt(d, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '');
                }}
                placeholder="0"
                className="w-full bg-card border border-border rounded-xl px-4 py-3 pr-10 text-ink font-bold text-lg focus:outline-none focus:border-accent placeholder:text-muted"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted">₸</span>
            </div>
          </div>
          {expenseCategories.length > 0 && (
            <div>
              <label className="block text-xs text-muted mb-1">Категория (необязательно)</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-accent"
              >
                <option value="">Без категории</option>
                {expenseCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setShowAdd(false)} className="flex-1">
              Отмена
            </Button>
            <Button onClick={handleAdd} className="flex-1">
              Добавить
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
