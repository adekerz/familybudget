import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Bank, Wallet, CaretDown, CaretRight,
  Trash, ArrowsClockwise, DotsThreeVertical,
} from '@phosphor-icons/react';
import { Header } from '../components/layout/Header';
import { useAccountStore } from '../store/useAccountStore';
import { useBankStore } from '../store/useBankStore';
import { formatMoney } from '../lib/format';
import BottomSheet from '../components/ui/BottomSheet';

type AccountTypeOption = 'debit' | 'credit' | 'savings' | 'deposit' | 'cash' | 'ewallet';

const ACCOUNT_TYPE_LABELS: Record<AccountTypeOption, string> = {
  debit: 'Дебетовая',
  credit: 'Кредитная',
  savings: 'Накопительная',
  deposit: 'Депозит',
  cash: 'Наличные',
  ewallet: 'Электронный кошелёк',
};

const BANK_COLORS = [
  '#E94B3C', '#F5A623', '#00B894', '#0062FF',
  '#7C3AED', '#EC4899', '#06B6D4', '#64748B',
];

export function AccountsPage() {
  const { accounts, loadAccounts, addAccount, updateAccount, removeAccount } = useAccountStore();
  const { banks, load: loadBanks, add: addBank } = useBankStore();

  const [expandedBanks, setExpandedBanks] = useState<Set<string>>(new Set(['__no_bank__']));
  const [showAddBank, setShowAddBank] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [editAccount, setEditAccount] = useState<string | null>(null);

  // Add bank form
  const [bankForm, setBankForm] = useState({ name: '', bankType: 'bank' as 'bank' | 'cash' | 'ewallet', color: BANK_COLORS[2] });

  // Add account form
  const [accForm, setAccForm] = useState({
    name: '',
    bankId: '',
    accountType: 'debit' as AccountTypeOption,
    balance: '',
    last4: '',
    currency: 'KZT',
  });

  // Edit balance form
  const [editBalanceVal, setEditBalanceVal] = useState('');

  useEffect(() => {
    loadAccounts();
    loadBanks();
  }, []);

  const activeAccounts = accounts.filter((a) => a.isActive);

  // Группировка счетов по банкам
  const grouped = useMemo(() => {
    const map = new Map<string, typeof activeAccounts>();
    // Счета с банком
    for (const acc of activeAccounts) {
      const key = acc.bankId ?? '__no_bank__';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(acc);
    }
    return map;
  }, [activeAccounts]);

  const totalBalance = activeAccounts
    .filter((a) => !a.isExcludedFromTotal)
    .reduce((s, a) => s + a.balance, 0);

  const netWorth = activeAccounts
    .filter((a) => !a.isExcludedFromTotal)
    .reduce((s, a) => {
      if (a.accountType === 'credit') return s - ((a.creditLimit ?? 0) - a.balance);
      return s + a.balance;
    }, 0);

  function toggleBank(key: string) {
    setExpandedBanks((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  async function handleAddBank() {
    if (!bankForm.name.trim()) return;
    await addBank({ ...bankForm, icon: 'building-2', isActive: true, sortOrder: banks.length });
    setBankForm({ name: '', bankType: 'bank', color: BANK_COLORS[2] });
    setShowAddBank(false);
  }

  async function handleAddAccount() {
    if (!accForm.name.trim()) return;
    await addAccount({
      name: accForm.name.trim(),
      currency: accForm.currency,
      balance: parseFloat(accForm.balance) || 0,
    });
    // TODO: after addAccount returns id, update bankId/accountType/last4
    setAccForm({ name: '', bankId: '', accountType: 'debit', balance: '', last4: '', currency: 'KZT' });
    setShowAddAccount(false);
  }

  async function handleUpdateBalance() {
    if (!editAccount) return;
    const val = parseFloat(editBalanceVal);
    if (!isNaN(val)) await updateAccount(editAccount, { balance: val });
    setEditAccount(null);
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--page)' }}>
      <Header />

      {/* Net Worth Hero */}
      <div className="px-4 pt-4 pb-2">
        <div
          className="rounded-2xl p-5"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text3)' }}>
            Net Worth
          </p>
          <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--cer)' }}>
            {formatMoney(netWorth)}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text3)' }}>
            {activeAccounts.length} счёт(а) · Итого: {formatMoney(totalBalance)}
          </p>

          {/* Breakdown bar */}
          {activeAccounts.length > 0 && (
            <div className="mt-3 flex rounded-full overflow-hidden h-2">
              {activeAccounts.filter((a) => !a.isExcludedFromTotal && a.balance > 0).map((acc, i) => {
                const pct = totalBalance > 0 ? (acc.balance / totalBalance) * 100 : 0;
                const colors = ['var(--cer)', '#F5A623', '#EC4899', '#7C3AED', '#06B6D4'];
                return (
                  <div
                    key={acc.id}
                    style={{ width: `${pct}%`, background: colors[i % colors.length] }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-4 pb-3 flex gap-2">
        <button
          onClick={() => setShowAddBank(true)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: 'var(--cer-light)', color: 'var(--cer)' }}
        >
          <Bank size={16} weight="bold" />
          Добавить банк
        </button>
        <button
          onClick={() => setShowAddAccount(true)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: 'var(--card)', color: 'var(--ink)', border: '1px solid var(--border)' }}
        >
          <Plus size={16} weight="bold" />
          Добавить счёт
        </button>
      </div>

      {/* Banks + Accounts list */}
      <div className="px-4 space-y-3">
        {/* Accounts without bank */}
        {grouped.has('__no_bank__') && (
          <BankSection
            key="__no_bank__"
            bankKey="__no_bank__"
            bankName="Без банка"
            bankColor="var(--text3)"
            accounts={grouped.get('__no_bank__')!}
            isExpanded={expandedBanks.has('__no_bank__')}
            onToggle={() => toggleBank('__no_bank__')}
            onEditBalance={(id, bal) => { setEditAccount(id); setEditBalanceVal(String(bal)); }}
            onRemoveAccount={removeAccount}
          />
        )}

        {/* Banks with accounts */}
        {banks.map((bank) => {
          const bankAccounts = grouped.get(bank.id) ?? [];
          return (
            <BankSection
              key={bank.id}
              bankKey={bank.id}
              bankName={bank.name}
              bankColor={bank.color}
              accounts={bankAccounts}
              isExpanded={expandedBanks.has(bank.id)}
              onToggle={() => toggleBank(bank.id)}
              onEditBalance={(id, bal) => { setEditAccount(id); setEditBalanceVal(String(bal)); }}
              onRemoveAccount={removeAccount}
            />
          );
        })}

        {activeAccounts.length === 0 && banks.length === 0 && (
          <div className="text-center py-12" style={{ color: 'var(--text3)' }}>
            <Wallet size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Добавьте банк и счёт, чтобы начать отслеживать баланс</p>
          </div>
        )}
      </div>

      {/* Edit balance sheet */}
      <BottomSheet
        isOpen={!!editAccount}
        onClose={() => setEditAccount(null)}
        title="Корректировать баланс"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text3)' }}>Новый баланс (₸)</label>
            <input
              type="number"
              value={editBalanceVal}
              onChange={(e) => setEditBalanceVal(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-xl font-bold outline-none text-right"
              style={{ background: 'var(--sand)', color: 'var(--ink)' }}
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setEditAccount(null)}
              className="flex-1 py-3 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--sand)', color: 'var(--text2)' }}
            >
              Отмена
            </button>
            <button
              onClick={handleUpdateBalance}
              className="flex-1 py-3 rounded-xl text-sm font-bold"
              style={{ background: 'var(--cer)', color: '#fff' }}
            >
              Сохранить
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Add bank sheet */}
      <BottomSheet isOpen={showAddBank} onClose={() => setShowAddBank(false)} title="Добавить банк">
        <div className="space-y-4">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text3)' }}>Название банка</label>
            <input
              value={bankForm.name}
              onChange={(e) => setBankForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Kaspi Bank, Halyk, Наличные..."
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'var(--sand)', color: 'var(--ink)' }}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text3)' }}>Тип</label>
            <div className="flex gap-2">
              {(['bank', 'cash', 'ewallet'] as const).map((bt) => (
                <button
                  key={bt}
                  onClick={() => setBankForm((f) => ({ ...f, bankType: bt }))}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: bankForm.bankType === bt ? 'var(--cer)' : 'var(--sand)',
                    color: bankForm.bankType === bt ? '#fff' : 'var(--text2)',
                  }}
                >
                  {bt === 'bank' ? 'Банк' : bt === 'cash' ? 'Наличные' : 'Кошелёк'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text3)' }}>Цвет</label>
            <div className="flex gap-2 flex-wrap">
              {BANK_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setBankForm((f) => ({ ...f, color: c }))}
                  className="w-8 h-8 rounded-full transition-all"
                  style={{
                    background: c,
                    outline: bankForm.color === c ? `3px solid var(--cer)` : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAddBank(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ background: 'var(--sand)', color: 'var(--text2)' }}>
              Отмена
            </button>
            <button onClick={handleAddBank} className="flex-1 py-3 rounded-xl text-sm font-bold" style={{ background: 'var(--cer)', color: '#fff' }}>
              Добавить
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Add account sheet */}
      <BottomSheet isOpen={showAddAccount} onClose={() => setShowAddAccount(false)} title="Добавить счёт">
        <div className="space-y-4">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text3)' }}>Название счёта</label>
            <input
              value={accForm.name}
              onChange={(e) => setAccForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Основная карта, Депозит..."
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'var(--sand)', color: 'var(--ink)' }}
              autoFocus
            />
          </div>
          {banks.length > 0 && (
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text3)' }}>Банк</label>
              <select
                value={accForm.bankId}
                onChange={(e) => setAccForm((f) => ({ ...f, bankId: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: 'var(--sand)', color: 'var(--ink)' }}
              >
                <option value="">— без банка —</option>
                {banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text3)' }}>Тип счёта</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountTypeOption[]).map((at) => (
                <button
                  key={at}
                  onClick={() => setAccForm((f) => ({ ...f, accountType: at }))}
                  className="py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: accForm.accountType === at ? 'var(--cer)' : 'var(--sand)',
                    color: accForm.accountType === at ? '#fff' : 'var(--text2)',
                  }}
                >
                  {ACCOUNT_TYPE_LABELS[at]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text3)' }}>Начальный баланс (₸)</label>
            <input
              type="number"
              value={accForm.balance}
              onChange={(e) => setAccForm((f) => ({ ...f, balance: e.target.value }))}
              placeholder="0"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none text-right"
              style={{ background: 'var(--sand)', color: 'var(--ink)' }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text3)' }}>Последние 4 цифры карты (опц.)</label>
            <input
              value={accForm.last4}
              onChange={(e) => setAccForm((f) => ({ ...f, last4: e.target.value.slice(0, 4) }))}
              placeholder="4521"
              maxLength={4}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'var(--sand)', color: 'var(--ink)' }}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAddAccount(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ background: 'var(--sand)', color: 'var(--text2)' }}>
              Отмена
            </button>
            <button onClick={handleAddAccount} className="flex-1 py-3 rounded-xl text-sm font-bold" style={{ background: 'var(--cer)', color: '#fff' }}>
              Добавить
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

// ─── BankSection subcomponent ────────────────────────────────────────────────

interface BankSectionProps {
  bankKey: string;
  bankName: string;
  bankColor: string;
  accounts: ReturnType<typeof useAccountStore.getState>['accounts'];
  isExpanded: boolean;
  onToggle: () => void;
  onEditBalance: (id: string, balance: number) => void;
  onRemoveAccount: (id: string) => void;
}

function BankSection({
  bankName, bankColor, accounts, isExpanded, onToggle,
  onEditBalance, onRemoveAccount,
}: BankSectionProps) {
  const bankTotal = accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      {/* Bank header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: isExpanded ? '1px solid var(--border)' : 'none' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: bankColor + '22' }}
        >
          <Bank size={16} style={{ color: bankColor }} weight="fill" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{bankName}</p>
          <p className="text-xs" style={{ color: 'var(--text3)' }}>
            {accounts.length} счёт(а) · {formatMoney(bankTotal)}
          </p>
        </div>
        {isExpanded
          ? <CaretDown size={16} style={{ color: 'var(--text3)' }} />
          : <CaretRight size={16} style={{ color: 'var(--text3)' }} />
        }
      </button>

      {/* Accounts */}
      {isExpanded && (
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {accounts.length === 0 && (
            <p className="px-4 py-3 text-xs" style={{ color: 'var(--text3)' }}>Счетов пока нет</p>
          )}
          {accounts.map((acc) => (
            <AccountRow
              key={acc.id}
              acc={acc}
              onEditBalance={() => onEditBalance(acc.id, acc.balance)}
              onRemove={() => onRemoveAccount(acc.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AccountRow({
  acc,
  onEditBalance,
  onRemove,
}: {
  acc: ReturnType<typeof useAccountStore.getState>['accounts'][number];
  onEditBalance: () => void;
  onRemove: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const typeLabel = ACCOUNT_TYPE_LABELS[acc.accountType as AccountTypeOption] ?? 'Дебетовая';

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>{acc.name}</p>
          {acc.last4 && (
            <span className="text-xs tabular-nums" style={{ color: 'var(--text3)' }}>·{acc.last4}</span>
          )}
        </div>
        <p className="text-xs" style={{ color: 'var(--text3)' }}>{typeLabel} · {acc.currency}</p>
      </div>

      <div className="flex items-center gap-2">
        <span
          className="text-sm font-bold tabular-nums"
          style={{ color: acc.balance >= 0 ? 'var(--income)' : 'var(--expense)' }}
        >
          {formatMoney(acc.balance)}
        </span>
        <div className="relative">
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="p-1.5 rounded-lg"
            style={{ color: 'var(--text3)' }}
          >
            <DotsThreeVertical size={16} />
          </button>
          {showMenu && (
            <div
              className="absolute right-0 top-8 w-44 rounded-xl overflow-hidden z-10 shadow-lg"
              style={{ background: 'var(--card2)', border: '1px solid var(--border)' }}
            >
              <button
                onClick={() => { onEditBalance(); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-[var(--sand)] transition-colors"
                style={{ color: 'var(--ink)' }}
              >
                <ArrowsClockwise size={14} />
                Корректировать баланс
              </button>
              <button
                onClick={() => { onRemove(); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm"
                style={{ color: 'var(--expense)' }}
              >
                <Trash size={14} />
                Удалить счёт
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
