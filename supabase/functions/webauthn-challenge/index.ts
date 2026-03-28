import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { generateRegistrationOptions, generateAuthenticationOptions } from 'https://esm.sh/@simplewebauthn/server@13.1.1?target=deno'

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

  const { type, userId, username } = await req.json()
  const rpID = new URL(req.headers.get('origin') ?? 'https://familybudget-aa.vercel.app').hostname

  if (type === 'registration') {
    const { data: existing } = await supabase
      .from('webauthn_credentials')
      .select('credential_id, transports')
      .eq('user_id', userId)

    const options = await generateRegistrationOptions({
      rpName: 'FamilyBudget',
      rpID,
      userID: new TextEncoder().encode(userId),
      userName: username,
      userDisplayName: username,
      attestationType: 'none',
      excludeCredentials: (existing ?? []).map((c) => ({
        id: c.credential_id,
        transports: c.transports,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'required',
      },
    })

    await supabase.from('webauthn_challenges').insert({
      user_id: userId,
      challenge: options.challenge,
      type: 'registration',
    })

    return new Response(JSON.stringify(options), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (type === 'authentication') {
    // Discoverable credentials — браузер сам находит ключ без указания username
    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: [], // пустой = браузер показывает список аккаунтов
      userVerification: 'required',
      timeout: 60000,
    })

    // Сохраняем challenge без привязки к user_id (узнаем после верификации)
    await supabase.from('webauthn_challenges').insert({
      user_id: null,
      challenge: options.challenge,
      type: 'authentication',
    })

    return new Response(JSON.stringify(options), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ error: 'invalid_type' }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
