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
    // 4. We're on a mobile device (notifications are most useful on mobile PWA)
    //    Desktop notifications only work when browser is open, so less useful
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

  // Vibration patterns for different notification types (Android only)
  // Pattern: [vibrate, pause, vibrate, pause, ...]
  vibrationPatterns = {
    yourTurn: [100, 50, 100],           // Quick double buzz
    gameInvite: [200, 100, 200, 100, 200], // Triple buzz (attention!)
    rematch: [150, 75, 150],            // Medium double buzz
    chat: [50],                          // Single short buzz
    victory: [100, 50, 100, 50, 300],   // Celebratory pattern
    defeat: [200, 200, 200],            // Slow triple
    default: [100, 50, 100]
  };

  // Get notification icon based on type (main large icon)
  getNotificationIcon(type) {
    // All types use the main app icon as the large icon
    return '/pwa-192x192.png';
  }

  // Get pentomino-shaped badge for status bar (Android)
  // Each notification type has a unique pentomino shape:
  // - T pentomino = Your Turn (you're "T"agged)
  // - P pentomino = Game Invite (P for Player)
  // - X pentomino = Rematch (X marks the battle)
  // - L pentomino = Chat (L for Letter)
  // - Y pentomino = Victory (Y for Yes!)
  // - F pentomino = Defeat (F to pay respects)
  // - I pentomino = Default (simple bar)
  getNotificationBadge(type) {
    const badgeMap = {
      'your_turn': '/badge-turn.svg',           // T pentomino
      'game_invite': '/badge-invite.svg',       // P pentomino
      'invite_accepted': '/badge-invite.svg',   // P pentomino
      'rematch_request': '/badge-rematch.svg',  // X pentomino
      'rematch_accepted': '/badge-rematch.svg', // X pentomino
      'rematch_declined': '/badge-defeat.svg',  // F pentomino
      'chat_message': '/badge-chat.svg',        // L pentomino
      'victory': '/badge-victory.svg',          // Y pentomino
      'defeat': '/badge-defeat.svg'             // F pentomino
    };
    return badgeMap[type] || '/badge-default.svg'; // I pentomino
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
      const notificationType = options.data?.type || 'default';
      
      // Build enhanced notification options
      const enhancedOptions = {
        // Icon - main notification icon (your logo)
        icon: this.getNotificationIcon(notificationType),
        
        // Badge - small pentomino-shaped icon for status bar (Android)
        // Each notification type gets a different pentomino shape with themed color
        badge: this.getNotificationBadge(notificationType),
        
        // Vibration pattern (Android only)
        vibrate: this.vibrationPatterns[notificationType] || this.vibrationPatterns.default,
        
        // Keep notification until user interacts (for important ones)
        requireInteraction: options.requireInteraction || false,
        
        // Play sound
        silent: options.silent || false,
        
        // Timestamp
        timestamp: Date.now(),
        
        // Spread any custom options
        ...options
      };

      // Add action buttons for certain notification types (Android/Desktop)
      if (notificationType === 'game_invite' && options.data?.inviteId) {
        enhancedOptions.actions = [
          { action: 'accept', title: '✓ Accept', icon: '/pwa-192x192.png' },
          { action: 'decline', title: '✗ Decline', icon: '/pwa-192x192.png' }
        ];
        enhancedOptions.requireInteraction = true;
      } else if (notificationType === 'rematch_request' && options.data?.rematchId) {
        enhancedOptions.actions = [
          { action: 'accept', title: '⚔️ Rematch!', icon: '/pwa-192x192.png' },
          { action: 'decline', title: 'Not now', icon: '/pwa-192x192.png' }
        ];
        enhancedOptions.requireInteraction = true;
      }

      const notification = new Notification(title, enhancedOptions);

      // Auto-close after 10 seconds (unless requireInteraction is true)
      if (!enhancedOptions.requireInteraction) {
        setTimeout(() => notification.close(), 10000);
      }

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
        } else if (data.type === 'invite_accepted' && data.gameId) {
          navigateUrl = `/?navigateTo=online&gameId=${data.gameId}`;
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

  // =====================================================
  // MESSAGE VARIATIONS
  // Each notification type has 10 variations from boring to themed
  // =====================================================
  
  getRandomMessage(messages) {
    return messages[Math.floor(Math.random() * messages.length)];
  }

  // Convenience methods for specific notification types
  notifyYourTurn(opponentName) {
    const messages = [
      // Straightforward (1-3)
      `${opponentName} made a move. It's your turn.`,
      `Your turn to play against ${opponentName}.`,
      `${opponentName} moved. Your turn now.`,
      // Casual (4-6)
      `${opponentName} just played. You're up!`,
      `Tag, you're it! ${opponentName} made their move.`,
      `${opponentName} is waiting for your move!`,
      // Energetic (7-8)
      `${opponentName} threw down! Show them what you've got!`,
      `Move incoming from ${opponentName}! Time to strike back!`,
      // Cyberpunk themed (9-10)
      `ALERT: ${opponentName} deployed their piece. Awaiting your response, operator.`,
      `[GRID UPDATED] ${opponentName} made a power play. Your move, operator.`
    ];
    
    return this.sendNotification('Deadblock - Your Turn!', {
      body: this.getRandomMessage(messages),
      tag: 'deadblock-turn',
      renotify: true,
      data: { type: 'your_turn' }
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
    const messages = [
      // Straightforward (1-3)
      `${opponentName} wants a rematch.`,
      `${opponentName} requested a rematch.`,
      `Rematch request from ${opponentName}.`,
      // Casual (4-6)
      `${opponentName} wants another round!`,
      `${opponentName} isn't done yet! Rematch?`,
      `Think you can beat ${opponentName} again? They want a rematch!`,
      // Energetic (7-8)
      `${opponentName} demands a rematch! Are you ready?!`,
      `Round 2? ${opponentName} is calling you out!`,
      // Cyberpunk themed (9-10)
      `[INCOMING CHALLENGE] ${opponentName} requests grid re-engagement.`,
      `${opponentName} jacked back in. They want revenge, choom.`
    ];
    
    return this.sendNotification('Deadblock - Rematch Request', {
      body: this.getRandomMessage(messages),
      tag: `deadblock-rematch-${rematchId}`,
      renotify: true,
      requireInteraction: true,
      data: { url: `/game/${gameId}`, gameId, rematchId, type: 'rematch_request' }
    });
  }

  notifyRematchAccepted(opponentName, newGameId) {
    const messages = [
      // Straightforward (1-3)
      `${opponentName} accepted. New game starting.`,
      `${opponentName} accepted your rematch.`,
      `Rematch accepted by ${opponentName}. Game ready.`,
      // Casual (4-6)
      `${opponentName} is ready for round two!`,
      `Game on! ${opponentName} accepted your rematch.`,
      `${opponentName} said yes! Let's go again!`,
      // Energetic (7-8)
      `${opponentName} accepted! Time to settle the score!`,
      `IT'S ON! ${opponentName} wants that rematch!`,
      // Cyberpunk themed (9-10)
      `[REMATCH CONFIRMED] ${opponentName} re-entering the grid. Prepare for battle.`,
      `${opponentName} accepted the challenge. Jack in and dominate, operator.`
    ];
    
    return this.sendNotification('Deadblock - Rematch Accepted!', {
      body: this.getRandomMessage(messages),
      tag: `deadblock-rematch-accepted-${newGameId}`,
      renotify: true,
      data: { url: `/game/${newGameId}`, gameId: newGameId, type: 'rematch_accepted' }
    });
  }

  notifyRematchDeclined(opponentName) {
    const messages = [
      // Straightforward (1-3)
      `${opponentName} declined your rematch.`,
      `${opponentName} passed on the rematch.`,
      `Rematch declined by ${opponentName}.`,
      // Casual (4-6)
      `${opponentName} isn't up for another game right now.`,
      `${opponentName} said not this time.`,
      `Maybe later? ${opponentName} declined the rematch.`,
      // Neutral (7-8)
      `${opponentName} has other plans. No rematch for now.`,
      `${opponentName} stepped away from the challenge.`,
      // Cyberpunk themed (9-10)
      `[REQUEST DENIED] ${opponentName} disconnected from rematch protocol.`,
      `${opponentName} flatlined your rematch request. Find a new target.`
    ];
    
    return this.sendNotification('Deadblock - Rematch Declined', {
      body: this.getRandomMessage(messages),
      tag: 'deadblock-rematch-declined',
      renotify: true,
      data: { type: 'rematch_declined' }
    });
  }

  notifyGameInvite(senderName, inviteId) {
    const messages = [
      // Straightforward (1-3)
      `${senderName} challenged you to a game.`,
      `New game invite from ${senderName}.`,
      `${senderName} wants to play.`,
      // Casual (4-6)
      `${senderName} is looking for competition. You in?`,
      `${senderName} threw down the gauntlet!`,
      `Ready to play? ${senderName} is waiting!`,
      // Energetic (7-8)
      `${senderName} just challenged you! Accept and dominate!`,
      `CHALLENGE INCOMING! ${senderName} thinks they can beat you!`,
      // Cyberpunk themed (9-10)
      `[PRIORITY ALERT] ${senderName} initiated grid challenge. Respond, operator.`,
      `${senderName} is breaking into your schedule. Game invite received, choom.`
    ];
    
    return this.sendNotification('Deadblock - Game Invite', {
      body: this.getRandomMessage(messages),
      tag: `deadblock-invite-${inviteId}`,
      renotify: true,
      requireInteraction: true,
      data: { url: '/online', inviteId, type: 'game_invite' }
    });
  }

  notifyInviteAccepted(opponentName, gameId) {
    const messages = [
      // Straightforward (1-3)
      `${opponentName} accepted. Game starting.`,
      `${opponentName} accepted your invite.`,
      `Your challenge was accepted by ${opponentName}.`,
      // Casual (4-6)
      `${opponentName} is ready to play! Let's go!`,
      `Game on! ${opponentName} accepted your challenge.`,
      `${opponentName} joined the game. Show them what you've got!`,
      // Energetic (7-8)
      `${opponentName} accepted your challenge! Time to battle!`,
      `LET'S GO! ${opponentName} is ready to face you!`,
      // Cyberpunk themed (9-10)
      `[OPPONENT LOCKED] ${opponentName} connected to the grid. Initiating game sequence.`,
      `${opponentName} jacked in. The digital arena awaits, operator.`
    ];
    
    return this.sendNotification('Deadblock - Invite Accepted', {
      body: this.getRandomMessage(messages),
      tag: `deadblock-game-${gameId}`,
      renotify: true,
      data: { url: `/game/${gameId}`, gameId, type: 'invite_accepted' }
    });
  }

  notifyGameOver(isWin, opponentName) {
    const winMessages = [
      // Straightforward (1-3)
      `You beat ${opponentName}.`,
      `Victory against ${opponentName}.`,
      `You won the game vs ${opponentName}.`,
      // Casual (4-6)
      `Nice one! You defeated ${opponentName}!`,
      `${opponentName} couldn't handle it. You win!`,
      `GG! You took down ${opponentName}!`,
      // Energetic (7-8)
      `CRUSHING VICTORY! ${opponentName} didn't stand a chance!`,
      `DOMINANT WIN! You destroyed ${opponentName}!`,
      // Cyberpunk themed (9-10)
      `[TARGET ELIMINATED] ${opponentName} has been flatlined. Victory achieved.`,
      `You fried ${opponentName}'s circuits. Another win for the operator.`
    ];
    
    const loseMessages = [
      // Straightforward (1-3)
      `${opponentName} won the game.`,
      `You lost to ${opponentName}.`,
      `Game over. ${opponentName} wins.`,
      // Casual (4-6)
      `Tough break. ${opponentName} got you this time.`,
      `${opponentName} was on fire! Better luck next time.`,
      `So close! ${opponentName} edged you out.`,
      // Supportive (7-8)
      `${opponentName} won. but you've got next game!`,
      `Defeat today, victory tomorrow. ${opponentName} wins this round.`,
      // Cyberpunk themed (9-10)
      `[SYSTEM FAILURE] ${opponentName} hacked your strategy. Reboot and try again.`,
      `${opponentName} pulled the plug. Time to upgrade your tactics, choom.`
    ];
    
    const title = isWin ? 'Deadblock - Victory!' : 'Deadblock - Game Over';
    const messages = isWin ? winMessages : loseMessages;
    const notificationType = isWin ? 'victory' : 'defeat';
      
    return this.sendNotification(title, {
      body: this.getRandomMessage(messages),
      tag: 'deadblock-gameover',
      renotify: true,
      data: { type: notificationType }
    });
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

export default notificationService;
