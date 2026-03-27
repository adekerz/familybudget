import { useEffect } from 'react'
import { useAIStore } from '../store/useAIStore'

type InsightType = 'dashboard' | 'analytics' | 'goals'

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Единый хук для загрузки AI-инсайта на страницах.
 * Убирает дублирование useEffect + buildXPrompt + fetchXInsight.
 */
export function useAIInsight(
  type: InsightType,
  buildPrompt: () => string,
  deps: unknown[]
) {
  const insight = useAIStore(s => s[`${type}Insight` as keyof typeof s] as string | null)
  const fetch   = useAIStore(s => s[`fetch${capitalize(type)}Insight` as keyof typeof s] as (p: string) => Promise<void>)

  useEffect(() => {
    fetch(buildPrompt())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { insight, isLoading: !insight }
}
