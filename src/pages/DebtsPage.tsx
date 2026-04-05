import { useState, useEffect } from 'react';
import { Plus, ArrowDown, ArrowUp, CheckCircle, Clock } from '@phosphor-icons/react';
import { Header } from '../components/layout/Header';
import { useDebtStore } from '../store/useDebtStore';
import type { Debt } from '../types';
import { formatMoney } from '../lib/format';

type Tab = 'active' | 'closed';

export function DebtsPage() {
  const { debts, payments, loading, loadDebts, addDebt, addPayment, closeDebt } = useDebtStore();
  const [tab, setTab] = useState<Tab>('active');
  const [showAddForm, setShowAddForm] = useState(false);
  const [payDebt, setPayDebt] = useState<Debt | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [form, setForm] = useState({
    personName: '',
    direction: 'i_owe' as Debt['direction'],
    totalAmount: '',
    note: '',
    dueDate: '',
  });

  useEffect(() => { loadDebts(); }, []);

  const filtered = debts.filter((d) => tab === 'active' ? d.isActive : !d.isActive);
  const totalIOwe = debts.filter((d) => d.isActive && d.direction === 'i_owe')
    .reduce((s, d) => s + (d.totalAmount - d.paidAmount), 0);
  const totalOweMe = debts.filter((d) => d.isActive && d.direction === 'owe_me')
    .reduce((s, d) => s + (d.totalAmount - d.paidAmount), 0);

  async function handleAdd() {
    if (!form.personName || !form.totalAmount) return;
    await addDebt({
      personName: form.personName,
      direction: form.direction,
      totalAmount: Number(form.totalAmount),
      note: form.note || undefined,
      dueDate: form.dueDate || undefined,
    });
    setForm({ personName: '', direction: 'i_owe', totalAmount: '', note: '', dueDate: '' });
    setShowAddForm(false);
  }

  async function handlePay() {
    if (!payDebt || !payAmount) return;
    await addPayment(payDebt.id, Number(payAmount));
    setPayDebt(null);
    setPayAmount('');
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--page)' }}>
      <Header />

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-4" style={{ background: 'var(--card)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text3)' }}>Я должен</p>
            <p className="text-xl font-extrabold" style={{ color: 'var(--expense)' }}>
              {formatMoney(totalIOwe)}
            </p>
          </div>
          <div className="rounded-2xl p-4" style={{ background: 'var(--card)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text3)' }}>Мне должны</p>
            <p className="text-xl font-extrabold" style={{ color: 'var(--income)' }}>
              {formatMoney(totalOweMe)}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl p-1 gap-1" style={{ background: 'var(--sand)' }}>
          {(['active', 'closed'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: tab === t ? 'var(--cer)' : 'transparent',
                color: tab === t ? '#fff' : 'var(--text3)',
              }}
            >
              {t === 'active' ? 'Активные' : 'Закрытые'}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <p className="text-center py-8" style={{ color: 'var(--text3)' }}>Загрузка…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle size={40} style={{ color: 'var(--border)', margin: '0 auto 8px' }} />
            <p style={{ color: 'var(--text3)' }}>
              {tab === 'active' ? 'Нет активных долгов' : 'Нет закрытых долгов'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((debt) => {
              const remaining = debt.totalAmount - debt.paidAmount;
              const progress = debt.totalAmount > 0 ? (debt.paidAmount / debt.totalAmount) * 100 : 0;
              const debtPayments = payments.filter((p) => p.debtId === debt.id);
              return (
                <div key={debt.id} className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--card)' }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          background: debt.direction === 'i_owe' ? 'var(--expense-bg)' : 'var(--income-bg)',
                        }}
                      >
                        {debt.direction === 'i_owe'
                          ? <ArrowUp size={16} style={{ color: 'var(--expense)' }} />
                          : <ArrowDown size={16} style={{ color: 'var(--income)' }} />
                        }
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold truncate" style={{ color: 'var(--ink)' }}>{debt.personName}</p>
                        <p className="text-xs" style={{ color: 'var(--text3)' }}>
                          {debt.direction === 'i_owe' ? 'Я должен' : 'Должен мне'}
                          {debt.dueDate && ` · до ${debt.dueDate}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-extrabold tabular-nums" style={{ color: 'var(--ink)' }}>
                        {formatMoney(remaining)}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text3)' }}>
                        из {formatMoney(debt.totalAmount)}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--sand)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, progress)}%`,
                        background: progress >= 100 ? 'var(--income)' : 'var(--cer)',
                      }}
                    />
                  </div>

                  {debt.note && (
                    <p className="text-xs" style={{ color: 'var(--text3)' }}>{debt.note}</p>
                  )}

                  {/* Payments history */}
                  {debtPayments.length > 0 && (
                    <div className="space-y-1">
                      {debtPayments.slice(0, 3).map((p) => (
                        <div key={p.id} className="flex justify-between text-xs" style={{ color: 'var(--text3)' }}>
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {p.createdAt.slice(0, 10)}
                            {p.note && ` · ${p.note}`}
                          </span>
                          <span className="font-semibold" style={{ color: 'var(--income)' }}>
                            +{formatMoney(p.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  {debt.isActive && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setPayDebt(debt)}
                        className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                        style={{ background: 'var(--cer)', color: '#fff' }}
                      >
                        Оплатить
                      </button>
                      <button
                        onClick={() => closeDebt(debt.id)}
                        className="py-2 px-3 rounded-xl text-sm font-semibold transition-all"
                        style={{ background: 'var(--sand)', color: 'var(--text2)' }}
                      >
                        Закрыть
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add button */}
        {tab === 'active' && (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
            style={{ background: 'var(--card)', color: 'var(--cer)', border: '2px dashed var(--cer)' }}
          >
            <Plus size={18} weight="bold" />
            Добавить долг
          </button>
        )}
      </div>

      {/* Add debt modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/50"
          onClick={(e) => e.target === e.currentTarget && setShowAddForm(false)}>
          <div className="w-full max-w-lg rounded-3xl p-6 space-y-4" style={{ background: 'var(--card)' }}>
            <h3 className="text-lg font-extrabold" style={{ color: 'var(--ink)' }}>Новый долг</h3>

            <div className="flex rounded-xl p-1 gap-1" style={{ background: 'var(--sand)' }}>
              {(['i_owe', 'owe_me'] as Debt['direction'][]).map((d) => (
                <button
                  key={d}
                  onClick={() => setForm((f) => ({ ...f, direction: d }))}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: form.direction === d ? 'var(--cer)' : 'transparent',
                    color: form.direction === d ? '#fff' : 'var(--text3)',
                  }}
                >
                  {d === 'i_owe' ? 'Я должен' : 'Мне должны'}
                </button>
              ))}
            </div>

            <input
              placeholder="Имя / название"
              value={form.personName}
              onChange={(e) => setForm((f) => ({ ...f, personName: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'var(--sand)', color: 'var(--ink)' }}
            />
            <input
              type="number"
              placeholder="Сумма ₸"
              value={form.totalAmount}
              onChange={(e) => setForm((f) => ({ ...f, totalAmount: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'var(--sand)', color: 'var(--ink)' }}
            />
            <input
              placeholder="Заметка (необязательно)"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'var(--sand)', color: 'var(--ink)' }}
            />
            <input
              type="date"
              placeholder="Срок погашения"
              value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'var(--sand)', color: 'var(--ink)' }}
            />

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--sand)', color: 'var(--text2)' }}
              >
                Отмена
              </button>
              <button
                onClick={handleAdd}
                className="flex-1 py-3 rounded-xl text-sm font-bold"
                style={{ background: 'var(--cer)', color: '#fff' }}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay modal */}
      {payDebt && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/50"
          onClick={(e) => e.target === e.currentTarget && setPayDebt(null)}>
          <div className="w-full max-w-lg rounded-3xl p-6 space-y-4" style={{ background: 'var(--card)' }}>
            <h3 className="text-lg font-extrabold" style={{ color: 'var(--ink)' }}>
              Оплата: {payDebt.personName}
            </h3>
            <p className="text-sm" style={{ color: 'var(--text3)' }}>
              Осталось: {formatMoney(payDebt.totalAmount - payDebt.paidAmount)}
            </p>
            <input
              type="number"
              placeholder="Сумма платежа ₸"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'var(--sand)', color: 'var(--ink)' }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setPayDebt(null)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--sand)', color: 'var(--text2)' }}
              >
                Отмена
              </button>
              <button
                onClick={handlePay}
                className="flex-1 py-3 rounded-xl text-sm font-bold"
                style={{ background: 'var(--cer)', color: '#fff' }}
              >
                Оплатить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
