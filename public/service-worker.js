// service-worker.js - UNIFIED Service Worker for Deadblock PWA
// v7.17 - Body tap on game_invite now accepts the invite (Android action buttons unreliable)
//   - Pre-caches badge PNGs during install for instant availability
//   - Full absolute URLs for openWindow on Android
//   - Tapping notification body on game_invite = accept + open game
//   - Action buttons remain as bonus (work when app is already open)
// v7.16 - Decline button sends message to app to actually decline invites/rematches
// v7.15.3 - Fixed notification badges: now using monochrome PNG files for Android
// v7.15.2 - Added streak_reminder notification type (N pentomino)
// Place in: public/service-worker.js

const CACHE_NAME = 'deadblock-v7.17';
const APP_URL = self.location.origin;

// =============================================================================
// PENTOMINO BADGES & VIBRATION PATTERNS
// =============================================================================

const BADGES = {
  'your_turn': `${APP_URL}/badges/badge-turn.png`,
  'game_start': `${APP_URL}/badges/badge-turn.png`,
  'game_invite': `${APP_URL}/badges/badge-invite.png`,
  'invite_accepted': `${APP_URL}/badges/badge-invite.png`,
  'friend_request': `${APP_URL}/badges/badge-friend.png`,
  'rematch_request': `${APP_URL}/badges/badge-rematch.png`,
  'rematch_accepted': `${APP_URL}/badges/badge-rematch.png`,
  'chat_message': `${APP_URL}/badges/badge-chat.png`,
  'chat': `${APP_URL}/badges/badge-chat.png`,
  'victory': `${APP_URL}/badges/badge-victory.png`,
  'defeat': `${APP_URL}/badges/badge-defeat.png`,
  'weekly_challenge': `${APP_URL}/badges/badge-weekly.png`,
  'streak_reminder': `${APP_URL}/badges/badge-streak.png`,
  'default': `${APP_URL}/badges/badge-default.png`
};

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
// v7.17: Pre-cache badge PNGs so they're instantly available for notifications
// =============================================================================

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa-192x192.png',
  '/badges/badge-turn.png',
  '/badges/badge-invite.png',
  '/badges/badge-friend.png',
  '/badges/badge-rematch.png',
  '/badges/badge-chat.png',
  '/badges/badge-victory.png',
  '/badges/badge-defeat.png',
  '/badges/badge-weekly.png',
  '/badges/badge-streak.png',
  '/badges/badge-default.png'
];

// =============================================================================
// INSTALL EVENT
// =============================================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing v7.17...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching core assets + badge PNGs');
        // Use addAll but don't fail install if a badge file is missing
        return cache.addAll(CORE_ASSETS).catch((err) => {
          console.warn('[SW] Some assets failed to cache, trying individually:', err.message);
          return Promise.allSettled(
            CORE_ASSETS.map(url => cache.add(url).catch(e => console.warn('[SW] Failed to cache:', url, e.message)))
          );
        });
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
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;
  
  if (event.request.url.includes('supabase.co')) return;
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('/auth/') ||
      event.request.url.includes('/rest/')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        if (response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') return caches.match('/index.html');
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
  
  const type = data.type || data.data?.type || 'default';
  const gameId = data.gameId || data.game_id || data.data?.gameId || data.data?.game_id;
  const inviteId = data.inviteId || data.invite_id || data.data?.inviteId || data.data?.invite_id;
  const rematchId = data.rematchId || data.rematch_id || data.data?.rematchId || data.data?.rematch_id;
  
  const badgeUrl = BADGES[type] || BADGES['default'];
  console.log('[SW] Type:', type, 'gameId:', gameId, 'inviteId:', inviteId, 'badge:', badgeUrl);
  
  // v7.17: For game_invite, hint that tapping accepts
  let body = data.body;
  if (type === 'game_invite' && inviteId) {
    body = data.body + '\nTap to accept!';
  }
  
  const options = {
    body: body,
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
// NOTIFICATION CLICK
// v7.17: Body tap on game_invite = accept (most reliable on Android)
// =============================================================================
self.addEventListener('notificationclick', (event) => {
  const { action } = event;
  const data = event.notification.data || {};
  const { type, gameId, inviteId, rematchId } = data;
  
  console.log('[SW] Click - action:', action, 'type:', type, 'gameId:', gameId, 'inviteId:', inviteId);
  event.notification.close();
  
  // -------------------------------------------------------------------------
  // ACCEPT: action button tap OR body tap on game_invite/rematch_request
  // -------------------------------------------------------------------------
  const isAcceptAction = (action === 'accept');
  const isInviteBodyTap = (!action && type === 'game_invite' && inviteId);
  const isRematchBodyTap = (!action && type === 'rematch_request' && rematchId);
  
  if (isAcceptAction || isInviteBodyTap || isRematchBodyTap) {
    let acceptUrl;
    if (type === 'game_invite' && inviteId) {
      acceptUrl = `${APP_URL}/?navigateTo=online&acceptInvite=${inviteId}`;
    } else if (type === 'rematch_request' && rematchId) {
      acceptUrl = `${APP_URL}/?navigateTo=online&acceptRematch=${rematchId}`;
    } else {
      acceptUrl = `${APP_URL}/?navigateTo=online`;
    }
    
    console.log('[SW] Accept - URL:', acceptUrl);
    
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        for (const client of clients) {
          if ('focus' in client) {
            console.log('[SW] Accept - posting to existing client');
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              url: acceptUrl,
              data: { type, gameId, inviteId, rematchId }
            });
            return client.focus();
          }
        }
        console.log('[SW] Accept - opening new window:', acceptUrl);
        if (self.clients.openWindow) {
          return self.clients.openWindow(acceptUrl);
        }
      })
    );
    return;
  }
  
  // -------------------------------------------------------------------------
  // DECLINE: action button only
  // -------------------------------------------------------------------------
  if (action === 'decline') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        for (const client of clients) {
          if (type === 'game_invite' && inviteId) {
            console.log('[SW] Sending DECLINE_INVITE for:', inviteId);
            client.postMessage({ type: 'DECLINE_INVITE', inviteId });
          } else if (type === 'rematch_request' && rematchId) {
            console.log('[SW] Sending DECLINE_REMATCH for:', rematchId);
            client.postMessage({ type: 'DECLINE_REMATCH', rematchId });
          }
        }
      })
    );
    return;
  }
  
  // -------------------------------------------------------------------------
  // ALL OTHER: navigate based on type
  // -------------------------------------------------------------------------
  let url = '/?navigateTo=online';
  let openChat = false;
  
  switch (type) {
    case 'weekly_challenge':
      url = '/?navigateTo=weekly'; break;
    case 'your_turn':
    case 'game_start':
      if (gameId) url = `/?navigateTo=online&gameId=${gameId}`; break;
    case 'chat_message':
    case 'chat':
      if (gameId) { url = `/?navigateTo=online&gameId=${gameId}&openChat=true`; openChat = true; } break;
    case 'victory':
    case 'defeat':
      if (gameId) url = `/?navigateTo=online&gameId=${gameId}`; break;
    case 'invite_accepted':
      if (gameId) url = `/?navigateTo=online&gameId=${gameId}`; break;
    case 'rematch_accepted':
      if (gameId) url = `/?navigateTo=online&gameId=${gameId}`; break;
    case 'friend_request':
      url = '/?navigateTo=online&showFriends=true'; break;
    case 'streak_reminder':
      url = '/'; break;
    default:
      if (gameId) url = `/?navigateTo=online&gameId=${gameId}`;
  }
  
  if (action === 'play' && gameId) url = `/?navigateTo=online&gameId=${gameId}`;
  else if (action === 'reply' && gameId) { url = `/?navigateTo=online&gameId=${gameId}&openChat=true`; openChat = true; }
  else if (action === 'view' && gameId) url = `/?navigateTo=online&gameId=${gameId}`;
  
  const fullUrl = `${APP_URL}${url}`;
  console.log('[SW] Navigating to:', fullUrl);
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if ('focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', url: fullUrl, data: { type, gameId, inviteId, rematchId, openChat } });
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(fullUrl);
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting' || event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] v7.17 unified service worker loaded');
