import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser'
import { supabase } from './supabase'

const CHALLENGE_FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webauthn-challenge`
const VERIFY_FN    = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webauthn-verify`
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export { browserSupportsWebAuthn }

async function callEdge(url: string, body: object) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).error ?? `http_${res.status}`)
  }
  return res.json()
}

/** Проверить есть ли у пользователя зарегистрированный passkey */
export async function hasPasskey(userId: string): Promise<boolean> {
  const { count } = await supabase
    .from('webauthn_credentials')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  return (count ?? 0) > 0
}

/** Зарегистрировать новый passkey (вызывать после успешного логина паролем) */
export async function registerPasskey(userId: string, username: string): Promise<void> {
  const options = await callEdge(CHALLENGE_FN, { type: 'registration', userId, username })
  const regResponse = await startRegistration({ optionsJSON: options })
  const result = await callEdge(VERIFY_FN, { type: 'registration', userId, response: regResponse })
  if (!result.ok) throw new Error('registration_failed')
}

/** Войти через passkey. Возвращает user row из app_users */
export async function authenticatePasskey(username: string): Promise<{
  id: string
  username: string
  space_id: string
  role: string
  theme_id: string
  must_change_password: boolean
  spaces: { name: string }
}> {
  const data = await callEdge(CHALLENGE_FN, { type: 'authentication', username })
  if (data.error) throw new Error(data.error)

  const { resolvedUserId, ...options } = data
  const authResponse = await startAuthentication({ optionsJSON: options })
  const result = await callEdge(VERIFY_FN, {
    type: 'authentication',
    userId: resolvedUserId,
    response: authResponse,
  })
  if (!result.ok) throw new Error('authentication_failed')
  return result.user
}
