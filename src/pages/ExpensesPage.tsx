import { useState } from 'react';
import { Trash, MagnifyingGlass, Funnel, Plus, PencilSimple } from '@phosphor-icons/react';
import { Header } from '../components/layout/Header';
import { useExpenseStore } from '../store/useExpenseStore';
import { useCategoryStore } from '../store/useCategoryStore';
import { formatMoney } from '../lib/format';
import { ExpenseForm } from '../components/expenses/ExpenseForm';
import { Icon } from '../lib/icons';
import { useUndoStore } from '../store/useUndoStore';
import type { Expense, ExpenseType } from '../types';

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Сегодня';
  if (d.toDateString() === yesterday.toDateString()) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' });
}

const TYPE_LABELS: Record<ExpenseType, string> = {
  mandatory: 'Обязательные',
  flexible: 'Гибкие',
  savings: 'Накопления',
};

const TYPE_COLORS: Record<ExpenseType, string> = {
  mandatory: '#2274A5',
  flexible: '#15664E',
  savings: '#7A5210',
};

export function ExpensesPage() {
  const expenses = useExpenseStore((s) => s.expenses);
  const removeExpense = useExpenseStore((s) => s.removeExpense);
  const getCategory = useCategoryStore((s) => s.getCategory);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<ExpenseType | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);

  function handleDeleteExpense(exp: Expense) {
    setHiddenIds(prev => [...prev, exp.id]);
    const cat = getCategory(exp.categoryId);
    useUndoStore.getState().show({
      message: `Расход «${cat?.name ?? 'Расход'}» удалён`,
      duration: 5000,
      onUndo: () => {
        setHiddenIds(prev => prev.filter(id => id !== exp.id));
      },
      onConfirm: () => {
        removeExpense(exp.id);
        setHiddenIds(prev => prev.filter(id => id !== exp.id));
      },
    });
  }

  const filtered = [...expenses]
    .filter((e) => {
      if (hiddenIds.includes(e.id)) return false;
      const cat = getCategory(e.categoryId);
      const text = (cat?.name ?? '') + ' ' + (e.description ?? '');
      const matchSearch = text.toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === 'all' || e.type === filterType;
      return matchSearch && matchType;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Group by day
  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, exp) => {
    const key = exp.date.slice(0, 10);
    if (!acc[key]) acc[key] = [];
    acc[key].push(exp);
    return acc;
  }, {});

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-4">
        <div className="flex items-center justify-between mb-0">
          <h2 className="text-base font-semibold text-ink">Расходы</h2>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-accent text-white text-sm font-semibold px-3.5 py-2 rounded-xl transition-all active:scale-95"
          >
            <Plus size={16} />
            Добавить
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <MagnifyingGlass size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск..."
            className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {(['all', 'mandatory', 'flexible', 'savings'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                filterType === t
                  ? 'bg-accent text-white border-accent'
                  : 'bg-alice border-alice-dark text-muted hover:text-ink'
              }`}
            >
              {t === 'all' ? 'Все' : TYPE_LABELS[t]}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1 shrink-0">
            <Funnel size={12} className="text-muted" />
            <span className="text-xs text-muted font-bold">{formatMoney(total)}</span>
          </div>
        </div>

        {/* List */}
        {Object.keys(grouped).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
            <p className="text-muted text-sm">Расходов нет</p>
            <p className="text-muted text-xs opacity-60">Добавляйте через главную страницу</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([day, items]) => {
              const dayTotal = items.reduce((s, e) => s + e.amount, 0);
              return (
              <div key={day}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    {getDayLabel(day)}
                  </p>
                  <p className="text-[10px] font-bold text-muted">
                    {formatMoney(dayTotal)}
                  </p>
                </div>
                <div className="space-y-1.5">
                  {items.map((exp) => {
                    const cat = getCategory(exp.categoryId);
                    return (
                      <div
                        key={exp.id}
                        className="bg-card border border-border rounded-xl p-3 flex items-center gap-3"
                      >
                        <div className="w-9 h-9 rounded-xl bg-alice flex items-center justify-center shrink-0">
                          <Icon name={cat?.icon ?? 'DollarSign'} size={16} className="text-muted" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink truncate">
                            {cat?.name ?? 'Прочее'}
                          </p>
                          {exp.description && (
                            <p className="text-xs text-muted truncate">{exp.description}</p>
                          )}
                          <span
                            className="text-[10px] font-medium"
                            style={{ color: TYPE_COLORS[exp.type] }}
                          >
                            {TYPE_LABELS[exp.type]}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <p className="text-sm font-bold text-danger">
                            -{formatMoney(exp.amount)}
                          </p>
                          <div className="flex gap-1">
                            <button
                              onClick={() => setEditingExpense(exp)}
                              className="w-8 h-8 flex items-center justify-center rounded-xl bg-alice border border-alice-dark text-muted hover:text-accent transition-all"
                            >
                              <PencilSimple size={12} strokeWidth={2} />
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(exp)}
                              className="w-11 h-11 flex items-center justify-center rounded-xl bg-danger-bg border border-danger/20 text-danger hover:bg-danger hover:text-white active:scale-95 transition-all"
                            >
                              <Trash size={16} strokeWidth={2} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );})}
          </div>
        )}
      </main>

      {showForm && <ExpenseForm onClose={() => setShowForm(false)} />}
      {editingExpense && (
        <ExpenseForm
          onClose={() => setEditingExpense(null)}
          initialData={editingExpense}
        />
      )}
    </div>
  );
}
