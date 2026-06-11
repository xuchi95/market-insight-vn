/* eslint-disable no-restricted-globals */
// Dedicated Web Push messaging worker for MarketWatch price alerts.
// This is a messaging service worker — NOT an app-shell cache.
// It only handles `push` and `notificationclick` events.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'MarketWatch', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'Cập nhật giá thị trường';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    image: payload.image,
    tag: payload.tag || 'mw-price-alert',
    renotify: true,
    data: { url: payload.url || '/', ts: Date.now() },
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          try {
            client.navigate(url);
            return client.focus();
          } catch {
            return client.focus();
          }
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
      return undefined;
    }),
  );
});