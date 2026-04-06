// src/components/FAB.tsx
import { Plus } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

interface Props {
  onClick: () => void;
}

export function FAB({ onClick }: Props) {
  const { t } = useTranslation();
  return (
    <button
      onClick={onClick}
      className="fixed bottom-[84px] right-4 w-14 h-14 rounded-full bg-accent text-white shadow-lg
                 flex items-center justify-center active:scale-95 transition-all z-30
                 hover:bg-accent/90"
      aria-label={t('add_transaction')}
    >
      <Plus size={26} weight="bold" />
    </button>
  );
}
