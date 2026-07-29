// Service worker for Web Push notifications.
// Runs in the browser independently of any open tab — this is what lets a
// notification reach a worker's phone/browser even with the site fully
// closed. Registered from lib/pushNotifications.ts.

self.addEventListener('push', (event) => {
  let data = { title: 'Mailzeon', body: 'You have a new notification.', orderId: null, url: null };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // Malformed/empty push payload — fall back to the generic message above
    // rather than crashing the service worker.
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      // NOTE: no `icon`/`badge` set — add one later by dropping a real PNG
      // (e.g. 192x192) at /public/icon-192.png and referencing it here.
      // Omitting it just means the browser's default bell icon shows for now.
      data: { url: data.url },
      tag: data.orderId || undefined, // Collapses repeat notifs for the same order instead of stacking
    })
  );
});

// Clicking the notification focuses an existing Mailzeon tab if one is open,
// otherwise opens a new one. Falls back to /login — middleware.ts
// auto-redirects an already-logged-in visitor to their correct role
// dashboard, so this is always a safe landing spot even without a specific URL.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetPath = event.notification.data?.url || '/login';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetPath);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetPath);
      }
    })
  );
});
