import { useState } from 'react';
import { X } from 'lucide-react';
import { useIncomeStore } from '../../store/useIncomeStore';
import { distributeIncome } from '../../lib/budget';
import { DistributionPreview } from './DistributionPreview';
import type { IncomeSource } from '../../types';
import { INCOME_SOURCE_LABELS } from '../../constants/categories';

interface Props {
  onClose: () => void;
}

const SOURCES: IncomeSource[] = ['husband_salary', 'wife_advance', 'wife_salary', 'general'];

type Step = 'form' | 'preview';

export function IncomeForm({ onClose }: Props) {
  const addIncome = useIncomeStore((s) => s.addIncome);

  const [step, setStep] = useState<Step>('form');
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState<IncomeSource>('husband_salary');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [ratios, setRatios] = useState({ mandatory: 0.5, flexible: 0.3, savings: 0.2 });
  const [showSliders, setShowSliders] = useState(false);

  const numAmount = parseInt(amount.replace(/\D/g, ''), 10) || 0;
  const distribution = distributeIncome(numAmount, ratios);

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '');
    setAmount(digits ? parseInt(digits, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '');
  }

  function handleSlider(key: 'mandatory' | 'flexible' | 'savings', val: number) {
    const others = Object.keys(ratios).filter((k) => k !== key) as (keyof typeof ratios)[];
    const remaining = 100 - val;
    const perOther = Math.round(remaining / 2);
    setRatios({
      ...ratios,
      [key]: val / 100,
      [others[0]]: perOther / 100,
      [others[1]]: (100 - val - perOther) / 100,
    });
  }

  function handleNext(e: React.FormEvent) {
    e.preventDefault();
    if (numAmount <= 0) return;
    setStep('preview');
  }

  function handleConfirm() {
    addIncome({ amount: numAmount, date, source, note: note || undefined, ratios });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-card border border-border rounded-t-3xl pt-5 pb-8 px-5 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">
            {step === 'form' ? 'Добавить доход' : 'Подтвердить'}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-white p-1">
            <X size={18} />
          </button>
        </div>

        {step === 'form' ? (
          <form onSubmit={handleNext} className="space-y-4">
            {/* Amount */}
            <div>
              <label className="text-xs text-muted mb-1.5 block">Сумма</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder="0"
                  className="w-full bg-primary border border-border rounded-xl px-4 py-3.5 pr-10 text-white text-xl font-mono focus:outline-none focus:border-accent transition-colors"
                  autoFocus
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted text-lg font-bold">₸</span>
              </div>
            </div>

            {/* Source */}
            <div>
              <label className="text-xs text-muted mb-1.5 block">Источник</label>
              <div className="grid grid-cols-2 gap-2">
                {SOURCES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSource(s)}
                    className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                      source === s
                        ? 'bg-accent text-primary'
                        : 'bg-primary border border-border text-white hover:border-accent/50'
                    }`}
                  >
                    {INCOME_SOURCE_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="text-xs text-muted mb-1.5 block">Дата</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-primary border border-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            {/* Note */}
            <div>
              <label className="text-xs text-muted mb-1.5 block">Примечание (необязательно)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="За что?"
                className="w-full bg-primary border border-border rounded-xl px-4 py-3 text-white placeholder:text-muted/40 focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={numAmount <= 0}
              className="w-full bg-accent text-primary font-bold py-3.5 rounded-xl transition-all disabled:opacity-40 active:scale-95 hover:bg-accent/90"
            >
              Далее →
            </button>
          </form>
        ) : (
          <>
            <DistributionPreview
              amount={numAmount}
              ratios={ratios}
              distribution={distribution}
              onAdjust={() => setShowSliders((v) => !v)}
              onConfirm={handleConfirm}
            />

            {showSliders && (
              <div className="mt-4 space-y-4 bg-primary rounded-xl p-4">
                {(['mandatory', 'flexible', 'savings'] as const).map((key) => {
                  const labels = { mandatory: 'Обязательные', flexible: 'Гибкие', savings: 'Накопления' };
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-xs text-muted mb-1">
                        <span>{labels[key]}</span>
                        <span className="font-mono text-white">{Math.round(ratios[key] * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={80}
                        value={Math.round(ratios[key] * 100)}
                        onChange={(e) => handleSlider(key, parseInt(e.target.value))}
                        className="w-full accent-accent"
                      />
                    </div>
                  );
                })}
                <button onClick={() => setStep('form')} className="text-xs text-muted hover:text-white">
                  ← Назад
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
