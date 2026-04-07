import { useTranslation } from 'react-i18next';
import { Header } from '../components/layout/Header';
import { SettingsThemeSection } from '../components/settings/SettingsThemeSection';
import { SettingsIncomeSourcesSection } from '../components/settings/SettingsIncomeSourcesSection';
import { SettingsPayersSection } from '../components/settings/SettingsPayersSection';
import { SettingsDistributionSection } from '../components/settings/SettingsDistributionSection';
import { SettingsFixedExpensesSection } from '../components/settings/SettingsFixedExpensesSection';
import { SettingsCategoryLimitsSection } from '../components/settings/SettingsCategoryLimitsSection';
import { SettingsSecuritySection } from '../components/settings/SettingsSecuritySection';
import { SettingsDataSection } from '../components/settings/SettingsDataSection';
import { SettingsLanguageSection } from '../components/settings/SettingsLanguageSection';
import { RecurringSection } from '../components/settings/RecurringSection';
import { SettingsAccountsSection } from '../components/settings/SettingsAccountsSection';
import { SettingsShortcutsSection } from '../components/settings/SettingsShortcutsSection';

export function SettingsPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-primary pb-24">
      <Header />
      <main className="px-4 pt-4 space-y-6 max-w-lg mx-auto">
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text3)' }}>{t('appearance')}</h2>
          <SettingsLanguageSection />
          <SettingsThemeSection />
        </div>
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text3)' }}>{t('finance_settings')}</h2>
          <SettingsIncomeSourcesSection />
          <SettingsPayersSection />
          <SettingsDistributionSection />
          <SettingsAccountsSection />
          <SettingsFixedExpensesSection />
          <SettingsCategoryLimitsSection />
          <RecurringSection />
        </div>
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text3)' }}>{t('security')}</h2>
          <SettingsSecuritySection />
        </div>
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text3)' }}>{t('data_section')}</h2>
          <SettingsShortcutsSection />
          <SettingsDataSection />
        </div>
        <p className="text-center text-muted text-xs pb-2">Flux v2.0 · {t('settings_footer')}</p>
      </main>
    </div>
  );
}
