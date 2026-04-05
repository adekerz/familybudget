// src/hooks/useInstallPWA.ts
import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'pwa_install_dismissed_at';
const SHOW_AFTER_DAYS = 3;

export function useInstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = (navigator as unknown as { standalone?: boolean }).standalone === true;
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    const daysSinceDismiss = dismissed
      ? (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24)
      : Infinity;

    if (isIOSDevice && !isInStandaloneMode && daysSinceDismiss > SHOW_AFTER_DAYS) {
      setIsIOS(true);
      setCanInstall(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      if (daysSinceDismiss > SHOW_AFTER_DAYS) {
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setCanInstall(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setCanInstall(false);
      setDeferredPrompt(null);
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setCanInstall(false);
  };

  return { canInstall, isIOS, install, dismiss };
}
