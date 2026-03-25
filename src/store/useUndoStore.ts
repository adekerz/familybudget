import { create } from 'zustand';

interface UndoItem {
    id: string;
    message: string;
    onUndo: () => void;
    onConfirm: () => void;
    duration: number;
}

interface UndoStore {
    item: UndoItem | null;
    show: (item: Omit<UndoItem, 'id'>) => void;
    dismiss: () => void;
}

export const useUndoStore = create<UndoStore>((set, get) => ({
    item: null,
    show: (item) => {
        // Если уже есть item — подтвердить его
        const current = get().item;
        if (current) current.onConfirm();
        set({ item: { ...item, id: crypto.randomUUID(), duration: item.duration ?? 5000 } });
    },
    dismiss: () => set({ item: null }),
}));
