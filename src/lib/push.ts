import { supabase } from './supabase'
import { useAuthStore } from '../store/useAuthStore'

const VAPID_PUBLIC_KEY = 'BLXQTxT4lafd70b-2B8Z7GHsLDlbD5Qig1r8d51nvg32skzxdoxbeLG2X9mOgIbwtE6IdNEJTaR6vsZGvSuWC7E'

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const arr = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i)
  return arr.buffer
}

export async function subscribeToPush(): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    if (existing) return true

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    const user = useAuthStore.getState().user
    if (!user) return false

    const subJson = sub.toJSON()
    await supabase.from('push_subscriptions').upsert({
      user_id: user.id,
      space_id: user.spaceId,
      endpoint: subJson.endpoint,
      p256dh: (subJson.keys as Record<string, string>)?.p256dh,
      auth: (subJson.keys as Record<string, string>)?.auth,
    }, { onConflict: 'endpoint' })

    return true
  } catch {
    return false
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  await sub.unsubscribe()
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
}

export async function isPushSubscribed(): Promise<boolean> {
  if (!('PushManager' in window)) return false
  try {
    const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 3000))
    const check = (async () => {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      return !!sub
    })()
    return await Promise.race([check, timeout])
  } catch {
    return false
  }
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}
