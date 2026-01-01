// Service Worker for Deadblock Push Notifications
// Place this file in your public folder (public/sw.js)
// This runs in the background even when the app is closed
// v2 - Enhanced debug logging

const CACHE_NAME = 'deadblock-v2';
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
  console.log('[SW] ========== PUSH EVENT RECEIVED ==========');
  console.log('[SW] Push event:', event);
  console.log('[SW] Has data:', !!event.data);
  
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
      // Try to get raw text first for debugging
      const rawText = event.data.text();
      console.log('[SW] Raw push data text:', rawText);
      
      // Now parse as JSON
      const pushData = JSON.parse(rawText);
      console.log('[SW] Parsed push data:', JSON.stringify(pushData, null, 2));
      data = { ...data, ...pushData };
      console.log('[SW] Final notification data:', JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('[SW] Failed to parse push data as JSON:', e);
      console.log('[SW] Error name:', e.name);
      console.log('[SW] Error message:', e.message);
      
      // Try to use raw text as body
      try {
        data.body = event.data.text();
        console.log('[SW] Using raw text as body:', data.body);
      } catch (e2) {
        console.error('[SW] Failed to get text from push data:', e2);
      }
    }
  } else {
    console.log('[SW] No data in push event - showing default notification');
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
  
  console.log('[SW] Showing notification with options:', JSON.stringify(options, null, 2));
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
      .then(() => {
        console.log('[SW] Notification shown successfully!');
      })
      .catch((err) => {
        console.error('[SW] Failed to show notification:', err);
      })
  );
});

// Notification click event - user clicked the notification
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  console.log('[SW] Action:', event.action);
  
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};
  
  console.log('[SW] Notification data:', data);
  
  notification.close();
  
  // Determine URL to open based on action and notification type
  let urlToOpen = data.url || '/';
  
  if (data.type === 'your_turn' && data.gameId) {
    urlToOpen = `/game/${data.gameId}`;
  } else if (data.type === 'game_invite') {
    if (action === 'accept' && data.inviteId) {
      urlToOpen = `/online?acceptInvite=${data.inviteId}`;
    } else if (action === 'decline') {
      return;
    } else {
      urlToOpen = '/online';
    }
  } else if (data.type === 'rematch' && data.gameId) {
    urlToOpen = `/game/${data.gameId}`;
  } else if (data.type === 'chat' && data.gameId) {
    urlToOpen = `/game/${data.gameId}?openChat=true`;
  }
  
  console.log('[SW] Opening URL:', urlToOpen);
  
  // Focus existing window or open new one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      console.log('[SW] Found', windowClients.length, 'window clients');
      
      // Check if there's already a window open
      for (const client of windowClients) {
        if (client.url.includes(APP_URL) && 'focus' in client) {
          console.log('[SW] Focusing existing client and posting message');
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
        console.log('[SW] Opening new window');
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event);
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
  
  // Test push handling
  if (event.data.type === 'TEST_PUSH') {
    console.log('[SW] Test push requested');
    self.registration.showNotification('Test Push', {
      body: 'This is a test push notification from service worker',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: 'test-push',
      data: { type: 'test' }
    });
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-game-moves') {
    event.waitUntil(syncGameMoves());
  }
});

// Helper function for background sync
async function syncGameMoves() {
  console.log('[SW] Syncing game moves...');
}

// Log any errors
self.addEventListener('error', (event) => {
  console.error('[SW] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled rejection:', event.reason);
});

console.log('[SW] Service worker loaded - version:', CACHE_NAME);
