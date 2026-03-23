# FamilyBudget — Design System Rules v2.0
# Этот файл обязателен для всех агентов, работающих над проектом.
# Никогда не отступай от этих правил без явного разрешения владельца.

---

## 1. Философия дизайна

**Стиль: Sand Dune Light — чистый, воздушный, современный.**

Палитра взята из реального мудборда: Sand Dune (#E7DFC6), Alice Blue (#E9F1F7),
Rich Cerulean (#2274A5), Ink Black (#131B23).

Сайт используется мужем и женой каждый день. Дизайн должен:
- Ощущаться чистым и лёгким — светлые тёплые фоны, воздух между элементами
- Использовать Sand Dune как нейтральную базу, Cerulean как единственный яркий акцент
- Быть читаемым с первого взгляда, без перегрузки информацией
- Иметь скруглённые углы — ничего острого (border-radius ≥ 10px)
- Использовать только stroke-иконки (Feather / Lucide / blend icons style) — без эмодзи

**НЕ делать:**
- Тёмная тема как основная — запрещена. Только светлая.
- Холодные серые или нейтральные белые (#FFFFFF) фоны — только тёплые тона
- Острые углы (border-radius < 10px)
- Чистый белый (#FFFFFF) фон страницы — использовать #F2EDE1
- Эмодзи вместо иконок — только SVG stroke-иконки
- Bootstrap, Material UI, любые UI-библиотеки — только ручной CSS + Tailwind
- Множество разных цветов — палитра строго из 4 базовых + деривативы

---

## 2. Цветовая палитра (обязательная)

Все CSS-переменные должны быть объявлены в `:root` в `index.css`.

```css
:root {
  /* ── БАЗОВЫЕ 4 ЦВЕТА ── */
  --sand:         #E7DFC6;  /* Sand Dune — нейтральный тёплый */
  --alice:        #E9F1F7;  /* Alice Blue — холодный светлый */
  --cerulean:     #2274A5;  /* Rich Cerulean — основной акцент */
  --ink:          #131B23;  /* Ink Black — тёмный текст */

  /* ── ДЕРИВАТИВЫ SAND ── */
  --sand-mid:     #D4CAB2;  /* Границы, разделители */
  --sand-dark:    #B8AA8E;  /* Иконки на песочном фоне */
  --page:         #F2EDE1;  /* Фон всей страницы */
  --card:         #FFFDF8;  /* Фон карточек */
  --card2:        #F7F2E8;  /* Карточки второго уровня */
  --border:       #DDD5BF;  /* Стандартный бордер */

  /* ── ДЕРИВАТИВЫ ALICE ── */
  --alice-dark:   #C4D6E4;  /* Бордер Alice-элементов */

  /* ── ДЕРИВАТИВЫ CERULEAN ── */
  --cer-light:    #D0E7F5;  /* Фон акцентных бейджей, hover */
  --cer-dark:     #185C85;  /* Текст на cer-light фоне */

  /* ── ДЕРИВАТИВЫ INK ── */
  --ink-soft:     #2D3E4D;  /* Мягкий тёмный, вторичный */

  /* ── ТЕКСТ ── */
  --text1:        #131B23;  /* Основной — Ink Black */
  --text2:        #4A3F30;  /* Вторичный — тёплый тёмный */
  --text3:        #8A7E6A;  /* Третичный — подсказки, лейблы */

  /* ── СЕМАНТИКА ── */
  --success:      #15664E;
  --success-bg:   #E2F2EC;
  --danger:       #9B2525;
  --danger-bg:    #FBE8E8;
  --warn:         #7A5210;
  --warn-bg:      #FBF2DA;
}
```

**Правило семантики цветов:**
- Cerulean (`--cerulean`) = основное действие, hero-карточки, активные состояния nav
- Sand (`--sand`) = нейтральный фон, категория "Гибкие расходы"
- Alice Blue (`--alice`) = вторичный фон, кнопка "Отмена", обводка телефонных рамок
- Ink Black (`--ink`) = только текст и логотип, НЕ фон
- Success green = категория "Накопления", подтверждения
- Danger red = превышение лимита, удаление

---

## 3. Типографика

**Шрифт: Plus Jakarta Sans** — подключить из Google Fonts.

```html
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
```

| Применение | Вес | Размер | Цвет |
|---|---|---|---|
| Название приложения / Hero | 700 | 20–22px | `--ink` + `--cerulean` (акцент) |
| Большие суммы | 700 | 18–24px | зависит от контекста |
| Заголовки секций | 700 | 14–16px | `--text1` |
| Основной текст | 600 | 12–13px | `--text2` |
| Секционные лейблы | 700 | 9–10px, uppercase, letter-spacing: 0.12em | `--text3` |
| Подсказки / мета | 500 | 9–11px | `--text3` |

**Правило для денежных сумм:**
- Форматировать с пробелами: `32 500 ₸` (не `32500₸`)
- Символ тенге `₸` после числа через неразрывный пробел
- Знак минус перед расходами: `−3 200 ₸` (не `-3200`)

**Запрещённые шрифты:** Inter, Roboto, Arial, system-ui

---

## 4. Иконки

**Только SVG stroke-иконки. Эмодзи запрещены.**

Источник: Feather Icons / Lucide React / blendicons.com (solid-line стиль)

Параметры иконок:
```
stroke-width: 2
stroke-linecap: round
stroke-linejoin: round
fill: none
```

Размеры:
- Навигация (bottom nav): 13×13px
- Кнопки: 14×14px
- Карточки / списки: 13–16×13–16px
- Декоративные (hero section): не используем

Цвет иконок:
- На белом/светлом фоне → `--text2` (#4A3F30)
- На cerulean фоне → `#fff`
- Неактивные в навигации → `--text3` (#8A7E6A)
- Активные в навигации → `--cerulean`
- Акцентные в иконко-контейнерах → цвет категории (см. ниже)

**Иконки по категориям:**

| Категория | Иконка (Lucide/Feather name) |
|---|---|
| Главная / дашборд | home |
| Доходы | dollar-sign |
| Цели | clock / target |
| Аналитика | bar-chart-2 |
| Настройки | settings |
| Аренда/ипотека | home |
| Продукты | shopping-cart |
| Транспорт | truck |
| Кофе/кафе | coffee |
| Рестораны | utensils |
| Медицина | activity |
| Развлечения | film |
| Накопления / депозит | dollar-sign |
| Цель (копилка) | target |
| Добавить | plus |
| Удалить | trash-2 |
| Закрыть | x |
| Пользователь | user |
| Доступ / безопасность | shield |
| Экспорт | download |
| Импорт | upload |
| Выйти | log-out |
| Редактировать | edit-2 |
| Фильтр | filter |
| Поиск | search |

---

## 5. Компоненты

### Фон страницы
```css
body {
  background: #F2EDE1; /* --page */
  font-family: 'Plus Jakarta Sans', sans-serif;
  color: #131B23;
}
```

### Карточки
```css
.card {
  background: #FFFDF8; /* --card */
  border: 1px solid #DDD5BF; /* --border */
  border-radius: 16px; /* --r */
  padding: 14px 16px;
}
```

### Hero-карточка (основной показатель)
```css
.hero-card {
  background: #2274A5; /* --cerulean */
  border-radius: 18px;
  padding: 16px;
  color: #fff;
  position: relative;
  overflow: hidden;
}
/* Декоративный круг через ::after */
.hero-card::after {
  content: '';
  position: absolute;
  right: -20px; top: -20px;
  width: 90px; height: 90px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 50%;
}
```

### Кнопки
```css
/* Основная — Cerulean */
.btn-primary {
  background: #2274A5;
  color: #fff;
  border: none;
  border-radius: 22px;
  padding: 10px 20px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
  display: flex; align-items: center; gap: 7px;
  cursor: pointer;
}

/* Вторичная — обводка Cerulean */
.btn-secondary {
  background: #FFFDF8;
  color: #2274A5;
  border: 1.5px solid #2274A5;
  border-radius: 22px;
  padding: 9px 18px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
  display: flex; align-items: center; gap: 7px;
}

/* Призрак — Alice Blue */
.btn-ghost {
  background: #E9F1F7;
  color: #2D3E4D;
  border: 1px solid #C4D6E4;
  border-radius: 22px;
  padding: 9px 18px;
  font-weight: 600;
  display: flex; align-items: center; gap: 7px;
}

/* Опасное действие */
.btn-danger {
  background: #FBE8E8;
  color: #9B2525;
  border: 1px solid #E8BBBB;
  border-radius: 22px;
  padding: 9px 18px;
  font-weight: 600;
  display: flex; align-items: center; gap: 7px;
}
```

### Бейджи
```css
.badge {
  border-radius: 20px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  display: inline-flex; align-items: center; gap: 5px;
}
.badge-mandatory { background: #D0E7F5; color: #185C85; }  /* Cerulean */
.badge-flexible  { background: #E7DFC6; color: #3A2E1A; }  /* Sand */
.badge-savings   { background: #E2F2EC; color: #15664E; }  /* Success */
.badge-income    { background: #E9F1F7; color: #1A3A52; }  /* Alice */
.badge-warn      { background: #FBF2DA; color: #7A5210; }
.badge-danger    { background: #FBE8E8; color: #9B2525; }
```

### Прогресс-бар
```css
.progress-track {
  height: 7px;
  background: #E7DFC6; /* --sand */
  border-radius: 7px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: 7px;
  transition: width 0.4s ease;
}
/*
  Цвет fill по категории:
  mandatory → #2274A5  (cerulean)
  flexible  → #B8AA8E  (sand-dark)
  savings   → #15664E  (success)
  >80%      → #B07D20  (warn)
  >100%     → #9B2525  (danger)
*/
```

### Поле ввода
```css
.input-field {
  border: 1.5px solid #DDD5BF;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  background: #FFFDF8;
  color: #131B23;
  width: 100%;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.input-field:focus {
  border-color: #2274A5;
  box-shadow: 0 0 0 3px #D0E7F5;
}
.input-field::placeholder { color: #8A7E6A; }
```

### Иконко-контейнер (icon wrapper в карточках)
```css
.icon-wrap {
  width: 28px; height: 28px;
  border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
/* Цвет контейнера по типу:
   mandatory → background: #D0E7F5; icon stroke: #2274A5
   flexible  → background: #E7DFC6; icon stroke: #6B5B40
   savings   → background: #E2F2EC; icon stroke: #15664E
*/
```

### Быстрые кнопки расходов (Quick Expense Bar)
```css
.quick-btn {
  background: #FFFDF8;
  border: 1px solid #DDD5BF;
  border-radius: 20px;
  padding: 6px 10px;
  display: flex; align-items: center; gap: 5px;
  font-size: 10px;
  font-weight: 600;
  color: #4A3F30;
  cursor: pointer;
}
```

### Секционный лейбл
```css
.section-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #8A7E6A;
  margin-bottom: 8px;
}
```

### Bottom Navigation
```css
.bottom-nav {
  display: flex;
  justify-content: space-around;
  background: #FFFDF8;
  border-top: 1px solid #DDD5BF;
  padding: 9px 0 max(12px, env(safe-area-inset-bottom));
}
.nav-item {
  display: flex; flex-direction: column;
  align-items: center; gap: 3px;
  font-size: 8px; font-weight: 600;
  color: #8A7E6A;
  cursor: pointer;
}
.nav-item.active { color: #2274A5; }
.nav-icon-wrap {
  width: 22px; height: 22px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
}
.nav-item.active .nav-icon-wrap { background: #D0E7F5; }
```

### Строка транзакции
```css
.tx-item {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 0;
  border-bottom: 1px solid #E7DFC6;
}
.tx-item:last-child { border-bottom: none; }
.tx-name  { font-size: 11px; font-weight: 600; color: #131B23; }
.tx-cat   { font-size: 9px; color: #8A7E6A; }
.tx-amount { margin-left: auto; font-size: 11px; font-weight: 700; color: #9B2525; }
```

### Состояния предупреждений
```css
.alert-warn {
  background: #FBF2DA;
  border: 1px solid #E0C870;
  border-radius: 12px;
  padding: 10px 14px;
  display: flex; align-items: center; gap: 10px;
  color: #7A5210;
  font-size: 12px; font-weight: 600;
}
.alert-danger {
  background: #FBE8E8;
  border: 1px solid #E8BBBB;
  border-radius: 12px;
  padding: 10px 14px;
  display: flex; align-items: center; gap: 10px;
  color: #9B2525;
  font-size: 12px; font-weight: 600;
}
```

### Empty state
```css
.empty-state {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 40px 20px; text-align: center; gap: 8px;
}
.empty-state .es-icon  { color: #DDD5BF; }  /* иконка 36px, sand-mid */
.empty-state .es-title { font-size: 14px; font-weight: 700; color: #4A3F30; }
.empty-state .es-sub   { font-size: 12px; color: #8A7E6A; }
```

---

## 6. Tailwind Config

```typescript
export default {
  theme: {
    extend: {
      colors: {
        primary:    '#F2EDE1',  /* page bg */
        card:       '#FFFDF8',
        card2:      '#F7F2E8',
        sand:       '#E7DFC6',
        'sand-mid': '#D4CAB2',
        'sand-dark':'#B8AA8E',
        alice:      '#E9F1F7',
        'alice-dark':'#C4D6E4',
        accent:     '#2274A5',  /* cerulean */
        'accent-light':'#D0E7F5',
        'accent-dark': '#185C85',
        ink:        '#131B23',
        'ink-soft': '#2D3E4D',
        border:     '#DDD5BF',
        muted:      '#8A7E6A',
        success:    '#15664E',
        'success-bg':'#E2F2EC',
        danger:     '#9B2525',
        'danger-bg':'#FBE8E8',
        warning:    '#7A5210',
        'warning-bg':'#FBF2DA',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      borderRadius: {
        xl:  '14px',
        '2xl':'18px',
        '3xl':'24px',
      },
    },
  },
};
```

**Использование в коде:**
- `bg-primary` — фон страниц
- `bg-card` — фон карточек
- `bg-accent` — cerulean кнопки/hero
- `text-accent` — cerulean текст
- `border-border` — стандартный бордер
- `text-muted` — третичный текст
- `bg-sand` — нейтральный фон категорий

---

## 7. Анимации

```css
button:active { transform: scale(0.97); }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.fade-up { animation: fadeUp 0.25s ease both; }

/* Stagger для списков */
.fade-up:nth-child(1) { animation-delay: 0ms; }
.fade-up:nth-child(2) { animation-delay: 50ms; }
.fade-up:nth-child(3) { animation-delay: 100ms; }

/* Модалки */
@keyframes modalIn {
  from { opacity: 0; transform: translateY(16px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.modal-enter { animation: modalIn 0.2s ease both; }
```

---

## 8. Layout & Spacing

- Страница: `max-width: 430px`, центр, `padding: 0 16px`
- Между карточками: `gap: 12px`
- Внутри карточки: `padding: 14px 16px`
- Секционный лейбл: `margin-bottom: 8px`
- Bottom nav: добавить `padding-bottom: 76px` к main-контейнеру

---

## 9. Tailwind index.css

```css
@layer base {
  body {
    @apply bg-primary text-ink font-sans;
  }
}

@layer components {
  .card-base {
    @apply bg-card border border-border rounded-2xl;
  }
  .section-lbl {
    @apply text-[9px] font-bold tracking-[0.12em] uppercase text-muted mb-2;
  }
  .money {
    @apply font-bold tracking-tight;
  }
  .icon-wrap-cer {
    @apply w-7 h-7 rounded-[9px] flex items-center justify-center bg-accent-light;
  }
  .icon-wrap-sand {
    @apply w-7 h-7 rounded-[9px] flex items-center justify-center bg-sand;
  }
  .icon-wrap-success {
    @apply w-7 h-7 rounded-[9px] flex items-center justify-center bg-success-bg;
  }
}
```

---

## 10. Чеклист перед PR

- [ ] Фон страницы `#F2EDE1` — не белый, не серый
- [ ] Карточки `#FFFDF8` — не чистый белый
- [ ] Все цвета из переменных / Tailwind-токенов (нет хардкода hex в JSX)
- [ ] Шрифт — Plus Jakarta Sans (нет Inter, Arial, system-ui)
- [ ] Все суммы отформатированы: `32 500 ₸`
- [ ] border-radius ≥ 10px везде
- [ ] Нет эмодзи — только SVG stroke-иконки
- [ ] Иконки: stroke-width=2, linecap=round, linejoin=round, fill=none
- [ ] Кнопки содержат иконку + текст (текст хорошо виден на фоне кнопки)
- [ ] Активная вкладка nav: цвет cerulean + фон cer-light
- [ ] Empty state есть на каждом списке
- [ ] Нет Bootstrap / Material / Chakra

---

## 11. Что строго запрещено

1. Тёмная тема как основная (Ink Black как фон)
2. Чистый белый `#FFFFFF` фон страницы или карточек
3. Холодные серые оттенки как доминирующие
4. Эмодзи вместо иконок
5. Иконки с fill (только stroke)
6. border-radius < 10px
7. Шрифты Inter / Roboto / Arial / system-ui
8. Суммы без пробелов и символа ₸
9. UI-библиотеки (Bootstrap, MUI, Chakra)
10. Больше 3 разных цветов акцента на одном экране
11. Текст мельче 9px

---

_Версия: 2.0 | Проект: FamilyBudget | Палитра: Sand Dune + Alice Blue + Rich Cerulean + Ink Black | Шрифт: Plus Jakarta Sans | Владелец: Адилет_
