import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Trash, CaretRight, SignOut } from '@phosphor-icons/react';
import { useAuthStore } from '../../store/useAuthStore';
import { useIncomeStore } from '../../store/useIncomeStore';
import { useExpenseStore } from '../../store/useExpenseStore';
import { useGoalsStore } from '../../store/useGoalsStore';
import { useBudgetSummary } from '../../store/useBudgetStore';
import { useToastStore } from '../../store/useToastStore';
import { generateBudgetPDF } from '../../lib/pdfExport';
import { useCategoryStore } from '../../store/useCategoryStore';
import { supabase } from '../../lib/supabase';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

export function SettingsDataSection() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const showToast = useToastStore((s) => s.show);

  const incomes = useIncomeStore((s) => s.incomes);
  const expenses = useExpenseStore((s) => s.expenses);
  const goals = useGoalsStore((s) => s.goals);
  const categories = useCategoryStore((s) => s.categories);
  const summary = useBudgetSummary();

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  function getCategoryName(id: string): string {
    return categories.find((c) => c.id === id)?.name ?? id;
  }

  function handleDownloadPDF() {
    generateBudgetPDF(incomes, expenses, goals, summary, getCategoryName);
  }

  async function handleClearAll() {
    const spaceId = user?.spaceId;
    if (spaceId) {
      await Promise.all([
        supabase.from('incomes').delete().eq('space_id', spaceId),
        supabase.from('expenses').delete().eq('space_id', spaceId),
        supabase.from('goals').delete().eq('space_id', spaceId),
      ]);
    }
    useIncomeStore.getState().clearAll();
    useExpenseStore.getState().clearAll();
    useGoalsStore.getState().clearAll();
    setShowClearConfirm(false);
    showToast(t('data_cleared'), 'success');
  }

  return (
    <>
      <section className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="font-semibold text-ink text-sm">{t('settings_data_title')}</p>
          <p className="text-muted text-xs mt-0.5">
            {t('data_summary', { incomes: incomes.length, expenses: expenses.length, goals: goals.length })}
          </p>
        </div>
        <div className="divide-y divide-border">
          <button
            onClick={handleDownloadPDF}
            className="flex items-center justify-between w-full px-4 py-3 hover:bg-primary/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-accent-light flex items-center justify-center">
                <FileText size={15} className="text-accent" />
              </div>
              <span className="text-ink text-sm">{t('download_pdf')}</span>
            </div>
            <CaretRight size={14} className="text-muted" />
          </button>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center justify-between w-full px-4 py-3 hover:bg-primary/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-danger-bg flex items-center justify-center">
                <Trash size={15} className="text-danger" />
              </div>
              <span className="text-danger text-sm">{t('clear_all_data')}</span>
            </div>
            <CaretRight size={14} className="text-muted" />
          </button>
        </div>
      </section>

      <section className="bg-card border border-border rounded-2xl overflow-hidden">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-4 py-4 hover:bg-primary/70 transition-colors"
        >
          <div className="w-8 h-8 rounded-xl bg-danger-bg flex items-center justify-center">
            <SignOut size={15} className="text-danger" />
          </div>
          <span className="text-danger font-medium text-sm">{t('sign_out')}</span>
        </button>
      </section>

      <Modal isOpen={showClearConfirm} onClose={() => setShowClearConfirm(false)} title={t('clear_data_title')}>
        <div className="space-y-4">
          <p className="text-muted text-sm">{t('clear_data_confirm')}</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setShowClearConfirm(false)} className="flex-1">{t('cancel')}</Button>
            <Button variant="danger" onClick={handleClearAll} className="flex-1">{t('clear_all_btn')}</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
