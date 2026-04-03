import { useState, useRef, useEffect, useMemo } from 'react'
import { PaperPlaneTilt, Trash, Sparkle, List, Plus } from '@phosphor-icons/react'
import { Header } from '../components/layout/Header'
import { useAIStore } from '../store/useAIStore'
import { useBudgetSummary } from '../store/useBudgetStore'
import { useExpenseStore } from '../store/useExpenseStore'
import { useGoalsStore } from '../store/useGoalsStore'
import { useIncomeStore } from '../store/useIncomeStore'
import { usePlannedFixedStore } from '../store/usePlannedFixedStore'
import { buildChatPrompt } from '../lib/aiPrompts'
import { useCategoryStore } from '../store/useCategoryStore'
import { usePayPeriodStore } from '../store/usePayPeriodStore'
import Modal from '../components/ui/Modal'

const ALL_QUESTIONS = [
  'Сколько я могу потратить сегодня?',
  'На что трачу больше всего?',
  'Как дела с накоплениями?',
  'Где можно сэкономить?',
  'Сколько осталось до конца месяца?',
  'Успею накопить на цель?',
  'Что будет если потрачу ещё 5 000 ₸?',
  'Как мы тратим по сравнению с прошлым месяцем?',
  'Какой день недели самый дорогой?',
  'На что ушло больше всего за 3 месяца?',
]

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

export function AssistantPage() {
  const summary       = useBudgetSummary()
  const expenses      = useExpenseStore(s => s.expenses)
  const goals         = useGoalsStore(s => s.goals)
  const categories    = useCategoryStore(s => s.categories)
  const incomes       = useIncomeStore(s => s.incomes)
  const fixedItems       = usePlannedFixedStore(s => s.items)
  const payPeriodSummary = usePayPeriodStore(s => s.summary)
  const { chats, activeChatId, isLoading, sendMessage, setActiveChat, deleteChat } = useAIStore()

  const [input, setInput] = useState('')
  const [showChats, setShowChats] = useState(false)
  const [questions, setQuestions] = useState(() => shuffle(ALL_QUESTIONS).slice(0, 4))
  const bottomRef = useRef<HTMLDivElement>(null)

  const activeChat = chats.find(c => c.id === activeChatId)
  const messages = activeChat?.messages ?? []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const id = setInterval(() => {
      setQuestions(shuffle(ALL_QUESTIONS).slice(0, 4))
    }, 30_000)
    return () => clearInterval(id)
  }, [])

  const systemPrompt = useMemo(
    () => buildChatPrompt(
      summary, expenses, goals, categories, incomes,
      fixedItems.map(f => ({
        id: f.id,
        name: f.title,
        amount: f.amount,
        icon: 'Lock',
        isActive: f.isActive,
        createdAt: f.createdAt,
      })),
      payPeriodSummary ? {
        safeToSpend: payPeriodSummary.safeToSpend,
        daysRemaining: payPeriodSummary.pace.daysRemaining,
        paceStatus: payPeriodSummary.pace.status,
        projectedEndBalance: payPeriodSummary.pace.projectedEndBalance,
        plannedExpenses: payPeriodSummary.plannedTransactions
          .filter(t => t.type === 'expense' && t.status === 'pending')
          .map(t => ({ title: t.title, amount: t.amount, scheduledDate: t.scheduledDate })),
        sinkingFunds: payPeriodSummary.sinkingFunds
          .map(f => ({ name: f.name, monthlyContribution: f.monthlyContribution ?? 0 })),
      } : undefined
    ),
    [summary, expenses, goals, categories, incomes, fixedItems, payPeriodSummary]
  )

  async function handleSend(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || isLoading) return
    if (msg.length > 2000) {
      alert('Слишком длинное сообщение (максимум 2000 символов)')
      return
    }
    setInput('')
    await sendMessage(msg, systemPrompt)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-40 space-y-3">

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-accent flex items-center justify-center">
              <Sparkle size={14} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink">Финансовый ассистент</h2>
              <p className="text-[10px] text-muted">Знает ваш бюджет</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!activeChatId ? null : (
              <button onClick={() => setActiveChat(null)} className="text-accent hover:bg-accent/10 transition-colors p-1.5 rounded-lg flex items-center gap-1 text-[11px] font-semibold">
                <Plus size={14} /> Новый
              </button>
            )}
            <button onClick={() => setShowChats(true)} className="text-ink hover:bg-sand transition-colors p-1.5 rounded-lg">
              <List size={20} />
            </button>
          </div>
        </div>

        {messages.length === 0 && (
          <div className="space-y-3 pt-4">
            <p className="text-xs text-muted text-center">Спроси что-нибудь о своём бюджете</p>
            <div className="grid grid-cols-2 gap-2">
              {questions.map(q => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="bg-card border border-border rounded-xl p-3 text-left text-xs text-ink
                             hover:border-accent/40 active:scale-[0.98] transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-lg bg-accent flex items-center justify-center shrink-0 mr-2 mt-1">
                <Sparkle size={11} className="text-white" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed
                ${msg.role === 'user'
                  ? 'bg-accent text-white rounded-br-sm'
                  : 'bg-card border border-border text-ink rounded-bl-sm'}`}
            >
              {msg.isLoading ? (
                <div className="flex items-center gap-1.5 py-1">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </main>

      <div className="fixed bottom-[64px] left-0 right-0 px-4 pb-3 bg-page/90 backdrop-blur-sm">
        <div className="flex items-center gap-2 bg-card border border-border rounded-2xl px-3 py-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Спроси о своём бюджете..."
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center
                       disabled:opacity-40 active:scale-95 transition-all"
          >
            <PaperPlaneTilt size={14} className="text-white" />
          </button>
        </div>
      </div>

      <Modal isOpen={showChats} onClose={() => setShowChats(false)} title="История чатов">
        <div className="space-y-2 max-h-[60vh] overflow-y-auto no-scrollbar">
          <button
            onClick={() => { setActiveChat(null); setShowChats(false); }}
            className="w-full flex items-center gap-2 p-3 rounded-xl bg-accent-light text-accent font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
          >
            <Plus size={16} /> Новый чат
          </button>

          {chats.length === 0 ? (
            <p className="text-xs text-muted text-center py-6">Нет предыдущих чатов</p>
          ) : (
            chats.map(chat => (
              <div
                key={chat.id}
                className={`flex flex-col border border-border rounded-xl p-3 text-left transition-all group relative cursor-pointer
                           ${activeChatId === chat.id ? 'bg-card border-accent' : 'bg-card hover:bg-sand/30'}`}
                onClick={() => { setActiveChat(chat.id); setShowChats(false); }}
              >
                <div className="flex justify-between items-start mb-1">
                  <p className="text-sm text-ink font-medium pr-8 truncate">
                    {chat.title}
                  </p>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                    className="absolute right-3 top-3 text-muted hover:text-danger transition-colors p-1 opacity-60 hover:opacity-100"
                  >
                    <Trash size={14} />
                  </button>
                </div>
                <p className="text-[10px] text-muted">
                  {new Date(chat.updated_at).toLocaleDateString()} в {new Date(chat.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  )
}
