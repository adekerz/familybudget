import { create } from 'zustand';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'warn' | 'error' | 'info';
}

interface ToastStore {
  toasts: Toast[];
  show: (message: string, type?: Toast['type'], duration?: number) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastStore>()((set) => ({
  toasts: [],

  show: (message, type = 'success', duration = 2500) => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },

  remove: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
