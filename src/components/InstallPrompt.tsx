// src/components/InstallPrompt.tsx
import { X, ArrowDown } from '@phosphor-icons/react';
import { useInstallPWA } from '../hooks/useInstallPWA';

export function InstallPrompt() {
  const { canInstall, isIOS, install, dismiss } = useInstallPWA();

  if (!canInstall) return null;

  if (isIOS) {
    return (
      <div className="fixed bottom-24 left-4 right-4 z-40 bg-card border border-border rounded-2xl p-4 shadow-lg">
        <div className="flex items-start justify-between mb-2">
          <p className="text-sm font-semibold text-ink">Установить приложение</p>
          <button onClick={dismiss}><X size={16} className="text-muted" /></button>
        </div>
        <p className="text-xs text-muted">
          Нажми <strong>Поделиться</strong> → <strong>На экран «Домой»</strong>
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
          <p className="text-sm font-semibold">Установить Flux</p>
          <p className="text-xs text-white/70">Работает офлайн, быстрее браузера</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={install}
            className="bg-white text-accent text-xs font-bold px-3 py-2 rounded-xl"
          >
            Установить
          </button>
          <button onClick={dismiss}><X size={16} className="text-white/70" /></button>
        </div>
      </div>
    </div>
  );
}
