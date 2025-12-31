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

  shouldPrompt() {
    // Show prompt if:
    // 1. Notifications are supported
    // 2. Permission hasn't been granted or denied
    // 3. User hasn't dismissed the prompt before
    return (
      'Notification' in window &&
      this.permission === 'default' &&
      !this.promptDismissed
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

    if (!document.hidden) {
      // Don't send notification if page is visible
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

      // Handle click - focus the app
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        notification.close();
        
        // If there's a URL in the data, navigate to it
        if (options.data?.url) {
          window.location.href = options.data.url;
        }
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

  notifyChatMessage(senderName, message) {
    const truncated = message?.length > 50 
      ? message.substring(0, 50) + '...' 
      : message || 'Sent a message';
      
    return this.sendNotification('Deadblock - New Message', {
      body: `${senderName}: ${truncated}`,
      tag: 'deadblock-chat',
      renotify: true
    });
  }

  notifyRematchRequest(opponentName) {
    return this.sendNotification('Deadblock - Rematch Request', {
      body: `${opponentName} wants a rematch!`,
      tag: 'deadblock-rematch',
      renotify: true,
      requireInteraction: true
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
