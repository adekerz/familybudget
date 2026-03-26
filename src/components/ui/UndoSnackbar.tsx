import { useEffect, useRef } from 'react';
import { ArrowCounterClockwise } from '@phosphor-icons/react';
import { useUndoStore } from '../../store/useUndoStore';

export function UndoSnackbar() {
  const { item, dismiss } = useUndoStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!item) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      item.onConfirm();
      dismiss();
    }, item.duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [item?.id]);

  if (!item) return null;

  return (
    <div className="fixed bottom-[72px] left-4 right-4 z-45 animate-slide-up">
      <div className="bg-ink text-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl">
        <p className="flex-1 text-sm font-medium truncate">{item.message}</p>
        <button
          onClick={() => {
            if (timerRef.current) clearTimeout(timerRef.current);
            item.onUndo();
            dismiss();
          }}
          className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-all active:scale-95 shrink-0"
        >
          <ArrowCounterClockwise size={12} />
          Отмена
        </button>
      </div>
    </div>
  );
}
