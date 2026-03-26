import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import type { AppUser, UserRole } from '../types'

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
}

const SESSION_DAYS = 30

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      sessionToken: null,

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
        }).eq('id', rows.id)

        const user: AppUser = {
          id: rows.id,
          username: rows.username,
          spaceId: rows.space_id,
          role: rows.role,
          themeId: rows.theme_id,
          lastLoginAt: rows.last_login_at,
          sessionExpiresAt: sessionExpires.toISOString(),
          mustChangePassword: rows.must_change_password ?? false,
        }

        set({ isAuthenticated: true, user, sessionToken })
        return { ok: true, mustChangePassword: user.mustChangePassword ?? false }
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
            theme_id: 'light',
            must_change_password: true,
          })
          .select()
          .single()

        if (!newUser) return { ok: false, error: 'username_taken' }

        const codes = generateRecoveryCodes()
        const hashes = await Promise.all(codes.map(hashCode))
        await supabase.from('recovery_codes').insert(
          hashes.map(h => ({ user_id: newUser.id, code_hash: h }))
        )

        return { ok: true, recoveryCodes: codes }
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
        set(s => ({ user: s.user ? { ...s.user, mustChangePassword: false } : null }))
        return codes
      },

      changeUserRole: async (userId, newRole) => {
        const currentUser = get().user
        if (currentUser?.role !== 'admin') return false
        if (userId === currentUser.id) return false
        await supabase.from('app_users').update({ role: newRole }).eq('id', userId)
        return true
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
