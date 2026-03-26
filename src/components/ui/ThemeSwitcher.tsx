import { useThemeStore } from '../../store/useThemeStore';
import { useToastStore } from '../../store/useToastStore';
import { useAuthStore } from '../../store/useAuthStore';
import { THEMES } from '../../lib/themes';
import { Check, Sun, Moon } from '@phosphor-icons/react';

function useIsFamily() {
  const user = useAuthStore((s) => s.user);
  return user?.spaceName?.toLowerCase() === 'family';
}

export function ThemeSwitcherCompact() {
  const { themeId, setTheme } = useThemeStore();
  const isFamily = useIsFamily();

  function toggle() {
    if (isFamily) {
      const next = themeId === 'wife' ? 'husband' : 'wife';
      setTheme(next);
    } else {
      const next = themeId === 'dark' ? 'light' : 'dark';
      setTheme(next);
    }
    useToastStore.getState().show('Тема изменена');
  }

  const isDark = isFamily ? themeId === 'husband' : themeId === 'dark';

  return (
    <button
      onClick={toggle}
      className="w-9 h-9 rounded-xl bg-accent text-white flex items-center justify-center active:scale-95 transition-transform"
      aria-label="Переключить тему"
    >
      {isDark
        ? <Sun size={16} strokeWidth={2} />
        : <Moon size={16} strokeWidth={2} />
      }
    </button>
  );
}

export function ThemeSwitcherFull() {
  const { themeId, setTheme } = useThemeStore();
  const isFamily = useIsFamily();

  const options = isFamily
    ? (['wife', 'husband'] as const)
    : (['light', 'dark'] as const);

  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((id) => {
        const active = themeId === id;
        return (
          <button
            key={id}
            onClick={() => {
              setTheme(id);
              useToastStore.getState().show('Тема изменена');
            }}
            className={`relative rounded-xl px-4 py-3 text-left transition-all active:scale-[0.97] ${
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
            <p className="text-sm font-semibold text-ink">{THEMES[id].label}</p>
            {active && (
              <p className="text-[10px] text-accent font-medium mt-1">Текущая тема</p>
            )}
          </button>
        );
      })}
    </div>
  );
}
