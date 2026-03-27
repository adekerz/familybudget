import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { callAI, type AIMessage } from '../lib/ai'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  isLoading?: boolean
}

interface AIStore {
  messages: ChatMessage[]
  isLoading: boolean
  sendMessage: (text: string, systemPrompt: string) => Promise<void>
  clearChat: () => void

  dashboardInsight: string | null
  dashboardInsightAt: number | null
  analyticsInsight: string | null
  analyticsInsightAt: number | null
  goalsInsight: string | null
  goalsInsightAt: number | null

  fetchDashboardInsight: (systemPrompt: string) => Promise<void>
  fetchAnalyticsInsight: (systemPrompt: string) => Promise<void>
  fetchGoalsInsight: (systemPrompt: string) => Promise<void>

  lastOverspendAlert: string | null
  setOverspendAlert: (text: string) => void
  clearOverspendAlert: () => void
}

const CACHE_TTL = 2 * 60 * 60 * 1000

function isFresh(ts: number | null): boolean {
  if (!ts) return false
  return Date.now() - ts < CACHE_TTL
}

export const useAIStore = create<AIStore>()(
  persist(
    (set, get) => ({
      messages: [],
      isLoading: false,

      sendMessage: async (text, systemPrompt) => {
        const userMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'user',
          content: text,
          timestamp: new Date().toISOString(),
        }
        const loadingMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
          isLoading: true,
        }
        set(s => ({
          messages: [...s.messages, userMsg, loadingMsg],
          isLoading: true,
        }))

        try {
          const history: AIMessage[] = get().messages
            .filter(m => !m.isLoading)
            .slice(-10)
            .map(m => ({ role: m.role, content: m.content }))

          history.push({ role: 'user', content: text })

          const reply = await callAI([
            { role: 'system', content: systemPrompt + '\n\nВАЖНО ДЛЯ ЭТОГО ОТВЕТА: Пользователь написал в чат — отвечай разговорно, одним абзацем. Без заголовков, без bullet points, без markdown bold.' },
            ...history,
          ], { maxTokens: 600, temperature: 0.7 })

          if (reply === null) {
            set(s => ({
              messages: s.messages.map(m =>
                m.isLoading ? { ...m, content: 'Слишком много запросов — подожди минуту.', isLoading: false } : m
              ),
              isLoading: false,
            }))
            return
          }

          set(s => ({
            messages: s.messages.map(m =>
              m.isLoading ? { ...m, content: reply, isLoading: false } : m
            ),
            isLoading: false,
          }))
        } catch {
          set(s => ({
            messages: s.messages.map(m =>
              m.isLoading
                ? { ...m, content: 'Не удалось получить ответ. Попробуй ещё раз.', isLoading: false }
                : m
            ),
            isLoading: false,
          }))
        }
      },

      clearChat: () => set({ messages: [] }),

      dashboardInsight: null,
      dashboardInsightAt: null,
      analyticsInsight: null,
      analyticsInsightAt: null,
      goalsInsight: null,
      goalsInsightAt: null,
      lastOverspendAlert: null,

      fetchDashboardInsight: async (systemPrompt) => {
        if (isFresh(get().dashboardInsightAt)) return
        try {
          const text = await callAI([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'Дай один короткий финансовый совет или наблюдение на сегодня (1-2 предложения).' },
          ], { maxTokens: 120, temperature: 0.4 })
          if (text) set({ dashboardInsight: text, dashboardInsightAt: Date.now() })
        } catch { /* тихо */ }
      },

      fetchAnalyticsInsight: async (systemPrompt) => {
        if (isFresh(get().analyticsInsightAt)) return
        try {
          const text = await callAI([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'Проанализируй траты за период и дай 2-3 конкретных наблюдения.' },
          ], { maxTokens: 250, temperature: 0.4 })
          if (text) set({ analyticsInsight: text, analyticsInsightAt: Date.now() })
        } catch { /* тихо */ }
      },

      fetchGoalsInsight: async (systemPrompt) => {
        if (isFresh(get().goalsInsightAt)) return
        try {
          const text = await callAI([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'Оцени прогресс по целям и дай совет как ускорить накопление.' },
          ], { maxTokens: 200, temperature: 0.4 })
          if (text) set({ goalsInsight: text, goalsInsightAt: Date.now() })
        } catch { /* тихо */ }
      },

      setOverspendAlert: (text) => set({ lastOverspendAlert: text }),
      clearOverspendAlert: () => set({ lastOverspendAlert: null }),
    }),
    {
      name: 'fb-ai',
      partialize: (s) => ({
        messages: s.messages.slice(-30),
        dashboardInsight: s.dashboardInsight,
        dashboardInsightAt: s.dashboardInsightAt,
        analyticsInsight: s.analyticsInsight,
        analyticsInsightAt: s.analyticsInsightAt,
        goalsInsight: s.goalsInsight,
        goalsInsightAt: s.goalsInsightAt,
      }),
    }
  )
)
