// src/components/QuickAddSheet.tsx

import { useState, useEffect, useCallback } from 'react';
import { X } from '@phosphor-icons/react';
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

export function QuickAddSheet({ isOpen, onClose, prefilledAmount, prefilledBank, prefilledType }: Props) {
  const [digits, setDigits] = useState('');
  const [mode, setMode] = useState<Mode>('expense');
  const [bank, setBank] = useState<BankId>(
    () => (prefilledBank ?? localStorage.getItem(LAST_BANK_KEY) ?? 'kaspi') as BankId
  );
  const [categoryId, setCategoryId] = useState(
    () => localStorage.getItem(LAST_CAT_KEY) ?? ''
  );
  const [saving, setSaving] = useState(false);

  const categories = useCategoryStore(s => s.categories);
  const addExpense = useExpenseStore(s => s.addExpense);
  const addIncome = useIncomeStore(s => s.addIncome);
  const payers = useSettingsStore(s => s.payers);

  const amount = parseInt(digits.replace(/\D/g, ''), 10) || 0;
  const formattedAmount = amount > 0
    ? amount.toLocaleString('ru-KZ')
    : '0';

  const quickCats = categories.filter(c => c.isQuickAccess && c.type !== 'transfer');
  const isValid = amount > 0 && (mode === 'income' || categoryId !== '');

  useEffect(() => {
    if (prefilledAmount) {
      setDigits(String(prefilledAmount));
    }
  }, [prefilledAmount]);

  useEffect(() => {
    if (prefilledType) {
      setMode(prefilledType);
    }
  }, [prefilledType]);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setDigits('');
        setSaving(false);
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
          paidBy: payers[0]?.id ?? 'shared',
          bank,
        });
      } else {
        await addIncome({
          amount,
          date: new Date().toISOString().slice(0, 10),
          source: 'general',
          bank,
        });
      }

      triggerRecompute();
      useToastStore.getState().show('Сохранено', 'success');
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
        className={`fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '92vh', overflowY: 'auto' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header: режим */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex bg-sand rounded-xl p-1 gap-1">
            {(['expense', 'income'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  mode === m
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-muted'
                }`}
              >
                {m === 'expense' ? 'Расход' : 'Доход'}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-sand">
            <X size={18} className="text-muted" />
          </button>
        </div>

        {/* Amount display */}
        <div className="text-center px-4 py-3">
          <p className={`text-5xl font-bold tracking-tight transition-colors ${
            amount > 0 ? 'text-ink' : 'text-muted/30'
          }`}>
            {formattedAmount} <span className="text-3xl text-muted">₸</span>
          </p>
        </div>

        {/* Bank selector */}
        <div className="overflow-x-auto px-4 py-2">
          <div className="flex gap-2 w-max">
            {BANKS.map(b => (
              <button
                key={b.id}
                onClick={() => setBank(b.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                  bank === b.id
                    ? `${b.bgColor} ${b.textColor} border-current`
                    : 'bg-sand text-muted border-transparent'
                }`}
              >
                <span style={{ fontSize: 14 }}>{b.icon}</span>
                {b.name}
              </button>
            ))}
          </div>
        </div>

        {/* Categories (только для расходов) */}
        {mode === 'expense' && (
          <div className="px-4 py-2">
            <div className="grid grid-cols-5 gap-2">
              {quickCats.slice(0, 10).map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                    categoryId === cat.id
                      ? 'bg-accent/10 ring-2 ring-accent'
                      : 'bg-sand hover:bg-accent/5'
                  }`}
                >
                  <span className="leading-none">
                    <Icon name={cat.icon} size={20} />
                  </span>
                  <span className="text-[10px] text-muted truncate w-full text-center">
                    {cat.name}
                  </span>
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
                key === '⌫'
                  ? 'bg-sand text-muted'
                  : key === ''
                  ? 'opacity-0 pointer-events-none'
                  : 'bg-sand text-ink hover:bg-accent/10'
              }`}
            >
              {key === '⌫' ? '⌫' : key}
            </button>
          ))}
        </div>

        {/* Save button */}
        <div className="px-4 pb-6 pt-1">
          <button
            onClick={handleSave}
            disabled={!isValid || saving}
            className={`w-full py-4 rounded-2xl text-base font-bold transition-all ${
              isValid && !saving
                ? 'bg-accent text-white active:scale-[0.98] shadow-lg'
                : 'bg-sand text-muted cursor-not-allowed'
            }`}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </>
  );
}
