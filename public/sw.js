const CACHE = 'flipfinder-v1';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(['/', '/index.html']))
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

// Handle incoming push notifications
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'FlipFinder', {
      body: data.body || 'New deal found!',
      icon: data.icon || '/icon.png',
      badge: data.badge || '/badge.png',
      data: data.data || {},
      actions: [
        { action: 'view', title: 'View deal' },
        { action: 'skip', title: 'Skip' }
      ],
      vibrate: [100, 50, 100],
      requireInteraction: true
    })
  );
});

// Handle notification tap
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'skip') return;

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const url = e.notification.data?.url || '/';
      const existing = list.find(c => c.url.includes(url));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
