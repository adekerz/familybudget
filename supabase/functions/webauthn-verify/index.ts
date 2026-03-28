import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
} from 'https://esm.sh/@simplewebauthn/server@13.1.1?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { type, userId, response } = await req.json()
  const origin = req.headers.get('origin') ?? 'https://familybudget-aa.vercel.app'
  const rpID = new URL(origin).hostname

  const nowIso = new Date().toISOString()
  console.log('verify userId:', userId, 'type:', type, 'now:', nowIso)

  const { data: challengeRow, error: challengeError } = await supabase
    .from('webauthn_challenges')
    .select('*')
    .eq('user_id', userId)
    .eq('type', type === 'registration' ? 'registration' : 'authentication')
    .gt('expires_at', nowIso)
    .order('expires_at', { ascending: false })
    .limit(1)
    .single()

  console.log('challengeRow:', JSON.stringify(challengeRow), 'error:', JSON.stringify(challengeError))

  if (!challengeRow) {
    return new Response(JSON.stringify({ error: 'challenge_expired' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  await supabase.from('webauthn_challenges').delete().eq('id', challengeRow.id)

  if (type === 'registration') {
    let verification
    try {
      verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: challengeRow.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      })
    } catch (e) {
      return new Response(JSON.stringify({ error: 'verification_failed', detail: String(e) }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!verification.verified || !verification.registrationInfo) {
      return new Response(JSON.stringify({ error: 'not_verified' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { credential } = verification.registrationInfo

    const pubKeyBase64 = btoa(String.fromCharCode(...credential.publicKey))

    const transports = response.response.transports ?? []
    // Определяем тип устройства по транспортам
    let device_type = 'passkey'
    if (transports.includes('internal')) {
      const ua = req.headers.get('user-agent') ?? ''
      if (/iphone|ipad|mac/i.test(ua)) device_type = 'face_id'
      else if (/android/i.test(ua)) device_type = 'fingerprint'
      else device_type = 'windows_hello'
    } else if (transports.includes('usb') || transports.includes('nfc') || transports.includes('ble')) {
      device_type = 'security_key'
    }

    await supabase.from('webauthn_credentials').insert({
      user_id: userId,
      credential_id: credential.id,
      public_key: pubKeyBase64,
      counter: credential.counter,
      transports,
      device_type,
    })

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (type === 'authentication') {
    const { data: credRow } = await supabase
      .from('webauthn_credentials')
      .select('*')
      .eq('credential_id', response.id)
      .eq('user_id', userId)
      .single()

    if (!credRow) {
      return new Response(JSON.stringify({ error: 'credential_not_found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let verification
    try {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challengeRow.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: credRow.credential_id,
          publicKey: Uint8Array.from(atob(credRow.public_key), c => c.charCodeAt(0)),
          counter: credRow.counter,
          transports: credRow.transports,
        },
      })
    } catch (e) {
      return new Response(JSON.stringify({ error: 'verification_failed', detail: String(e) }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!verification.verified) {
      return new Response(JSON.stringify({ error: 'not_verified' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await supabase
      .from('webauthn_credentials')
      .update({ counter: verification.authenticationInfo.newCounter })
      .eq('id', credRow.id)

    const { data: userRow } = await supabase
      .from('app_users')
      .select('*, spaces(name)')
      .eq('id', userId)
      .single()

    return new Response(JSON.stringify({ ok: true, user: userRow }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ error: 'invalid_type' }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
