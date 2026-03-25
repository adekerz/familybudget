import { useState, useRef, useEffect } from 'react';
import { useThemeStore } from '../../store/useThemeStore';
import { useToastStore } from '../../store/useToastStore';
import { THEMES, type ThemeId } from '../../lib/themes';
import { Check } from 'lucide-react';

const SWATCHES: Record<ThemeId, string[]> = {
  wife:    ['#F2EDE1', '#FFFDF8', '#2274A5', '#E7DFC6', '#131B23'],
  husband: ['#0F1923', '#1A2535', '#00D4FF', '#243447', '#E8F4F8'],
};

export function ThemeSwitcherCompact() {
  const { themeId, setTheme } = useThemeStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const label = themeId === 'wife' ? 'Ж' : 'М';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 rounded-xl bg-accent text-white font-bold text-sm flex items-center justify-center active:scale-95 transition-transform"
      >
        {label}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-48 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50 animate-slide-down">
          {(['wife', 'husband'] as const).map((id) => (
            <button
              key={id}
              onClick={() => {
                setTheme(id);
                setOpen(false);
                useToastStore.getState().show('Тема изменена');
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                themeId === id ? 'bg-accent/10' : 'hover:bg-sand/30'
              }`}
            >
              <div className="flex gap-1">
                {SWATCHES[id].slice(0, 3).map((c, i) => (
                  <span key={i} className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: c }} />
                ))}
              </div>
              <span className="text-sm font-medium text-ink flex-1">{THEMES[id].label}</span>
              {themeId === id && <Check size={14} className="text-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ThemeSwitcherFull() {
  const { themeId, setTheme } = useThemeStore();

  return (
    <div className="grid grid-cols-2 gap-3">
      {(['wife', 'husband'] as const).map((id) => {
        const active = themeId === id;
        return (
          <button
            key={id}
            onClick={() => {
              setTheme(id);
              useToastStore.getState().show('Тема изменена');
            }}
            className={`relative rounded-xl p-3 text-left transition-all active:scale-[0.97] ${
              active
                ? 'border-2 border-accent bg-accent/5'
                : 'border border-border bg-card hover:border-accent/40'
            }`}
          >
            {active && (
              <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                <Check size={12} strokeWidth={3} className="text-white" />
              </span>
            )}
            <p className="text-sm font-semibold text-ink mb-2">{THEMES[id].label}</p>
            <div className="flex gap-1.5">
              {SWATCHES[id].map((c, i) => (
                <span key={i} className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: c }} />
              ))}
            </div>
            {active && (
              <p className="text-[10px] text-accent font-medium mt-2">Текущая тема</p>
            )}
          </button>
        );
      })}
    </div>
  );
}
