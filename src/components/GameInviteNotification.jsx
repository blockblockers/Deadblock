// GameInviteNotification.jsx - Toast notifications for game invites and friend requests
// Shows popups when receiving challenges or friend requests

import { useState, useEffect, useCallback } from 'react';
import { Swords, UserPlus, X, Check, Clock } from 'lucide-react';
import { inviteService } from '../services/inviteService';
import { supabase } from '../lib/supabase';
import { soundManager } from '../utils/soundManager';
import { notificationService } from '../services/notificationService';

const GameInviteNotification = ({ userId, onAccept, onDecline }) => {
  const [notifications, setNotifications] = useState([]);

  // Subscribe to new invites
  useEffect(() => {
    if (!userId) return;

    console.log('[GameInviteNotification] Setting up subscriptions for:', userId);

    // Subscribe to game invites
    const inviteChannel = supabase
      .channel(`invite-notify-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_invites',
          filter: `to_user_id=eq.${userId}`
        },
        async (payload) => {
          console.log('[GameInviteNotification] New invite received:', payload);
          
          // Fetch full invite with sender info
          const { data: invite } = await supabase
            .from('game_invites')
            .select(`
              *,
              from_user:profiles!game_invites_from_user_id_fkey(id, username, display_name)
            `)
            .eq('id', payload.new.id)
            .single();

          if (invite && invite.status === 'pending') {
            const senderName = invite.from_user?.display_name || invite.from_user?.username || 'Someone';
            
            // Add to notifications
            setNotifications(prev => [
              ...prev,
              {
                id: invite.id,
                type: 'invite',
                sender: senderName,
                senderId: invite.from_user_id,
                timestamp: Date.now()
              }
            ]);

            // Play sound
            soundManager.playSound('notification');

            // Send browser notification
            if (document.hidden) {
              notificationService.notifyGameInvite(senderName, invite.id);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[GameInviteNotification] Invite channel status:', status);
      });

    // Subscribe to friend requests
    const friendChannel = supabase
      .channel(`friend-notify-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friendships',
          filter: `friend_id=eq.${userId}`
        },
        async (payload) => {
          console.log('[GameInviteNotification] New friend request:', payload);
          
          if (payload.new.status === 'pending') {
            // Fetch sender info
            const { data: sender } = await supabase
              .from('profiles')
              .select('id, username, display_name')
              .eq('id', payload.new.user_id)
              .single();

            if (sender) {
              const senderName = sender.display_name || sender.username || 'Someone';
              
              // Add to notifications
              setNotifications(prev => [
                ...prev,
                {
                  id: payload.new.id,
                  type: 'friend_request',
                  sender: senderName,
                  senderId: sender.id,
                  timestamp: Date.now()
                }
              ]);

              // Play sound
              soundManager.playSound('notification');
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[GameInviteNotification] Friend channel status:', status);
      });

    return () => {
      console.log('[GameInviteNotification] Cleaning up subscriptions');
      inviteChannel.unsubscribe();
      friendChannel.unsubscribe();
    };
  }, [userId]);

  // Auto-remove old notifications after 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setNotifications(prev => prev.filter(n => now - n.timestamp < 30000));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleAccept = useCallback(async (notification) => {
    // Remove from notifications
    setNotifications(prev => prev.filter(n => n.id !== notification.id));
    
    // Call parent handler
    onAccept?.(notification);
  }, [onAccept]);

  const handleDecline = useCallback((notification) => {
    // Remove from notifications
    setNotifications(prev => prev.filter(n => n.id !== notification.id));
    
    // Call parent handler
    onDecline?.(notification);
  }, [onDecline]);

  const handleDismiss = useCallback((notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="bg-gradient-to-r from-slate-800/95 to-slate-900/95 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-amber-500/30 animate-slide-in"
        >
          <button
            onClick={() => handleDismiss(notification.id)}
            className="absolute top-2 right-2 p-1 text-slate-500 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>

          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              notification.type === 'invite' 
                ? 'bg-amber-500/20' 
                : 'bg-cyan-500/20'
            }`}>
              {notification.type === 'invite' ? (
                <Swords className="w-5 h-5 text-amber-400" />
              ) : (
                <UserPlus className="w-5 h-5 text-cyan-400" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold truncate">
                {notification.type === 'invite' ? 'Game Challenge!' : 'Friend Request'}
              </p>
              <p className="text-slate-400 text-sm">
                <span className={notification.type === 'invite' ? 'text-amber-400' : 'text-cyan-400'}>
                  {notification.sender}
                </span>
                {notification.type === 'invite' 
                  ? ' wants to play' 
                  : ' wants to be friends'}
              </p>

              {/* Buttons */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleAccept(notification)}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-bold text-sm flex items-center justify-center gap-1.5 transition-all ${
                    notification.type === 'invite'
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                  }`}
                >
                  <Check size={14} />
                  Accept
                </button>
                <button
                  onClick={() => handleDecline(notification)}
                  className="py-1.5 px-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-all"
                >
                  Decline
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      <style>{`
        @keyframes slide-in {
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
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default GameInviteNotification;
