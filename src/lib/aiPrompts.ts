import type { Income, Expense, SavingsGoal, BudgetSummary, Category } from '../types'
import { formatMoney } from './format'

const BASE_PERSONA = `Ты — финансовый ассистент приложения FamilyBudget для семьи в Казахстане.

РОЛЬ И ГРАНИЦЫ:
- Помогаешь контролировать бюджет, анализировать траты, достигать финансовых целей.
- Не даёшь инвестиционных советов. Не упоминаешь банки, кредиты, финансовые продукты.
- Если данных нет — прямо говоришь: "Сначала добавь доходы/расходы".

ТОНАЛЬНОСТЬ:
- Говоришь как умный друг семьи — тепло, конкретно, без морализаторства.
- Хвалишь реальные успехи. Предупреждаешь о рисках без паники.
- Никогда не повторяешь один и тот же совет подряд.

ФОРМАТ ОТВЕТОВ:
- Язык — автоматически: русский если вопрос на русском, английский если на английском.
- Валюта — тенге (₸). Суммы с пробелами: 32 500 ₸.
- Инсайт дашборда: строго 1–2 предложения, без приветствий.
- Аналитика: 2–3 конкретных наблюдения с цифрами из данных.
- Цели: оценка прогресса + 1 конкретный следующий шаг.
- Алерт превышения: 1 предложение, тактично, с учётом контекста.
- Чат: отвечай развёрнуто если вопрос требует деталей, кратко — если нет.

СТИЛЬ ОБЩЕНИЯ В ЧАТЕ:
- Говори как человек, не как отчёт. Никаких заголовков **Инсайт дашборда:**, **Аналитика:**, **Цель:**.
- Никогда не используй markdown bullets (* пункт) в чате — только живой текст.
- Не повторяй то что пользователь только что сказал ("Отлично, что цель Корея добавлена!").
- Отвечай на вопрос напрямую с первого предложения.
- Категории называй по-русски: "Рестораны", не "dining". "Прочее", не "other_flex".

КАТЕГОРИИ БЮДЖЕТА (50/30/20):
- Обязательные (50%): аренда, коммуналка, продукты, транспорт, медицина, связь.
- Гибкие (30%): кафе, рестораны, одежда, развлечения, спорт, подарки.
- Накопления (20%): депозит, подушка безопасности, цели.

ИНТЕРПРЕТАЦИЯ ДАННЫХ:
- Дневной лимит < 1 000 ₸ → предупреди аккуратно.
- Гибкие потрачены > 80% при > 10 днях до прихода → рекомендуй осторожность.
- Накопления < 50% плана в середине месяца → предложи конкретную сумму для пополнения.
- Цель достигнет дедлайна с дефицитом → назови точную сумму которой не хватает.`

export function buildDashboardPrompt(summary: BudgetSummary, expenses: Expense[], categories: Category[] = []): string {
  const topCategories = getTopExpenseCategories(expenses, 3, categories)
  return `${BASE_PERSONA}

ТЕКУЩЕЕ СОСТОЯНИЕ БЮДЖЕТА:
- Свободных денег (гибкие): ${formatMoney(summary.flexibleRemaining)}
- Дневной лимит: ${formatMoney(summary.dailyFlexibleLimit)}
- До следующего прихода: ${summary.daysUntilNextIncome} дней
- Обязательные: потрачено ${formatMoney(summary.mandatorySpent)} из ${formatMoney(summary.mandatoryBudget)}
- Гибкие: потрачено ${formatMoney(summary.flexibleSpent)} из ${formatMoney(summary.flexibleBudget)}
- Накоплено: ${formatMoney(summary.savingsActual)} из ${formatMoney(summary.savingsBudget)} план
- Фиксированные расходы: ${formatMoney(summary.fixedTotal)}
- Топ-3 категории трат этого месяца: ${topCategories}

Сейчас пользователь смотрит на главный экран дашборда.`
}

export function buildAnalyticsPrompt(
  incomes: Income[],
  expenses: Expense[],
  period: 'month' | 'prev' | 'q3',
  categories: Category[] = []
): string {
  const periodLabel = { month: 'текущий месяц', prev: 'прошлый месяц', q3: 'последние 3 месяца' }[period]
  const totalIncome  = incomes.reduce((s, i) => s + i.amount, 0)
  const totalSpent   = expenses.reduce((s, e) => s + e.amount, 0)
  const saved        = totalIncome - totalSpent
  const byType       = getByType(expenses)
  const topCats      = getTopExpenseCategories(expenses, 5, categories)
  const patterns     = buildSpendingPatterns(expenses)

  return `${BASE_PERSONA}

АНАЛИТИКА ЗА ПЕРИОД: ${periodLabel}
- Доходы: ${formatMoney(totalIncome)}
- Расходы: ${formatMoney(totalSpent)}
- Сэкономлено: ${formatMoney(saved)}
- Обязательные расходы: ${formatMoney(byType.mandatory)}
- Гибкие расходы: ${formatMoney(byType.flexible)}
- Накопления: ${formatMoney(byType.savings)}
- Топ-5 категорий: ${topCats}
- Количество транзакций: ${expenses.length}
- ${patterns}

Пользователь смотрит на страницу аналитики.`
}

export function buildGoalsPrompt(goals: SavingsGoal[], summary: BudgetSummary): string {
  const activeGoals = goals.filter(g => g.isActive)
  const goalsText = activeGoals.map(g => {
    const pct = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0
    const remaining = g.targetAmount - g.currentAmount
    const daysLeft = g.targetDate
      ? Math.ceil((new Date(g.targetDate).getTime() - Date.now()) / 86_400_000)
      : null

    // Реальный темп накоплений
    const monthsActive = Math.max(1,
      (Date.now() - new Date(g.createdAt).getTime()) / (30 * 24 * 3600 * 1000)
    )
    const monthlyRate = Math.round(g.currentAmount / monthsActive)
    const etaMonths = monthlyRate > 0
      ? Math.ceil(remaining / monthlyRate)
      : null
    const etaStr = etaMonths !== null
      ? `, реальный темп: ${formatMoney(monthlyRate)}/мес → ETA: ~${etaMonths} мес`
      : ''

    return `"${g.name}": накоплено ${formatMoney(g.currentAmount)} из ${formatMoney(g.targetAmount)} (${pct}%)${daysLeft ? `, дедлайн через ${daysLeft} дней` : ''}${etaStr}, не хватает ${formatMoney(remaining)}`
  }).join('\n')

  return `${BASE_PERSONA}

ЦЕЛИ НАКОПЛЕНИЙ:
${goalsText || 'Целей пока нет'}

Ежемесячно на накопления выделяется: ${formatMoney(summary.savingsBudget)}
Фактически накоплено в этом месяце: ${formatMoney(summary.savingsActual)}

Пользователь смотрит на страницу целей.`
}

export function buildChatPrompt(summary: BudgetSummary, expenses: Expense[], goals: SavingsGoal[], categories: Category[] = []): string {
  const topCats = getTopExpenseCategories(expenses, 5, categories)
  const activeGoals = goals.filter(g => g.isActive).map(g =>
    `"${g.name}": ${Math.round((g.currentAmount / g.targetAmount) * 100)}%`
  ).join(', ')

  return `${BASE_PERSONA}

ПОЛНЫЙ КОНТЕКСТ БЮДЖЕТА:
- Свободных денег: ${formatMoney(summary.flexibleRemaining)}
- Дневной лимит: ${formatMoney(summary.dailyFlexibleLimit)}/день
- До следующего прихода: ${summary.daysUntilNextIncome} дней
- Обязательные: ${formatMoney(summary.mandatorySpent)} / ${formatMoney(summary.mandatoryBudget)}
- Гибкие: ${formatMoney(summary.flexibleSpent)} / ${formatMoney(summary.flexibleBudget)}
- Накопления: ${formatMoney(summary.savingsActual)} / ${formatMoney(summary.savingsBudget)}
- Топ-5 категорий: ${topCats}
- Цели: ${activeGoals || 'нет'}
- Транзакций в этом месяце: ${expenses.filter(e => {
    const d = new Date(e.date)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length}

Пользователь общается в чате. Отвечай развёрнуто если спрашивают подробно.`
}

export function buildOverspendPrompt(summary: BudgetSummary, categoryName: string, spent: number, budget: number, overspendCount = 1): string {
  const history = overspendCount > 1
    ? `Это ${overspendCount}-й раз превышения лимита в этой категории в текущем месяце. `
    : ''
  return `${BASE_PERSONA}

${history}Пользователь превысил лимит в категории "${categoryName}": потрачено ${formatMoney(spent)}, лимит ${formatMoney(budget)}.
Остаток гибкого бюджета: ${formatMoney(summary.flexibleRemaining)}.
До прихода денег: ${summary.daysUntilNextIncome} дней.

Дай короткий (1 предложение) тактичный совет что делать дальше.`
}

function getTopExpenseCategories(expenses: Expense[], limit: number, categories: Category[] = []): string {
  const nameMap = Object.fromEntries(categories.map(c => [c.id, c.name]))
  const byCat = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.categoryId] = (acc[e.categoryId] ?? 0) + e.amount
    return acc
  }, {})
  return Object.entries(byCat)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([id, amt]) => `${nameMap[id] ?? id}: ${formatMoney(amt)}`)
    .join(', ') || 'нет данных'
}

function getByType(expenses: Expense[]) {
  return {
    mandatory: expenses.filter(e => e.type === 'mandatory').reduce((s, e) => s + e.amount, 0),
    flexible:  expenses.filter(e => e.type === 'flexible').reduce((s, e) => s + e.amount, 0),
    savings:   expenses.filter(e => e.type === 'savings').reduce((s, e) => s + e.amount, 0),
  }
}

function buildSpendingPatterns(expenses: Expense[]): string {
  if (expenses.length === 0) return 'Паттерны трат: данных нет'
  const byDow = Array(7).fill(0) as number[]
  expenses.forEach(e => { byDow[new Date(e.date).getDay()] += e.amount })
  const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
  const top = byDow
    .map((amt, i) => ({ day: days[i], amt }))
    .filter(d => d.amt > 0)
    .sort((a, b) => b.amt - a.amt)
    .slice(0, 3)
    .map(d => `${d.day}: ${formatMoney(d.amt)}`)
    .join(', ')
  return `Топ дни трат по дням недели: ${top}`
}
