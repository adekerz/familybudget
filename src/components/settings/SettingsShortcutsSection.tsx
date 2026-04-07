import { DeviceMobile, Plus, ArrowSquareOut } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

/**
 * Секция для iOS-пользователей: инструкция по созданию ярлыка «Добавить расход»
 * и ссылка на Shortcut (после того как пользователь его создаст и пришлёт ID).
 *
 * Замени SHORTCUT_ID ниже на реальный iCloud Shortcut ID после создания.
 */
const SHORTCUT_ID = 'e2ee880690374b1f951563d3902a9493';

export function SettingsShortcutsSection() {
  const { t } = useTranslation();
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  // Показываем всем — пусть скопируют ссылку и откроют на iPhone
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const deepLinkUrl = `${origin}/dashboard?type=expense`;

  return (
    <section className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <DeviceMobile size={16} style={{ color: 'var(--cer)' }} />
        <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>
          {isIOS ? t('shortcuts_title_ios') : t('shortcuts_title')}
        </p>
      </div>

      <div className="px-4 py-4 space-y-4">
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text3)' }}>
          {t('shortcuts_desc')}
        </p>

        {/* Deep-link URL для копирования */}
        <div className="rounded-xl p-3" style={{ background: 'var(--sand)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text3)' }}>
            {t('shortcut_url_label')}
          </p>
          <p className="text-xs font-mono break-all" style={{ color: 'var(--cer)' }}>
            {deepLinkUrl}
          </p>
        </div>

        {/* Shortcut из iCloud — показываем только если ID вставлен */}
        {SHORTCUT_ID ? (
          <a
            href={`https://www.icloud.com/shortcuts/${SHORTCUT_ID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl transition-all active:scale-[0.98]"
            style={{ background: 'var(--cer-light)', border: '1px solid var(--cer)' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--cer)' }}
            >
              <Plus size={20} color="#0B0F1A" weight="bold" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: 'var(--ink)' }}>{t('shortcut_install_label')}</p>
              <p className="text-xs" style={{ color: 'var(--text3)' }}>{t('shortcut_install_hint')}</p>
            </div>
            <ArrowSquareOut size={16} style={{ color: 'var(--cer)' }} />
          </a>
        ) : (
          <div
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: 'var(--sand)', border: '1px dashed var(--border)' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--border)' }}
            >
              <Plus size={20} style={{ color: 'var(--text3)' }} weight="bold" />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--ink)' }}>{t('shortcut_install_label')}</p>
              <p className="text-xs" style={{ color: 'var(--text3)' }}>{t('shortcut_not_configured')}</p>
            </div>
          </div>
        )}

        {/* Инструкция */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text3)' }}>
            {t('shortcut_instructions_title')}
          </p>
          {[
            t('shortcut_step_1'),
            t('shortcut_step_2'),
            t('shortcut_step_3', { url: deepLinkUrl }),
            t('shortcut_step_4'),
            t('shortcut_step_5'),
            t('shortcut_step_6'),
          ].map((step, i) => (
            <div key={i} className="flex gap-2.5">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                style={{ background: 'var(--cer-light)', color: 'var(--cer)' }}
              >
                {i + 1}
              </span>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text2)' }}>{step}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
