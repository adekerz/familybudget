const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'
const PRIMARY_MODEL   = 'meta-llama/llama-3.3-70b-instruct:free'
const FALLBACK_MODEL  = 'mistralai/mistral-small-3.1-24b-instruct:free'

// Локальный rate-limit: не более 3 запросов за 60 секунд
const RATE_WINDOW_MS = 60_000
const RATE_MAX       = 3
const _requestTimes: number[] = []

function isRateLimited(): boolean {
  const now = Date.now()
  // Убрать записи старше окна
  while (_requestTimes.length > 0 && now - _requestTimes[0] > RATE_WINDOW_MS) {
    _requestTimes.shift()
  }
  return _requestTimes.length >= RATE_MAX
}

function recordRequest(): void {
  _requestTimes.push(Date.now())
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function callAI(
  messages: AIMessage[],
  options?: { model?: string; maxTokens?: number }
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
      temperature: 0.4,
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
