// Chat Service - In-game quick chat and emotes
import { supabase, isSupabaseConfigured } from '../utils/supabase';

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

  // Subscribe to chat messages in a game
  subscribeToChat(gameId, callback) {
    if (!isSupabaseConfigured()) return null;

    return supabase
      .channel(`game-chat-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_chat',
          filter: `game_id=eq.${gameId}`
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();
  },

  // Unsubscribe from chat
  unsubscribeFromChat(subscription) {
    if (subscription) {
      supabase.removeChannel(subscription);
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
