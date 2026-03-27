import type { Income, Expense, SavingsGoal, BudgetSummary } from '../types'
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

КАТЕГОРИИ БЮДЖЕТА (50/30/20):
- Обязательные (50%): аренда, коммуналка, продукты, транспорт, медицина, связь.
- Гибкие (30%): кафе, рестораны, одежда, развлечения, спорт, подарки.
- Накопления (20%): депозит, подушка безопасности, цели.

ИНТЕРПРЕТАЦИЯ ДАННЫХ:
- Дневной лимит < 1 000 ₸ → предупреди аккуратно.
- Гибкие потрачены > 80% при > 10 днях до прихода → рекомендуй осторожность.
- Накопления < 50% плана в середине месяца → предложи конкретную сумму для пополнения.
- Цель достигнет дедлайна с дефицитом → назови точную сумму которой не хватает.`

export function buildDashboardPrompt(summary: BudgetSummary, expenses: Expense[]): string {
  const topCategories = getTopExpenseCategories(expenses, 3)
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
  period: 'month' | 'prev' | 'q3'
): string {
  const periodLabel = { month: 'текущий месяц', prev: 'прошлый месяц', q3: 'последние 3 месяца' }[period]
  const totalIncome  = incomes.reduce((s, i) => s + i.amount, 0)
  const totalSpent   = expenses.reduce((s, e) => s + e.amount, 0)
  const saved        = totalIncome - totalSpent
  const byType       = getByType(expenses)
  const topCats      = getTopExpenseCategories(expenses, 5)

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
    return `"${g.name}": накоплено ${formatMoney(g.currentAmount)} из ${formatMoney(g.targetAmount)} (${pct}%)${daysLeft ? `, осталось ${daysLeft} дней` : ''}, не хватает ${formatMoney(remaining)}`
  }).join('\n')

  return `${BASE_PERSONA}

ЦЕЛИ НАКОПЛЕНИЙ:
${goalsText || 'Целей пока нет'}

Ежемесячно на накопления выделяется: ${formatMoney(summary.savingsBudget)}
Фактически накоплено в этом месяце: ${formatMoney(summary.savingsActual)}

Пользователь смотрит на страницу целей.`
}

export function buildChatPrompt(summary: BudgetSummary, expenses: Expense[], goals: SavingsGoal[]): string {
  const topCats = getTopExpenseCategories(expenses, 5)
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

export function buildOverspendPrompt(summary: BudgetSummary, categoryName: string, spent: number, budget: number): string {
  return `${BASE_PERSONA}

Пользователь превысил лимит в категории "${categoryName}": потрачено ${formatMoney(spent)}, лимит ${formatMoney(budget)}.
Остаток гибкого бюджета: ${formatMoney(summary.flexibleRemaining)}.
До прихода денег: ${summary.daysUntilNextIncome} дней.

Дай короткий (1 предложение) тактичный совет что делать дальше.`
}

function getTopExpenseCategories(expenses: Expense[], limit: number): string {
  const byCat = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.categoryId] = (acc[e.categoryId] ?? 0) + e.amount
    return acc
  }, {})
  return Object.entries(byCat)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([id, amt]) => `${id}: ${formatMoney(amt)}`)
    .join(', ') || 'нет данных'
}

function getByType(expenses: Expense[]) {
  return {
    mandatory: expenses.filter(e => e.type === 'mandatory').reduce((s, e) => s + e.amount, 0),
    flexible:  expenses.filter(e => e.type === 'flexible').reduce((s, e) => s + e.amount, 0),
    savings:   expenses.filter(e => e.type === 'savings').reduce((s, e) => s + e.amount, 0),
  }
}
