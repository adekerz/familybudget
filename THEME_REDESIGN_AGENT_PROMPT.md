# FamilyBudget — Dual Theme UX/UI Redesign Agent Prompt

## Задача
Реализовать систему смены темы (жена / муж) с полным редизайном UX/UI по принципам senior-level product design. Каждая тема — отдельная design identity, не просто смена цветов.

---

## Контекст проекта
- Прочитай `DESIGN_RULES_v2.md` — текущая дизайн-система (тема жены)
- Прочитай `CLAUDE_CODE_PLAN.md` — архитектура, стек, типы данных
- Стек: React 18 + TypeScript + Tailwind CSS + Zustand + Vite
- Шрифт: Plus Jakarta Sans (уже подключён)

---

## Шаг 1 — Создать систему тем

### 1.1 Создать файл `src/lib/themes.ts`

```typescript
export type ThemeId = 'wife' | 'husband'

export interface Theme {
  id: ThemeId
  name: string
  label: string // отображаемое имя
  // CSS-переменные которые будут выставлены на :root
  vars: Record<string, string>
}

export const THEMES: Record<ThemeId, Theme> = {
  wife: {
    id: 'wife',
    name: 'wife',
    label: 'Для жены',
    vars: {
      '--page':         '#F2EDE1',
      '--card':         '#FFFDF8',
      '--card2':        '#F7F2E8',
      '--sand':         '#E7DFC6',
      '--sand-mid':     '#D4CAB2',
      '--sand-dark':    '#B8AA8E',
      '--alice':        '#E9F1F7',
      '--alice-dark':   '#C4D6E4',
      '--accent':       '#2274A5',
      '--accent-light': '#D0E7F5',
      '--accent-dark':  '#185C85',
      '--ink':          '#131B23',
      '--ink-soft':     '#2D3E4D',
      '--border':       '#DDD5BF',
      '--text1':        '#131B23',
      '--text2':        '#4A3F30',
      '--text3':        '#8A7E6A',
      '--success':      '#15664E',
      '--success-bg':   '#E2F2EC',
      '--danger':       '#9B2525',
      '--danger-bg':    '#FBE8E8',
      '--warn':         '#7A5210',
      '--warn-bg':      '#FBF2DA',
      // Hero card
      '--hero-bg':      '#2274A5',
      '--hero-text':    '#FFFFFF',
      '--hero-sub':     'rgba(255,255,255,0.72)',
      '--hero-chip':    'rgba(255,255,255,0.18)',
      // Nav
      '--nav-bg':       '#FFFDF8',
      '--nav-active':   '#2274A5',
      '--nav-inactive': '#8A7E6A',
      '--nav-icon-bg':  '#D0E7F5',
      // Progress bars
      '--bar-mandatory':'#2274A5',
      '--bar-flexible': '#B8AA8E',
      '--bar-savings':  '#15664E',
      '--bar-track':    '#E7DFC6',
      // Quick expense buttons
      '--quick-bg':     '#FFFDF8',
      '--quick-border': '#DDD5BF',
      '--quick-text':   '#4A3F30',
    },
  },

  husband: {
    id: 'husband',
    name: 'husband',
    label: 'Для мужа',
    vars: {
      '--page':         '#0F1923',
      '--card':         '#1A2535',
      '--card2':        '#1E2C3D',
      '--sand':         '#243447',
      '--sand-mid':     '#2E4060',
      '--sand-dark':    '#3D5475',
      '--alice':        '#1C2E42',
      '--alice-dark':   '#2A4060',
      '--accent':       '#00D4FF',
      '--accent-light': '#003D4D',
      '--accent-dark':  '#00A8CC',
      '--ink':          '#E8F4F8',
      '--ink-soft':     '#B0C8D8',
      '--border':       '#2A3F55',
      '--text1':        '#E8F4F8',
      '--text2':        '#A8C4D8',
      '--text3':        '#5A7A95',
      '--success':      '#00E5A0',
      '--success-bg':   '#002A1F',
      '--danger':       '#FF5A5A',
      '--danger-bg':    '#2A0F0F',
      '--warn':         '#FFB800',
      '--warn-bg':      '#2A1F00',
      // Hero card
      '--hero-bg':      '#00D4FF',
      '--hero-text':    '#0A1520',
      '--hero-sub':     'rgba(10,21,32,0.65)',
      '--hero-chip':    'rgba(10,21,32,0.2)',
      // Nav
      '--nav-bg':       '#131F2D',
      '--nav-active':   '#00D4FF',
      '--nav-inactive': '#5A7A95',
      '--nav-icon-bg':  '#003D4D',
      // Progress bars
      '--bar-mandatory':'#00D4FF',
      '--bar-flexible': '#3D5475',
      '--bar-savings':  '#00E5A0',
      '--bar-track':    '#243447',
      // Quick expense buttons
      '--quick-bg':     '#1A2535',
      '--quick-border': '#2A3F55',
      '--quick-text':   '#A8C4D8',
    },
  },
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
  root.setAttribute('data-theme', theme.id)
}
```

### 1.2 Создать `src/store/useThemeStore.ts`

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { THEMES, applyTheme, type ThemeId } from '../lib/themes'

interface ThemeStore {
  themeId: ThemeId
  setTheme: (id: ThemeId) => void
  initTheme: () => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      themeId: 'wife',
      setTheme: (id) => {
        applyTheme(THEMES[id])
        set({ themeId: id })
      },
      initTheme: () => {
        applyTheme(THEMES[get().themeId])
      },
    }),
    { name: 'fb-theme' }
  )
)
```

### 1.3 Инициализация в `src/main.tsx`

```typescript
// В useEffect или сразу при загрузке — до рендера
import { useThemeStore } from './store/useThemeStore'
useThemeStore.getState().initTheme()
```

---

## Шаг 2 — Компонент переключения темы

### Создать `src/components/ui/ThemeSwitcher.tsx`

Требования к компоненту:
- Два варианта: компактный (для Header) и развёрнутый (для SettingsPage)
- Анимация переключения: плавный fade + scale
- Показывает имя активной темы и аватар-инициалы
- Тактильный feedback: `active:scale-95`

```typescript
// Compact variant — для Header
// Показывает: [Ж] или [М] — нажатие открывает dropdown с двумя вариантами
// Dropdown: две карточки — "Для жены" и "Для мужа" с превью цветов

// Settings variant — полноширинный
// Две карточки рядом, активная подсвечена accent-бордером
// Каждая карточка: название + 5 цветовых свотчей темы
```

Дизайн карточки темы в настройках:
```
┌─────────────────────┐
│  [Ж]  Для жены      │  ← активная: border 2px accent
│  ● ● ● ● ●         │  ← 5 свотчей: page, card, accent, sand, text1
│  Текущая тема   ✓   │
└─────────────────────┘
```

---

## Шаг 3 — UX/UI улучшения (Best Practices уровень Senior)

### 3.1 BalanceWidget — редизайн Hero Card

**Проблема текущего решения:** информация не иерархична, всё одного веса.

**Решение:**
```
┌────────────────────────────────────┐
│  Свободных денег          8 дней   │  ← label + badge
│                                    │
│  32 500 ₸                          │  ← главное число, 28px bold
│                                    │
│  ──────────────────────────────    │  ← thin divider
│                                    │
│  Дневной лимит    Следующий приход │
│  2 700 ₸/день     29 окт, зп мужа  │  ← две колонки внизу
└────────────────────────────────────┘
```

Правила реализации:
- Главная сумма: 28px, weight 700, letter-spacing -0.03em
- Дневной лимит и дата прихода: 11px, две колонки с разделителем
- Если дней осталось ≤ 3: badge с дискретным warn-цветом
- Если дней осталось ≤ 1: badge с danger-цветом

### 3.2 CategoryCards — прогресс-бары с числами

**Текущая проблема:** карточки не дают контекст — непонятно сколько осталось.

**Решение — три состояния карточки:**

```
Нормальное (< 80%):
┌──────────────┐
│ 🏠           │
│ Обязат.      │
│ 45 000 ₸     │  ← потрачено
│ ████████░░   │  ← 90% прогресс-бар (cerulean)
│ осталось 5к  │  ← остаток маленьким шрифтом
└──────────────┘

Предупреждение (80–99%):
- Бар становится warn-цвета
- Карточка получает лёгкий warn-bg фон

Превышение (100%+):
- Бар красный, полный
- Карточка получает danger-bg фон
- Иконка предупреждения вместо категорийной иконки
```

### 3.3 QuickExpenseBar — улучшение

**Текущая проблема:** все кнопки одинаковые, нет приоритетности.

**Решение:**
- Первые 3 кнопки (самые частые по истории) — чуть больше и ярче
- Анимация нажатия: `scale(0.94)` + `transition 100ms`
- После добавления расхода: кнопка на 800ms показывает `✓` + success-цвет

### 3.4 Transaction List — группировка и свайп

**Решение:**
- Группировка по дням: "Сегодня", "Вчера", "Пн, 28 окт"
- Каждая строка: иконка + название + сумма + категорийный badge
- Свайп влево на мобильном → удалить (с подтверждением)
- Суммарная строка внизу каждой группы: "Итого: 4 100 ₸"

### 3.5 Bottom Navigation — индикаторы

**Улучшения:**
- Активная вкладка: иконка + текст + animated underline dot
- Если есть незафиксированный расход (прошло > 24ч без новых записей) — badge на иконке расходов
- Плавный slide-transition между страницами: `translateX` 150ms ease

### 3.6 IncomeForm + DistributionPreview — улучшение UX

**Текущая проблема:** пользователь вводит сумму и сразу нажимает сохранить, не видя распределения.

**Решение — live preview:**
```typescript
// По мере ввода суммы — в реальном времени обновлять три строки
// с анимацией countUp на числах (каждый символ → новое число плавно)

// Ввод: 1|50 000
//          ↓ в реальном времени
// Обязательные: 75 000 ₸  (анимация числа)
// Гибкие:       45 000 ₸
// Накопления:   30 000 ₸
```

### 3.7 Общие UX правила (применить ко всем страницам)

```
1. Skeleton loading — вместо пустых состояний при загрузке:
   - BalanceWidget: серый прямоугольник-скелет
   - CategoryCards: три серых карточки
   - TransactionList: 5 серых строк

2. Pull-to-refresh на дашборде (мобильный жест)

3. Haptic feedback (navigator.vibrate) при:
   - Добавлении расхода: 1 вибрация 50ms
   - Превышении лимита: 3 вибрации 100ms
   - Удалении: 1 вибрация 100ms

4. Toast уведомления (не alert!):
   - Позиция: top-center, появляется на 2.5 секунды
   - Виды: success (зелёный), warn (жёлтый), error (красный)
   - Анимация: slideDown + fadeOut

5. Числа всегда через formatMoney() — без исключений

6. Все формы валидируются инлайн (не при submit):
   - Сумма ≤ 0: "Введите сумму больше нуля"
   - Сумма > 10,000,000: "Слишком большая сумма"
   - Дата в будущем: предупреждение (не блокировать)
```

---

## Шаг 4 — Анимации и micro-interactions

### Создать `src/lib/animations.ts`

```typescript
// CSS классы для анимаций — добавить в index.css

// Page transitions
export const PAGE_ENTER = 'animate-page-enter'   // fadeIn + slideUp 200ms
export const PAGE_EXIT  = 'animate-page-exit'    // fadeOut 150ms

// Card появление (stagger)
export const CARD_ENTER = 'animate-card-enter'   // scaleIn + fadeIn 250ms

// Count-up для чисел
export function animateNumber(
  element: HTMLElement,
  from: number,
  to: number,
  duration = 600
): void {
  const start = performance.now()
  const update = (time: number) => {
    const progress = Math.min((time - start) / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
    const current = Math.round(from + (to - from) * eased)
    element.textContent = formatMoney(current)
    if (progress < 1) requestAnimationFrame(update)
  }
  requestAnimationFrame(update)
}
```

### Добавить в `src/index.css`:

```css
@keyframes pageEnter {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes cardEnter {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-16px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pulse-once {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.04); }
  100% { transform: scale(1); }
}

.animate-page-enter  { animation: pageEnter 0.2s ease both; }
.animate-card-enter  { animation: cardEnter 0.25s ease both; }
.animate-slide-down  { animation: slideDown 0.2s ease both; }
.animate-pulse-once  { animation: pulse-once 0.3s ease; }

/* Stagger delays */
.stagger-1 { animation-delay: 0ms; }
.stagger-2 { animation-delay: 60ms; }
.stagger-3 { animation-delay: 120ms; }
.stagger-4 { animation-delay: 180ms; }
.stagger-5 { animation-delay: 240ms; }

/* Skeleton shimmer */
@keyframes shimmer {
  from { background-position: -200% 0; }
  to   { background-position: 200% 0; }
}
.skeleton {
  background: linear-gradient(
    90deg,
    var(--card) 25%,
    var(--sand) 50%,
    var(--card) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}
```

---

## Шаг 5 — Toast система

### Создать `src/components/ui/Toast.tsx` и `src/store/useToastStore.ts`

```typescript
// Store
interface Toast {
  id: string
  message: string
  type: 'success' | 'warn' | 'error' | 'info'
  duration?: number
}

// Использование в компонентах:
// useToastStore.getState().show('Расход добавлен', 'success')
// useToastStore.getState().show('Лимит превышен!', 'warn')
```

Дизайн Toast (светлая тема — жена):
```
┌───────────────────────────────┐
│  ✓  Расход добавлен           │  ← success: зелёный border-left + success-bg
└───────────────────────────────┘
```

Дизайн Toast (тёмная тема — муж):
```
┌───────────────────────────────┐
│  ✓  Расход добавлен           │  ← accent border + glass card
└───────────────────────────────┘
```

Позиция: `fixed top-4 left-1/2 -translate-x-1/2`, z-index 50
Ширина: `min(calc(100vw - 32px), 360px)`

---

## Шаг 6 — Settings Page: переключатель тем

В `src/pages/SettingsPage.tsx` добавить секцию:

```typescript
// Секция "Оформление" — первая в списке настроек
// Две карточки рядом (grid 2 cols)
// Каждая карточка темы:
//   - Название: "Для жены" / "Для мужа"
//   - Мини-превью: 4 цветных круга
//   - Если активна: border 2px var(--accent) + галочка
// При клике: setTheme() + toast "Тема изменена"
```

---

## Шаг 7 — Тема мужа: специфичные UX адаптации

Для тёмной темы (`data-theme="husband"`) применить отдельные правила:

```css
/* Только для тёмной темы мужа */
[data-theme="husband"] .hero {
  /* Acent #00D4FF на тёмном фоне — выглядит как cyan glow */
  box-shadow: 0 0 32px rgba(0, 212, 255, 0.15);
}

[data-theme="husband"] .card {
  /* Лёгкое свечение верхней границы */
  border-top: 1px solid rgba(0, 212, 255, 0.1);
}

[data-theme="husband"] .progress-fill {
  /* Accent-бар со свечением */
  box-shadow: 0 0 8px rgba(0, 212, 255, 0.4);
}

[data-theme="husband"] .quick-btn:hover {
  border-color: rgba(0, 212, 255, 0.4);
}
```

Типография для тёмной темы:
- Числа: `--accent` (#00D4FF) вместо тёмно-синего — читабельно на тёмном
- Мутированный текст: `--text3` (#5A7A95) — не белый, а приглушённый
- Hero сумма: `--text1` (#E8F4F8) — почти белый

---

## Шаг 8 — Header: контекстный

Добавить в Header компонент:
1. Слева: логотип FamilyBudget с динамическим цветом `var(--accent)`
2. Справа: компактный ThemeSwitcher (иконка [Ж]/[М] с dropdown)
3. При смене темы: плавный transition 300ms на всём body через CSS `transition: background-color 300ms, color 300ms`

```css
/* Плавная смена темы */
*, *::before, *::after {
  transition:
    background-color 250ms ease,
    border-color 250ms ease,
    color 150ms ease;
}
/* Исключить анимации которым не нужна смена */
.no-theme-transition {
  transition: none !important;
}
```

---

## Структура файлов для создания/изменения

```
src/
├── lib/
│   ├── themes.ts            ← НОВЫЙ
│   └── animations.ts        ← НОВЫЙ
├── store/
│   └── useThemeStore.ts     ← НОВЫЙ
├── components/
│   ├── ui/
│   │   ├── ThemeSwitcher.tsx ← НОВЫЙ
│   │   ├── Toast.tsx         ← НОВЫЙ
│   │   └── Skeleton.tsx      ← НОВЫЙ
│   ├── dashboard/
│   │   └── BalanceWidget.tsx ← ИЗМЕНИТЬ (новая раскладка)
│   │   └── CategoryCards.tsx ← ИЗМЕНИТЬ (3 состояния)
│   │   └── QuickExpenseBar.tsx ← ИЗМЕНИТЬ (feedback)
│   └── layout/
│       └── Header.tsx        ← ИЗМЕНИТЬ (ThemeSwitcher)
├── pages/
│   └── SettingsPage.tsx      ← ИЗМЕНИТЬ (секция тем)
└── index.css                 ← ИЗМЕНИТЬ (анимации, skeleton, темы)
```

---

## Порядок реализации (не менять!)

1. `src/lib/themes.ts` — типы и данные тем
2. `src/store/useThemeStore.ts` — Zustand стор
3. `src/index.css` — CSS переменные + анимации + skeleton
4. `src/main.tsx` — initTheme() вызов
5. `src/store/useToastStore.ts` — toast стор
6. `src/components/ui/Toast.tsx` — toast компонент
7. `src/components/ui/Skeleton.tsx` — skeleton компонент
8. `src/components/ui/ThemeSwitcher.tsx` — переключатель
9. `src/components/layout/Header.tsx` — обновить с ThemeSwitcher
10. `src/components/dashboard/BalanceWidget.tsx` — редизайн hero
11. `src/components/dashboard/CategoryCards.tsx` — 3 состояния
12. `src/components/dashboard/QuickExpenseBar.tsx` — feedback
13. `src/pages/SettingsPage.tsx` — секция тем

---

## Чеклист перед завершением

- [ ] Обе темы работают: нажать [Ж] → светлая, нажать [М] → тёмная
- [ ] Тема сохраняется в localStorage (fb-theme) — после F5 тема та же
- [ ] Смена темы плавная — 250ms transition без "прыжков"
- [ ] Toast работает: добавить расход → виден success toast
- [ ] Skeleton виден: заглушить данные → видны gray placeholders
- [ ] Все числа через formatMoney() — не голые цифры
- [ ] ThemeSwitcher в Header виден на всех страницах
- [ ] BalanceWidget: две колонки внизу (лимит + дата прихода)
- [ ] CategoryCards: warn-состояние при > 80%, danger при > 100%
- [ ] Нет хардкода hex в JSX — только CSS-переменные через Tailwind
- [ ] TypeScript: нет ошибок, нет any
- [ ] Plus Jakarta Sans — везде, не Inter

---

## ДЕЛЬТА — Адаптация под реальный проект (прочитать в первую очередь)

> Этот раздел написан после анализа актуального кода проекта.
> Всё что описано выше остаётся в силе, но этот раздел уточняет
> что именно нужно создать/изменить, а что уже есть.

### Что уже реализовано — НЕ ТРОГАТЬ

- `tailwind.config.ts` — все токены уже есть (`accent`, `card`, `border`, `muted`, `success`, `danger` и т.д.)
- `src/index.css` — CSS-переменные жены уже объявлены в `:root`, базовые анимации `fadeUp`, `modalIn`, `shake` уже есть в tailwind keyframes
- `src/store/useSettingsStore.ts` — стор настроек уже есть
- `src/store/useFixedExpenseStore.ts` — фиксированные расходы уже есть
- `src/lib/icons.ts` — иконки уже есть (`Icon`, `FIXED_ICON_NAMES`)
- `src/components/ui/` — `Button`, `Card`, `Modal`, `ProgressBar`, `Badge` уже есть
- `src/pages/SettingsPage.tsx` — страница настроек уже полностью реализована со слайдерами, лимитами, вайтлистом
- Приложение использует Supabase (`src/lib/supabase.ts` есть), данные загружаются через `loadIncomes()`, `loadExpenses()` и т.д. в `App.tsx`
- `body` уже имеет фоновые изображения `bg-mobile.png` / `bg-desktop.png` через `background-image`

### Что нужно создать — только эти файлы

**1. `src/lib/themes.ts`** — новый файл, точно по Шагу 1.1 выше.
Единственное уточнение для переменных темы жены: не трогать `background-image` на body —
она управляется отдельно через `bg-mobile.png`. Тема жены выставляет только цвета,
тема мужа добавляет `--page: #0F1923` который перекроет фоновое изображение через:
```css
[data-theme="husband"] body {
  background-image: none;
}
```

**2. `src/store/useThemeStore.ts`** — новый файл, точно по Шагу 1.2 выше.

**3. `src/components/ui/ThemeSwitcher.tsx`** — новый файл по Шагу 2 выше.
Компонент должен экспортировать два варианта:
```typescript
export function ThemeSwitcherCompact() { ... }  // для Header — пилюля [Ж]/[М]
export function ThemeSwitcherFull() { ... }      // для SettingsPage — две карточки
```

**4. `src/components/ui/Toast.tsx`** — новый файл по Шагу 5 выше.

**5. `src/store/useToastStore.ts`** — новый файл по Шагу 5 выше.

**6. `src/components/ui/Skeleton.tsx`** — новый файл, простой компонент:
```typescript
// Использование: <Skeleton className="h-24 w-full rounded-2xl" />
export function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton ${className}`} />
}
```

### Что нужно изменить — только эти файлы, только эти части

**7. `src/index.css`** — ДОПИСАТЬ в конец файла (не переписывать!):

```css
/* ── ТЕМА МУЖА ── */
[data-theme="husband"] {
  --page:         #0F1923;
  --card:         #1A2535;
  --card2:        #1E2C3D;
  --sand:         #243447;
  --sand-mid:     #2E4060;
  --sand-dark:    #3D5475;
  --alice:        #1C2E42;
  --alice-dark:   #2A4060;
  --cer:          #00D4FF;
  --cer-light:    #003D4D;
  --cer-dark:     #00A8CC;
  --ink:          #E8F4F8;
  --ink-soft:     #B0C8D8;
  --border:       #2A3F55;
  --text1:        #E8F4F8;
  --text2:        #A8C4D8;
  --text3:        #5A7A95;
}

[data-theme="husband"] body {
  background-color: #0F1923;
  background-image: none;
}

/* Прогресс-бары со свечением в тёмной теме */
[data-theme="husband"] .bar-accent {
  box-shadow: 0 0 8px rgba(0, 212, 255, 0.4);
}

[data-theme="husband"] .card-glow {
  box-shadow: inset 0 1px 0 rgba(0, 212, 255, 0.08);
}

/* Hero-карточка мужа */
[data-theme="husband"] .hero-card {
  box-shadow: 0 0 32px rgba(0, 212, 255, 0.15);
}

/* ── АНИМАЦИИ (дописать к существующим) ── */
@keyframes cardEnter {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-16px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes shimmer {
  from { background-position: -200% 0; }
  to   { background-position: 200% 0; }
}

/* ── УТИЛИТЫ ── */
.animate-card-enter { animation: cardEnter 0.25s ease both; }
.animate-slide-down { animation: slideDown 0.2s ease both; }

.skeleton {
  background: linear-gradient(
    90deg,
    var(--card) 25%,
    var(--sand) 50%,
    var(--card) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}

/* Плавная смена темы */
*,
*::before,
*::after {
  transition:
    background-color 250ms ease,
    border-color 250ms ease,
    color 150ms ease;
}

/* Исключить элементы где transition мешает */
.no-theme-transition,
.no-theme-transition * {
  transition: none !important;
}

/* Исключить button:active scale из theme transition */
button {
  transition:
    background-color 250ms ease,
    border-color 250ms ease,
    color 150ms ease,
    transform 0.1s;
}
```

**8. `src/components/layout/Header.tsx`** — ИЗМЕНИТЬ только одно: добавить `ThemeSwitcherCompact` вместо кнопки logout.
Logout убрать из хедера — он уже есть в `SettingsPage`.
Итоговый Header:
```typescript
import { ThemeSwitcherCompact } from '../ui/ThemeSwitcher';

export function Header() {
  const today = new Date().toLocaleDateString('ru-RU', {
    weekday: 'short', day: 'numeric', month: 'long',
  });

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-card/60 backdrop-blur-md border-b border-border sticky top-0 z-40">
      <div>
        <h1 className="text-base font-bold tracking-wide">
          <span className="text-ink">Family</span>
          <span className="text-accent">Budget</span>
        </h1>
        <p className="text-xs text-muted capitalize">{today}</p>
      </div>
      <ThemeSwitcherCompact />
    </header>
  );
}
```

**9. `src/pages/SettingsPage.tsx`** — ДОБАВИТЬ одну секцию в начало `<main>`, перед секцией "Распределение дохода". Не переписывать весь файл, только вставить:
```typescript
// Добавить импорт в начало файла:
import { ThemeSwitcherFull } from '../components/ui/ThemeSwitcher';

// Вставить первой секцией внутри <main className="...">, перед блоком "Distribution defaults":
<section className="bg-card border border-border rounded-2xl overflow-hidden">
  <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
    {/* иконка — Palette из lucide-react */}
    <Palette size={16} className="text-accent" />
    <p className="font-semibold text-ink text-sm">Оформление</p>
  </div>
  <div className="px-4 py-4">
    <ThemeSwitcherFull />
  </div>
</section>

// Добавить Palette в импорт из lucide-react
```

**10. `src/main.tsx`** — ДОБАВИТЬ одну строку до ReactDOM.render:
```typescript
import { useThemeStore } from './store/useThemeStore';
// Сразу до createRoot():
useThemeStore.getState().initTheme();
```

**11. `src/App.tsx`** — ДОБАВИТЬ Toast рендер в JSX, внутри `<ErrorBoundary>`:
```typescript
import { Toast } from './components/ui/Toast';
// Добавить последним элементом внутри <div className="relative min-h-screen">:
<Toast />
```

### Проверка Tailwind токенов

Тема мужа использует те же Tailwind-классы (`bg-card`, `border-border`, `text-ink`, `text-accent` и т.д.) — они будут автоматически подхватывать CSS-переменные через `[data-theme="husband"]` переопределения. **Tailwind config НЕ менять** — он ссылается на те же переменные.

Единственное исключение: в `tailwind.config.ts` цвет `accent` сейчас хардкодом `#2274A5`.
Нужно заменить на CSS-переменную чтобы тема работала:
```typescript
// tailwind.config.ts — заменить только эти строки:
accent:         'var(--cer)',
'accent-light': 'var(--cer-light)',
'accent-dark':  'var(--cer-dark)',
ink:            'var(--ink)',
'ink-soft':     'var(--ink-soft)',
primary:        'var(--page)',
card:           'var(--card)',
border:         'var(--border)',
muted:          'var(--text3)',
text2:          'var(--text2)',
sand:           'var(--sand)',
'sand-mid':     'var(--sand-mid)',
'sand-dark':    'var(--sand-dark)',
```

### Итого — список файлов для изменения

```
СОЗДАТЬ (6 новых файлов):
src/lib/themes.ts
src/store/useThemeStore.ts
src/components/ui/ThemeSwitcher.tsx
src/components/ui/Toast.tsx
src/store/useToastStore.ts
src/components/ui/Skeleton.tsx

ИЗМЕНИТЬ (5 существующих файлов, минимально):
src/index.css              ← дописать в конец
src/tailwind.config.ts     ← заменить хардкодные цвета на var()
src/components/layout/Header.tsx  ← заменить logout-кнопку на ThemeSwitcherCompact
src/pages/SettingsPage.tsx ← добавить секцию оформления первой
src/main.tsx               ← добавить initTheme() до createRoot
src/App.tsx                ← добавить <Toast /> в JSX
```
