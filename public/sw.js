// Service Worker for Deadblock Push Notifications
// Place this file in your public folder (public/sw.js)
// This runs in the background even when the app is closed

const CACHE_NAME = 'deadblock-v1';
const APP_URL = self.location.origin;

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/pwa-192x192.png',
        '/pwa-512x512.png'
      ]).catch(err => {
        console.log('[SW] Cache addAll failed:', err);
      });
    })
  );
  
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  
  // Take control of all pages immediately
  self.clients.claim();
});

// Push event - received a push notification from server
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  
  let data = {
    title: 'Deadblock',
    body: 'You have a new notification',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'deadblock-notification',
    data: {}
  };
  
  // Parse push data if available
  if (event.data) {
    try {
      const pushData = event.data.json();
      data = { ...data, ...pushData };
    } catch (e) {
      console.log('[SW] Failed to parse push data:', e);
      data.body = event.data.text();
    }
  }
  
  // Notification options
  const options = {
    body: data.body,
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    tag: data.tag || 'deadblock-notification',
    renotify: true,
    requireInteraction: data.requireInteraction || false,
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      gameId: data.gameId,
      type: data.type,
      timestamp: Date.now(),
      ...data.data
    },
    actions: data.actions || []
  };
  
  // Add actions based on notification type
  if (data.type === 'your_turn') {
    options.actions = [
      { action: 'play', title: 'Play Now', icon: '/icons/play.png' }
    ];
  } else if (data.type === 'game_invite') {
    options.actions = [
      { action: 'accept', title: 'Accept', icon: '/icons/check.png' },
      { action: 'decline', title: 'Decline', icon: '/icons/x.png' }
    ];
  } else if (data.type === 'rematch') {
    options.actions = [
      { action: 'accept', title: 'Accept', icon: '/icons/check.png' },
      { action: 'decline', title: 'Decline', icon: '/icons/x.png' }
    ];
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event - user clicked the notification
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};
  
  notification.close();
  
  // Determine URL to open based on action and notification type
  let urlToOpen = data.url || '/';
  
  if (data.type === 'your_turn' && data.gameId) {
    urlToOpen = `/game/${data.gameId}`;
  } else if (data.type === 'game_invite') {
    if (action === 'accept' && data.inviteId) {
      // Will handle accept on the client side
      urlToOpen = `/online?acceptInvite=${data.inviteId}`;
    } else if (action === 'decline') {
      // Just close, decline handled passively
      return;
    } else {
      urlToOpen = '/online';
    }
  } else if (data.type === 'rematch' && data.gameId) {
    urlToOpen = `/game/${data.gameId}`;
  } else if (data.type === 'chat' && data.gameId) {
    urlToOpen = `/game/${data.gameId}?openChat=true`;
  }
  
  // Focus existing window or open new one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window open
      for (const client of windowClients) {
        if (client.url.includes(APP_URL) && 'focus' in client) {
          // Navigate existing window to the URL
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            url: urlToOpen,
            data: data
          });
          return client.focus();
        }
      }
      
      // Open new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event);
  
  // Track dismissals if needed for analytics
  const data = event.notification.data || {};
  
  // Could send to analytics here
});

// Message event - communication from main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Background sync for offline actions (optional enhancement)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-game-moves') {
    event.waitUntil(syncGameMoves());
  }
});

// Helper function for background sync (placeholder)
async function syncGameMoves() {
  // Could be used to sync offline moves when connection restored
  console.log('[SW] Syncing game moves...');
}

console.log('[SW] Service worker loaded');
