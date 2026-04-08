import type { ReactNode } from 'react';
import { X } from '@phosphor-icons/react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;       // default: 'max-w-lg'
  showDragHandle?: boolean; // default: true
}

export default function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
  showDragHandle = true,
}: BottomSheetProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`relative w-full ${maxWidth} rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto shadow-2xl animate-modal-in`}
        style={{ background: 'var(--card)' }}
      >
        <div className="px-6 pt-5 pb-1">
          {showDragHandle && (
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'var(--border)' }} />
          )}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-extrabold" style={{ color: 'var(--ink)' }}>
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl transition-colors"
              style={{ color: 'var(--text3)' }}
            >
              <X size={18} weight="bold" />
            </button>
          </div>
        </div>
        <div className="px-6 pb-8 space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}
