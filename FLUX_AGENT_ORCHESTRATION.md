# FLUX — Agent Orchestration Setup + Execution Prompt

## Контекст
- Repo: https://github.com/adekerz/familybudget
- URL: https://flux-ae.vercel.app
- Стек: React 19, TypeScript, Vite, Tailwind CSS 3, Zustand 5, Supabase, recharts, Phosphor Icons, i18next, PWA
- Размер: ~120 файлов, ~15K строк

---

## ЗАДАЧА

Создай систему агентов в `.claude/agents/`, затем используй их для выполнения полного рефакторинга проекта Flux. Работай как Project Supervisor — сначала настрой инфраструктуру, потом последовательно запускай агентов по фазам.

---

## ШАГ 1: Создай CLAUDE.md

Создай файл `CLAUDE.md` в корне проекта:

```markdown
# Flux — Fintech Budget App

## Project
- React 19 + TypeScript + Vite + Tailwind CSS 3 + Zustand 5 + Supabase
- PWA, deployed on Vercel
- Currency: KZT (тенге), target: Kazakhstan
- i18n: ru, en, kz (react-i18next)
- Icons: @phosphor-icons/react
- Charts: recharts
- Auth: custom password + WebAuthn (passkeys)

## Architecture
- Pages: src/pages/ (13 pages)
- Components: src/components/ (organized by feature)
- State: src/store/ (Zustand stores, 20 stores)
- Logic: src/lib/ (calculations, dates, formatting, AI)
- Types: src/types/
- i18n: src/i18n/locales/{ru,en,kz}.json

## Key Financial Logic
- Two calculation engines exist (PROBLEM — must be unified):
  - `src/lib/calculations.ts` → `computeEngineResult()` → `useFinanceEngine` store
  - `src/store/useBudgetStore.ts` → `useBudgetSummary()` (reads stores directly)
- PayPeriod engine: salary-to-salary cycles
- Budget model: 50/30/20 (mandatory/flexible/savings) with custom ratios

## CSS Theme System
- CSS variables defined in `src/lib/themes.ts` (light + dark)
- Applied via `data-theme` attribute on `<html>`
- Tailwind maps to CSS vars in `tailwind.config.ts`
- KNOWN BUG: Header, Sidebar, BottomNav have hardcoded dark colors — don't adapt to light theme

## Conventions
- Use `t('key')` from react-i18next for ALL user-facing strings
- Use CSS variables (`var(--cer)`, `var(--ink)`, etc.) for colors, never hardcode
- Use `style={{ color: 'var(--text3)' }}` pattern for inline theme colors
- Functional components only, no class components
- Zustand stores with `create()` pattern
```

## ШАГ 2: Создай агентов

### `.claude/agents/i18n-specialist.md`

```markdown
---
name: i18n-specialist
description: Finds and fixes hardcoded strings, ensures full i18n coverage across all three languages
model: claude-sonnet-4-5-20250929
tools:
  - Read
  - Edit
  - Write
  - Grep
  - Glob
---

You are an i18n specialist for a React + react-i18next application.

## Your Task
1. Find ALL hardcoded Russian strings in src/**/*.tsx and src/**/*.ts files (excluding i18n/, aiPrompts.ts, aiContext.ts)
2. For each string: add a key to ru.json, en.json, kz.json
3. Replace the hardcoded string with `t('key')` call
4. Ensure `useTranslation` is imported in each file where you add `t()`
5. Check that NO hardcoded Cyrillic text remains in JSX output

## Search Pattern
Use grep to find: `'[А-Яа-яЁё][А-Яа-яЁё ]{2,}'` in .tsx/.ts files

## Known Locations (29 strings in 20 files)
- ThemeSwitcher.tsx — 'Тема изменена'
- DistributionPreview.tsx — 'Гибкие', 'Накопления'
- IncomeForm.tsx — type labels
- ExpenseForm.tsx — type labels
- SettingsDistributionSection.tsx — labels
- SettingsIncomeSourcesSection.tsx — 'Последний'
- UpcomingPaymentsWidget.tsx — 'Сегодня'
- HealthScoreCard.tsx — 'Внимание'
- PaceIndicator.tsx — 'Внимание'
- AddPlannedTransactionModal.tsx — 'Укажи название'
- AddSinkingFundModal.tsx — 'Укажи название'
- DonutChart.tsx — 'расходы'
- AnalyticsPage.tsx — period labels, type names, day labels
- ExpensesPage.tsx — today, type labels
- DebtsPage.tsx — direction labels
- DepositsPage.tsx — empty states, labels
- AdminPage.tsx — 'Никогда'
- AssistantPage.tsx — placeholder
- DepositCalculator.tsx — all labels
- AppShell.tsx, BottomNav.tsx — ternary labels for admin/debts/deposits
- SettingsPage.tsx — footer text

## Rules
- Key naming: snake_case, descriptive (e.g., `today_label`, `savings_label`, `theme_changed`)
- English translations: natural, not literal
- Kazakh translations: use proper Kazakh (not Russian transliteration)
- Don't touch strings inside comments, console.log, or AI prompt builders
- After completing: run grep again to verify ZERO remaining hardcoded Cyrillic in JSX
```

### `.claude/agents/theme-fixer.md`

```markdown
---
name: theme-fixer
description: Fixes theme system — removes hardcoded dark colors, makes all navigation theme-responsive
model: claude-sonnet-4-5-20250929
tools:
  - Read
  - Edit
  - Write
  - Grep
---

You are a CSS/theme specialist for a React + Tailwind app with CSS variable theming.

## Your Task
Fix the theme system so that Header, Sidebar, and BottomNav adapt to both light and dark themes.

## Problem
These files have hardcoded dark backgrounds that don't change on light theme:
- `src/components/layout/Header.tsx` — `rgba(11,15,26,0.92)`
- `src/components/layout/AppShell.tsx` — `rgba(11,15,26,0.95)` 
- `src/components/layout/BottomNav.tsx` — `rgba(11,15,26,0.92)`

Also hardcoded text/border colors: `#475569`, `#0B0F1A`, `#F1F5F9`, `#94A3B8`, `rgba(255,255,255,0.06)`, `rgba(255,255,255,0.08)`

## Solution
Replace ALL hardcoded colors with CSS variable equivalents:
- `rgba(11,15,26,0.92)` → `color-mix(in srgb, var(--card) 92%, transparent)`
- `rgba(11,15,26,0.95)` → `color-mix(in srgb, var(--card) 98%, transparent)`
- `color: '#475569'` → `color: 'var(--text3)'`
- `color: '#0B0F1A'` → `color: 'var(--ink)'`
- `color: '#F1F5F9'` → `color: 'var(--text1)'`
- `color: '#94A3B8'` → `color: 'var(--text3)'`
- `rgba(255,255,255,0.06)` → `var(--border)` or `color-mix(in srgb, var(--ink) 6%, transparent)`
- `rgba(255,255,255,0.08)` → `var(--border)`

## Also Fix
1. Logo rendering — replace `<img src="/icons/flux-logo.png">` with FluxLogo component:
   - Icon: `<img>` with `mixBlendMode: 'screen'`
   - Text: `<span className="flux-gradient-text">Flux</span>`
   - Add `.flux-gradient-text` CSS class with light/dark variants to `index.css`
   
2. Header deduplication on desktop — add `md:hidden` to elements that duplicate sidebar:
   - Logo → `md:hidden`
   - Username badge → `md:hidden`  
   - ThemeSwitcherCompact → `md:hidden`

3. AuthPage.tsx logo — same mixBlendMode fix + gradient text

## Files to Modify
- src/components/layout/Header.tsx
- src/components/layout/AppShell.tsx
- src/components/layout/BottomNav.tsx
- src/pages/AuthPage.tsx
- src/index.css

## Rules
- Test both themes mentally: every color must look correct on #F8FAFC (light) and #0B0F1A (dark)
- Keep `backdropFilter: 'blur(20px)'` — it still works with CSS vars
- Don't break the gradient button in sidebar ("Добавить расход")
```

### `.claude/agents/finance-architect.md`

```markdown
---
name: finance-architect
description: Unifies the two calculation engines and fixes financial logic edge cases
model: claude-sonnet-4-5-20250929
tools:
  - Read
  - Edit
  - Write
  - Grep
  - Glob
---

You are a fintech backend architect specializing in personal finance calculation systems.

## Your Task
1. Unify two parallel calculation engines into ONE source of truth
2. Fix edge cases in financial logic
3. Improve Dashboard to be a decision-making system

## Problem: Two Engines
- Engine A: `src/lib/calculations.ts` → `computeEngineResult()` → `src/store/useFinanceEngine.ts` → used by HeroCard, DashboardPage
- Engine B: `src/store/useBudgetStore.ts` → `useBudgetSummary()` → reads stores directly → used by CategoryCards, HealthScore, AnalyticsPage

They use DIFFERENT period logic and can show contradictory numbers.

## Solution
Make `useBudgetSummary()` READ from `useFinanceEngine` instead of computing independently:

```typescript
export function useBudgetSummary(): BudgetSummary {
  const engine = useFinanceEngine(s => s.result);
  const fixedItems = usePlannedFixedStore(s => s.items);
  const ratios = useSettingsStore(s => s.defaultRatios);
  
  if (!engine) return DEFAULT_BUDGET_SUMMARY;
  
  const fixedTotal = fixedItems.filter(f => f.isActive).reduce((s, f) => s + f.amount, 0);
  const distributable = Math.max(0, engine.totalIncome - fixedTotal);
  const mandatoryBudget = Math.round(distributable * ratios.mandatory);
  const flexibleBudget = Math.round(distributable * ratios.flexible);
  const savingsBudget = distributable - mandatoryBudget - flexibleBudget;
  
  return {
    totalBalance: engine.rawBalance,
    mandatoryBudget, mandatorySpent: engine.mandatorySpent,
    mandatoryRemaining: mandatoryBudget - engine.mandatorySpent,
    flexibleBudget, flexibleSpent: engine.flexibleSpent,
    flexibleRemaining: flexibleBudget - engine.flexibleSpent,
    savingsBudget, savingsActual: engine.savingsSpent,
    savingsRemaining: savingsBudget - engine.savingsSpent,
    fixedTotal,
    dailyFlexibleLimit: engine.dailyLimit,
    periodStart: engine.periodStart,
    // ... fill remaining fields from engine
  };
}
```

## Edge Case Fix: dates.ts ~line 196
```typescript
// BUG: fallback uses ALL incomes ever (period becomes years long)
const sourceIncomes = cycleIncomes.length > 0 ? cycleIncomes : incomes;
// FIX:
if (cycleIncomes.length === 0) {
  return { start: new Date(y, m, 1, 0, 0, 0), end: todayEnd };
}
```

## Edge Cases to Handle
- No incomes → safeToSpend = 0, show "Add income" prompt
- Negative balance → isOverBudget = true, red state
- Category overspend → alert via useCategoryLimitAlerts (already connected)
- No custom ratios → fallback 50/30/20
- Period transition → old period closes cleanly

## Dashboard Block Priority (for UX agent reference)
1. Hero: spendable + daily limit + days left + state (green/yellow/red)
2. Alerts: overspend / high burn rate / category exceeded
3. Spending pace: actual vs expected
4. Categories: sorted by risk (most overspent first)
5. Donut chart
6. Recent transactions
7. Bank breakdown
8. AI insight
```

### `.claude/agents/ux-improver.md`

```markdown
---
name: ux-improver
description: Improves UX patterns — empty states, settings grouping, mobile layouts, accessibility
model: claude-sonnet-4-5-20250929
tools:
  - Read
  - Edit
  - Write
  - Grep
---

You are a UX engineer focused on fintech mobile-first applications.

## Your Tasks

### 1. Empty States — add call to action
Replace plain text empty states with actionable ones (icon + message + button).
Files: DebtsPage.tsx, DepositsPage.tsx, GoalsPage.tsx, ExpensesPage.tsx, AssistantPage.tsx

Pattern:
```tsx
<div className="flex flex-col items-center py-12 text-center">
  <IconComponent size={40} style={{ color: 'var(--text3)' }} />
  <p className="text-sm font-semibold mt-3" style={{ color: 'var(--ink)' }}>
    {t('no_active_debts')}
  </p>
  <p className="text-xs mt-1 max-w-[240px]" style={{ color: 'var(--text3)' }}>
    {t('add_first_debt_hint')}
  </p>
  <button onClick={handleAdd} className="mt-4 px-5 py-2.5 rounded-xl text-sm font-bold"
    style={{ background: 'var(--cer)', color: '#fff' }}>
    {t('add')}
  </button>
</div>
```

### 2. Settings Page — group with section headers
File: src/pages/SettingsPage.tsx

Group into 4 sections with h2 headers:
- Appearance: Language, Theme
- Finance: Income Sources, Payers, Distribution, Accounts, Fixed Expenses, Category Limits, Recurring
- Security: Face ID / Passkeys, Push
- Data: iPhone Shortcuts, Export, Clear, Logout

### 3. Mobile Layout Fixes
- CategoryCards.tsx: horizontal scroll on mobile, grid on desktop
  `flex gap-3 overflow-x-auto snap-x no-scrollbar md:grid md:grid-cols-3`
  Each card: `min-w-[160px] shrink-0 snap-start md:min-w-0`
  
- HeroCard.tsx: stack metrics on mobile
  `flex flex-col gap-2 sm:grid sm:grid-cols-2`

- All page main areas: add `max-w-4xl mx-auto`

### 4. recharts Fix
- DonutChart.tsx: `<ResponsiveContainer width="100%" height={chartHeight} minWidth={100}>`
- DepositCalculator.tsx: same pattern for LineChart

### 5. Accessibility
- All icon-only buttons need `aria-label`
- Remove `user-scalable=no` from index.html viewport meta
- Add `focus-visible` ring styles to interactive elements
- Check color contrast of var(--text3) on both themes

### 6. SEO / HTML
- index.html: add `<link rel="canonical">`, dual theme-color meta, remove user-scalable=no
- Add `lang` attribute update on language switch in i18n/index.ts
- Replace key divs with semantic tags: `<aside>` for sidebar, `<section>` for settings groups
```

### `.claude/agents/security-auditor.md`

```markdown
---
name: security-auditor
description: Audits WebAuthn implementation for edge cases and error handling
model: claude-sonnet-4-5-20250929
tools:
  - Read
  - Grep
  - Glob
---

You are a security engineer specializing in WebAuthn/FIDO2 and web authentication.

## Your Task
Audit the WebAuthn implementation and fix error handling gaps.

## Files to Audit
- src/lib/webauthn.ts — core WebAuthn functions
- src/store/useAuthStore.ts — registerPasskey, loginWithPasskey, recoverWithPasskey
- src/pages/AuthPage.tsx — UI for passkey login/register
- src/components/settings/SettingsSecuritySection.tsx — passkey management

## Known Issues to Fix

1. **registerPasskey in useAuthStore (~line 288)** — no try/catch. If edge function fails → unhandled rejection.
   Fix: wrap in try/catch, show error toast.

2. **Timeout handling** — authenticatePasskey() doesn't handle timeout errors specifically.
   Fix: catch timeout error, return user-friendly message.

3. **Verify these edge cases are handled:**
   - Browser doesn't support WebAuthn → button hidden (check: browserSupportsWebAuthn)
   - User cancels prompt → NotAllowed/cancel/abort → silent return (check: already handled in AuthPage)
   - No credentials registered → 'no_credentials' error → show message (check: already handled)
   - Network failure during challenge/verify → should show retry option

4. **Report findings** — list what's already handled well and what needs fixing.

## Rules
- READ ONLY for audit — only Edit if you find a clear bug
- Don't change the WebAuthn flow architecture
- Don't modify Supabase Edge Functions (they're not in this repo)
```

## ШАГ 3: Создай orchestration prompt

### `.claude/agents/orchestrator.md`

```markdown
---
name: orchestrator
description: Project supervisor that coordinates all specialist agents in correct order
model: claude-sonnet-4-5-20250929
tools:
  - Read
  - Edit
  - Write
  - Grep
  - Glob
  - Task
---

You are the Project Supervisor for the Flux refactoring project.

## Execution Plan

Execute agents in this specific order. Wait for each phase to complete before starting the next.

### Phase 1: Foundation (sequential — shared files)
1. Run `theme-fixer` — fixes logo, theme colors, header deduplication
2. Run `finance-architect` — unifies calculation engines, fixes edge cases

### Phase 2: Content (parallel — isolated files)  
3. Run `i18n-specialist` — 29 hardcoded strings across 20 files
4. Run `security-auditor` — WebAuthn audit (read-only, may edit 1-2 files)

### Phase 3: Polish (sequential — depends on Phase 1+2)
5. Run `ux-improver` — empty states, settings, mobile, a11y, SEO

### Phase 4: Verification
After all agents complete, verify:
- [ ] `grep -rP "'[А-Яа-яЁё]{3,}'" src/ --include="*.tsx" | grep -v i18n | grep -v aiPrompts` → 0 results
- [ ] No hardcoded `rgba(11,15,26` in layout files
- [ ] Both themes render correctly (mentally verify)
- [ ] Console errors (404, 406, width(-1)) are resolved
- [ ] All empty states have call-to-action buttons

## Conflict Prevention Rules
- Phase 1 agents work on layout/logic files — MUST complete before Phase 3
- Phase 2 agents work on content/security files — can run parallel
- Phase 3 agent (ux-improver) touches some files from Phase 1 (DashboardPage) — waits for Phase 1

## Final Report Format
```
## Completed:
1. [Agent] — [Files changed] — [What was done]

## Issues Found:
1. [Description] — [Severity] — [Recommendation]

## Verification:
- Hardcoded Russian: X remaining (target: 0)
- Hardcoded colors: X remaining (target: 0)  
- Console errors: [list]

## Recommendations for Next Sprint:
1. ...
```
```

---

## ШАГ 4: Выполнение

После создания всех файлов выше, запусти orchestrator:

```
Use the orchestrator agent to execute the full Flux refactoring plan. 
Start with Phase 1 (theme-fixer, then finance-architect), 
then Phase 2 (i18n-specialist + security-auditor in parallel), 
then Phase 3 (ux-improver).
End with Phase 4 verification and produce the final report.
```

---

## АЛЬТЕРНАТИВА: Без agent teams (проще)

Если agent teams не включены или хочешь проще — используй subagents через Task tool. Скопируй CLAUDE.md и agents/ файлы, потом в одной сессии напиши:

```
Read CLAUDE.md and all files in .claude/agents/. 
Then execute the orchestration plan from orchestrator.md:
1. First do theme-fixer tasks
2. Then finance-architect tasks  
3. Then i18n-specialist tasks
4. Then security-auditor tasks
5. Then ux-improver tasks
6. Run verification checks
7. Produce final report
```

Claude Code автоматически будет спавнить subagents через Task tool для параллельных фаз.

---

## ВАЖНО

- Все агенты НЕ трогают: Supabase Edge Functions, migrations, package.json dependencies
- Все агенты используют CSS variables, не hardcode цвета
- Все агенты используют `t()` для строк, не hardcode текст
- При конфликте — CLAUDE.md имеет приоритет над agent instructions
- Каждый агент после завершения: проверяет свою работу grep-ом
