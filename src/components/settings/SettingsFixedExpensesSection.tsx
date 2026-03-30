import { useState } from 'react';
import { Lock, Plus, Trash } from '@phosphor-icons/react';
import { useFixedExpenseStore } from '../../store/useFixedExpenseStore';
import { formatMoney } from '../../lib/format';
import { Icon, FIXED_ICON_NAMES } from '../../lib/icons';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

export function SettingsFixedExpensesSection() {
  const { fixedExpenses, addFixedExpense, removeFixedExpense, toggleFixedExpense } = useFixedExpenseStore();

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [icon, setIcon] = useState('Home');

  function handleAdd() {
    const amt = parseInt(amount.replace(/\D/g, ''), 10) || 0;
    if (!name.trim() || amt <= 0) return;
    addFixedExpense({ name: name.trim(), amount: amt, icon });
    setName(''); setAmount(''); setIcon('Home');
    setShowAdd(false);
  }

  return (
    <>
      <section className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-accent" />
            <p className="font-semibold text-ink text-sm">Фиксированные расходы</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="text-accent text-xs flex items-center gap-1 hover:text-accent/80 transition-colors">
            <Plus size={14} />Добавить
          </button>
        </div>

        {fixedExpenses.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-muted text-xs">Нет фиксированных расходов</p>
            <p className="text-muted text-[10px] mt-1">Аренда, коммуналка, интернет — вычитаются из дохода до распределения</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {fixedExpenses.map((fe) => (
              <div key={fe.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-7 h-7 rounded-[9px] bg-muted/10 flex items-center justify-center shrink-0">
                  <Icon name={fe.icon} size={14} strokeWidth={2} className="text-muted" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium text-ink ${!fe.isActive ? 'line-through opacity-50' : ''}`}>{fe.name}</p>
                </div>
                <p className={`text-sm font-bold text-ink ${!fe.isActive ? 'opacity-50' : ''}`}>{formatMoney(fe.amount)}</p>
                <button onClick={() => toggleFixedExpense(fe.id)} className={`w-8 h-5 rounded-full transition-colors shrink-0 ${fe.isActive ? 'bg-accent' : 'bg-border'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform mx-0.5 ${fe.isActive ? 'translate-x-3' : 'translate-x-0'}`} />
                </button>
                <button onClick={() => removeFixedExpense(fe.id)} className="text-muted hover:text-danger transition-colors p-1 shrink-0"><Trash size={14} /></button>
              </div>
            ))}
          </div>
        )}
        <div className="px-4 py-2 border-t border-border">
          <p className="text-[10px] text-muted text-center">Вычитаются из дохода до распределения 50/30/20</p>
        </div>
      </section>

      <Modal isOpen={showAdd} onClose={() => { setShowAdd(false); setName(''); setAmount(''); setIcon('Home'); }} title="Фиксированный расход">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-muted mb-1">Название</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Аренда квартиры" className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink font-semibold focus:outline-none focus:border-accent placeholder:text-muted" />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Сумма</label>
            <div className="relative">
              <input
                type="text" inputMode="numeric" value={amount}
                onChange={(e) => { const d = e.target.value.replace(/\D/g, ''); setAmount(d ? parseInt(d, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : ''); }}
                placeholder="0"
                className="w-full bg-card border border-border rounded-xl px-4 py-3 pr-10 text-ink font-bold text-lg focus:outline-none focus:border-accent placeholder:text-muted"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted">₸</span>
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Иконка</label>
            <div className="flex flex-wrap gap-2">
              {FIXED_ICON_NAMES.map((n) => (
                <button key={n} type="button" onClick={() => setIcon(n)} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${icon === n ? 'bg-accent text-white' : 'bg-card border border-border text-muted hover:border-accent/50'}`}>
                  <Icon name={n} size={16} strokeWidth={2} />
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setShowAdd(false)} className="flex-1">Отмена</Button>
            <Button onClick={handleAdd} className="flex-1">Добавить</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
