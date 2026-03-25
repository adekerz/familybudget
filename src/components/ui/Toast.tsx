import { useToastStore } from '../../store/useToastStore';
import { Icon } from '../../lib/icons';

const TYPE_STYLES: Record<string, { border: string; icon: string; iconName: string }> = {
  success: { border: 'border-l-success', icon: 'text-success', iconName: 'Shield' },
  warn:    { border: 'border-l-warning', icon: 'text-warning', iconName: 'Zap' },
  error:   { border: 'border-l-danger',  icon: 'text-danger',  iconName: 'Zap' },
  info:    { border: 'border-l-accent',  icon: 'text-accent',  iconName: 'Target' },
};

export function Toast() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[min(calc(100vw-32px),360px)]">
      {toasts.map((t) => {
        const style = TYPE_STYLES[t.type] ?? TYPE_STYLES.info;
        return (
          <div
            key={t.id}
            className={`animate-slide-down bg-card border border-border ${style.border} border-l-[3px] rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg`}
          >
            <Icon name={style.iconName} size={16} strokeWidth={2} className={style.icon} />
            <p className="text-sm text-ink font-medium font-sans">{t.message}</p>
          </div>
        );
      })}
    </div>
  );
}
