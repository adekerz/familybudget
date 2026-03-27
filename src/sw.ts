/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// ─── Push notifications ───────────────────────────────────────────────────────
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return

  let payload: { title?: string; body?: string; url?: string } = {}
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'FamilyBudget', body: event.data.text() }
  }

  const title = payload.title ?? 'FamilyBudget'
  const options: NotificationOptions = {
    body: payload.body ?? '',
    icon: '/icons/icon.png',
    badge: '/icons/icon.png',
    data: { url: payload.url ?? '/' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const url: string = event.notification.data?.url ?? '/'
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        const existing = clients.find(c => c.url.includes(url))
        if (existing) return existing.focus()
        return self.clients.openWindow(url)
      })
  )
})
