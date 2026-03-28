import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Берём sessionToken из заголовка Authorization: Bearer <token>
    const authHeader = req.headers.get('Authorization')
    const sessionToken = authHeader?.replace('Bearer ', '').trim()

    if (!sessionToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Проверяем токен через Service Role (ключ автоматически доступен в Edge Functions)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Проверяем сначала в user_sessions (новая таблица множественных сессий)
    let authorized = false
    const { data: sessionRow } = await supabase
      .from('user_sessions')
      .select('user_id, expires_at')
      .eq('token', sessionToken)
      .single()

    if (sessionRow && new Date(sessionRow.expires_at) > new Date()) {
      authorized = true
    }

    // Fallback: проверяем старую колонку app_users.session_token
    if (!authorized) {
      const { data: userRow } = await supabase
        .from('app_users')
        .select('id, session_expires_at')
        .eq('session_token', sessionToken)
        .single()
      if (userRow && (!userRow.session_expires_at || new Date(userRow.session_expires_at) > new Date())) {
        authorized = true
      }
    }

    if (!authorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()

    // 1. ЖЕСТКАЯ ВАЛИДАЦИЯ ИНПУТА (Anti-prompt injection & Max length)
    const messages = body.messages || []
    const lastMessage = messages[messages.length - 1]
    if (lastMessage && lastMessage.role === 'user') {
      const content = lastMessage.content || ''
      
      // Ограничение на длину (Защита от сжигания токенов)
      if (content.length > 2000) {
        return new Response(JSON.stringify({ error: 'Message payload too large (max 2000 chars)' }), {
          status: 413,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      
      // Минимальный anti-prompt injection фильтр
      const suspiciousRegex = /ignore.*prompt|ignore.*instruction|system prompt|jailbreak|забудь.{1,20}инструкции/i
      if (suspiciousRegex.test(content)) {
        // Заменяем взлом на заглушку
        lastMessage.content = "[Ввод заблокирован фильтром безопасности]"
      }
    }

    // 2. ЖЕСТКОЕ ОГРАНИЧЕНИЕ ТОКЕНОВ НА СЕРВЕРЕ (не доверяем фронту)
    const MAX_ALLOWED_TOKENS = 800
    body.max_tokens = Math.min(body.max_tokens ?? 512, MAX_ALLOWED_TOKENS)

    // Проксируем в OpenRouter
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
