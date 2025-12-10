// GameInviteNotification - Toast notifications for game invites and challenges
import { useState, useEffect, useRef } from 'react';
import { Gamepad2, X, Check, Clock, Users, Bell } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../utils/supabase';
import { soundManager } from '../utils/soundManager';
import { ratingService } from '../services/ratingService';
import TierIcon from './TierIcon';

const GameInviteNotification = ({ userId, onAccept, onDecline }) => {
  const [notifications, setNotifications] = useState([]);
  const subscriptionRef = useRef(null);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured()) return;

    // Check for pending invites on load
    checkPendingInvites();

    // Subscribe to new invites
    subscriptionRef.current = supabase
      .channel('game-invites')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_invites',
          filter: `invited_id=eq.${userId}`
        },
        async (payload) => {
          // Fetch inviter details
          const { data: inviter } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, elo_rating')
            .eq('id', payload.new.inviter_id)
            .single();

          const notification = {
            id: payload.new.id,
            type: 'invite',
            inviter,
            timerSeconds: payload.new.timer_seconds,
            createdAt: payload.new.created_at,
            expiresAt: new Date(Date.now() + 60000) // 60 second expiry
          };

          setNotifications(prev => [...prev, notification]);
          soundManager.playSound('notification');
          
          // Vibrate if supported
          if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
          }
        }
      )
      .subscribe();

    // Also listen for friend requests
    const friendSub = supabase
      .channel('friend-requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friends',
          filter: `friend_id=eq.${userId}`
        },
        async (payload) => {
          if (payload.new.status !== 'pending') return;

          const { data: requester } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, elo_rating')
            .eq('id', payload.new.user_id)
            .single();

          const notification = {
            id: payload.new.id,
            type: 'friend_request',
            from: requester,
            createdAt: payload.new.created_at
          };

          setNotifications(prev => [...prev, notification]);
          soundManager.playSound('notification');
        }
      )
      .subscribe();

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
      supabase.removeChannel(friendSub);
    };
  }, [userId]);

  const checkPendingInvites = async () => {
    const { data: invites } = await supabase
      .from('game_invites')
      .select(`
        id,
        timer_seconds,
        created_at,
        inviter:profiles!game_invites_inviter_id_fkey(id, username, avatar_url, elo_rating)
      `)
      .eq('invited_id', userId)
      .eq('status', 'pending')
      .gte('created_at', new Date(Date.now() - 60000).toISOString()); // Last minute

    if (invites?.length > 0) {
      const notifications = invites.map(inv => ({
        id: inv.id,
        type: 'invite',
        inviter: inv.inviter,
        timerSeconds: inv.timer_seconds,
        createdAt: inv.created_at,
        expiresAt: new Date(new Date(inv.created_at).getTime() + 60000)
      }));
      setNotifications(notifications);
    }
  };

  const handleAccept = async (notification) => {
    removeNotification(notification.id);
    onAccept?.(notification);
  };

  const handleDecline = async (notification) => {
    removeNotification(notification.id);
    
    if (notification.type === 'invite') {
      await supabase
        .from('game_invites')
        .update({ status: 'declined' })
        .eq('id', notification.id);
    }
    
    onDecline?.(notification);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Auto-remove expired notifications
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setNotifications(prev => 
        prev.filter(n => !n.expiresAt || new Date(n.expiresAt) > now)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map(notification => (
        <NotificationCard
          key={notification.id}
          notification={notification}
          onAccept={() => handleAccept(notification)}
          onDecline={() => handleDecline(notification)}
        />
      ))}
    </div>
  );
};

// Individual notification card
const NotificationCard = ({ notification, onAccept, onDecline }) => {
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    if (!notification.expiresAt) return;

    const updateTime = () => {
      const remaining = Math.max(0, Math.floor((new Date(notification.expiresAt) - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [notification.expiresAt]);

  if (notification.type === 'invite') {
    const tier = ratingService.getRatingTier(notification.inviter?.elo_rating || 1200);

    return (
      <div className="bg-slate-900 border border-amber-500/50 rounded-xl shadow-xl overflow-hidden animate-slide-in">
        {/* Timer bar */}
        {notification.expiresAt && (
          <div className="h-1 bg-slate-800">
            <div 
              className="h-full bg-amber-500 transition-all duration-1000"
              style={{ width: `${(timeLeft / 60) * 100}%` }}
            />
          </div>
        )}

        <div className="p-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {notification.inviter?.username?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1">
              <div className="font-bold text-white">{notification.inviter?.username}</div>
              <div className="text-xs text-slate-400 flex items-center gap-1">
                <TierIcon shape={tier.shape} glowColor={tier.glowColor} size="small" />
                {notification.inviter?.elo_rating || 1200}
                {notification.timerSeconds && (
                  <>
                    <span className="mx-1">•</span>
                    <Clock size={10} />
                    {notification.timerSeconds}s turns
                  </>
                )}
              </div>
            </div>
            <button
              onClick={onDecline}
              className="text-slate-500 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Message */}
          <div className="text-sm text-amber-200 mb-3 flex items-center gap-2">
            <Gamepad2 size={16} />
            Challenges you to a game!
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onAccept}
              className="flex-1 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-400 flex items-center justify-center gap-2"
            >
              <Check size={18} />
              Accept
            </button>
            <button
              onClick={onDecline}
              className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg font-medium hover:bg-slate-600 flex items-center justify-center gap-2"
            >
              <X size={18} />
              Decline
            </button>
          </div>

          {/* Time remaining */}
          {timeLeft > 0 && (
            <div className="text-center text-xs text-slate-500 mt-2">
              Expires in {timeLeft}s
            </div>
          )}
        </div>
      </div>
    );
  }

  if (notification.type === 'friend_request') {
    return (
      <div className="bg-slate-900 border border-cyan-500/50 rounded-xl shadow-xl p-4 animate-slide-in">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
            {notification.from?.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1">
            <div className="font-medium text-white">{notification.from?.username}</div>
            <div className="text-xs text-cyan-400 flex items-center gap-1">
              <Users size={12} />
              Friend request
            </div>
          </div>
          <button
            onClick={onDecline}
            className="text-slate-500 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onAccept}
            className="flex-1 py-1.5 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-400"
          >
            Accept
          </button>
          <button
            onClick={onDecline}
            className="flex-1 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-600"
          >
            Decline
          </button>
        </div>
      </div>
    );
  }

  return null;
};

// Notification bell with count
export const NotificationBell = ({ count = 0, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="relative p-2 text-slate-400 hover:text-white"
    >
      <Bell size={24} />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
};

export default GameInviteNotification;

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  .animate-slide-in {
    animation: slideIn 0.3s ease-out;
  }
`;
if (typeof document !== 'undefined') {
  document.head.appendChild(style);
}
