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
    <div className="fixed bottom-[72px] left-4 right-4 z-50" style={{ animation: 'fadeUp 0.2s ease both' }}>
      <div className="rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl" style={{ backgroundColor: '#1C2535', color: '#F0F6FF' }}>
        <p className="flex-1 text-sm font-medium truncate font-sans">{item.message}</p>
        <button
          onClick={() => {
            if (timerRef.current) clearTimeout(timerRef.current);
            item.onUndo();
            dismiss();
          }}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all active:scale-95 shrink-0 font-sans"
          style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#F0F6FF' }}
        >
          <ArrowCounterClockwise size={12} />
          Отмена
        </button>
      </div>
    </div>
  );
}
