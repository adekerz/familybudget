// src/pages/OnboardingPage.tsx
import { useState } from 'react';
import { BANKS, type BankId } from '../constants/banks';
import { usePayPeriodStore } from '../store/usePayPeriodStore';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';

interface Props {
  onComplete: () => void;
}

type Step = 1 | 2 | 3;

export function OnboardingPage({ onComplete }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [selectedBanks, setSelectedBanks] = useState<BankId[]>(['kaspi']);
  const [salary, setSalary] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return last.toISOString().slice(0, 10);
  });
  const [saving, setSaving] = useState(false);

  const createPayPeriod = usePayPeriodStore(s => s.createPayPeriod);

  function toggleBank(id: BankId) {
    setSelectedBanks(prev =>
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  }

  async function handleFinish() {
    if (saving) return;
    setSaving(true);

    const amount = parseInt(salary.replace(/\D/g, ''), 10) || 0;
    if (amount > 0 && startDate && endDate) {
      await createPayPeriod({ startDate, endDate, salaryAmount: amount });
    }

    // Сохраняем выбранные банки в localStorage (нет отдельной DB колонки)
    localStorage.setItem('fb_selected_banks', JSON.stringify(selectedBanks));
    // Сохраняем первый банк как дефолт для QuickAddSheet
    if (selectedBanks.length > 0) {
      localStorage.setItem('fb_last_bank', selectedBanks[0]);
    }

    // Отметить онбординг пройденным
    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      await supabase
        .from('app_users')
        .update({ onboarded: true })
        .eq('id', userId);
    }

    onComplete();
  }

  return (
    <div className="min-h-screen bg-sand flex flex-col">
      {/* Progress */}
      <div className="flex gap-2 p-4 pt-8">
        {[1, 2, 3].map(s => (
          <div
            key={s}
            className={`flex-1 h-1.5 rounded-full transition-all ${
              s <= step ? 'bg-accent' : 'bg-border'
            }`}
          />
        ))}
      </div>

      <div className="flex-1 px-4 pt-6 pb-10">
        {/* Шаг 1: Выбор банков */}
        {step === 1 && (
          <div>
            <h1 className="text-2xl font-bold text-ink mb-2">Какими банками пользуетесь?</h1>
            <p className="text-muted text-sm mb-6">Выберите один или несколько</p>
            <div className="space-y-3">
              {BANKS.filter(b => b.id !== 'other').map(bank => (
                <button
                  key={bank.id}
                  onClick={() => toggleBank(bank.id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                    selectedBanks.includes(bank.id)
                      ? `${bank.bgColor} border-current ${bank.textColor}`
                      : 'bg-card border-border text-ink'
                  }`}
                >
                  <span style={{ fontSize: 24 }}>{bank.icon}</span>
                  <span className="font-semibold">{bank.name}</span>
                  {selectedBanks.includes(bank.id) && (
                    <span className="ml-auto font-bold">✓</span>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={selectedBanks.length === 0}
              className="mt-8 w-full py-4 rounded-2xl bg-accent text-white font-bold disabled:opacity-50"
            >
              Далее
            </button>
          </div>
        )}

        {/* Шаг 2: Зарплата и период */}
        {step === 2 && (
          <div>
            <h1 className="text-2xl font-bold text-ink mb-2">Настроим бюджет</h1>
            <p className="text-muted text-sm mb-6">Укажите зарплату и даты периода</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted uppercase tracking-wide mb-1 block">
                  Сумма зарплаты (₸)
                </label>
                <input
                  type="number"
                  value={salary}
                  onChange={e => setSalary(e.target.value)}
                  placeholder="300 000"
                  className="w-full px-4 py-3 rounded-2xl border border-border bg-card text-ink text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted uppercase tracking-wide mb-1 block">
                  Начало периода
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-border bg-card text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted uppercase tracking-wide mb-1 block">
                  Конец периода
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-border bg-card text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-4 rounded-2xl border border-border text-ink font-semibold"
              >
                Назад
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-4 rounded-2xl bg-accent text-white font-bold"
              >
                Далее
              </button>
            </div>
          </div>
        )}

        {/* Шаг 3: Готово */}
        {step === 3 && (
          <div className="text-center">
            <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <span style={{ fontSize: 48 }}>🎉</span>
            </div>
            <h1 className="text-2xl font-bold text-ink mb-3">Всё готово!</h1>
            <p className="text-muted text-sm mb-2">
              Приложение настроено. Теперь вы можете добавить первый расход через кнопку «+».
            </p>
            <p className="text-muted text-xs mb-8">
              Выбранные банки: {selectedBanks.map(id => BANKS.find(b => b.id === id)?.name).join(', ')}
            </p>
            <button
              onClick={handleFinish}
              disabled={saving}
              className="w-full py-4 rounded-2xl bg-accent text-white font-bold disabled:opacity-50"
            >
              {saving ? 'Сохранение...' : 'Начать использовать'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
