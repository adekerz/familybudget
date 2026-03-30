import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// ──────────────────────────────────────────────
// SHA-256 fallback (клиентская формула: hash:salt)
// ──────────────────────────────────────────────
async function sha256Legacy(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + salt)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ──────────────────────────────────────────────
// Rate limit (5 неуспешных попыток за 15 мин)
// ──────────────────────────────────────────────
async function isRateLimited(username: string): Promise<boolean> {
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('login_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('username', username)
    .eq('success', false)
    .gte('attempted_at', since)
  return (count ?? 0) >= 5
}

async function recordAttempt(username: string, success: boolean) {
  await supabase.from('login_attempts').insert({ username, success })
}

// ──────────────────────────────────────────────
// Handler
// ──────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  let body: { action?: string; username?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return respond({ error: 'invalid_json' }, 400)
  }

  const { action, username, password } = body

  // ── action: hash ──────────────────────────────
  // Хеширует пароль bcrypt, возвращает хеш.
  // Вызывается при регистрации / смене пароля.
  if (action === 'hash') {
    if (!password) return respond({ error: 'missing_password' }, 400)
    const hash = await bcrypt.hash(password, await bcrypt.genSalt(12))
    return respond({ hash })
  }

  // ── action: verify ────────────────────────────
  // Верифицирует логин. Возвращает user-строку при успехе.
  if (action === 'verify') {
    if (!username || !password) return respond({ error: 'missing_fields' }, 400)

    const normalizedUsername = username.trim().toLowerCase()

    if (await isRateLimited(normalizedUsername)) {
      return respond({ ok: false, error: 'rate_limited' })
    }

    const { data: row } = await supabase
      .from('app_users')
      .select('id, username, space_id, role, theme_id, must_change_password, password_hash, password_bcrypt')
      .eq('username', normalizedUsername)
      .single()

    if (!row) {
      await recordAttempt(normalizedUsername, false)
      return respond({ ok: false, error: 'invalid_credentials' })
    }

    if (!row.password_hash && !row.password_bcrypt) {
      return respond({ ok: false, error: 'not_setup' })
    }

    let verified = false

    // Сначала пробуем bcrypt (новые пользователи / мигрированные)
    if (row.password_bcrypt) {
      verified = await bcrypt.compare(password, row.password_bcrypt)
    }

    // Fallback на SHA-256 (старые хеши до миграции)
    if (!verified && row.password_hash) {
      const [storedHash, salt] = (row.password_hash as string).split(':')
      if (storedHash && salt) {
        const inputHash = await sha256Legacy(password, salt)
        verified = inputHash === storedHash
      }
    }

    if (!verified) {
      await recordAttempt(normalizedUsername, false)
      return respond({ ok: false, error: 'invalid_credentials' })
    }

    // ── Ленивая миграция SHA-256 → bcrypt ────────
    if (!row.password_bcrypt) {
      const newHash = await bcrypt.hash(password, await bcrypt.genSalt(12))
      // fire-and-forget: не блокируем ответ
      supabase.from('app_users')
        .update({ password_bcrypt: newHash })
        .eq('id', row.id)
        .then(() => {})
    }

    await recordAttempt(normalizedUsername, true)

    return respond({
      ok: true,
      user: {
        id: row.id,
        username: row.username,
        space_id: row.space_id,
        role: row.role,
        theme_id: row.theme_id,
        must_change_password: row.must_change_password ?? false,
      },
    })
  }

  return respond({ error: 'unknown_action' }, 400)
})
