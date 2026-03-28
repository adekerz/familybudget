import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import type { AppUser, UserRole } from '../types'
import { registerPasskey as webauthnRegister, authenticatePasskey, hasPasskey as checkHasPasskey, listPasskeys, deletePasskey, type PasskeyCredential } from '../lib/webauthn'

// SHA-256 + salt (Web Crypto API) — без bcrypt на клиенте для производительности
async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + salt)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function generateSalt(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

function generateRecoveryCodes(): string[] {
  return Array.from({ length: 8 }, () => {
    const part1 = Math.random().toString(36).substring(2, 6).toUpperCase()
    const part2 = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `${part1}-${part2}`
  })
}

async function hashCode(code: string): Promise<string> {
  return hashPassword(code, 'recovery-salt-fb')
}

// Rate limit: 5 попыток за 15 минут
async function checkRateLimit(username: string): Promise<boolean> {
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

interface AuthStore {
  user: AppUser | null
  isAuthenticated: boolean
  sessionToken: string | null
  onlineUsers: string[]

  confirmPasswordChanged: () => void
  login: (username: string, password: string) => Promise<
    { ok: true; mustChangePassword: boolean } |
    { ok: false; error: 'invalid_credentials' | 'rate_limited' | 'not_setup' }
  >
  logout: () => void
  register: (username: string, password: string, spaceId: string, role?: UserRole) => Promise<
    { ok: true; recoveryCodes: string[] } |
    { ok: false; error: 'username_taken' | 'space_not_found' }
  >
  recoverWithCode: (username: string, code: string, newPassword: string) => Promise<boolean>
  checkSession: () => void
  updateTheme: (themeId: string) => Promise<void>
  setupFirstPassword: (userId: string, password: string) => Promise<{ ok: true; recoveryCodes: string[] }>
  changeUserRole: (userId: string, newRole: 'admin' | 'member') => Promise<boolean>
  changePassword: (newPassword: string) => Promise<string[] | null>
  registerPasskey: () => Promise<void>
  loginWithPasskey: (username: string) => Promise<{ ok: true } | { ok: false; error: string }>
  refreshPasskeyStatus: () => Promise<void>
  listUserPasskeys: () => Promise<PasskeyCredential[]>
  deleteUserPasskey: (credentialId: string) => Promise<boolean>
  recoverWithPasskey: (username: string, newPassword: string) => Promise<{ ok: true; codes: string[] } | { ok: false; error: string }>
  subscribeRealtime: () => () => void
}

const SESSION_DAYS = 30

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      sessionToken: null,
      onlineUsers: [],

      checkSession: () => {
        const { user, isAuthenticated } = get()
        if (!isAuthenticated || !user?.sessionExpiresAt) return
        if (new Date(user.sessionExpiresAt) < new Date()) {
          set({ isAuthenticated: false, user: null, sessionToken: null })
        }
      },

      login: async (username, password) => {
        const limited = await checkRateLimit(username)
        if (limited) return { ok: false, error: 'rate_limited' }

        const { data: rows } = await supabase
          .from('app_users')
          .select('*')
          .eq('username', username.trim().toLowerCase())
          .single()

        if (!rows) {
          await recordAttempt(username, false)
          return { ok: false, error: 'invalid_credentials' }
        }

        if (!rows.password_hash) {
          return { ok: false, error: 'not_setup' }
        }

        const [storedHash, salt] = rows.password_hash.split(':')
        const inputHash = await hashPassword(password, salt)

        if (inputHash !== storedHash) {
          await recordAttempt(username, false)
          return { ok: false, error: 'invalid_credentials' }
        }

        await recordAttempt(username, true)

        const sessionExpires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
        const sessionToken = crypto.randomUUID()

        await supabase.from('app_users').update({
          last_login_at: new Date().toISOString(),
          session_expires_at: sessionExpires.toISOString(),
          session_token: sessionToken,
        }).eq('id', rows.id)

        // Сохраняем сессию в user_sessions для поддержки нескольких устройств
        await supabase.from('user_sessions').upsert({
          token: sessionToken,
          user_id: rows.id,
          expires_at: sessionExpires.toISOString(),
        })

        const { data: spaceRow } = await supabase
          .from('spaces')
          .select('name')
          .eq('id', rows.space_id)
          .single()

        const user: AppUser = {
          id: rows.id,
          username: rows.username,
          spaceId: rows.space_id,
          spaceName: spaceRow?.name ?? undefined,
          role: rows.role,
          themeId: rows.theme_id,
          lastLoginAt: rows.last_login_at,
          sessionExpiresAt: sessionExpires.toISOString(),
          mustChangePassword: rows.must_change_password ?? false,
        }

        set({ isAuthenticated: true, user, sessionToken })

        // Асинхронно проверить наличие passkey (не блокируем логин)
        checkHasPasskey(user.id).then(has => {
          set(s => ({ user: s.user ? { ...s.user, hasPasskey: has } : null }))
        })

        return { ok: true, mustChangePassword: user.mustChangePassword ?? false }
      },

      confirmPasswordChanged: () => {
        set(s => ({ user: s.user ? { ...s.user, mustChangePassword: false } : null }))
      },

      logout: () => set({ isAuthenticated: false, user: null, sessionToken: null }),

      register: async (username, password, spaceId, role = 'member') => {
        const { data: existing } = await supabase
          .from('app_users')
          .select('id')
          .eq('username', username.trim().toLowerCase())
          .single()

        if (existing) return { ok: false, error: 'username_taken' }

        const { data: space } = await supabase
          .from('spaces')
          .select('id')
          .eq('id', spaceId)
          .single()

        if (!space) return { ok: false, error: 'space_not_found' }

        const salt = generateSalt()
        const hash = await hashPassword(password, salt)
        const passwordHash = `${hash}:${salt}`

        const { data: newUser } = await supabase
          .from('app_users')
          .insert({
            username: username.trim().toLowerCase(),
            password_hash: passwordHash,
            space_id: spaceId,
            role,
            theme_id: 'wife',
            must_change_password: true,
          })
          .select()
          .single()

        if (!newUser) return { ok: false, error: 'username_taken' }

        // Коды восстановления создаются при первом changePassword (обязательная смена пароля)
        // Это предотвращает мусорные коды в БД
        return { ok: true, recoveryCodes: [] }
      },

      setupFirstPassword: async (userId, password) => {
        const salt = generateSalt()
        const hash = await hashPassword(password, salt)
        await supabase.from('app_users').update({
          password_hash: `${hash}:${salt}`,
        }).eq('id', userId)

        const codes = generateRecoveryCodes()
        const hashes = await Promise.all(codes.map(hashCode))

        await supabase.from('recovery_codes').delete().eq('user_id', userId)
        await supabase.from('recovery_codes').insert(
          hashes.map(h => ({ user_id: userId, code_hash: h }))
        )

        return { ok: true, recoveryCodes: codes }
      },

      recoverWithCode: async (username, code, newPassword) => {
        const { data: user } = await supabase
          .from('app_users')
          .select('id')
          .eq('username', username.trim().toLowerCase())
          .single()

        if (!user) return false

        const { data: codes } = await supabase
          .from('recovery_codes')
          .select('*')
          .eq('user_id', user.id)
          .is('used_at', null)

        if (!codes?.length) return false

        const codeHash = await hashCode(code.toUpperCase())
        const match = codes.find(c => c.code_hash === codeHash)
        if (!match) return false

        await supabase.from('recovery_codes')
          .update({ used_at: new Date().toISOString() })
          .eq('id', match.id)

        const salt = generateSalt()
        const hash = await hashPassword(newPassword, salt)
        await supabase.from('app_users').update({
          password_hash: `${hash}:${salt}`,
        }).eq('id', user.id)

        return true
      },

      updateTheme: async (themeId) => {
        const { user } = get()
        if (!user) return
        await supabase.from('app_users').update({ theme_id: themeId }).eq('id', user.id)
        set(s => ({ user: s.user ? { ...s.user, themeId } : null }))
      },

      changePassword: async (newPassword) => {
        const { user } = get()
        if (!user) return null
        const salt = generateSalt()
        const hash = await hashPassword(newPassword, salt)
        await supabase.from('app_users').update({
          password_hash: `${hash}:${salt}`,
          must_change_password: false,
        }).eq('id', user.id)
        // Пересоздаём коды восстановления — старые (от регистрации) удаляем
        const codes = generateRecoveryCodes()
        const hashes = await Promise.all(codes.map(hashCode))
        await supabase.from('recovery_codes').delete().eq('user_id', user.id)
        await supabase.from('recovery_codes').insert(
          hashes.map(h => ({ user_id: user.id, code_hash: h }))
        )
        // НЕ сбрасываем mustChangePassword здесь — это делается через confirmPasswordChanged()
        // после того как пользователь скачает и подтвердит коды восстановления
        return codes
      },

      registerPasskey: async () => {
        const { user } = get()
        if (!user) return
        await webauthnRegister(user.id, user.username)
        set(s => ({ user: s.user ? { ...s.user, hasPasskey: true } : null }))
      },

      loginWithPasskey: async (_username) => {
        try {
          const row = await authenticatePasskey()
          const sessionExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          const { data: spaceRow } = await supabase
            .from('spaces').select('name').eq('id', row.space_id).single()
          const user: AppUser = {
            id: row.id,
            username: row.username,
            spaceId: row.space_id,
            spaceName: spaceRow?.name ?? undefined,
            role: row.role as UserRole,
            themeId: row.theme_id,
            sessionExpiresAt: sessionExpires.toISOString(),
            mustChangePassword: row.must_change_password ?? false,
            hasPasskey: true,
          }
          const st = crypto.randomUUID()
          await supabase.from('app_users').update({
            last_login_at: new Date().toISOString(),
            session_expires_at: sessionExpires.toISOString(),
            session_token: st,
          }).eq('id', row.id)
          await supabase.from('user_sessions').upsert({
            token: st,
            user_id: row.id,
            expires_at: sessionExpires.toISOString(),
          })
          set({ isAuthenticated: true, user, sessionToken: st })
          return { ok: true as const }
        } catch (e: unknown) {
          return { ok: false as const, error: (e as Error).message ?? 'unknown' }
        }
      },

      refreshPasskeyStatus: async () => {
        const { user } = get()
        if (!user) return
        const has = await checkHasPasskey(user.id)
        set(s => ({ user: s.user ? { ...s.user, hasPasskey: has } : null }))
      },

      listUserPasskeys: async () => {
        const { user } = get()
        if (!user) return []
        return listPasskeys(user.id)
      },

      deleteUserPasskey: async (credentialId) => {
        const { user } = get()
        if (!user) return false
        const ok = await deletePasskey(credentialId, user.id)
        if (ok) {
          const remaining = await checkHasPasskey(user.id)
          set(s => ({ user: s.user ? { ...s.user, hasPasskey: remaining } : null }))
        }
        return ok
      },

      recoverWithPasskey: async (_username, newPassword) => {
        try {
          // Аутентифицируемся через passkey (доказываем владение аккаунтом)
          const row = await authenticatePasskey()
          // Меняем пароль
          const salt = generateSalt()
          const hash = await hashPassword(newPassword, salt)
          await supabase.from('app_users').update({
            password_hash: `${hash}:${salt}`,
            must_change_password: false,
          }).eq('id', row.id)
          // Создаём новые коды восстановления
          const codes = generateRecoveryCodes()
          const hashes = await Promise.all(codes.map(hashCode))
          await supabase.from('recovery_codes').delete().eq('user_id', row.id)
          await supabase.from('recovery_codes').insert(
            hashes.map(h => ({ user_id: row.id, code_hash: h }))
          )
          return { ok: true, codes }
        } catch (e: unknown) {
          const msg = (e as Error).message ?? 'unknown'
          if (msg === 'no_credentials') return { ok: false, error: 'no_passkey' }
          if (msg === 'user_not_found') return { ok: false, error: 'user_not_found' }
          return { ok: false, error: msg }
        }
      },

      changeUserRole: async (userId, newRole) => {
        const currentUser = get().user
        if (currentUser?.role !== 'admin') return false
        if (userId === currentUser.id) return false
        await supabase.from('app_users').update({ role: newRole }).eq('id', userId)
        return true
      },

      subscribeRealtime: () => {
        const { user } = get()
        if (!user) return () => {}
        const channel = supabase
          .channel(`space-presence-${user.spaceId}`)
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'app_users', filter: `id=eq.${user.id}` },
            (payload) => {
              const r = payload.new as Record<string, unknown>
              if (r.space_id !== user.spaceId || r.role !== user.role) {
                set({ isAuthenticated: false, user: null, sessionToken: null })
              }
            }
          )
          .on(
            'postgres_changes',
            { event: 'DELETE', schema: 'public', table: 'app_users', filter: `id=eq.${user.id}` },
            (_payload) => {
              set({ isAuthenticated: false, user: null, sessionToken: null })
            }
          )
          .on('presence', { event: 'sync' }, () => {
             const state = channel.presenceState();
             const users = new Set<string>();
             for (const key in state) {
               for (const p of state[key] as any[]) {
                 if (p.user_id) users.add(p.user_id);
               }
             }
             set({ onlineUsers: Array.from(users) });
          })
          .subscribe(async (status) => {
             if (status === 'SUBSCRIBED') {
               await channel.track({ user_id: user.id });
             }
          })
        return () => { supabase.removeChannel(channel) }
      },
    }),
    {
      name: 'fb-auth-v2',
      partialize: (s) => ({
        isAuthenticated: s.isAuthenticated,
        user: s.user,
        sessionToken: s.sessionToken,
      }),
    }
  )
)
