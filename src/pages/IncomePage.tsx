import { useState } from 'react';
import { Plus } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { Header } from '../components/layout/Header';
import { IncomeList } from '../components/income/IncomeList';
import { IncomeForm } from '../components/income/IncomeForm';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

export function IncomePage() {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  usePullToRefresh();

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-28">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-ink">{t('income_tab')}</h2>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-accent text-white text-sm font-semibold px-3.5 py-2 rounded-xl transition-all active:scale-95 hover:bg-accent/90"
          >
            <Plus size={16} />
            {t('add_income')}
          </button>
        </div>

        <IncomeList />
      </main>

      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-accent rounded-full flex items-center justify-center shadow-lg shadow-accent/30 active:scale-95 transition-transform z-30"
        aria-label={t('add_income')}
      >
        <Plus size={24} className="text-white" />
      </button>

      {showForm && <IncomeForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
