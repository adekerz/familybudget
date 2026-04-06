import { useState } from 'react';
import { Plus, Pencil, Check, X } from '@phosphor-icons/react';
import { useAccountStore } from '../../store/useAccountStore';
import { formatMoney } from '../../lib/format';

export function SettingsAccountsSection() {
  const { accounts, addAccount, updateAccount } = useAccountStore();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBalance, setNewBalance] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editBalance, setEditBalance] = useState('');

  const active = accounts.filter((a) => a.isActive);

  async function handleAdd() {
    if (!newName.trim()) return;
    await addAccount({ name: newName.trim(), balance: parseFloat(newBalance) || 0 });
    setNewName('');
    setNewBalance('');
    setShowAdd(false);
  }

  async function handleEditBalance() {
    if (!editId) return;
    const val = parseFloat(editBalance);
    if (!isNaN(val)) {
      await updateAccount(editId, { balance: val });
    }
    setEditId(null);
  }

  const totalBalance = active.reduce((s, a) => s + a.balance, 0);

  return (
    <section className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div>
          <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>Счета</p>
          <p className="text-xs" style={{ color: 'var(--text3)' }}>
            Итого: <span className="font-bold" style={{ color: 'var(--cer)' }}>{formatMoney(totalBalance)}</span>
          </p>
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
          style={{ background: 'var(--cer-light)', color: 'var(--cer)' }}
        >
          <Plus size={12} weight="bold" />
          Добавить
        </button>
      </div>

      {showAdd && (
        <div className="px-4 py-3 space-y-2 border-b" style={{ borderColor: 'var(--border)' }}>
          <input
            placeholder="Название счёта (напр. Kaspi Gold)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: 'var(--sand)', color: 'var(--ink)' }}
          />
          <input
            type="number"
            placeholder="Начальный баланс ₸"
            value={newBalance}
            onChange={(e) => setNewBalance(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: 'var(--sand)', color: 'var(--ink)' }}
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowAdd(false)}
              className="flex-1 py-2 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--sand)', color: 'var(--text2)' }}
            >
              Отмена
            </button>
            <button
              onClick={handleAdd}
              className="flex-1 py-2 rounded-xl text-sm font-bold"
              style={{ background: 'var(--cer)', color: '#fff' }}
            >
              Добавить
            </button>
          </div>
        </div>
      )}

      <div className="divide-y" style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
        {active.length === 0 && (
          <p className="px-4 py-4 text-sm" style={{ color: 'var(--text3)' }}>Нет счетов</p>
        )}
        {active.map((acc) => (
          <div key={acc.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>{acc.name}</p>
              <p className="text-xs" style={{ color: 'var(--text3)' }}>{acc.currency}</p>
            </div>

            {editId === acc.id ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={editBalance}
                  onChange={(e) => setEditBalance(e.target.value)}
                  className="w-28 px-2 py-1 rounded-lg text-sm outline-none text-right"
                  style={{ background: 'var(--sand)', color: 'var(--ink)' }}
                  autoFocus
                />
                <button onClick={handleEditBalance} className="p-1.5 rounded-lg" style={{ color: 'var(--income)' }}>
                  <Check size={14} weight="bold" />
                </button>
                <button onClick={() => setEditId(null)} className="p-1.5 rounded-lg" style={{ color: 'var(--text3)' }}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-bold tabular-nums"
                  style={{ color: acc.balance >= 0 ? 'var(--income)' : 'var(--expense)' }}
                >
                  {formatMoney(acc.balance)}
                </span>
                <button
                  onClick={() => { setEditId(acc.id); setEditBalance(String(acc.balance)); }}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--text3)' }}
                >
                  <Pencil size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
