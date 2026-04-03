import { useAuthStore } from '../store/useAuthStore'

// Все AI-запросы идут через Supabase Edge Function — ключ OpenRouter никогда не покидает сервер
const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-proxy`

const PRIMARY_MODEL  = 'google/gemini-2.5-flash-lite'
const FALLBACK_MODEL = 'meta-llama/llama-3.3-70b-instruct'

// ─── Раздельные rate-limit'ы ─────────────────────────────────────
const RATE_WINDOW_MS = 60_000

const LIMITS = {
  insight: { max: 3, key: 'fb_ai_insight_times' }, // фоновые инсайты
  chat:    { max: 5, key: 'fb_ai_chat_times'    }, // пользовательский чат
}

type AIBucket = keyof typeof LIMITS

function isRateLimited(bucket: AIBucket): boolean {
  const { max, key } = LIMITS[bucket]
  const raw = localStorage.getItem(key)
  const times: number[] = raw ? JSON.parse(raw) : []
  const now = Date.now()
  const fresh = times.filter(t => now - t < RATE_WINDOW_MS)
  localStorage.setItem(key, JSON.stringify(fresh))
  return fresh.length >= max
}

function recordRequest(bucket: AIBucket): void {
  const { key } = LIMITS[bucket]
  const raw = localStorage.getItem(key)
  const times: number[] = raw ? JSON.parse(raw) : []
  times.push(Date.now())
  localStorage.setItem(key, JSON.stringify(times))
}

export function getRateLimitInfo(bucket: AIBucket): { limited: boolean; resetInMs: number } {
  const { max, key } = LIMITS[bucket]
  const raw = localStorage.getItem(key)
  const times: number[] = raw ? JSON.parse(raw) : []
  const now = Date.now()
  const fresh = times.filter(t => now - t < RATE_WINDOW_MS)
  if (fresh.length < max) return { limited: false, resetInMs: 0 }
  const oldest = Math.min(...fresh)
  return { limited: true, resetInMs: Math.max(0, RATE_WINDOW_MS - (now - oldest)) }
}

// ─── AI Request Queue (только для инсайтов) ──────────────────────
const _queue: Array<() => void> = []
let _flushScheduled = false

function scheduleFlush() {
  if (_flushScheduled) return
  _flushScheduled = true
  const wait = Math.ceil(RATE_WINDOW_MS / LIMITS.insight.max) // 20 000 ms
  setTimeout(() => {
    _flushScheduled = false
    if (_queue.length > 0 && !isRateLimited('insight')) {
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

/** Сброс rate-limit при логине — чтобы накопленные 401 не блокировали сессию */
export function clearAllRateLimits() {
  Object.values(LIMITS).forEach(({ key }) => localStorage.removeItem(key))
}
// ────────────────────────────────────────────────────────────────

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

async function _callAI(
  messages: AIMessage[],
  bucket: AIBucket,
  options?: { model?: string; maxTokens?: number; temperature?: number }
): Promise<string | null> {
  if (isRateLimited(bucket)) {
    if (import.meta.env.DEV) {
      console.warn('[AI] callAI returned null — rate limited or session expired')
    }
    return null
  }

  const model = options?.model ?? PRIMARY_MODEL
  const token = useAuthStore.getState().sessionToken
  if (!token) return null

  recordRequest(bucket)

  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-request-type': bucket,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options?.maxTokens ?? 512,
      temperature: options?.temperature ?? 0.4,
    }),
  })

  if (res.status === 401) {
    // Сессия протухла — сбрасываем все rate limit ключи
    clearAllRateLimits()
    return null
  }

  if (res.status === 429 || res.status === 503) {
    if (model !== FALLBACK_MODEL) {
      return _callAI(messages, bucket, { ...options, model: FALLBACK_MODEL })
    }
    throw new Error('rate_limit')
  }

  if (!res.ok) throw new Error(`ai_error_${res.status}`)

  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() ?? null
}

/** Для инсайтов (дашборд, аналитика, цели) — лимит 3/мин */
export function callAI(
  messages: AIMessage[],
  options?: { model?: string; maxTokens?: number; temperature?: number }
): Promise<string | null> {
  return _callAI(messages, 'insight', options)
}

/** Для чата — лимит 5/мин, не блокируется инсайтами */
export function callAIChat(
  messages: AIMessage[],
  options?: { model?: string; maxTokens?: number; temperature?: number }
): Promise<string | null> {
  return _callAI(messages, 'chat', options)
}
