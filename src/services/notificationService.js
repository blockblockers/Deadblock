// notificationService.js - Browser notification service for Deadblock
// Handles permission requests and sending browser notifications

class NotificationService {
  constructor() {
    this.permission = 'default';
    this.initialized = false;
    this.promptDismissed = false;
  }

  async init() {
    if (this.initialized) return;
    
    if (!('Notification' in window)) {
      console.log('[NotificationService] Browser does not support notifications');
      this.permission = 'denied';
      this.initialized = true;
      return;
    }

    this.permission = Notification.permission;
    this.initialized = true;
    
    // Check if user has dismissed the prompt before
    try {
      this.promptDismissed = localStorage.getItem('deadblock_notification_prompt_dismissed') === 'true';
    } catch (e) {
      this.promptDismissed = false;
    }
    
    console.log('[NotificationService] Initialized with permission:', this.permission);
  }

  isEnabled() {
    return this.permission === 'granted';
  }

  isBlocked() {
    return this.permission === 'denied';
  }

  // Check if we're on a mobile device (where push notifications are most useful)
  isMobileDevice() {
    if (typeof window === 'undefined') return false;
    
    // Check user agent for mobile devices
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Additional checks for touch-based devices
    const hasTouchScreen = (
      ('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0) ||
      (navigator.msMaxTouchPoints > 0)
    );
    
    // Only consider it mobile if the UA says mobile OR it's a touch device with small screen
    // This prevents desktop browsers with small windows from being detected as mobile
    return isMobileUA || (hasTouchScreen && window.innerWidth <= 768);
  }

  // Check if we're on a platform that supports useful push notifications
  // Desktop browsers support notifications but they're less useful since the browser is usually open
  isDesktopBrowser() {
    if (typeof window === 'undefined') return false;
    return !this.isMobileDevice();
  }

  // Check if push notifications are supported and useful on this platform
  isPushSupported() {
    // Check for Notification API
    if (!('Notification' in window)) return false;
    
    // Check for service worker (required for background notifications on mobile PWA)
    if (!('serviceWorker' in navigator)) return false;
    
    return true;
  }

  shouldPrompt() {
    // Show prompt if:
    // 1. Notifications are supported
    // 2. Permission hasn't been granted or denied
    // 3. User hasn't dismissed the prompt before
    // 4. We're on a mobile device (most useful for push notifications)
    return (
      this.isPushSupported() &&
      this.permission === 'default' &&
      !this.promptDismissed &&
      this.isMobileDevice()
    );
  }

  dismissPrompt() {
    this.promptDismissed = true;
    try {
      localStorage.setItem('deadblock_notification_prompt_dismissed', 'true');
    } catch (e) {
      // Ignore storage errors
    }
  }

  async requestPermission() {
    if (!('Notification' in window)) {
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();
      this.permission = result;
      console.log('[NotificationService] Permission result:', result);
      
      // Send test notification if granted
      if (result === 'granted') {
        this.sendNotification('Notifications Enabled', {
          body: 'You will now receive notifications for game events!',
          tag: 'deadblock-test',
          silent: true
        });
      }
      
      return result;
    } catch (err) {
      console.error('[NotificationService] Permission request failed:', err);
      return 'denied';
    }
  }

  sendNotification(title, options = {}) {
    if (!this.isEnabled()) {
      console.log('[NotificationService] Notifications not enabled');
      return null;
    }

    // Note: We now send notifications even when page is visible for chat messages
    // The toast banner handles in-app visibility
    const isPageHidden = document.hidden;
    
    if (!isPageHidden && options.data?.type !== 'chat_message') {
      // Skip non-chat notifications if page is visible
      console.log('[NotificationService] Page is visible, skipping notification');
      return null;
    }

    try {
      const notification = new Notification(title, {
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        requireInteraction: false,
        silent: false,
        ...options
      });

      // Auto-close after 10 seconds
      setTimeout(() => notification.close(), 10000);

      // Handle click - navigate to the appropriate screen
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        notification.close();
        
        const data = options.data || {};
        
        // Build the navigation URL based on notification type
        let navigateUrl = '/';
        
        if (data.type === 'chat_message' && data.gameId) {
          // Navigate to game with chat open
          navigateUrl = `/?navigateTo=online&gameId=${data.gameId}&openChat=true`;
        } else if ((data.type === 'rematch_request' || data.type === 'rematch_accepted') && data.gameId) {
          navigateUrl = `/?navigateTo=online&gameId=${data.gameId}`;
        } else if (data.type === 'your_turn' && data.gameId) {
          navigateUrl = `/?navigateTo=online&gameId=${data.gameId}`;
        } else if (data.type === 'game_invite') {
          navigateUrl = `/?navigateTo=online`;
        } else if (data.gameId) {
          navigateUrl = `/?navigateTo=online&gameId=${data.gameId}`;
        }
        
        console.log('[NotificationService] Click navigating to:', navigateUrl, 'type:', data.type);
        window.location.href = navigateUrl;
      };

      return notification;
    } catch (err) {
      console.error('[NotificationService] Failed to send notification:', err);
      return null;
    }
  }

  // Convenience methods for specific notification types
  notifyYourTurn(opponentName) {
    return this.sendNotification('Deadblock - Your Turn!', {
      body: `${opponentName} made a move. It's your turn to play!`,
      tag: 'deadblock-turn',
      renotify: true
    });
  }

  notifyChatMessage(senderName, message, gameId) {
    const truncated = message?.length > 50 
      ? message.substring(0, 50) + '...' 
      : message || 'Sent a message';
      
    return this.sendNotification('Deadblock - New Message', {
      body: `${senderName}: ${truncated}`,
      tag: `deadblock-chat-${gameId}`,
      renotify: true,
      data: { url: `/game/${gameId}`, gameId, type: 'chat_message' }
    });
  }

  notifyRematchRequest(opponentName, gameId, rematchId) {
    return this.sendNotification('Deadblock - Rematch Request', {
      body: `${opponentName} wants a rematch!`,
      tag: `deadblock-rematch-${rematchId}`,
      renotify: true,
      requireInteraction: true,
      data: { url: `/game/${gameId}`, gameId, rematchId, type: 'rematch_request' }
    });
  }

  notifyRematchAccepted(opponentName, newGameId) {
    return this.sendNotification('Deadblock - Rematch Accepted!', {
      body: `${opponentName} accepted your rematch. New game starting!`,
      tag: `deadblock-rematch-accepted-${newGameId}`,
      renotify: true,
      data: { url: `/game/${newGameId}`, gameId: newGameId, type: 'rematch_accepted' }
    });
  }

  notifyRematchDeclined(opponentName) {
    return this.sendNotification('Deadblock - Rematch Declined', {
      body: `${opponentName} declined your rematch request.`,
      tag: 'deadblock-rematch-declined',
      renotify: true
    });
  }

  notifyGameInvite(senderName, inviteId) {
    return this.sendNotification('Deadblock - Game Invite', {
      body: `${senderName} challenged you to a game!`,
      tag: `deadblock-invite-${inviteId}`,
      renotify: true,
      requireInteraction: true,
      data: { url: '/online', inviteId }
    });
  }

  notifyInviteAccepted(opponentName, gameId) {
    return this.sendNotification('Deadblock - Invite Accepted', {
      body: `${opponentName} accepted your challenge! Game is starting...`,
      tag: `deadblock-game-${gameId}`,
      renotify: true,
      data: { url: `/game/${gameId}`, gameId }
    });
  }

  notifyGameOver(isWin, opponentName) {
    const title = isWin ? 'Deadblock - Victory!' : 'Deadblock - Game Over';
    const body = isWin 
      ? `You beat ${opponentName}!` 
      : `${opponentName} won the game.`;
      
    return this.sendNotification(title, {
      body,
      tag: 'deadblock-gameover',
      renotify: true
    });
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

export default notificationService;
