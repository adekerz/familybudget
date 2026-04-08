import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useExpenseStore } from '../../store/useExpenseStore';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useToastStore } from '../../store/useToastStore';
import { Icon } from '../../lib/icons';
import { formatMoney } from '../../lib/format';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useAccountStore } from '../../store/useAccountStore';
import type { Expense, ExpenseType } from '../../types';
import BottomSheet from '../ui/BottomSheet';

interface Props {
  onClose: () => void;
  defaultType?: ExpenseType;
  initialData?: Expense;
}

const PRESETS = [500, 1000, 2000, 5000];

export function ExpenseForm({ onClose, defaultType = 'flexible', initialData }: Props) {
  const { t } = useTranslation();
  const addExpense = useExpenseStore((s) => s.addExpense);
  const updateExpense = useExpenseStore((s) => s.updateExpense);
  const categories = useCategoryStore((s) => s.categories);
  const payers = useSettingsStore((s) => s.payers);
  const accounts = useAccountStore((s) => s.accounts);

  const [amount, setAmount] = useState(initialData?.amount ? String(initialData.amount) : '');
  const [type, setType] = useState<ExpenseType>(initialData?.type ?? defaultType);
  const [categoryId, setCategoryId] = useState(initialData?.categoryId ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [date, setDate] = useState(initialData?.date ?? new Date().toISOString().slice(0, 10));
  const [paidBy, setPaidBy] = useState<string>(initialData?.paidBy ?? '');
  const [accountId, setAccountId] = useState<string>(initialData?.accountId ?? '');
  const [saved, setSaved] = useState(false);

  const numAmount = parseInt(amount.replace(/\D/g, ''), 10) || 0;
  const isValid = numAmount > 0 && categoryId !== '';

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '');
    setAmount(digits ? parseInt(digits, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '');
  }

  function handlePreset(val: number) {
    setAmount(val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '));
  }

  const [showAllCats, setShowAllCats] = useState(false);
  const quickCats = categories.filter(c => c.isQuickAccess);
  const otherCats = categories.filter(c => !c.isQuickAccess);

  function handleCategorySelect(id: string) {
    setCategoryId(id);
    const cat = categories.find((c) => c.id === id);
    if (cat) setType(cat.type ?? 'flexible');
    setShowAllCats(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || saved) return;
    const cat = categories.find((c) => c.id === categoryId);
    if (initialData) {
      updateExpense(initialData.id, {
        amount: numAmount,
        date,
        categoryId,
        type,
        description: description.trim() || undefined,
        paidBy,
        accountId,
      });
      useToastStore.getState().show(t('expense_updated'), 'success');
    } else {
      const result = await addExpense({
        amount: numAmount,
        date,
        categoryId,
        type,
        description: description.trim() || undefined,
        paidBy,
        accountId: accountId || undefined,
      });
      if (!result.ok) {
        useToastStore.getState().show(t('toast_error_prefix') + result.error, 'error');
        return;
      }
      useToastStore.getState().show(
        t('expense_added') + ' · -' + formatMoney(numAmount) + ' · ' + (cat?.name ?? ''),
        'success'
      );
    }
    setSaved(true);
    setTimeout(() => onClose(), 600);
  }

  return (
    <BottomSheet isOpen={true} onClose={onClose} title={t('new_expense_title')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Amount */}
        <div>
          <label className="text-xs text-muted mb-1 block">{t('amount_label')}</label>
          {/* Quick presets */}
          <div className="flex gap-2 mb-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handlePreset(p)}
                className="flex-1 py-1.5 rounded-xl text-xs font-medium bg-alice border border-alice-dark text-ink-soft hover:border-accent/40 transition-all"
              >
                {p.toLocaleString('ru')}
              </button>
            ))}
          </div>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0"
              className="w-full bg-card border border-border rounded-xl px-4 py-3.5 pr-10 text-ink font-bold text-lg text-center focus:outline-none focus:border-accent transition-colors"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted text-lg font-bold">₸</span>
          </div>
        </div>

        {/* Category grid */}
        <div>
          <label className="text-xs text-muted mb-1.5 block">{t('category')}</label>

          {/* Быстрый доступ — всегда видны */}
          <div className="grid grid-cols-4 gap-2 mb-2">
            {quickCats.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategorySelect(cat.id)}
                className={`flex flex-col items-center gap-1 py-3 px-1 rounded-2xl text-center transition-all ${
                  categoryId === cat.id
                    ? 'bg-accent text-white shadow-sm scale-[1.03]'
                    : 'bg-alice border border-alice-dark text-ink hover:border-accent/50'
                }`}
              >
                <Icon
                  name={cat.icon}
                  size={18}
                  className={categoryId === cat.id ? 'text-white' : 'text-accent'}
                />
                <span className="text-[9px] leading-tight font-medium">{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Кнопка раскрытия остальных */}
          <button
            type="button"
            onClick={() => setShowAllCats(v => !v)}
            className="w-full py-2 text-xs text-muted border border-dashed border-border rounded-xl hover:border-accent/40 transition-colors flex items-center justify-center gap-1.5 mb-2"
          >
            {showAllCats ? (
              <>{t('hide_categories')}</>
            ) : (
              <>{t('show_all_categories', { count: otherCats.length })}</>
            )}
          </button>

          {/* Все остальные — только при раскрытии */}
          {showAllCats && (
            <div className="grid grid-cols-4 gap-2">
              {otherCats.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategorySelect(cat.id)}
                  className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-2xl text-center transition-all ${
                    categoryId === cat.id
                      ? 'bg-accent text-white shadow-sm'
                      : 'bg-card border border-border text-muted hover:border-accent/40'
                  }`}
                >
                  <Icon
                    name={cat.icon}
                    size={16}
                    className={categoryId === cat.id ? 'text-white' : 'text-muted'}
                  />
                  <span className="text-[9px] leading-tight">{cat.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Тип категории */}
          {categoryId && (
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                type === 'mandatory' ? 'bg-accent-light text-accent' :
                type === 'savings'   ? 'bg-success-bg text-success' :
                                       'bg-sand text-text2'
              }`}>
                {type === 'mandatory' ? t('mandatory_full') :
                 type === 'savings'   ? t('savings')        : t('flexible')}
              </span>
              <p className="text-[10px] text-muted">{t('determined_by_category')}</p>
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-muted mb-1.5 block">{t('description_optional')}</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('what_for_placeholder')}
            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink placeholder:text-muted focus:outline-none focus:border-accent transition-colors text-sm"
          />
        </div>

        {/* Date + PaidBy */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-muted mb-1.5 block">{t('date_label')}</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-ink text-sm focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          {payers.length > 0 && (
            <div className="flex-1">
              <label className="text-xs text-muted mb-1.5 block">{t('who_paid')}</label>
              <div className="flex flex-col gap-1">
                {payers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPaidBy(p.id)}
                    className={`py-1.5 rounded-[22px] text-xs font-medium transition-all ${
                      paidBy === p.id
                        ? 'bg-accent text-white'
                        : 'bg-alice border border-alice-dark text-muted'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {accounts.length > 0 && (
          <div>
            <label className="text-xs text-muted mb-1.5 block">{t('account_label')}</label>
            <div className="flex flex-wrap gap-1.5">
              {accounts.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAccountId(accountId === a.id ? '' : a.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    accountId === a.id
                      ? 'bg-accent text-white'
                      : 'bg-alice border border-alice-dark text-ink-soft hover:border-accent/40'
                  }`}
                >
                  {a.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={!isValid}
          className={`w-full font-bold py-3.5 rounded-xl transition-all disabled:opacity-40 ${
            saved
              ? 'bg-success text-white scale-[1.02]'
              : 'bg-accent text-white active:scale-[0.98] hover:bg-accent/90'
          }`}
        >
          {saved ? t('saved_check') : initialData ? t('save_changes') : t('save_expense')}
        </button>
      </form>
    </BottomSheet>
  );
}
