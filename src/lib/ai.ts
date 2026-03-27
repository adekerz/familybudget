const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'
const PRIMARY_MODEL   = 'google/gemini-2.5-flash-lite'
const FALLBACK_MODEL  = 'meta-llama/llama-3.3-70b-instruct'

// Локальный rate-limit: не более 3 запросов за 60 секунд (хранится в localStorage)
const RATE_WINDOW_MS = 60_000
const RATE_MAX       = 3
const LS_KEY         = 'fb_ai_req_times'

function isRateLimited(): boolean {
  const raw = localStorage.getItem(LS_KEY)
  const times: number[] = raw ? JSON.parse(raw) : []
  const now = Date.now()
  const fresh = times.filter(t => now - t < RATE_WINDOW_MS)
  localStorage.setItem(LS_KEY, JSON.stringify(fresh))
  return fresh.length >= RATE_MAX
}

function recordRequest(): void {
  const raw = localStorage.getItem(LS_KEY)
  const times: number[] = raw ? JSON.parse(raw) : []
  times.push(Date.now())
  localStorage.setItem(LS_KEY, JSON.stringify(times))
}

// ─── AI Request Queue ───────────────────────────────────────────
// При rate-limit запрос не теряется, а ставится в очередь и выполняется
// как только освободится слот (каждые RATE_WINDOW_MS / RATE_MAX = 20 сек)
const _queue: Array<() => void> = []
let _flushScheduled = false

function scheduleFlush() {
  if (_flushScheduled) return
  _flushScheduled = true
  const wait = Math.ceil(RATE_WINDOW_MS / RATE_MAX) // 20 000 ms
  setTimeout(() => {
    _flushScheduled = false
    if (_queue.length > 0 && !isRateLimited()) {
      const next = _queue.shift()
      next?.()
    }
    if (_queue.length > 0) scheduleFlush()
  }, wait)
}

export function enqueueAI(fn: () => void) {
  _queue.push(fn)
  scheduleFlush()
}
// ────────────────────────────────────────────────────────────────

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function callAI(
  messages: AIMessage[],
  options?: { model?: string; maxTokens?: number; temperature?: number }
): Promise<string | null> {
  if (isRateLimited()) return null

  const model = options?.model ?? PRIMARY_MODEL
  const key   = import.meta.env.VITE_OPENROUTER_API_KEY as string

  recordRequest()

  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://familybudget.app',
      'X-Title': 'FamilyBudget',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options?.maxTokens ?? 512,
      temperature: options?.temperature ?? 0.4,
    }),
  })

  if (res.status === 429 || res.status === 503) {
    if (model !== FALLBACK_MODEL) {
      return callAI(messages, { ...options, model: FALLBACK_MODEL })
    }
    throw new Error('rate_limit')
  }

  if (!res.ok) throw new Error(`ai_error_${res.status}`)

  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() ?? null
}

export function detectLanguage(text: string): 'ru' | 'en' {
  const ruChars = (text.match(/[а-яёА-ЯЁ]/g) ?? []).length
  const enChars = (text.match(/[a-zA-Z]/g) ?? []).length
  return ruChars >= enChars ? 'ru' : 'en'
}
