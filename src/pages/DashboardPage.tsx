import { useState, useEffect } from 'react';
import { TrendUp } from '@phosphor-icons/react';
import { Header } from '../components/layout/Header';
import { HeroCard } from '../components/dashboard/HeroCard';
import { BankBreakdown } from '../components/dashboard/BankBreakdown';
import { CategoryCards } from '../components/dashboard/CategoryCards';
import { RecentExpenses } from '../components/dashboard/RecentExpenses';
import { SetupChecklist } from '../components/dashboard/SetupChecklist';
import { UpcomingPaymentsWidget } from '../components/dashboard/UpcomingPaymentsWidget';
import { Skeleton } from '../components/ui/Skeleton';
import { AIInsightCard } from '../components/ui/AIInsightCard';
import { useTranslation } from 'react-i18next';
import { useIncomeStore } from '../store/useIncomeStore';
import { useExpenseStore } from '../store/useExpenseStore';
import { usePayPeriodStore } from '../store/usePayPeriodStore';
import { useCategoryStore } from '../store/useCategoryStore';
import { useEngine } from '../store/useFinanceEngine';
import { buildAIContext } from '../lib/aiContext';
import { useAIInsight } from '../hooks/useAIInsight';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

export function DashboardPage() {
  usePullToRefresh();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const incomes = useIncomeStore((s) => s.incomes);
  const incomeLoading = useIncomeStore((s) => s.loading);
  const expenseLoading = useExpenseStore((s) => s.loading);
  const isLoading = incomeLoading || expenseLoading;

  const expenses = useExpenseStore((s) => s.expenses);
  const payPeriodSummary = usePayPeriodStore(s => s.summary);
  const categories = useCategoryStore((s) => s.categories);
  const engine = useEngine();

  const [dbInsight, setDbInsight] = useState<string | null>(null);

  // Загрузить инсайт из БД
  useEffect(() => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return;
    supabase
      .from('ai_insights')
      .select('text, created_at')
      .eq('space_id', spaceId)
      .is('read_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setDbInsight(data.text);
      });
  }, []);

  const aiPrompt = engine
    ? buildAIContext(engine, expenses.slice(0, 50), categories)
    : '';

  const { insight: dashboardInsight } = useAIInsight('dashboard', () => aiPrompt, [aiPrompt]);

  const activeInsight = dbInsight ?? dashboardInsight;

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 px-4 pt-4 pb-28 space-y-4">
          <Skeleton className="h-40 w-full" />
          <div className="flex gap-3">
            <Skeleton className="h-24 flex-1" />
            <Skeleton className="h-24 flex-1" />
            <Skeleton className="h-24 flex-1" />
          </div>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-40 w-full" />
        </main>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-4">
        {incomes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 bg-alice border border-alice-dark rounded-3xl flex items-center justify-center mb-5">
              <TrendUp size={36} className="text-accent" />
            </div>
            <h2 className="text-ink font-bold text-lg mb-2">{t('welcome')}</h2>
            <p className="text-muted text-sm max-w-xs">
              {t('welcome_desc')}
            </p>
          </div>
        ) : (
          <>
            {/* Hero: безопасно потратить */}
            <HeroCard />

            {/* Onboarding checklist — скрываем если пользователь уже прошёл онбординг */}
            {!user?.onboarded && <SetupChecklist />}

            {/* Предстоящие платежи */}
            {payPeriodSummary && payPeriodSummary.upcomingDays7.length > 0 && (
              <UpcomingPaymentsWidget transactions={payPeriodSummary.upcomingDays7} />
            )}

            {/* AI совет */}
            <AIInsightCard insight={activeInsight} isLoading={!activeInsight} />

            {/* Budget categories breakdown */}
            <CategoryCards />

            {/* Расходы по банкам */}
            <BankBreakdown />

            {/* Последние транзакции */}
            <RecentExpenses />
          </>
        )}
      </main>
    </div>
  );
}
