# FLUX — Единый UI / Исправление багов / Доработка функционала

## Контекст проекта
React 19 + TypeScript + Vite + Tailwind CSS + Zustand + Supabase. PWA для управления семейным бюджетом (KZT). Тёмная тема (Flux brand) — основная. CSS-переменные: `--card`, `--border`, `--ink`, `--cer`, `--sand`, `--text3`, `--page`.

---

## ЧАСТЬ 1: Единый компонент BottomSheet-модалки ✅ ВЫПОЛНЕНО

- ✅ Создан `src/components/ui/BottomSheet.tsx` — универсальный компонент (mobile: снизу, desktop: по центру)
- ✅ `src/pages/DebtsPage.tsx` — мигрирован (add/pay модалки)
- ✅ `src/pages/DepositsPage.tsx` — мигрирован (calculator)
- ✅ `src/components/expenses/ExpenseForm.tsx` — мигрирован
- ✅ `src/components/income/IncomeForm.tsx` — мигрирован
- ✅ `src/pages/GoalsPage.tsx` — мигрирован (add/edit goal)
- ✅ `src/components/settings/SettingsIncomeSourcesSection.tsx` — мигрирован
- ✅ `src/components/settings/SettingsFixedExpensesSection.tsx` — мигрирован
- ✅ `src/components/budget/CreatePayPeriodModal.tsx` — мигрирован
- ✅ `src/components/budget/AddPlannedTransactionModal.tsx` — мигрирован
- ✅ `src/components/budget/AddSinkingFundModal.tsx` — мигрирован
- ✅ `src/components/settings/RecurringSection.tsx` — inline форма → BottomSheet модалка
- ✅ `src/pages/AuthPage.tsx` — passkey модалка → BottomSheet

---

## ЧАСТЬ 2: Единые пустые состояния (Empty State) ✅ ВЫПОЛНЕНО

- ✅ Создан `src/components/ui/EmptyState.tsx` — тип `Icon` из phosphor-icons
- ✅ `DebtsPage.tsx` — использует EmptyState
- ✅ `DepositsPage.tsx` — использует EmptyState
- ✅ `SettingsPayersSection.tsx` — добавлен EmptyState
- ✅ `SettingsAccountsSection.tsx` — добавлен EmptyState
- ✅ `RecurringSection.tsx` — добавлен EmptyState
- ✅ `IncomeList.tsx` — заменён на EmptyState + добавлен `onAdd` prop с CTA кнопкой
- ✅ `GoalsList.tsx` — заменён на EmptyState

---

## ЧАСТЬ 3: Исправление горизонтального скролла на ExpensesPage ✅ ВЫПОЛНЕНО

- ✅ Фильтры и итоговая сумма разделены на два ряда
- ✅ `overflow-x: hidden` на `<html>` и `<body>` в `index.css`
- ✅ `.no-scrollbar` класс на filter chips контейнере

---

## ЧАСТЬ 4: Период из источников дохода ✅ ВЫПОЛНЕНО

- ✅ `src/lib/calculations.ts` — добавлено поле `periodSource: 'pay_period' | 'income_sources' | 'auto_month'`
- ✅ `src/lib/calculations.ts` — функция `derivePeriodFromSources()` — вычисляет период из дат поступлений
- ✅ `src/store/useFinanceEngine.ts` — передаёт `incomeSources` в `computeEngineResult`
- ✅ `src/components/dashboard/HeroCard.tsx`:
  - `income_sources` → `"{{count}} дн. до поступления"`
  - `pay_period` → `"{{count}} дн. до конца периода"`
  - `auto_month` → `"Настройте источники дохода в настройках"`
- ✅ `ru.json` — добавлены ключи `days_until_income`, `setup_income_sources_hint`

---

## ЧАСТЬ 5: Удалить рудимент «Безопасно потратить» из ExpenseForm ✅ ВЫПОЛНЕНО

- ✅ SafeToSpend виджет и импорт `usePayPeriodStore` полностью удалены из `ExpenseForm.tsx`

---

## ЧАСТЬ 6: Скролл в «Распределение дохода» ✅ ВЫПОЛНЕНО

- ✅ `touchAction: 'none'` добавлен на range-слайдеры в `IncomeForm.tsx`

---

## ЧАСТЬ 7: Единый дизайн добавления в настройках ✅ ВЫПОЛНЕНО

- ✅ `SettingsPayersSection.tsx` — card обёртка + BottomSheet (add + edit)
- ✅ `SettingsAccountsSection.tsx` — card обёртка + BottomSheet
- ✅ `RecurringSection.tsx` — card обёртка + BottomSheet форма + EmptyState
- ✅ `SettingsIncomeSourcesSection.tsx` — BottomSheet
- ✅ `SettingsFixedExpensesSection.tsx` — BottomSheet

---

## ЧАСТЬ 8: Мобильная адаптация ✅ ЧАСТИЧНО ВЫПОЛНЕНО

- ✅ `overflow-x: hidden` на html/body
- ✅ `animate-modal-in` keyframe добавлен в `index.css`
- ✅ `max-h-[92vh] overflow-y-auto` на BottomSheet контенте

---

## Дополнительно выполнено (вне плана)

- ✅ Создан `src/lib/webauthn.ts` — полная клиентская библиотека (`registerPasskey`, `authenticatePasskey`, `hasPasskey`, `listPasskeys`, `deletePasskey`, `PasskeyCredential`) — файл отсутствовал и ломал билд
- ✅ Исправлены TypeScript ошибки в `useAuthStore.ts`

---

## Статус билда

```
✓ built in 16.32s — 0 TypeScript ошибок
```

## Все чеклисты выполнены ✅

- [x] Все модалки используют BottomSheet
- [x] Все empty states используют `<EmptyState>`
- [x] Нет горизонтального скролла (overflow-x: hidden на html/body)
- [x] Нет SafeToSpend в ExpenseForm
- [x] Все секции настроек: card-обёртка + BottomSheet для добавления
- [x] «дн. до поступления» → привязан к источникам дохода
- [x] Билд успешен без ошибок
