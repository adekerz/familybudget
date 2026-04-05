// src/lib/aiContext.ts
// Единый контекст для AI — берёт данные из useEngine()

import type { EngineResult } from './calculations';
import type { Expense } from '../types';
import type { Category } from '../types';

export function buildAIContext(
  engine: EngineResult,
  recentExpenses: Expense[],
  categories: Category[]
): string {
  const topCategories = recentExpenses
    .reduce((acc: Record<string, number>, e) => {
      const cat = categories.find(c => c.id === e.categoryId);
      const name = cat?.name ?? 'Прочее';
      acc[name] = (acc[name] ?? 0) + e.amount;
      return acc;
    }, {});

  const topCatList = Object.entries(topCategories)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, amount]) => `${name}: ${amount.toLocaleString('ru-KZ')} ₸`)
    .join(', ');

  return `
# Контекст семейного бюджета (Казахстан, ₸)

## Текущий период
- Начало: ${engine.periodStart}
- Конец: ${engine.periodEnd}
- Прошло: ${engine.daysPassed} из ${engine.daysTotal} дней (осталось ${engine.daysRemaining})

## Финансы
- Бюджет периода: ${engine.totalIncome.toLocaleString('ru-KZ')} ₸
- Потрачено: ${engine.totalExpenses.toLocaleString('ru-KZ')} ₸
- Безопасно потратить: ${engine.safeToSpend.toLocaleString('ru-KZ')} ₸
- Лимит на день: ${engine.dailyLimit.toLocaleString('ru-KZ')} ₸
- Темп трат: ${engine.paceStatus === 'on_track' ? 'в норме' : engine.paceStatus === 'warning' ? 'выше плана' : 'опасно высокий'}

## Топ расходы
${topCatList || 'Нет данных'}

## Банки
${Object.entries(engine.bankBreakdown).map(([b, a]) => `${b}: ${a.toLocaleString('ru-KZ')} ₸`).join(', ') || 'Нет данных'}

## Запланировано к оплате
Осталос�� заплатить: ${engine.plannedPending.toLocaleString('ru-KZ')} ₸
  `.trim();
}
