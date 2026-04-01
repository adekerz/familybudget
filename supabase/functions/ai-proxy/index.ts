import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-type',
}

// Серверные лимиты (совпадают с клиентскими, но их нельзя обойти)
const RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  insight: { max: 3,  windowMs: 60_000 },
  chat:    { max: 5,  windowMs: 60_000 },
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    const sessionToken = authHeader?.replace('Bearer ', '').trim()

    if (!sessionToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Проверяем сессию и получаем user_id
    let userId: string | null = null

    const { data: sessionRow } = await supabase
      .from('user_sessions')
      .select('user_id, expires_at')
      .eq('token', sessionToken)
      .single()

    if (sessionRow && new Date(sessionRow.expires_at) > new Date()) {
      userId = sessionRow.user_id
    }

    // Fallback: старая колонка app_users.session_token
    if (!userId) {
      const { data: userRow } = await supabase
        .from('app_users')
        .select('id, session_expires_at')
        .eq('session_token', sessionToken)
        .single()
      if (userRow && (!userRow.session_expires_at || new Date(userRow.session_expires_at) > new Date())) {
        userId = userRow.id
      }
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ─── Серверный rate limiting ─────────────────────────────────
    const requestType = req.headers.get('x-request-type') ?? 'chat'
    const limit = RATE_LIMITS[requestType] ?? RATE_LIMITS.chat
    const now = new Date()

    const { data: rl } = await supabase
      .from('ai_rate_limits')
      .select('calls, window_start')
      .eq('user_id', userId)
      .eq('type', requestType)
      .single()

    if (rl) {
      const windowStart = new Date(rl.window_start).getTime()
      const elapsed = now.getTime() - windowStart

      if (elapsed < limit.windowMs) {
        if (rl.calls >= limit.max) {
          const resetInMs = limit.windowMs - elapsed
          return new Response(
            JSON.stringify({ error: 'rate_limited', resetInMs }),
            {
              status: 429,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          )
        }
        // Инкремент в рамках текущего окна
        await supabase
          .from('ai_rate_limits')
          .update({ calls: rl.calls + 1 })
          .eq('user_id', userId)
          .eq('type', requestType)
      } else {
        // Новое окно — сбрасываем счётчик
        await supabase
          .from('ai_rate_limits')
          .update({ calls: 1, window_start: now.toISOString() })
          .eq('user_id', userId)
          .eq('type', requestType)
      }
    } else {
      // Первый запрос — создаём запись
      await supabase
        .from('ai_rate_limits')
        .insert({ user_id: userId, type: requestType, calls: 1, window_start: now.toISOString() })
    }
    // ─────────────────────────────────────────────────────────────

    const body = await req.json()

    // Валидация инпута (Anti-prompt injection & Max length)
    const messages = body.messages || []
    const lastMessage = messages[messages.length - 1]
    if (lastMessage && lastMessage.role === 'user') {
      const content = lastMessage.content || ''

      if (content.length > 2000) {
        return new Response(JSON.stringify({ error: 'Message payload too large (max 2000 chars)' }), {
          status: 413,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const suspiciousRegex = /ignore.*prompt|ignore.*instruction|system prompt|jailbreak|забудь.{1,20}инструкции/i
      if (suspiciousRegex.test(content)) {
        lastMessage.content = '[Ввод заблокирован фильтром безопасности]'
      }
    }

    // Жёсткое ограничение токенов на сервере
    const MAX_ALLOWED_TOKENS = 800
    body.max_tokens = Math.min(body.max_tokens ?? 512, MAX_ALLOWED_TOKENS)

    const openrouterKey = Deno.env.get('OPENROUTER_KEY')
    if (!openrouterKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://familybudget.app',
        'X-Title': 'FamilyBudget',
      },
      body: JSON.stringify(body),
    })

    const data = await response.text()
    return new Response(data, {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
