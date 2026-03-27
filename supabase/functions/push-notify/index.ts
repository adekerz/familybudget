import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Web Push via web-push compatible implementation using VAPID
// deno-compatible web push signing

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── VAPID JWT signing ───────────────────────────────────────────────────────
async function importVapidPrivateKey(base64url: string): Promise<CryptoKey> {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4)
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  return crypto.subtle.importKey(
    'raw', raw,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  ).then(async (ecdhKey) => {
    // Export as JWK then re-import as ECDSA for signing
    const jwk = await crypto.subtle.exportKey('jwk', ecdhKey)
    jwk.key_ops = ['sign']
    return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  })
}

function base64urlEncode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function createVapidJWT(audience: string, subject: string, privateKey: CryptoKey): Promise<string> {
  const header = base64urlEncode(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const now = Math.floor(Date.now() / 1000)
  const payload = base64urlEncode(new TextEncoder().encode(JSON.stringify({
    aud: audience,
    exp: now + 43200, // 12h
    sub: subject,
  })))
  const signingInput = `${header}.${payload}`
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    privateKey,
    new TextEncoder().encode(signingInput)
  )
  return `${signingInput}.${base64urlEncode(sig)}`
}

// ─── Main ────────────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    const vapidPublicKey  = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidSubject    = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com'

    if (!vapidPrivateKey || !vapidPublicKey) {
      return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Получаем тело запроса (опционально — можно вызвать без тела из cron)
    let spaceId: string | null = null
    let title = 'FamilyBudget'
    let body = 'Проверьте бюджет на сегодня'
    let url = '/'

    if (req.method === 'POST') {
      try {
        const b = await req.json()
        spaceId = b.space_id ?? null
        title = b.title ?? title
        body  = b.body  ?? body
        url   = b.url   ?? url
      } catch { /* cron вызов без тела */ }
    }

    // Загружаем подписки
    let query = supabase.from('push_subscriptions').select('*')
    if (spaceId) query = query.eq('space_id', spaceId)
    const { data: subs } = await query

    if (!subs?.length) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const signingKey = await importVapidPrivateKey(vapidPrivateKey)
    const payload = JSON.stringify({ title, body, url })
    const payloadBytes = new TextEncoder().encode(payload)

    let sent = 0
    const expired: string[] = []

    for (const sub of subs) {
      try {
        const origin = new URL(sub.endpoint).origin
        const jwt = await createVapidJWT(origin, vapidSubject, signingKey)
        const vapidHeader = `vapid t=${jwt},k=${vapidPublicKey}`

        // Для простоты — unencrypted push (Content-Encoding: aes128gcm требует библиотеку)
        // Используем Content-Type text/plain — браузеры поддерживают
        const res = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'Authorization': vapidHeader,
            'Content-Type': 'application/octet-stream',
            'Content-Encoding': 'aes128gcm',
            'TTL': '86400',
          },
          body: payloadBytes,
        })

        if (res.status === 201 || res.status === 200) {
          sent++
        } else if (res.status === 404 || res.status === 410) {
          expired.push(sub.endpoint)
        }
      } catch { /* skip failed */ }
    }

    // Удаляем истёкшие подписки
    if (expired.length) {
      await supabase.from('push_subscriptions').delete().in('endpoint', expired)
    }

    return new Response(JSON.stringify({ sent, expired: expired.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
