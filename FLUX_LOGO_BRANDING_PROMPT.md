# FLUX — Промт интеграции логотипа и брендинга

## Ассеты бренда

В проекте имеются два файла логотипа Flux:

1. **`logo.png`** — горизонтальный логотип (иконка "F" + надпись "Flux"). Широкий формат (~1560×540px). Неоновая стилизованная буква "F" в виде плавной петли слева + текст "Flux" справа. Цвет: градиент от мягкого sky blue (#7DD3FC) к cyan (#00D4FF). Фон: deep navy (#0B0F1A). Эффект: neon glow вокруг буквы и текста.

2. **`icon.png`** — квадратная иконка (только буква "F"). Формат squircle (скруглённый квадрат) ~1080×1080px. Та же неоновая "F" по центру на тёмном фоне. Используется для PWA icon, favicon, compact навигации.

## Где и как использовать

### Скопировать файлы в проект
```
public/icons/flux-logo.png    ← logo.png (горизонтальный)
public/icons/flux-icon.png    ← icon.png (квадратный)
```

Также создать уменьшенные версии для PWA manifest:
```
public/icons/flux-icon-192.png   (192×192)
public/icons/flux-icon-512.png   (512×512)
public/icons/favicon-32.png      (32×32, из icon.png)
public/icons/favicon-16.png      (16×16, из icon.png)
public/icons/apple-touch-icon.png (180×180, из icon.png)
```

### Header компонент (`src/components/layout/Header.tsx`)

**Mobile (< 768px):**
```tsx
<header className="sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border">
  <div className="flex items-center justify-between px-4 h-14">
    <img 
      src="/icons/flux-logo.png" 
      alt="Flux" 
      className="h-7 w-auto" 
      // На тёмном фоне лого видно идеально
      // На светлой теме — добавить CSS filter для контраста:
      // className="h-7 w-auto dark:filter-none [data-theme='light']_&:brightness-0 [data-theme='light']_&:opacity-80"
    />
    <div className="flex items-center gap-2">
      <ThemeSwitcherCompact />
      {/* settings gear, notifications etc */}
    </div>
  </div>
</header>
```

**Важно для светлой темы:** Логотип нарисован светлым на тёмном фоне. На светлой теме нужна адаптация:
- Вариант A (рекомендуемый): Создать `flux-logo-dark.png` — версию логотипа с тёмными цветами для светлой темы. Если такой версии нет — использовать CSS filter:
  ```css
  [data-theme="light"] .flux-logo {
    filter: brightness(0.15) saturate(2) hue-rotate(10deg);
  }
  ```
- Вариант B: Header всегда тёмный (dark bar) на обеих темах — тогда лого без изменений. Это паттерн типа Spotify/Linear.

### Desktop Sidebar (`src/components/layout/AppShell.tsx`)

```tsx
{/* Верх sidebar */}
<div className="p-5 border-b border-border">
  <img 
    src="/icons/flux-logo.png" 
    alt="Flux" 
    className="h-8 w-auto"
  />
</div>

{/* ИЛИ компактный вариант: иконка + текст */}
<div className="flex items-center gap-3 p-5 border-b border-border">
  <img 
    src="/icons/flux-icon.png" 
    alt="Flux" 
    className="h-9 w-9 rounded-xl"
  />
  <span className="text-lg font-bold bg-gradient-to-r from-[#7DD3FC] to-[#00D4FF] bg-clip-text text-transparent">
    Flux
  </span>
</div>
```

### Auth Page (`src/pages/AuthPage.tsx`)

Логотип — центральный hero-элемент экрана авторизации:

```tsx
<div className="min-h-screen flex flex-col items-center justify-center auth-bg px-4">
  {/* Logo hero */}
  <div className="mb-10 flex flex-col items-center">
    <img 
      src="/icons/flux-icon.png" 
      alt="Flux" 
      className="w-24 h-24 rounded-3xl mb-5 shadow-2xl"
      style={{ boxShadow: '0 0 60px rgba(0,212,255,0.2)' }}
    />
    <img 
      src="/icons/flux-logo.png" 
      alt="Flux" 
      className="h-10 w-auto"
    />
    <p className="text-muted text-sm mt-3">Умный семейный бюджет</p>
  </div>

  {/* Login card */}
  <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-xl">
    {/* ... login form ... */}
  </div>
</div>
```

`auth-bg` в CSS обновить под бренд:
```css
.auth-bg {
  background:
    radial-gradient(ellipse at 30% 20%, rgba(0,212,255,0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 80%, rgba(125,211,252,0.05) 0%, transparent 50%),
    var(--page);
  min-height: 100dvh;
}
```

### Onboarding Page (`src/pages/OnboardingPage.tsx`)

Первый экран онбординга — большое лого:
```tsx
<div className="flex flex-col items-center py-12">
  <img src="/icons/flux-icon.png" alt="Flux" className="w-20 h-20 rounded-2xl mb-6" />
  <h1 className="text-2xl font-bold text-ink">Добро пожаловать в Flux</h1>
  <p className="text-muted text-sm mt-2 text-center max-w-xs">
    Настроим ваш бюджет за пару минут
  </p>
</div>
```

### PWA Manifest (`public/manifest.json` или через vite-plugin-pwa)

```json
{
  "name": "Flux — Семейный бюджет",
  "short_name": "Flux",
  "description": "Контроль расходов, доходов, кредитов и депозитов",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#0B0F1A",
  "background_color": "#0B0F1A",
  "icons": [
    {
      "src": "/icons/flux-icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/flux-icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### `index.html`

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  
  <title>Flux — Умный семейный бюджет</title>
  <meta name="description" content="Flux — контроль расходов, доходов, кредитов и депозитов для семьи. AI-ассистент, аналитика, Казахстан." />
  
  <!-- Favicon -->
  <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
  
  <!-- Theme -->
  <meta name="theme-color" content="#0B0F1A" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  
  <!-- OG -->
  <meta property="og:title" content="Flux — Умный семейный бюджет" />
  <meta property="og:description" content="Контролируйте финансы семьи с AI-ассистентом" />
  <meta property="og:image" content="/icons/flux-logo.png" />
  <meta property="og:type" content="website" />
  
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
</head>
```

### Loading / Splash Screen

При первой загрузке PWA показывать splash с логотипом:

```tsx
// src/components/SplashScreen.tsx
export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[100] bg-[#0B0F1A] flex flex-col items-center justify-center">
      <img 
        src="/icons/flux-icon.png" 
        alt="Flux" 
        className="w-20 h-20 rounded-2xl animate-pulse"
        style={{ boxShadow: '0 0 40px rgba(0,212,255,0.15)' }}
      />
      <div className="mt-6 w-8 h-0.5 bg-gradient-to-r from-[#00D4FF] to-[#7DD3FC] rounded-full animate-pulse" />
    </div>
  );
}
```

### Recovery codes файл

```ts
// AuthPage.tsx → downloadCodes()
const content = [
  '╔══════════════════════════════════╗',
  '║        FLUX — Recovery Codes     ║',
  '╚══════════════════════════════════╝',
  '',
  `Username: ${username}`,
  `Дата: ${new Date().toLocaleDateString('ru-RU')}`,
  '',
  'Храните в безопасном месте.',
  'Каждый код используется один раз.',
  '',
  ...codes.map((c, i) => `  ${i + 1}. ${c}`),
].join('\n');

// filename
a.download = `flux-recovery-${username}.txt`;
```

### Удалить старые файлы

После миграции удалить из `public/icons/`:
- `bg-mobile.png` (фон жены)
- `bg-desktop.png` (фон жены desktop)
- `bg-husband.jpg` (фон мужа)
- Любые старые favicon/manifest icons с "FamilyBudget"

### Градиент бренда как утилита

Добавить в `index.css` утилитарный класс для повторного использования:
```css
.flux-gradient-text {
  background: linear-gradient(135deg, #7DD3FC, #00D4FF);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.flux-glow {
  box-shadow: 0 0 20px rgba(0, 212, 255, 0.15);
}

.flux-glow-strong {
  box-shadow: 0 0 40px rgba(0, 212, 255, 0.25);
}
```

И в Tailwind config:
```ts
// tailwind.config.ts extend
boxShadow: {
  'flux': '0 0 20px rgba(0, 212, 255, 0.15)',
  'flux-lg': '0 0 40px rgba(0, 212, 255, 0.25)',
},
```
