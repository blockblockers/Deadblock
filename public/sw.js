// sw.js - Service Worker with Push Notifications
// v7.11 - FIXES:
// - Notifications navigate to SPECIFIC GAME (not just online menu)
// - Uses pentomino-shaped badges with game-accurate colors
// - Includes weekly_challenge notification type
// Place in public/sw.js

const CACHE_NAME = 'deadblock-v7.11';
const APP_URL = self.location.origin;

// Pentomino badge paths - place SVG files in public/badges/
// Colors match the game's piece colors from pieces.js
const BADGES = {
  'your_turn': '/badges/badge-turn.svg',           // T pentomino - Chrome Silver
  'game_start': '/badges/badge-turn.svg',          // T pentomino - Chrome Silver
  'game_invite': '/badges/badge-invite.svg',       // I pentomino - Electric Cyan
  'invite_accepted': '/badges/badge-invite.svg',   // I pentomino - Electric Cyan
  'friend_request': '/badges/badge-friend.svg',    // F pentomino - Hot Magenta
  'rematch_request': '/badges/badge-rematch.svg',  // X pentomino - Pure White
  'rematch_accepted': '/badges/badge-rematch.svg', // X pentomino - Pure White
  'chat_message': '/badges/badge-chat.svg',        // U pentomino (as C) - Neon Yellow
  'chat': '/badges/badge-chat.svg',                // U pentomino (as C) - Neon Yellow
  'victory': '/badges/badge-victory.svg',          // W pentomino - Scarlet Red
  'defeat': '/badges/badge-defeat.svg',            // L pentomino - Plasma Orange
  'weekly_challenge': '/badges/badge-weekly.svg',  // Z pentomino - Electric Lime
  'default': '/badges/badge-default.svg'           // I pentomino - Electric Cyan
};

// Vibration patterns per notification type
const VIBRATIONS = {
  'your_turn': [100, 50, 100],
  'game_start': [200, 100, 200],
  'game_invite': [200, 100, 200, 100, 200],
  'friend_request': [150, 75, 150],
  'rematch_request': [150, 75, 150],
  'chat_message': [50],
  'chat': [50],
  'victory': [100, 50, 100, 50, 300],
  'defeat': [200, 200, 200],
  'weekly_challenge': [100, 50, 100, 50, 100, 50, 200],
  'default': [100, 50, 100]
};

// Install
self.addEventListener('install', () => {
  console.log('[SW] Installing v7.11');
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating');
  event.waitUntil(
    caches.keys().then(names => 
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

// Push notification received
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
  const gameId = data.gameId || data.data?.gameId;
  const inviteId = data.inviteId || data.data?.inviteId;
  const rematchId = data.rematchId || data.data?.rematchId;
  
  console.log('[SW] Notification type:', type, 'gameId:', gameId);
  
  const options = {
    body: data.body,
    icon: '/pwa-192x192.png',
    badge: BADGES[type] || BADGES['default'],
    tag: `deadblock-${type}-${Date.now()}`,
    renotify: true,
    requireInteraction: type === 'game_invite' || type === 'rematch_request' || type === 'weekly_challenge',
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
    default:
      return [];
  }
}

// Notification clicked - NAVIGATE TO SPECIFIC GAME
self.addEventListener('notificationclick', (event) => {
  const { action } = event;
  const data = event.notification.data || {};
  const { type, gameId, inviteId, rematchId } = data;
  
  console.log('[SW] Click - action:', action, 'type:', type, 'gameId:', gameId);
  event.notification.close();
  
  // Build navigation URL
  let url = '/?navigateTo=online';
  
  // v7.11: Navigate based on notification type
  if (type === 'weekly_challenge') {
    url = '/?navigateTo=weekly';
  } else if (gameId) {
    if (type === 'your_turn' || type === 'game_start' || action === 'play') {
      url = `/?navigateTo=online&gameId=${gameId}`;
    } else if (type === 'chat_message' || type === 'chat' || action === 'reply') {
      url = `/?navigateTo=online&gameId=${gameId}&openChat=true`;
    } else if (type === 'rematch_accepted' || type === 'invite_accepted') {
      url = `/?navigateTo=online&gameId=${gameId}`;
    } else {
      url = `/?navigateTo=online&gameId=${gameId}`;
    }
  } else if (inviteId && action === 'accept') {
    url = `/?navigateTo=online&acceptInvite=${inviteId}`;
  } else if (rematchId && action === 'accept') {
    url = `/?navigateTo=online&acceptRematch=${rematchId}`;
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
            data: { type, gameId, inviteId, rematchId, openChat: url.includes('openChat') }
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

// Close
self.addEventListener('notificationclose', () => {
  console.log('[SW] Notification closed');
});

// Messages from app
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting' || event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] v7.11 loaded');
