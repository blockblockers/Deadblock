// notificationService.js - Client-side notification handling
// v7.12 FIX: notifyYourTurn now accepts gameId and uses game-specific tags
// - Each game gets its own notification tag to prevent replacement issues
// - Clicking notification navigates to the correct game
// - Added debug logging for troubleshooting

class NotificationService {
  constructor() {
    this.permission = 'default';
    this.promptDismissed = false;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
    
    // Check if user has previously dismissed the prompt
    try {
      this.promptDismissed = localStorage.getItem('deadblock_notification_prompt_dismissed') === 'true';
    } catch (e) {
      // Ignore storage errors
    }
    
    this.initialized = true;
    console.log('[NotificationService] Initialized, permission:', this.permission);
  }

  isEnabled() {
    return 'Notification' in window && this.permission === 'granted';
  }

  isPushSupported() {
    // Check for Notification API
    if (!('Notification' in window)) return false;
    
    // Check for service worker (required for background notifications on mobile PWA)
    if (!('serviceWorker' in navigator)) return false;
    
    return true;
  }

  isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  shouldPrompt() {
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
  vibrationPatterns = {
    yourTurn: [100, 50, 100],           // Quick double buzz
    gameInvite: [200, 100, 200, 100, 200], // Triple buzz (attention!)
    rematch: [150, 75, 150],            // Medium double buzz
    chat: [50],                          // Single short buzz
    victory: [100, 50, 100, 50, 300],   // Celebratory pattern
    defeat: [200, 200, 200],            // Slow triple
    default: [100, 50, 100]
  };

  getNotificationIcon(type) {
    return '/pwa-192x192.png';
  }

  getNotificationBadge(type) {
    const badgeMap = {
      'your_turn': '/badge-turn.svg',
      'game_invite': '/badge-invite.svg',
      'invite_accepted': '/badge-invite.svg',
      'rematch_request': '/badge-rematch.svg',
      'rematch_accepted': '/badge-rematch.svg',
      'rematch_declined': '/badge-defeat.svg',
      'chat_message': '/badge-chat.svg',
      'victory': '/badge-victory.svg',
      'defeat': '/badge-defeat.svg'
    };
    return badgeMap[type] || '/badge-default.svg';
  }

  sendNotification(title, options = {}) {
    console.log('[NotificationService] sendNotification called:', title, options);
    
    if (!this.isEnabled()) {
      console.log('[NotificationService] Notifications not enabled, permission:', this.permission);
      return null;
    }

    // Check notification preferences
    const prefs = this.getNotificationPrefs();
    const notificationType = options.data?.type || 'default';
    
    // Map notification types to preference keys
    const prefKeyMap = {
      'your_turn': 'yourTurn',
      'game_invite': 'gameInvites',
      'friend_request': 'friendRequests',
      'rematch_request': 'rematchRequests',
      'rematch_accepted': 'rematchRequests',
      'chat_message': 'chatMessages',
      'invite_accepted': 'gameStart',
      'game_start': 'gameStart'
    };
    
    const prefKey = prefKeyMap[notificationType];
    if (prefKey && prefs[prefKey] === false) {
      console.log('[NotificationService] Notification type disabled by user preference:', notificationType);
      return null;
    }

    // Check page visibility - send notification even if visible for important events
    // For your_turn, we want to notify even if they're on a different tab
    const isPageHidden = document.hidden || document.visibilityState === 'hidden';
    const alwaysNotify = ['chat_message', 'your_turn', 'game_invite', 'rematch_request'].includes(notificationType);
    
    if (!isPageHidden && !alwaysNotify) {
      console.log('[NotificationService] Page is visible and notification type not priority, skipping');
      return null;
    }

    try {
      const enhancedOptions = {
        icon: this.getNotificationIcon(notificationType),
        badge: this.getNotificationBadge(notificationType),
        vibrate: this.vibrationPatterns[notificationType] || this.vibrationPatterns.default,
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
        timestamp: Date.now(),
        ...options
      };

      // Add action buttons for certain notification types
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

      console.log('[NotificationService] Creating notification with options:', enhancedOptions);
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
        let navigateUrl = '/';
        
        if (data.type === 'chat_message' && data.gameId) {
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

      console.log('[NotificationService] Notification created successfully');
      return notification;
    } catch (err) {
      console.error('[NotificationService] Failed to send notification:', err);
      return null;
    }
  }

  getNotificationPrefs() {
    try {
      const stored = localStorage.getItem('deadblock_notification_prefs');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}
    
    // Default: all enabled
    return {
      yourTurn: true,
      gameInvites: true,
      friendRequests: true,
      rematchRequests: true,
      chatMessages: true,
      gameStart: true,
      weeklyChallenge: true
    };
  }

  // =====================================================
  // MESSAGE VARIATIONS
  // =====================================================
  
  getRandomMessage(messages) {
    return messages[Math.floor(Math.random() * messages.length)];
  }

  // v7.12 FIX: Now accepts gameId parameter and uses game-specific tag
  notifyYourTurn(opponentName, gameId) {
    console.log('[NotificationService] notifyYourTurn called:', { opponentName, gameId });
    
    const messages = [
      `${opponentName} made a move. It's your turn.`,
      `Your turn to play against ${opponentName}.`,
      `${opponentName} moved. Your turn now.`,
      `${opponentName} just played. You're up!`,
      `Tag, you're it! ${opponentName} made their move.`,
      `${opponentName} is waiting for your move!`,
      `${opponentName} threw down! Show them what you've got!`,
      `Move incoming from ${opponentName}! Time to strike back!`,
      `ALERT: ${opponentName} deployed their piece. Awaiting your response, operator.`,
      `[GRID UPDATED] ${opponentName} made a power play. Your move, operator.`
    ];
    
    // v7.12 FIX: Use game-specific tag so each game gets its own notification
    // This prevents notifications from different games replacing each other
    const tag = gameId ? `deadblock-turn-${gameId}` : 'deadblock-turn';
    
    return this.sendNotification('Deadblock - Your Turn!', {
      body: this.getRandomMessage(messages),
      tag: tag,
      renotify: true,  // Important: re-alert even if tag exists
      data: { 
        type: 'your_turn',
        gameId: gameId,  // v7.12 FIX: Include gameId for navigation
        url: gameId ? `/?navigateTo=online&gameId=${gameId}` : '/?navigateTo=online'
      }
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
      `${opponentName} wants a rematch.`,
      `${opponentName} requested a rematch.`,
      `Rematch request from ${opponentName}.`,
      `${opponentName} wants another round!`,
      `${opponentName} isn't done yet! Rematch?`,
      `Think you can beat ${opponentName} again? They want a rematch!`,
      `${opponentName} demands a rematch! Are you ready?!`,
      `Round 2? ${opponentName} is calling you out!`,
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
      `${opponentName} accepted. New game starting.`,
      `${opponentName} accepted your rematch.`,
      `Rematch accepted by ${opponentName}. Game ready.`,
      `${opponentName} is ready for round two!`,
      `Game on! ${opponentName} accepted your rematch.`,
      `${opponentName} said yes! Let's go again!`,
      `${opponentName} accepted! Time to settle the score!`,
      `IT'S ON! ${opponentName} wants that rematch!`,
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
      `${opponentName} declined your rematch.`,
      `${opponentName} passed on the rematch.`,
      `Rematch declined by ${opponentName}.`,
      `${opponentName} isn't up for another game right now.`,
      `${opponentName} said not this time.`,
      `Maybe later? ${opponentName} declined the rematch.`,
      `${opponentName} has other plans. No rematch for now.`,
      `${opponentName} stepped away from the challenge.`,
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
      `${senderName} challenged you to a game.`,
      `New game invite from ${senderName}.`,
      `${senderName} wants to play.`,
      `${senderName} is looking for competition. You in?`,
      `${senderName} threw down the gauntlet!`,
      `Ready to play? ${senderName} is waiting!`,
      `${senderName} just challenged you! Accept and dominate!`,
      `CHALLENGE INCOMING! ${senderName} thinks they can beat you!`,
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
      `${opponentName} accepted. Game starting.`,
      `${opponentName} accepted your invite.`,
      `Your challenge was accepted by ${opponentName}.`,
      `${opponentName} is ready to play! Let's go!`,
      `Game on! ${opponentName} accepted your challenge.`,
      `${opponentName} joined the game. Show them what you've got!`,
      `${opponentName} accepted your challenge! Time to battle!`,
      `LET'S GO! ${opponentName} is ready to face you!`,
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
      `You beat ${opponentName}.`,
      `Victory against ${opponentName}.`,
      `You won the game vs ${opponentName}.`,
      `Nice one! You defeated ${opponentName}!`,
      `${opponentName} couldn't handle it. You win!`,
      `GG! You took down ${opponentName}!`,
      `CRUSHING VICTORY! ${opponentName} didn't stand a chance!`,
      `DOMINANT WIN! You destroyed ${opponentName}!`,
      `[TARGET ELIMINATED] ${opponentName} has been flatlined. Victory achieved.`,
      `You fried ${opponentName}'s circuits. Another win for the operator.`
    ];
    
    const loseMessages = [
      `${opponentName} won the game.`,
      `You lost to ${opponentName}.`,
      `Game over. ${opponentName} wins.`,
      `Tough break. ${opponentName} got you this time.`,
      `${opponentName} was on fire! Better luck next time.`,
      `So close! ${opponentName} edged you out.`,
      `${opponentName} won, but you'll get them next time!`,
      `Defeat today, victory tomorrow. ${opponentName} got lucky.`,
      `[MISSION FAILED] ${opponentName} outmaneuvered you. Recalibrate and retry.`,
      `${opponentName} flatlined your run. Time to jack back in, operator.`
    ];
    
    return this.sendNotification(
      isWin ? 'Deadblock - Victory!' : 'Deadblock - Game Over',
      {
        body: this.getRandomMessage(isWin ? winMessages : loseMessages),
        tag: 'deadblock-game-over',
        renotify: true,
        data: { type: isWin ? 'victory' : 'defeat' }
      }
    );
  }

  notifyFriendRequest(senderName) {
    const messages = [
      `${senderName} sent you a friend request.`,
      `New friend request from ${senderName}.`,
      `${senderName} wants to be friends.`,
      `${senderName} is reaching out! Friend request received.`,
      `${senderName} wants to add you as a friend.`,
      `Connect with ${senderName}? Friend request waiting.`,
      `${senderName} wants to join your crew!`,
      `New connection alert! ${senderName} sent a friend request.`,
      `[SOCIAL PING] ${senderName} requesting connection to your network.`,
      `${senderName} wants to jack into your friend list, choom.`
    ];
    
    return this.sendNotification('Deadblock - Friend Request', {
      body: this.getRandomMessage(messages),
      tag: 'deadblock-friend-request',
      renotify: true,
      data: { type: 'friend_request' }
    });
  }
}

export const notificationService = new NotificationService();
export default notificationService;
