import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { callAI, callAIChat, enqueueAI, getRateLimitInfo, type AIMessage } from '../lib/ai'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './useAuthStore'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  isLoading?: boolean
}

export interface AIChat {
  id: string
  user_id: string
  title: string
  messages: ChatMessage[]
  created_at: string
  updated_at: string
}

interface AIStore {
  chats: AIChat[]
  activeChatId: string | null
  isLoading: boolean

  loadChats: () => Promise<void>
  setActiveChat: (id: string | null) => void
  sendMessage: (text: string, systemPrompt: string) => Promise<void>
  deleteChat: (id: string) => Promise<void>

  // background insights
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
      chats: [],
      activeChatId: null,
      isLoading: false,

      loadChats: async () => {
        const user = useAuthStore.getState().user;
        if (!user) return;
        set({ isLoading: true });
        const { data, error } = await supabase
          .from('ai_chats')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        if (!error && data) {
          set({ chats: data as AIChat[], isLoading: false });
        } else {
          set({ isLoading: false });
        }
      },

      setActiveChat: (id) => set({ activeChatId: id }),

      deleteChat: async (id) => {
        set(s => ({
          chats: s.chats.filter(c => c.id !== id),
          activeChatId: s.activeChatId === id ? null : s.activeChatId,
        }));
        await supabase.from('ai_chats').delete().eq('id', id);
      },

      sendMessage: async (text, systemPrompt) => {
        const user = useAuthStore.getState().user;
        if (!user) return;

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

        let isNewChat = false;
        let chatId = get().activeChatId;

        // Create new chat locally if none active
        if (!chatId) {
          isNewChat = true;
          chatId = crypto.randomUUID();
          const newChat: AIChat = {
            id: chatId,
            user_id: user.id,
            title: text.length > 30 ? text.slice(0, 30) + '...' : text,
            messages: [userMsg, loadingMsg],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          set(s => ({ chats: [newChat, ...s.chats], activeChatId: chatId, isLoading: true }));
        } else {
          set(s => ({
            chats: s.chats.map(c => c.id === chatId ? { ...c, messages: [...c.messages, userMsg, loadingMsg] } : c),
            isLoading: true,
          }));
        }

        try {
          const chat = get().chats.find(c => c.id === chatId);
          if (!chat) return; // Should not happen

          const history: AIMessage[] = chat.messages
            .filter(m => !m.isLoading && m.id !== loadingMsg.id)
            .slice(-10) // Limit context
            .map(m => ({ role: m.role, content: m.content }));

          const reply = await callAIChat([
            { role: 'system', content: systemPrompt + '\n\nВАЖНО ДЛЯ ЭТОГО ОТВЕТА: У пользователя есть персональный чат. Делай краткие четкие ответы 1 абзацем или списком (если просят), но общайся разговорно.' },
            ...history,
          ], { maxTokens: 600, temperature: 0.7 })

          let finalReply = reply;
          if (finalReply === null) {
            const { resetInMs } = getRateLimitInfo('chat')
            const secs = Math.ceil(resetInMs / 1000)
            finalReply = secs > 0
              ? `Слишком много запросов — подожди ${secs} сек.`
              : 'Слишком много запросов — подожди немного.'
          }

          const assistantMsg: ChatMessage = {
            id: loadingMsg.id,
            role: 'assistant',
            content: finalReply,
            timestamp: new Date().toISOString(),
          };

          const newChats = get().chats.map(c => c.id === chatId ? {
            ...c,
            messages: c.messages.map(m => m.id === loadingMsg.id ? assistantMsg : m),
            updated_at: new Date().toISOString()
          } : c);

          set({ chats: newChats, isLoading: false });

          // Save to Supabase
          const updatedChat = newChats.find(c => c.id === chatId);
          if (updatedChat) {
            if (isNewChat) {
              await supabase.from('ai_chats').insert(updatedChat);
            } else {
              await supabase.from('ai_chats').update({
                messages: updatedChat.messages,
                updated_at: updatedChat.updated_at
              }).eq('id', chatId);
            }
          }

        } catch (e) {
          const failMsg: ChatMessage = {
            id: loadingMsg.id,
            role: 'assistant',
            content: 'Не удалось получить ответ от сервера. Попробуй ещё раз.',
            timestamp: new Date().toISOString(),
          };
          const newChats = get().chats.map(c => c.id === chatId ? {
            ...c,
            messages: c.messages.map(m => m.id === loadingMsg.id ? failMsg : m)
          } : c);
          set({ chats: newChats, isLoading: false });
        }
      },

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
          else enqueueAI(() => get().fetchDashboardInsight(systemPrompt))
        } catch { }
      },

      fetchAnalyticsInsight: async (systemPrompt) => {
        if (isFresh(get().analyticsInsightAt)) return
        try {
          const text = await callAI([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'Проанализируй траты за период и дай 2-3 конкретных наблюдения.' },
          ], { maxTokens: 250, temperature: 0.4 })
          if (text) set({ analyticsInsight: text, analyticsInsightAt: Date.now() })
          else enqueueAI(() => get().fetchAnalyticsInsight(systemPrompt))
        } catch { }
      },

      fetchGoalsInsight: async (systemPrompt) => {
        if (isFresh(get().goalsInsightAt)) return
        try {
          const text = await callAI([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'Оцени прогресс по целям и дай совет как ускорить накопление.' },
          ], { maxTokens: 200, temperature: 0.4 })
          if (text) set({ goalsInsight: text, goalsInsightAt: Date.now() })
          else enqueueAI(() => get().fetchGoalsInsight(systemPrompt))
        } catch { }
      },

      setOverspendAlert: (text) => set({ lastOverspendAlert: text }),
      clearOverspendAlert: () => set({ lastOverspendAlert: null }),
    }),
    {
      name: 'fb-ai-v2', // bump version to avoid cache collisions
      partialize: (s) => ({
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
