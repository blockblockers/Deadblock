// Push Notification Service for Online Games
// Handles web push notifications for game events

class NotificationService {
  constructor() {
    this.permission = 'default';
    this.supported = 'Notification' in window;
    this.serviceWorkerReady = false;
  }

  // Initialize notification service
  async init() {
    if (!this.supported) {
      console.log('Notifications not supported');
      return false;
    }

    this.permission = Notification.permission;
    
    // Check if service worker is ready
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        this.serviceWorkerReady = !!registration;
      } catch (e) {
        console.log('Service worker not ready for notifications');
      }
    }

    return this.permission === 'granted';
  }

  // Request notification permission
  async requestPermission() {
    if (!this.supported) {
      return { granted: false, error: 'Notifications not supported' };
    }

    try {
      const result = await Notification.requestPermission();
      this.permission = result;
      
      if (result === 'granted') {
        // Save preference
        localStorage.setItem('notificationsEnabled', 'true');
        return { granted: true };
      } else if (result === 'denied') {
        localStorage.setItem('notificationsEnabled', 'false');
        return { granted: false, error: 'Permission denied' };
      }
      
      return { granted: false, error: 'Permission dismissed' };
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      return { granted: false, error: err.message };
    }
  }

  // Check if notifications are enabled
  isEnabled() {
    return this.supported && this.permission === 'granted';
  }

  // Check if we should prompt for permission
  shouldPrompt() {
    if (!this.supported) return false;
    if (this.permission === 'granted' || this.permission === 'denied') return false;
    
    // Don't prompt if user has dismissed before
    const dismissed = localStorage.getItem('notificationPromptDismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      // Only prompt again after 7 days
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        return false;
      }
    }
    
    return true;
  }

  // Mark prompt as dismissed
  dismissPrompt() {
    localStorage.setItem('notificationPromptDismissed', Date.now().toString());
  }

  // Send a local notification
  async notify(title, options = {}) {
    if (!this.isEnabled()) {
      console.log('Notifications not enabled');
      return null;
    }

    const defaultOptions = {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      requireInteraction: false,
      silent: false,
      tag: 'deadblock-notification',
      ...options
    };

    try {
      // Try service worker notification first (works in background)
      if (this.serviceWorkerReady && navigator.serviceWorker.controller) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, defaultOptions);
        return true;
      }
      
      // Fallback to regular notification (foreground only)
      const notification = new Notification(title, defaultOptions);
      
      notification.onclick = () => {
        window.focus();
        notification.close();
        options.onClick?.();
      };
      
      return notification;
    } catch (err) {
      console.error('Error showing notification:', err);
      return null;
    }
  }

  // Game-specific notifications
  
  // Notify when it's your turn
  notifyYourTurn(opponentName, gameId) {
    return this.notify('Your Turn!', {
      body: `${opponentName} made their move. It's your turn to play!`,
      tag: `turn-${gameId}`,
      data: { type: 'your_turn', gameId },
      requireInteraction: true,
      actions: [
        { action: 'play', title: 'Play Now' }
      ]
    });
  }

  // Notify when you receive a game invite
  notifyGameInvite(fromUsername, inviteId) {
    return this.notify('Game Invite!', {
      body: `${fromUsername} wants to play Deadblock with you!`,
      tag: `invite-${inviteId}`,
      data: { type: 'invite', inviteId },
      requireInteraction: true,
      actions: [
        { action: 'accept', title: 'Accept' },
        { action: 'decline', title: 'Decline' }
      ]
    });
  }

  // Notify when opponent accepts your invite
  notifyInviteAccepted(opponentName, gameId) {
    return this.notify('Game Started!', {
      body: `${opponentName} accepted your invite. Game on!`,
      tag: `game-start-${gameId}`,
      data: { type: 'game_start', gameId }
    });
  }

  // Notify game result
  notifyGameResult(won, opponentName, gameId) {
    const title = won ? '🏆 Victory!' : '💀 Defeat';
    const body = won 
      ? `You defeated ${opponentName}!`
      : `${opponentName} won this round. Try again?`;
    
    return this.notify(title, {
      body,
      tag: `result-${gameId}`,
      data: { type: 'game_result', gameId, won }
    });
  }

  // Notify opponent forfeit
  notifyOpponentForfeit(opponentName, gameId) {
    return this.notify('You Win!', {
      body: `${opponentName} forfeited the game.`,
      tag: `forfeit-${gameId}`,
      data: { type: 'forfeit', gameId }
    });
  }
}

// Create singleton instance
export const notificationService = new NotificationService();
export default notificationService;
