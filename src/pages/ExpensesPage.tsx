import { useState } from 'react';
import { Trash2, Search, Filter, Plus } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { useExpenseStore } from '../store/useExpenseStore';
import { useCategoryStore } from '../store/useCategoryStore';
import { formatMoney, formatDate } from '../lib/format';
import { ExpenseForm } from '../components/expenses/ExpenseForm';
import type { ExpenseType } from '../types';

const TYPE_LABELS: Record<ExpenseType, string> = {
  mandatory: 'Обязательные',
  flexible: 'Гибкие',
  savings: 'Накопления',
};

const TYPE_COLORS: Record<ExpenseType, string> = {
  mandatory: '#4A90D9',
  flexible: '#2EA043',
  savings: '#E3B341',
};

export function ExpensesPage() {
  const expenses = useExpenseStore((s) => s.expenses);
  const removeExpense = useExpenseStore((s) => s.removeExpense);
  const getCategory = useCategoryStore((s) => s.getCategory);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<ExpenseType | 'all'>('all');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const filtered = [...expenses]
    .filter((e) => {
      const cat = getCategory(e.categoryId);
      const text = (cat?.name ?? '') + ' ' + (e.description ?? '');
      const matchSearch = text.toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === 'all' || e.type === filterType;
      return matchSearch && matchType;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Group by day
  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, exp) => {
    const key = formatDate(exp.date);
    if (!acc[key]) acc[key] = [];
    acc[key].push(exp);
    return acc;
  }, {});

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="flex flex-col min-h-screen bg-primary">
      <Header />
      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-4">
        <div className="flex items-center justify-between mb-0">
          <h2 className="text-base font-semibold text-white">Расходы</h2>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-accent text-primary text-sm font-semibold px-3.5 py-2 rounded-xl transition-all active:scale-95"
          >
            <Plus size={16} />
            Добавить
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск..."
            className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {(['all', 'mandatory', 'flexible', 'savings'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterType === t
                  ? 'bg-accent text-primary'
                  : 'bg-card border border-border text-muted hover:text-white'
              }`}
            >
              {t === 'all' ? 'Все' : TYPE_LABELS[t]}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1 shrink-0">
            <Filter size={12} className="text-muted" />
            <span className="text-xs text-muted font-mono">{formatMoney(total)}</span>
          </div>
        </div>

        {/* List */}
        {Object.keys(grouped).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
            <p className="text-muted text-sm">Расходов нет</p>
            <p className="text-muted/50 text-xs">Добавляйте через главную страницу</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([day, items]) => (
              <div key={day}>
                <p className="text-xs font-semibold text-muted uppercase mb-2">{day}</p>
                <div className="space-y-1.5">
                  {items.map((exp) => {
                    const cat = getCategory(exp.categoryId);
                    return (
                      <div
                        key={exp.id}
                        className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-3"
                      >
                        <span className="text-xl w-8 text-center">{cat?.icon ?? '💸'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {cat?.name ?? 'Прочее'}
                          </p>
                          {exp.description && (
                            <p className="text-xs text-muted/70 truncate">{exp.description}</p>
                          )}
                          <span
                            className="text-[10px] font-medium"
                            style={{ color: TYPE_COLORS[exp.type] }}
                          >
                            {TYPE_LABELS[exp.type]}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold font-mono text-white">
                            -{formatMoney(exp.amount)}
                          </p>
                          {confirmId === exp.id ? (
                            <div className="flex gap-1.5 mt-1 justify-end">
                              <button
                                onClick={() => { removeExpense(exp.id); setConfirmId(null); }}
                                className="text-[10px] text-danger"
                              >
                                Да
                              </button>
                              <button
                                onClick={() => setConfirmId(null)}
                                className="text-[10px] text-muted"
                              >
                                Нет
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmId(exp.id)}
                              className="text-muted/40 hover:text-danger mt-1 block ml-auto"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showForm && <ExpenseForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
