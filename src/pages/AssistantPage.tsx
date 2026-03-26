import { useState, useRef, useEffect } from 'react'
import { PaperPlaneTilt, Trash, Sparkle } from '@phosphor-icons/react'
import { Header } from '../components/layout/Header'
import { useAIStore } from '../store/useAIStore'
import { useBudgetSummary } from '../store/useBudgetStore'
import { useExpenseStore } from '../store/useExpenseStore'
import { useGoalsStore } from '../store/useGoalsStore'
import { buildChatPrompt } from '../lib/aiPrompts'

const QUICK_QUESTIONS = [
  'Как я трачу деньги этот месяц?',
  'Когда накоплю на свою цель?',
  'На чём можно сэкономить?',
  'Сколько осталось до конца месяца?',
]

export function AssistantPage() {
  const summary  = useBudgetSummary()
  const expenses = useExpenseStore(s => s.expenses)
  const goals    = useGoalsStore(s => s.goals)
  const { messages, isLoading, sendMessage, clearChat } = useAIStore()

  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const systemPrompt = buildChatPrompt(summary, expenses, goals)

  async function handleSend(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || isLoading) return
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
          {messages.length > 0 && (
            <button onClick={clearChat} className="text-muted hover:text-danger transition-colors p-1">
              <Trash size={15} />
            </button>
          )}
        </div>

        {messages.length === 0 && (
          <div className="space-y-3 pt-4">
            <p className="text-xs text-muted text-center">Спроси что-нибудь о своём бюджете</p>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_QUESTIONS.map(q => (
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
    </div>
  )
}
