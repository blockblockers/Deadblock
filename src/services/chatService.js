// Chat Service - In-game quick chat and emotes
// OPTIMIZED: Uses centralized RealtimeManager for chat subscriptions
import { supabase, isSupabaseConfigured } from '../utils/supabase';
import { realtimeManager } from './realtimeManager';

// Quick chat messages
export const QUICK_CHAT_MESSAGES = {
  good_luck: { text: 'Good luck!', icon: '🍀' },
  good_game: { text: 'Good game!', icon: '🎮' },
  nice_move: { text: 'Nice move!', icon: '👏' },
  thanks: { text: 'Thanks!', icon: '🙏' },
  oops: { text: 'Oops!', icon: '😅' },
  thinking: { text: 'Thinking...', icon: '🤔' },
  hurry: { text: 'Your turn!', icon: '⏰' },
  rematch: { text: 'Rematch?', icon: '🔄' }
};

// Emotes
export const EMOTES = {
  thumbs_up: '👍',
  thumbs_down: '👎',
  clap: '👏',
  fire: '🔥',
  cry: '😢',
  laugh: '😄',
  mind_blown: '🤯',
  trophy: '🏆',
  heart: '❤️',
  skull: '💀'
};

export const chatService = {
  // Send a quick chat message
  async sendQuickChat(gameId, userId, messageKey) {
    if (!isSupabaseConfigured()) return { error: { message: 'Not configured' } };

    if (!QUICK_CHAT_MESSAGES[messageKey]) {
      return { error: { message: 'Invalid message key' } };
    }

    const { data, error } = await supabase
      .from('game_chat')
      .insert({
        game_id: gameId,
        user_id: userId,
        message_type: 'quick_chat',
        message_key: messageKey
      })
      .select()
      .single();

    return { data, error };
  },

  // Send an emote
  async sendEmote(gameId, userId, emoteKey) {
    if (!isSupabaseConfigured()) return { error: { message: 'Not configured' } };

    if (!EMOTES[emoteKey]) {
      return { error: { message: 'Invalid emote' } };
    }

    const { data, error } = await supabase
      .from('game_chat')
      .insert({
        game_id: gameId,
        user_id: userId,
        message_type: 'emote',
        message_key: emoteKey
      })
      .select()
      .single();

    return { data, error };
  },

  // Get chat history for a game
  async getChatHistory(gameId, limit = 50) {
    if (!isSupabaseConfigured()) return { data: [], error: null };

    const { data, error } = await supabase
      .from('game_chat')
      .select(`
        id,
        user_id,
        message_type,
        message_key,
        created_at
      `)
      .eq('game_id', gameId)
      .order('created_at', { ascending: true })
      .limit(limit);

    return { data: data || [], error };
  },

  // Subscribe to chat messages - uses RealtimeManager (no new channel created!)
  subscribeToChat(gameId, callback) {
    if (!isSupabaseConfigured()) {
      console.log('[ChatService] Not configured, skipping subscription');
      return () => {};
    }

    console.log('[ChatService] Registering chat handler for game:', gameId);
    
    // Register handler with RealtimeManager
    // The game channel is already subscribed, this just adds a handler
    return realtimeManager.on('chatMessage', (message) => {
      console.log('[ChatService] Received chatMessage event:', message?.id, 'for game:', message?.game_id);
      // Only callback for messages in this game
      if (message.game_id === gameId) {
        console.log('[ChatService] Message matches our game, calling callback');
        callback(message);
      } else {
        console.log('[ChatService] Message for different game, ignoring');
      }
    });
  },

  // Unsubscribe from chat (now just removes handler, not a full channel)
  unsubscribeFromChat(unsubscribeFn) {
    if (unsubscribeFn && typeof unsubscribeFn === 'function') {
      unsubscribeFn();
    }
  },

  // Get display info for a message
  getMessageDisplay(messageType, messageKey) {
    if (messageType === 'quick_chat') {
      return QUICK_CHAT_MESSAGES[messageKey] || { text: messageKey, icon: '💬' };
    } else if (messageType === 'emote') {
      return { text: '', icon: EMOTES[messageKey] || '❓' };
    }
    return { text: messageKey, icon: '💬' };
  }
};

export default chatService;
