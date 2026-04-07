# FLUX — Единый UI / Исправление багов / Доработка функционала

## Контекст проекта
React 19 + TypeScript + Vite + Tailwind CSS + Zustand + Supabase. PWA для управления семейным бюджетом (KZT). Тёмная тема (Flux brand) — основная. CSS-переменные: `--card`, `--border`, `--ink`, `--cer`, `--sand`, `--text3`, `--page`. Анимация `animate-modal-in` уже определена в tailwind.config.ts.

---

## ЧАСТЬ 1: Единый компонент BottomSheet-модалки

### Проблема
Сейчас 5+ разных паттернов модалок:
- `DebtsPage.tsx` / `DepositsPage.tsx` — inline `<div className="fixed inset-0 z-50 flex items-end">` с `rounded-3xl p-6`
- `ExpenseForm.tsx` / `IncomeForm.tsx` — inline `<div className="fixed inset-0 z-50 flex items-end">` с `rounded-t-3xl pt-5 pb-8 px-5` + drag-handle
- `GoalsPage.tsx` / `SettingsFixedExpensesSection.tsx` / `SettingsIncomeSourcesSection.tsx` — компонент `Modal` из `src/components/ui/Modal.tsx` (rounded-t-3xl на mobile, centered на desktop)
- `RecurringSection.tsx` — inline раскрывающаяся форма без модалки
- `BudgetPage` модалки (CreatePayPeriodModal, AddPlannedTransactionModal, AddSinkingFundModal) — inline с `animate-modal-in`

### Задача
Переписать `src/components/ui/Modal.tsx` → универсальный `BottomSheet` компонент. ВСЕ модалки во всём приложении должны использовать только его.

### Спецификация компонента `BottomSheet`

```tsx
// src/components/ui/BottomSheet.tsx
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;       // default: 'max-w-lg'
  showDragHandle?: boolean; // default: true
}
```

**Дизайн (взять за основу стиль DebtsPage):**
- Overlay: `fixed inset-0 z-50 bg-black/50 backdrop-blur-sm`
- Контейнер: `flex items-end justify-center p-4` (на mobile), `flex items-center justify-center p-4` (на `sm:`)
- Контент: `w-full {maxWidth} rounded-3xl p-6 space-y-4 animate-modal-in shadow-2xl` с `background: var(--card)`
- Drag-handle (если `showDragHandle`): `<div className="w-10 h-1 rounded-full mx-auto mb-2" style={{ background: 'var(--border)' }} />`
- Заголовок: `<h3 className="text-lg font-extrabold" style={{ color: 'var(--ink)' }}>{title}</h3>`
- Кнопка закрытия (X) справа от заголовка
- Клик по overlay → `onClose()`
- `max-h-[92vh] overflow-y-auto` на контенте
- **На mobile (до `sm:`)**: прижат к низу (`items-end`), `rounded-t-3xl` (нижние углы прямые), без padding снизу у overlay
- **На desktop (`sm:+`)**: по центру (`items-center`), полностью `rounded-3xl`

### Файлы для рефакторинга

1. **`src/components/ui/Modal.tsx`** → переименовать в `BottomSheet.tsx`, обновить экспорт
2. **`src/pages/DebtsPage.tsx`** — строки 230-301 (add debt modal) и 304-339 (pay modal) → заменить на `<BottomSheet>`
3. **`src/pages/DepositsPage.tsx`** — строки 112-124 (calculator modal) → заменить на `<BottomSheet>`
4. **`src/components/expenses/ExpenseForm.tsx`** — строки 107-109 (outer wrapper) → заменить на `<BottomSheet>`
5. **`src/components/income/IncomeForm.tsx`** — строки 91-95 (outer wrapper) → заменить на `<BottomSheet>`
6. **`src/pages/GoalsPage.tsx`** — строки 59-68 → уже использует Modal, обновить импорт
7. **`src/components/settings/SettingsIncomeSourcesSection.tsx`** — строка 83 → обновить импорт
8. **`src/components/settings/SettingsFixedExpensesSection.tsx`** — строка 117 → обновить импорт
9. **`src/components/budget/CreatePayPeriodModal.tsx`** — заменить inline модалку на `<BottomSheet>`
10. **`src/components/budget/AddPlannedTransactionModal.tsx`** — заменить inline модалку на `<BottomSheet>`
11. **`src/components/budget/AddSinkingFundModal.tsx`** — заменить inline модалку на `<BottomSheet>`
12. **`src/components/settings/RecurringSection.tsx`** — строки 61-128 (inline form) → вынести в `<BottomSheet>` модалку
13. **`src/pages/AuthPage.tsx`** — строка 776 (модалка восстановления) → заменить на `<BottomSheet>`

**ВАЖНО:** Удалить старый файл `src/components/ui/Modal.tsx` после миграции. Убедиться, что все импорты обновлены. `grep -rn "from.*Modal" src/` для проверки.

---

## ЧАСТЬ 2: Единые пустые состояния (Empty State)

### Проблема
Разные паттерны пустых состояний:
- DebtsPage / DepositsPage / GoalsList — красивый: иконка (Phosphor, `weight="thin"`, `size={40}`) + заголовок + подсказка + кнопка CTA
- ExpensesPage — просто `<p className="text-muted text-sm">`
- IncomeList — иконка в квадрате + 2 строки текста (но без кнопки)
- RecurringSection — просто `<p className="text-sm">`
- SettingsFixedExpensesSection — просто `<p className="text-muted text-xs">`
- SettingsAccountsSection — просто `<p>`

### Задача
Создать переиспользуемый компонент `EmptyState` и заменить им ВСЕ пустые состояния.

### Спецификация

```tsx
// src/components/ui/EmptyState.tsx
interface EmptyStateProps {
  icon: React.ComponentType<{ size: number; weight: string; style: React.CSSProperties }>;
  title: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
}
```

**Дизайн (эталон — DebtsPage, строки 97-111):**
```
<div className="flex flex-col items-center py-12 text-center">
  <Icon size={40} weight="thin" style={{ color: 'var(--text3)' }} />
  <p className="text-sm font-semibold mt-3" style={{ color: 'var(--ink)' }}>{title}</p>
  {hint && <p className="text-xs mt-1 max-w-[240px]" style={{ color: 'var(--text3)' }}>{hint}</p>}
  {actionLabel && onAction && (
    <button onClick={onAction}
      className="mt-4 px-5 py-2.5 rounded-xl text-sm font-bold"
      style={{ background: 'var(--cer)', color: '#fff' }}>
      {actionLabel}
    </button>
  )}
</div>
```

### Файлы для рефакторинга

| Файл | Текущее пустое состояние | Иконка |
|---|---|---|
| `ExpensesPage.tsx:136-139` | `<p className="text-muted">` | `ShoppingCart` (Phosphor) |
| `IncomeList.tsx:36-44` | Квадрат с иконкой + текст, без CTA кнопки | `TrendUp` (уже есть, добавить кнопку) |
| `RecurringSection.tsx:133-134` | `<p className="text-sm">` | `ArrowsClockwise` |
| `SettingsFixedExpensesSection.tsx:58-63` | `<p className="text-muted text-xs">` | `Lock` |
| `SettingsAccountsSection.tsx:93-95` | `<p className="text-sm">` | `Bank` (Phosphor) |
| `SettingsPayersSection.tsx` (если нет плательщиков) | Нет empty state вообще | `Users` |

**Страницы DebtsPage, DepositsPage, GoalsList** — уже в правильном формате, но нужно заменить inline-код на `<EmptyState>` для консистентности.

---

## ЧАСТЬ 3: Исправление горизонтального скролла на ExpensesPage

### Проблема
`ExpensesPage.tsx:115` — `<div className="flex gap-2 overflow-x-auto pb-0.5">` с filter chips + `ml-auto` итоговая сумма в том же flex-контейнере. На узких экранах (<375px) вызывает горизонтальный скролл всей страницы.

### Решение
1. Разделить фильтр-чипы и итоговую сумму на два ряда
2. Фильтр-чипы — `flex gap-2 overflow-x-auto no-scrollbar pb-1`
3. Итоговая сумма — отдельный div под чипами, `flex items-center justify-end gap-1`
4. Добавить в `index.css`:
```css
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
```
5. Проверить что на `<main>` есть `overflow-x-hidden`
6. На `<html>` и `<body>` добавить `overflow-x: hidden` если отсутствует
7. Проверить все `overflow-x-auto` контейнеры в проекте (`grep -rn "overflow-x-auto" src/`) и убедиться что они не пробивают ширину viewport

---

## ЧАСТЬ 4: Исправление «23 дн. до конца периода»

### Проблема
В `src/lib/calculations.ts:66-67` — если `period === null`, автоматически берётся текущий месяц (`getMonthStart()` / `getMonthEnd()`). Это рудимент от удалённых «Планов». Текст «23 дн. до конца периода» в `HeroCard.tsx:52` показывается всегда.

### Текущая логика
- `useFinanceEngine.ts` → берёт `activePeriod` из `usePayPeriodStore`
- Если `activePeriod === null` → `period = null` → `computeEngineResult` использует авто-период (начало/конец месяца)
- `HeroCard.tsx:52` показывает `t('days_left', { count: daysRemaining })` — всегда

### Новая логика
Период должен определяться по **«Источникам и датам поступлений»** (`useSettingsStore.incomeSources`):

1. **Если есть incomeSources** — период = от ближайшей прошедшей даты поступления до ближайшей будущей даты поступления
   - Каждый `incomeSource` имеет `day: number | 'last'` (число месяца)
   - Найти ближайшую прошлую дату поступления (может быть из прошлого месяца)
   - Найти ближайшую будущую дату поступления (может быть из следующего месяца)
   - Это и есть текущий период
   - Текст: `{daysRemaining} дн. до поступления` (или `t('days_until_income', { count: daysRemaining })`)
2. **Если нет incomeSources** — показать текст-подсказку «Настройте источники дохода» с кнопкой перехода в настройки, вместо «X дн. до конца периода»
3. **Если есть activePeriod** (из pay_periods) — использовать его как приоритет (обратная совместимость)

### Файлы для изменений

1. **`src/lib/calculations.ts`** — добавить параметр `incomeSources` в `computeEngineResult`. Если `period === null` и есть `incomeSources` с датами → вычислить период из них. Добавить новое поле `periodSource: 'pay_period' | 'income_sources' | 'auto_month'` в `EngineResult`.

2. **`src/store/useFinanceEngine.ts`** — передавать `incomeSources` из `useSettingsStore.getState().incomeSources` в `computeEngineResult`.

3. **`src/components/dashboard/HeroCard.tsx:51-53`** — изменить текст:
   - Если `periodSource === 'income_sources'`: `t('days_until_income', { count: daysRemaining })`
   - Если `periodSource === 'pay_period'`: `t('days_left', { count: daysRemaining })`
   - Если `periodSource === 'auto_month'` и нет incomeSources: показать подсказку настроить источники

4. **i18n** — добавить ключи `days_until_income`, `setup_income_sources_hint`

---

## ЧАСТЬ 5: Удалить рудимент «Безопасно потратить» из ExpenseForm

### Проблема
В `src/components/expenses/ExpenseForm.tsx:42-46` и `298-322` — виджет «Безопасно потратить» (SafeToSpend) при добавлении расхода. Использует `usePayPeriodStore.summary.safeToSpend`. Это рудимент от удалённой страницы «План» — safeToSpend из PayPeriodStore больше не актуален.

### Решение

**Вариант А (удалить):** Полностью удалить блок строки 298-322 и строки 42-46 (импорт `usePayPeriodStore` и вычисление `safeToSpend`/`afterSpend`). Убрать `import { usePayPeriodStore }` если больше нигде не используется.

**Вариант Б (заменить на Engine):** Если хочешь оставить индикатор — заменить источник данных: вместо `usePayPeriodStore(s => s.summary)` использовать `useEngine()` из `useFinanceEngine` и показывать `engine.safeToSpend`. Но стилизацию `bg-red-50 border border-red-200` заменить на CSS-переменные (`var(--expense-bg)`, `var(--danger)` и т.д.), чтобы работало в тёмной теме.

**Рекомендация:** Вариант А (удалить) — чище. Если нужен — вернёшь позже с правильной логикой.

### Файлы
- `src/components/expenses/ExpenseForm.tsx` — удалить строки 11 (`import usePayPeriodStore`), 42-46 (safeToSpend вычисление), 298-322 (JSX блок)

---

## ЧАСТЬ 6: Скролл в «Распределение дохода»

### Проблема
В `src/components/settings/SettingsDistributionSection.tsx` — range-слайдеры (`<input type="range">`) некорректно работают на mobile при скролле (touch-конфликт). 

### Решение
1. Обернуть секцию слайдеров в контейнер с `touch-action: pan-y` или `touch-action: none` на самих слайдерах
2. Добавить на `<input type="range">` стиль: `style={{ touchAction: 'none' }}` — это предотвратит перехват скролла при перетаскивании ползунка
3. Проверить, что секция не находится внутри `overflow-x: auto` контейнера

---

## ЧАСТЬ 7: Единый дизайн добавления в настройках

### Проблема
Каждая секция в настройках добавляет элементы по-своему:
- **SettingsPayersSection** — inline: input + маленькая кнопка Plus в footer секции
- **SettingsAccountsSection** — кнопка «+ Добавить» в header → раскрывается inline-форма в body
- **SettingsIncomeSourcesSection** — кнопка «+ Добавить» в header → открывается модалка (Modal)
- **SettingsFixedExpensesSection** — кнопка «+ Добавить» в header → открывается модалка (Modal)
- **RecurringSection** — кнопка «+ Добавить» → раскрывается inline-форма без модалки, причём секция не обёрнута в card (отличается визуально)

### Задача
Все секции должны использовать **единый паттерн** — как в `SettingsIncomeSourcesSection` и `SettingsFixedExpensesSection`:
- Кнопка `+ Добавить` в header секции (справа)
- При клике → открывается `<BottomSheet>` модалка с формой
- Форма внутри модалки: label + input для каждого поля, кнопки Cancel/Save внизу
- Все inputs: `w-full bg-card border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-accent`

### Рефакторинг по файлам

#### 1. `SettingsPayersSection.tsx` — полный рефакторинг
**Сейчас:** inline input + Plus button в footer
**Должно быть:**
- Header: иконка `Users` + «Кто платил» + кнопка `+ Добавить` (справа)
- Список плательщиков (как сейчас, не менять)
- При «+ Добавить» → `<BottomSheet title={t('add_payer')}>`
- Форма внутри: одно поле «Имя» + кнопки Cancel/Save
- При редактировании (клик на Pencil) → тоже `<BottomSheet title={t('edit_payer')}>` с полем имени

#### 2. `SettingsAccountsSection.tsx` — мелкий рефакторинг
**Сейчас:** inline раскрывающаяся форма (showAdd toggle)
**Должно быть:**
- При «+ Добавить» → `<BottomSheet title={t('add_account')}>`
- Форма: Название счёта + Начальный баланс + кнопки Cancel/Save
- Стиль формы: как в SettingsFixedExpensesSection (label + input с ₸ для суммы)

#### 3. `RecurringSection.tsx` — значительный рефакторинг
**Сейчас:** отдельная секция без card-обёртки, inline форма
**Должно быть:**
- Обернуть в `<section className="bg-card border border-border rounded-2xl overflow-hidden">` как все остальные секции
- Header: иконка `ArrowsClockwise` + «Повторяющиеся платежи» + кнопка `+ Добавить`
- Список элементов в `divide-y divide-border`
- Empty state через компонент `<EmptyState>`
- При «+ Добавить» → `<BottomSheet title={t('add_recurring')}>`
- Форма: Название + Сумма + Категория + Периодичность + День месяца (если monthly) + кнопки Cancel/Save

#### 4. `SettingsIncomeSourcesSection.tsx` — минимальный
Уже использует Modal. Обновить импорт на `BottomSheet`. Проверить стилизацию формы.

#### 5. `SettingsFixedExpensesSection.tsx` — минимальный
Уже использует Modal. Обновить импорт на `BottomSheet`. Всё ОК.

---

## ЧАСТЬ 8: Полная адаптация под телефоны

### Чеклист мобильной адаптации (проверить ВСЁ):

1. **`overflow-x: hidden`** на `<html>` и `<body>` в `index.css`
2. Все `overflow-x-auto` контейнеры — проверить, что не пробивают viewport
3. **`max-w-lg mx-auto`** — на всех страницах-контейнерах для ограничения ширины
4. Все таблицы/гриды — проверить на 320px ширину
5. **Font-size** — не меньше 12px для читаемости
6. **Touch targets** — минимум 44x44px для кнопок (Apple HIG)
7. **Input fields** — `font-size: 16px` минимум (предотвращает zoom на iOS)
8. **Safe area** — `padding-bottom: env(safe-area-inset-bottom)` для нижнего nav на iPhone с вырезом
9. **BottomNav** — проверить что контент не перекрывается (pb-24 на всех страницах)
10. **Модалки** — `max-h-[92vh]` + `overflow-y-auto` + safe area padding

### Файлы для проверки/исправления
- `src/index.css` — добавить глобальные стили
- Все файлы в `src/pages/` — проверить pb-24 и overflow-x
- `src/components/layout/BottomNav.tsx` — safe area
- `src/components/layout/AppShell.tsx` — overflow-x: hidden

---

## Порядок выполнения

1. Создать `BottomSheet.tsx` (Часть 1)
2. Создать `EmptyState.tsx` (Часть 2)
3. Мигрировать ВСЕ модалки на BottomSheet (Часть 1 + 7)
4. Мигрировать ВСЕ empty states на EmptyState (Часть 2)
5. Исправить горизонтальный скролл (Часть 3)
6. Переработать расчёт периода (Часть 4)
7. Удалить SafeToSpend из ExpenseForm (Часть 5)
8. Исправить скролл слайдеров (Часть 6)
9. Мобильная адаптация (Часть 8)
10. Финальный `grep` на оставшиеся импорты Modal, inline модалки, некнсистентные empty states

## Критерии готовности
- [ ] `grep -rn "from.*Modal" src/` возвращает 0 результатов (кроме BottomSheet)
- [ ] Ни одной inline модалки (`grep -rn "fixed inset-0 z-50" src/` — только BottomSheet.tsx)
- [ ] Все empty states используют `<EmptyState>` (`grep -rn "EmptyState" src/` — все страницы)
- [ ] Нет горизонтального скролла на 320px viewport
- [ ] `overflow-x: hidden` на html/body
- [ ] «дн. до конца периода» → привязан к источникам дохода
- [ ] Нет SafeToSpend в ExpenseForm
- [ ] Все секции настроек: card-обёртка + модалка для добавления
