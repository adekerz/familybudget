import type { ReactNode } from 'react';
import { X } from '@phosphor-icons/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-card border border-border rounded-t-3xl sm:rounded-2xl p-6 animate-modal-in shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-ink">{title}</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-ink transition-colors p-1 rounded-lg hover:bg-sand"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
