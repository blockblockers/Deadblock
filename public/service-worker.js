// service-worker.js - UNIFIED Service Worker for Deadblock PWA
// v7.17 - Accept button now works on Android (handles accept action explicitly)
//   - Accept action sends ACCEPT_INVITE message to app or opens with full absolute URL
//   - Badge URLs use full absolute paths for Android compatibility
//   - Added debug logging for badge URLs
// v7.16 - Decline button now sends message to app to actually decline invites/rematches
// v7.15.3 - Fixed notification badges: now using monochrome PNG files for Android
// v7.15.2 - Added streak_reminder notification type (N pentomino)
// FIXES:
// - All notification types navigate to correct screen
// - Chat notifications open game WITH chat panel
// - Victory/defeat navigate to game to see final board
// - Handles both camelCase and snake_case data keys from database
// - Decline action sends DECLINE_INVITE/DECLINE_REMATCH message to app
// - Accept action sends ACCEPT_INVITE message to app or navigates via URL
// Place in: public/service-worker.js

const CACHE_NAME = 'deadblock-v7.17';
const APP_URL = self.location.origin;

// =============================================================================
// PENTOMINO BADGES & VIBRATION PATTERNS
// =============================================================================

// Pentomino badge paths - PNG files for Android notification badges (must be monochrome)
// v7.16: Use absolute URLs for Android compatibility
const BADGES = {
  'your_turn': `${APP_URL}/badges/badge-turn.png`,           // T pentomino
  'game_start': `${APP_URL}/badges/badge-turn.png`,          // T pentomino
  'game_invite': `${APP_URL}/badges/badge-invite.png`,       // I pentomino
  'invite_accepted': `${APP_URL}/badges/badge-invite.png`,   // I pentomino
  'friend_request': `${APP_URL}/badges/badge-friend.png`,    // F pentomino
  'rematch_request': `${APP_URL}/badges/badge-rematch.png`,  // X pentomino
  'rematch_accepted': `${APP_URL}/badges/badge-rematch.png`, // X pentomino
  'chat_message': `${APP_URL}/badges/badge-chat.png`,        // U pentomino
  'chat': `${APP_URL}/badges/badge-chat.png`,                // U pentomino
  'victory': `${APP_URL}/badges/badge-victory.png`,          // W pentomino
  'defeat': `${APP_URL}/badges/badge-defeat.png`,            // L pentomino
  'weekly_challenge': `${APP_URL}/badges/badge-weekly.png`,  // Z pentomino
  'streak_reminder': `${APP_URL}/badges/badge-streak.png`,   // N pentomino
  'default': `${APP_URL}/badges/badge-default.png`           // P pentomino
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
  'streak_reminder': [100, 100, 100, 100, 200],
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
  console.log('[SW] Installing v7.17...');
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
  console.log('[SW] Activating v7.17...');
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
  
  // v7.17: Resolve badge URL
  const badgeUrl = BADGES[type] || BADGES['default'];
  
  console.log('[SW] Notification type:', type, 'gameId:', gameId, 'inviteId:', inviteId);
  console.log('[SW] Badge URL:', badgeUrl);
  console.log('[SW] APP_URL:', APP_URL);
  
  const options = {
    body: data.body,
    icon: `${APP_URL}/pwa-192x192.png`,
    badge: badgeUrl,
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
  
  console.log('[SW] Click - action:', action, 'type:', type, 'gameId:', gameId, 'inviteId:', inviteId);
  event.notification.close();
  
  // v7.17: Handle accept action explicitly
  // On Android, action button taps may not grant sufficient user activation for openWindow.
  // We handle accept by sending a message to existing client OR navigating via full URL.
  if (action === 'accept') {
    const acceptUrl = (type === 'game_invite' && inviteId) 
      ? `${APP_URL}/?navigateTo=online&acceptInvite=${inviteId}`
      : (type === 'rematch_request' && rematchId)
        ? `${APP_URL}/?navigateTo=online&acceptRematch=${rematchId}`
        : `${APP_URL}/?navigateTo=online`;
    
    console.log('[SW] Accept action - URL:', acceptUrl);
    
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        // Try to find an existing app window
        for (const client of clients) {
          if (client.url.includes(APP_URL) && 'focus' in client) {
            console.log('[SW] Accept - sending to existing client');
            // Send accept message to existing window
            if (type === 'game_invite' && inviteId) {
              client.postMessage({
                type: 'NOTIFICATION_CLICK',
                url: acceptUrl,
                data: { type, gameId, inviteId, rematchId }
              });
            } else if (type === 'rematch_request' && rematchId) {
              client.postMessage({
                type: 'NOTIFICATION_CLICK',
                url: acceptUrl,
                data: { type, gameId, inviteId, rematchId }
              });
            }
            return client.focus();
          }
        }
        
        // No existing window - open new one with full absolute URL
        console.log('[SW] Accept - no existing client, opening:', acceptUrl);
        if (self.clients.openWindow) {
          return self.clients.openWindow(acceptUrl);
        }
      })
    );
    return;
  }
  
  // v7.16: Handle decline action - send message to app to actually decline
  if (action === 'decline') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        for (const client of clients) {
          if (type === 'game_invite' && inviteId) {
            console.log('[SW] Sending DECLINE_INVITE message for:', inviteId);
            client.postMessage({
              type: 'DECLINE_INVITE',
              inviteId: inviteId
            });
          } else if (type === 'rematch_request' && rematchId) {
            console.log('[SW] Sending DECLINE_REMATCH message for:', rematchId);
            client.postMessage({
              type: 'DECLINE_REMATCH',
              rematchId: rematchId
            });
          }
        }
      })
    );
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
      // Body tap (not action button) - just go to online menu to see invite
      url = '/?navigateTo=online';
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
      // Open new window - v7.17: use full absolute URL for Android reliability
      if (self.clients.openWindow) {
        const fullUrl = url.startsWith('http') ? url : `${APP_URL}${url}`;
        return self.clients.openWindow(fullUrl);
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

console.log('[SW] v7.17 unified service worker loaded');
