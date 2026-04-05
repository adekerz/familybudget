// src/components/QuickAddSheet.tsx

import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Check } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { BANKS, type BankId } from '../constants/banks';
import { useExpenseStore } from '../store/useExpenseStore';
import { useIncomeStore } from '../store/useIncomeStore';
import { useCategoryStore } from '../store/useCategoryStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useToastStore } from '../store/useToastStore';
import { Icon } from '../lib/icons';
import { triggerRecompute } from '../store/engineBus';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  prefilledAmount?: number;
  prefilledBank?: BankId;
  prefilledType?: 'expense' | 'income';
}

type Mode = 'expense' | 'income';

const LAST_BANK_KEY = 'fb_last_bank';
const LAST_CAT_KEY = 'fb_last_category';

/** Топ категория за последние 7 дней */
function getTopCategory(
  expenses: { date: string; categoryId: string }[],
  categoryIds: string[],
): string {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const counts: Record<string, number> = {};
  expenses
    .filter(e => new Date(e.date) >= cutoff && categoryIds.includes(e.categoryId))
    .forEach(e => { counts[e.categoryId] = (counts[e.categoryId] ?? 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? categoryIds[0] ?? '';
}

export function QuickAddSheet({ isOpen, onClose, prefilledAmount, prefilledBank, prefilledType }: Props) {
  const { t } = useTranslation();
  const [digits, setDigits] = useState('');
  const [mode, setMode] = useState<Mode>('expense');
  const [bank, setBank] = useState<BankId>(
    () => (prefilledBank ?? localStorage.getItem(LAST_BANK_KEY) ?? 'other') as BankId
  );
  const [categoryId, setCategoryId] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const categories = useCategoryStore(s => s.categories);
  const expenses = useExpenseStore(s => s.expenses);
  const addExpense = useExpenseStore(s => s.addExpense);
  const addIncome = useIncomeStore(s => s.addIncome);
  const payers = useSettingsStore(s => s.payers);

  const amount = parseInt(digits.replace(/\D/g, ''), 10) || 0;
  const formattedAmount = amount > 0 ? amount.toLocaleString('ru-KZ') : '0';

  const quickCats = useMemo(
    () => categories.filter(c => c.isQuickAccess && c.type !== 'transfer'),
    [categories],
  );

  // Автовыбор топ-категории при открытии
  useEffect(() => {
    if (isOpen && quickCats.length > 0) {
      const stored = localStorage.getItem(LAST_CAT_KEY) ?? '';
      const isStoredValid = quickCats.some(c => c.id === stored);
      if (isStoredValid) {
        setCategoryId(stored);
      } else {
        const top = getTopCategory(expenses, quickCats.map(c => c.id));
        setCategoryId(top);
      }
    }
  }, [isOpen, quickCats, expenses]);

  useEffect(() => {
    if (prefilledAmount) setDigits(String(prefilledAmount));
  }, [prefilledAmount]);

  useEffect(() => {
    if (prefilledType) setMode(prefilledType);
  }, [prefilledType]);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setDigits('');
        setSaving(false);
        setShowDetails(false);
      }, 300);
    }
  }, [isOpen]);

  const handleDigit = useCallback((d: string) => {
    setDigits(prev => {
      const raw = (prev + d).replace(/\D/g, '');
      if (raw.length > 9) return prev;
      return raw;
    });
  }, []);

  const handleBackspace = useCallback(() => {
    setDigits(prev => prev.slice(0, -1));
  }, []);

  const isValid = amount > 0 && (mode === 'income' || categoryId !== '');

  async function handleSave() {
    if (!isValid || saving) return;
    setSaving(true);

    if ('vibrate' in navigator) navigator.vibrate(50);

    localStorage.setItem(LAST_BANK_KEY, bank);
    if (categoryId) localStorage.setItem(LAST_CAT_KEY, categoryId);

    try {
      if (mode === 'expense') {
        const cat = categories.find(c => c.id === categoryId);
        await addExpense({
          amount,
          date: new Date().toISOString().slice(0, 10),
          categoryId,
          type: cat?.type ?? 'flexible',
          paidBy: payers[0]?.id ?? 'me',
          bank,
        });
      } else {
        await addIncome({
          amount,
          date: new Date().toISOString().slice(0, 10),
          source: 'salary_1',
          bank,
        });
      }

      triggerRecompute();
      useToastStore.getState().show(t('saved'), 'success');
      onClose();
    } catch {
      useToastStore.getState().show('Ошибка сохранения', 'error');
      setSaving(false);
    }
  }

  const numpadKeys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '92vh', overflowY: 'auto', background: 'var(--card)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        {/* Header: режим + закрыть */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex rounded-xl p-1 gap-1" style={{ background: 'var(--sand)' }}>
            {(['expense', 'income'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: mode === m ? 'var(--cer)' : 'transparent',
                  color: mode === m ? 'white' : 'var(--text3)',
                }}
              >
                {m === 'expense' ? t('expense') : t('income')}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="p-2 rounded-full" style={{ color: 'var(--text3)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Amount display */}
        <div className="text-center px-4 py-3">
          <p className="text-5xl font-extrabold tracking-tight tabular-nums transition-colors"
            style={{ color: amount > 0 ? 'var(--ink)' : 'var(--border)' }}>
            {formattedAmount} <span className="text-3xl" style={{ color: 'var(--text3)' }}>₸</span>
          </p>
        </div>

        {/* Categories (только для расходов) — top-6 в grid */}
        {mode === 'expense' && (
          <div className="px-4 py-2">
            <div className="grid grid-cols-6 gap-1.5">
              {quickCats.slice(0, 6).map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id)}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all active:scale-95"
                  style={{
                    background: categoryId === cat.id ? 'var(--cer-light)' : 'var(--sand)',
                    outline: categoryId === cat.id ? '2px solid var(--cer)' : 'none',
                  }}
                >
                  <span style={{ color: categoryId === cat.id ? 'var(--cer)' : 'var(--text2)' }}>
                    <Icon name={cat.icon} size={20} />
                  </span>
                  <span className="text-[9px] truncate w-full text-center font-medium" style={{ color: 'var(--text3)' }}>
                    {cat.name}
                  </span>
                </button>
              ))}
            </div>
            {/* Показать больше категорий */}
            {quickCats.length > 6 && (
              <button
                onClick={() => setShowDetails(v => !v)}
                className="mt-2 w-full text-[11px] font-semibold py-1.5 rounded-xl transition-all"
                style={{ color: 'var(--cer)', background: 'var(--cer-light)' }}
              >
                {showDetails ? 'Скрыть' : `Все (${quickCats.length})`}
              </button>
            )}
            {showDetails && (
              <div className="grid grid-cols-5 gap-1.5 mt-2">
                {quickCats.slice(6).map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => { setCategoryId(cat.id); setShowDetails(false); }}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all active:scale-95"
                    style={{
                      background: categoryId === cat.id ? 'var(--cer-light)' : 'var(--sand)',
                      outline: categoryId === cat.id ? '2px solid var(--cer)' : 'none',
                    }}
                  >
                    <span style={{ color: categoryId === cat.id ? 'var(--cer)' : 'var(--text2)' }}>
                      <Icon name={cat.icon} size={18} />
                    </span>
                    <span className="text-[9px] truncate w-full text-center font-medium" style={{ color: 'var(--text3)' }}>
                      {cat.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bank selector — свёрнут по умолчанию, раскрывается по кнопке */}
        {showDetails && (
          <div className="overflow-x-auto px-4 py-2">
            <div className="flex gap-2 w-max">
              {BANKS.map(b => (
                <button
                  key={b.id}
                  onClick={() => setBank(b.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                    bank === b.id
                      ? `${b.bgColor} ${b.textColor} border-current`
                      : 'border-transparent'
                  }`}
                  style={{ background: bank === b.id ? undefined : 'var(--sand)', color: bank === b.id ? undefined : 'var(--text3)' }}
                >
                  <span style={{ fontSize: 14 }}>{b.icon}</span>
                  {b.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-1 px-4 py-2">
          {numpadKeys.map((key, i) => (
            <button
              key={i}
              onClick={() => {
                if (key === '⌫') handleBackspace();
                else if (key !== '') handleDigit(key);
              }}
              disabled={key === ''}
              className={`h-14 rounded-2xl text-xl font-semibold transition-all active:scale-95 ${
                key === '' ? 'opacity-0 pointer-events-none' : ''
              }`}
              style={{
                background: key === '⌫' ? 'var(--sand)' : 'var(--sand)',
                color: key === '⌫' ? 'var(--text3)' : 'var(--ink)',
              }}
            >
              {key}
            </button>
          ))}
        </div>

        {/* Save button */}
        <div className="px-4 pb-6 pt-1">
          <button
            onClick={handleSave}
            disabled={!isValid || saving}
            className="w-full py-4 rounded-2xl text-base font-bold transition-all flex items-center justify-center gap-2"
            style={{
              background: isValid && !saving ? 'var(--cer)' : 'var(--sand)',
              color: isValid && !saving ? 'white' : 'var(--text3)',
              boxShadow: isValid && !saving ? '0 0 20px rgba(0,212,255,0.2)' : 'none',
            }}
          >
            {saving ? (
              <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full inline-block" />
            ) : (
              <Check size={18} weight="bold" />
            )}
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      </div>
    </>
  );
}
