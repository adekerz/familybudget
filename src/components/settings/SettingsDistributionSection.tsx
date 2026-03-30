import { useState } from 'react';
import { Sliders } from '@phosphor-icons/react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useToastStore } from '../../store/useToastStore';

const SLIDER_COLORS: Record<string, string> = {
  mandatory: 'text-accent',
  flexible: 'text-text2',
  savings: 'text-success',
};
const SLIDER_LABELS: Record<string, string> = {
  mandatory: 'Обязательные',
  flexible: 'Гибкие',
  savings: 'Накопления',
};

export function SettingsDistributionSection() {
  const { defaultRatios, updateDefaultRatios } = useSettingsStore();
  const showToast = useToastStore((s) => s.show);
  const [ratios, setRatios] = useState(defaultRatios);
  const [saved, setSaved] = useState(false);

  function handleSlider(key: 'mandatory' | 'flexible' | 'savings', val: number) {
    const others = (Object.keys(ratios) as (keyof typeof ratios)[]).filter((k) => k !== key);
    const remaining = 100 - val;
    const perOther = Math.round(remaining / 2);
    setRatios({ ...ratios, [key]: val / 100, [others[0]]: perOther / 100, [others[1]]: (100 - val - perOther) / 100 });
    setSaved(false);
  }

  function handleSave() {
    updateDefaultRatios(ratios);
    setSaved(true);
    showToast('Настройки сохранены', 'success');
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <section className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Sliders size={16} className="text-accent" />
        <p className="font-semibold text-ink text-sm">Распределение дохода (по умолчанию)</p>
      </div>
      <div className="px-4 py-4 space-y-4">
        {(['mandatory', 'flexible', 'savings'] as const).map((key) => (
          <div key={key}>
            <div className="flex justify-between text-xs mb-1.5">
              <span className={`font-medium ${SLIDER_COLORS[key]}`}>{SLIDER_LABELS[key]}</span>
              <span className="font-bold text-ink">{Math.round(ratios[key] * 100)}%</span>
            </div>
            <input type="range" min={10} max={80} value={Math.round(ratios[key] * 100)} onChange={(e) => handleSlider(key, parseInt(e.target.value))} className="w-full accent-accent" />
          </div>
        ))}
        <button
          onClick={handleSave}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${saved ? 'bg-success-bg text-success border border-success/30' : 'bg-accent text-white hover:bg-accent/90'}`}
        >
          {saved ? 'Сохранено!' : 'Сохранить'}
        </button>
        <p className="text-xs text-muted text-center">Применяется к новым доходам</p>
      </div>
    </section>
  );
}
