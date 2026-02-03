// service-worker.js - UNIFIED Service Worker for Deadblock PWA
// v7.15.3 - Fixed notification badges: now using monochrome PNG files for Android
// v7.15.2 - Added streak_reminder notification type (N pentomino)
// FIXES:
// - All notification types navigate to correct screen
// - Chat notifications open game WITH chat panel
// - Victory/defeat navigate to game to see final board
// - Handles both camelCase and snake_case data keys from database
// Place in: public/service-worker.js

const CACHE_NAME = 'deadblock-v7.15.3';
const APP_URL = self.location.origin;

// =============================================================================
// PENTOMINO BADGES & VIBRATION PATTERNS
// =============================================================================

// Pentomino badge paths - PNG files for Android notification badges (must be monochrome)
const BADGES = {
  'your_turn': '/badges/badge-turn.png',           // T pentomino
  'game_start': '/badges/badge-turn.png',          // T pentomino
  'game_invite': '/badges/badge-invite.png',       // I pentomino
  'invite_accepted': '/badges/badge-invite.png',   // I pentomino
  'friend_request': '/badges/badge-friend.png',    // F pentomino
  'rematch_request': '/badges/badge-rematch.png',  // X pentomino
  'rematch_accepted': '/badges/badge-rematch.png', // X pentomino
  'chat_message': '/badges/badge-chat.png',        // U pentomino
  'chat': '/badges/badge-chat.png',                // U pentomino
  'victory': '/badges/badge-victory.png',          // W pentomino
  'defeat': '/badges/badge-defeat.png',            // L pentomino
  'weekly_challenge': '/badges/badge-weekly.png',  // Z pentomino
  'streak_reminder': '/badges/badge-streak.png',   // N pentomino
  'default': '/badges/badge-default.png'           // I pentomino
};

// Vibration patterns per notification type
const VIBRATIONS = {
  'your_turn': [100, 50, 100],
  'game_start': [200, 100, 200],
  'game_invite': [200, 100, 200, 100, 200],
  'friend_request': [150, 75, 150],
  'rematch_request': [150, 75, 150],
  'rematch_accepted': [200, 100, 200],
  'chat_message': [50],
  'chat': [50],
  'victory': [100, 50, 100, 50, 300],
  'defeat': [200, 200, 200],
  'weekly_challenge': [100, 50, 100, 50, 100, 50, 200],
  'streak_reminder': [100, 100, 100, 100, 200],  // Urgent pulsing
  'default': [100, 50, 100]
};

// Notifications that should stay visible until user interacts
const REQUIRE_INTERACTION = [
  'game_invite', 
  'rematch_request', 
  'weekly_challenge',
  'victory',
  'defeat',
  'streak_reminder'
];

// =============================================================================
// CORE ASSETS TO CACHE
// =============================================================================

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// =============================================================================
// INSTALL EVENT
// =============================================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing v7.15.3...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching core assets');
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => {
        console.log('[SW] Install complete');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[SW] Install failed:', err);
      })
  );
});

// =============================================================================
// ACTIVATE EVENT
// =============================================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating v7.15.3...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Now controlling all clients');
        return self.clients.claim();
      })
  );
});

// =============================================================================
// FETCH EVENT - Network first, cache fallback
// =============================================================================
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip chrome-extension and other non-http(s) requests
  if (!event.request.url.startsWith('http')) return;
  
  // CRITICAL: Skip ALL Supabase API requests - never cache these!
  if (event.request.url.includes('supabase.co')) {
    return;
  }
  
  // Skip other API endpoints
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('/auth/') ||
      event.request.url.includes('/rest/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone response for caching
        const responseClone = response.clone();
        
        // Cache successful responses
        if (response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Return offline fallback for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// =============================================================================
// PUSH NOTIFICATIONS
// =============================================================================
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  let data = { title: 'Deadblock', body: 'New notification', type: 'default' };
  
  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  // Extract type from multiple possible locations
  const type = data.type || data.data?.type || 'default';
  
  // v7.12: Handle both camelCase and snake_case from database triggers
  const gameId = data.gameId || data.game_id || data.data?.gameId || data.data?.game_id;
  const inviteId = data.inviteId || data.invite_id || data.data?.inviteId || data.data?.invite_id;
  const rematchId = data.rematchId || data.rematch_id || data.data?.rematchId || data.data?.rematch_id;
  
  console.log('[SW] Notification type:', type, 'gameId:', gameId);
  
  const options = {
    body: data.body,
    icon: '/pwa-192x192.png',
    badge: BADGES[type] || BADGES['default'],
    tag: `deadblock-${type}-${Date.now()}`,
    renotify: true,
    requireInteraction: REQUIRE_INTERACTION.includes(type),
    vibrate: VIBRATIONS[type] || VIBRATIONS['default'],
    data: { type, gameId, inviteId, rematchId, url: data.url },
    actions: getActions(type)
  };
  
  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Get action buttons based on notification type
function getActions(type) {
  switch (type) {
    case 'your_turn':
    case 'game_start':
      return [{ action: 'play', title: '🎮 Play Now' }];
    case 'game_invite':
      return [{ action: 'accept', title: '✓ Accept' }, { action: 'decline', title: '✗ Decline' }];
    case 'rematch_request':
      return [{ action: 'accept', title: '⚔️ Accept' }, { action: 'decline', title: '✗ Decline' }];
    case 'chat_message':
    case 'chat':
      return [{ action: 'reply', title: '💬 Reply' }];
    case 'weekly_challenge':
      return [{ action: 'play', title: '🏆 Play Now' }];
    case 'victory':
      return [{ action: 'view', title: '🏆 View Game' }];
    case 'defeat':
      return [{ action: 'view', title: '📊 View Game' }];
    case 'streak_reminder':
      return [{ action: 'play', title: '🔥 Play Now' }];
    default:
      return [];
  }
}

// =============================================================================
// NOTIFICATION CLICK - Navigate to correct screen
// =============================================================================
self.addEventListener('notificationclick', (event) => {
  const { action } = event;
  const data = event.notification.data || {};
  const { type, gameId, inviteId, rematchId } = data;
  
  console.log('[SW] Click - action:', action, 'type:', type, 'gameId:', gameId);
  event.notification.close();
  
  // Handle decline action - just close, don't navigate
  if (action === 'decline') {
    return;
  }
  
  // Build navigation URL based on notification type
  let url = '/?navigateTo=online';
  let openChat = false;
  
  // v7.12: Comprehensive navigation handling
  switch (type) {
    case 'weekly_challenge':
      url = '/?navigateTo=weekly';
      break;
      
    case 'your_turn':
    case 'game_start':
      if (gameId) {
        url = `/?navigateTo=online&gameId=${gameId}`;
      }
      break;
      
    case 'chat_message':
    case 'chat':
      if (gameId) {
        // Open game WITH chat panel open
        url = `/?navigateTo=online&gameId=${gameId}&openChat=true`;
        openChat = true;
      }
      break;
      
    case 'victory':
    case 'defeat':
      if (gameId) {
        // Navigate to completed game to see final board
        url = `/?navigateTo=online&gameId=${gameId}`;
      }
      break;
      
    case 'game_invite':
      if (inviteId && action === 'accept') {
        url = `/?navigateTo=online&acceptInvite=${inviteId}`;
      } else {
        url = '/?navigateTo=online';
      }
      break;
      
    case 'invite_accepted':
      if (gameId) {
        url = `/?navigateTo=online&gameId=${gameId}`;
      }
      break;
      
    case 'rematch_request':
      if (gameId) {
        url = `/?navigateTo=online&gameId=${gameId}`;
      }
      if (rematchId && action === 'accept') {
        url = `/?navigateTo=online&acceptRematch=${rematchId}`;
      }
      break;
      
    case 'rematch_accepted':
      if (gameId) {
        // Navigate to the NEW game from rematch
        url = `/?navigateTo=online&gameId=${gameId}`;
      }
      break;
      
    case 'friend_request':
      url = '/?navigateTo=online&showFriends=true';
      break;
      
    case 'streak_reminder':
      // Navigate to main menu so player can choose any game mode
      url = '/';
      break;
      
    default:
      // Fallback - if we have a gameId, go to that game
      if (gameId) {
        url = `/?navigateTo=online&gameId=${gameId}`;
      }
  }
  
  // Handle action button clicks that override type-based routing
  if (action === 'play' && gameId) {
    url = `/?navigateTo=online&gameId=${gameId}`;
  } else if (action === 'reply' && gameId) {
    url = `/?navigateTo=online&gameId=${gameId}&openChat=true`;
    openChat = true;
  } else if (action === 'view' && gameId) {
    url = `/?navigateTo=online&gameId=${gameId}`;
  }
  
  console.log('[SW] Navigating to:', url);
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // Find existing window
      for (const client of clients) {
        if (client.url.includes(APP_URL) && 'focus' in client) {
          // Send navigation message to existing window
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            url,
            data: { type, gameId, inviteId, rematchId, openChat }
          });
          return client.focus();
        }
      }
      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// =============================================================================
// NOTIFICATION CLOSE
// =============================================================================
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');
});

// =============================================================================
// MESSAGE HANDLING
// =============================================================================
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting' || event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] v7.15.3 unified service worker loaded');
