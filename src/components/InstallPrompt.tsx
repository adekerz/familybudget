// src/components/InstallPrompt.tsx
import { X, ArrowDown } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useInstallPWA } from '../hooks/useInstallPWA';

export function InstallPrompt() {
  const { t } = useTranslation();
  const { canInstall, isIOS, install, dismiss } = useInstallPWA();

  if (!canInstall) return null;

  if (isIOS) {
    return (
      <div className="fixed bottom-24 left-4 right-4 z-40 bg-card border border-border rounded-2xl p-4 shadow-lg">
        <div className="flex items-start justify-between mb-2">
          <p className="text-sm font-semibold text-ink">{t('install_app_title')}</p>
          <button onClick={dismiss}><X size={16} className="text-muted" /></button>
        </div>
        <p className="text-xs text-muted">
          {t('install_app_ios')}
        </p>
        <div className="flex items-center justify-center mt-2 text-accent animate-bounce">
          <ArrowDown size={20} />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-24 left-4 right-4 z-40 bg-accent text-white rounded-2xl p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">{t('install_flux_title')}</p>
          <p className="text-xs text-white/70">{t('install_flux_desc')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={install}
            className="bg-white text-accent text-xs font-bold px-3 py-2 rounded-xl"
          >
            {t('install_btn')}
          </button>
          <button onClick={dismiss}><X size={16} className="text-white/70" /></button>
        </div>
      </div>
    </div>
  );
}
