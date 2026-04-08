import type { Icon } from '@phosphor-icons/react';

interface EmptyStateProps {
  icon: Icon;
  title: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: IconComp, title, hint, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <IconComp size={40} weight="thin" style={{ color: 'var(--text3)' }} />
      <p className="text-sm font-semibold mt-3" style={{ color: 'var(--ink)' }}>{title}</p>
      {hint && (
        <p className="text-xs mt-1 max-w-[240px]" style={{ color: 'var(--text3)' }}>{hint}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
          style={{ background: 'var(--cer)', color: '#fff' }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
