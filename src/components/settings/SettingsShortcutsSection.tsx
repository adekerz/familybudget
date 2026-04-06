import { DeviceMobile, Plus, ArrowSquareOut } from '@phosphor-icons/react';

/**
 * Секция для iOS-пользователей: инструкция по созданию ярлыка «Добавить расход»
 * и ссылка на Shortcut (после того как пользователь его создаст и пришлёт ID).
 *
 * Замени SHORTCUT_ID ниже на реальный iCloud Shortcut ID после создания.
 */
const SHORTCUT_ID = 'e2ee880690374b1f951563d3902a9493';

export function SettingsShortcutsSection() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  // Показываем всем — пусть скопируют ссылку и откроют на iPhone
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const deepLinkUrl = `${origin}/dashboard?type=expense`;

  return (
    <section className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <DeviceMobile size={16} style={{ color: 'var(--cer)' }} />
        <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>
          {isIOS ? 'Быстрые команды iPhone' : 'Интеграция с iPhone'}
        </p>
      </div>

      <div className="px-4 py-4 space-y-4">
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text3)' }}>
          Добавь ярлык на экран «Домой» — один тап и сразу форма расхода, без открытия браузера.
        </p>

        {/* Deep-link URL для копирования */}
        <div className="rounded-xl p-3" style={{ background: 'var(--sand)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text3)' }}>
            URL для Shortcut
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
              <p className="text-sm font-bold" style={{ color: 'var(--ink)' }}>Flux: Добавить расход</p>
              <p className="text-xs" style={{ color: 'var(--text3)' }}>Нажми для установки ярлыка →</p>
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
              <p className="text-sm font-bold" style={{ color: 'var(--ink)' }}>Flux: Добавить расход</p>
              <p className="text-xs" style={{ color: 'var(--text3)' }}>Ярлык ещё не настроен</p>
            </div>
          </div>
        )}

        {/* Инструкция */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text3)' }}>
            Как создать ярлык (2 минуты)
          </p>
          {[
            'Открой приложение «Команды» на iPhone',
            'Нажми «+» → «Добавить действие» → найди «URL»',
            `Вставь URL: ${deepLinkUrl}`,
            'Добавь ещё одно действие: «Открыть URL»',
            'Нажми «Поделиться» (квадрат со стрелкой) → «Добавить на экран Домой»',
            'Введи название «Flux» и выбери иконку',
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
