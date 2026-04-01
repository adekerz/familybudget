import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Resolve caller's user_id from session
    let callerId: string | null = null

    const { data: sessionRow } = await supabase
      .from('user_sessions')
      .select('user_id, expires_at')
      .eq('token', sessionToken)
      .single()

    if (sessionRow && new Date(sessionRow.expires_at) > new Date()) {
      callerId = sessionRow.user_id
    }

    if (!callerId) {
      const { data: userRow } = await supabase
        .from('app_users')
        .select('id, session_expires_at')
        .eq('session_token', sessionToken)
        .single()
      if (userRow && (!userRow.session_expires_at || new Date(userRow.session_expires_at) > new Date())) {
        callerId = userRow.id
      }
    }

    if (!callerId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify caller is an admin
    const { data: callerRow } = await supabase
      .from('app_users')
      .select('role, space_id')
      .eq('id', callerId)
      .single()

    if (!callerRow || callerRow.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { targetUserId, newRole } = await req.json()

    if (!targetUserId || !['admin', 'member'].includes(newRole)) {
      return new Response(JSON.stringify({ error: 'Invalid input' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Cannot change your own role
    if (targetUserId === callerId) {
      return new Response(JSON.stringify({ error: 'Cannot change your own role' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Target must be in the same space as the caller
    const { data: targetRow } = await supabase
      .from('app_users')
      .select('space_id')
      .eq('id', targetUserId)
      .single()

    if (!targetRow || targetRow.space_id !== callerRow.space_id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { error } = await supabase
      .from('app_users')
      .update({ role: newRole })
      .eq('id', targetUserId)

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
