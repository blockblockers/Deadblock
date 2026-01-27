// Online Menu - Hub for online features
// v7.15: FIXES - Completed games disappear from Active immediately, rematch acceptance updates in real-time
// v7.14: Real-time "Your turn" updates - no more waiting for refresh!
// v7.10: Fixed iOS scroll, accept invite clears list, acceptor goes first
// v7.10: Prioritize username over display_name (fixes Google OAuth showing account name)
// v7.11: Android scroll fix for Active Games and Recent Games modals
// v7.12: Unviewed game results - losses highlighted in red with pulse animation
import { useState, useEffect, useCallback, useRef } from 'react';
import { Swords, Trophy, User, LogOut, History, ChevronRight, X, Zap, Search, UserPlus, Mail, Check, Clock, Send, Bell, Link, Copy, Share2, Users, Eye, Award, LayoutGrid, RefreshCw, Pencil, Loader, HelpCircle, ArrowLeft, Skull } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';
import { gameSyncService } from '../services/gameSync';
import { inviteService } from '../services/inviteService';
import { notificationService } from '../services/notificationService';
import { friendsService } from '../services/friendsService';
import { ratingService } from '../services/ratingService';
import { matchmakingService } from '../services/matchmaking';
import { realtimeManager } from '../services/realtimeManager';
import { rematchService } from '../services/rematchService';
import NeonTitle from './NeonTitle';
import NeonSubtitle from './NeonSubtitle';
import TierIcon from './TierIcon';
import NotificationPrompt from './NotificationPrompt';
import FriendsList from './FriendsList';
import ViewPlayerProfile from './ViewPlayerProfile';
import Achievements, { AchievementPopup } from './Achievements';
import { SpectatableGamesList } from './SpectatorView';
import GameInviteNotification from './GameInviteNotification';
import FinalBoardView from './FinalBoardView';
import { soundManager } from '../utils/soundManager';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

// Online theme - amber/orange to match the menu button
const theme = {
  gridColor: 'rgba(251,191,36,0.4)',
  glow1: { color: 'bg-amber-500/40', pos: 'top-10 right-20' },
  glow2: { color: 'bg-orange-500/35', pos: 'bottom-20 left-10' },
  glow3: { color: 'bg-yellow-500/20', pos: 'top-1/3 left-1/3' },
  cardBg: 'bg-gradient-to-br from-slate-900/95 via-amber-950/40 to-slate-900/95',
  cardBorder: 'border-amber-500/40',
  cardShadow: 'shadow-[0_0_50px_rgba(251,191,36,0.3),inset_0_0_20px_rgba(251,191,36,0.05)]',
};

// Active Game Prompt Modal
const ActiveGamePrompt = ({ games, profile, onResume, onDismiss }) => {
  // Find games where it's the user's turn
  const myTurnGames = games?.filter(game => game && gameSyncService.isPlayerTurn(game, profile?.id)) || [];
  
  if (myTurnGames.length === 0) return null;

  const getOpponentName = (game) => {
    if (!game) return 'Unknown';
    if (game.player1_id === profile?.id) {
      return game.player2?.username || game.player2?.display_name || 'Unknown';
    }
    return game.player1?.username || game.player1?.display_name || 'Unknown';
  };

  const game = myTurnGames[0]; // Show the first game where it's their turn
  if (!game) return null;

  const displayName = profile?.username || profile?.display_name;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-slate-900 rounded-2xl border border-amber-500/50 shadow-[0_0_60px_rgba(251,191,36,0.3)] overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-4 relative">
          <button
            onClick={onDismiss}
            className="absolute top-3 right-3 p-1 text-white/70 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
          <div className="flex items-center justify-center gap-3">
            <Zap size={28} className="text-white" />
            <h2 className="text-xl font-black text-white">IT'S YOUR TURN!</h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <p className="text-slate-400 text-center mb-4">
            You have {myTurnGames.length === 1 ? 'a game' : `${myTurnGames.length} games`} waiting for your move
          </p>

          {/* Game preview */}
          <div className="bg-slate-800/50 rounded-xl p-4 mb-5 border border-slate-700/50">
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold mb-1">
                  {displayName?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="text-white text-xs font-medium">You</div>
              </div>
              <div className="text-xl font-black text-amber-400">VS</div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold mb-1">
                  {getOpponentName(game)?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="text-white text-xs font-medium">{getOpponentName(game)}</div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-2">
            <button
              onClick={() => {
                soundManager.playButtonClick();
                onResume(game);
              }}
              className="w-full p-4 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl font-bold text-white hover:from-amber-400 hover:to-orange-500 transition-all shadow-[0_0_20px_rgba(251,191,36,0.4)] active:scale-[0.98]"
            >
              RESUME GAME
            </button>
            <button
              onClick={onDismiss}
              className="w-full p-3 text-slate-500 hover:text-slate-300 text-sm transition-colors"
            >
              Maybe Later
            </button>
          </div>

          {/* Additional games indicator */}
          {myTurnGames.length > 1 && (
            <p className="text-center text-amber-400/70 text-xs mt-3">
              +{myTurnGames.length - 1} more {myTurnGames.length - 1 === 1 ? 'game' : 'games'} waiting
            </p>
          )}
        </div>
      </div>

      {/* Animation */}
      <style>{`
        @keyframes scaleIn {
          0% { transform: scale(0.9); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

const OnlineMenu = ({ 
  onFindMatch, 
  onViewProfile, 
  onViewLeaderboard, 
  onResumeGame,
  onSpectateGame,
  onViewReplay,
  onBack 
}) => {
  const { user, profile, signOut, refreshProfile, updateProfile, checkUsernameAvailable, sessionReady } = useAuth();
  // OnlineMenu has substantial content, so always enable scroll
  const { needsScroll: checkScroll, viewportHeight } = useResponsiveLayout(1200);
  // Force scroll for this menu due to amount of content
  const needsScroll = true;
  const [activeGames, setActiveGames] = useState([]);
  const [recentGames, setRecentGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showActivePrompt, setShowActivePrompt] = useState(true);
  const [profileError, setProfileError] = useState(false);
  
  // Username editing state
  const [showUsernameEdit, setShowUsernameEdit] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  
  // Ref to track if profile has been loaded (prevents infinite loop)
  const profileLoadedRef = useRef(false);
  
  // Refresh profile on mount to ensure fresh data (only once)
  useEffect(() => {
    // Skip if already loaded or no refresh function
    if (profileLoadedRef.current || !refreshProfile) return;
    
    const loadProfile = async () => {
      // Mark as loaded immediately to prevent re-runs
      profileLoadedRef.current = true;
      
      setProfileError(false);
      
      try {
        const result = await refreshProfile();
        
        // If profile is still null after refresh and we have a user, retry once
        if (!result && user) {
          await new Promise(r => setTimeout(r, 1000));
          const retryResult = await refreshProfile();
          
          if (!retryResult) {
            console.error('OnlineMenu: Failed to load profile after retry');
            setProfileError(true);
          }
        }
      } catch (err) {
        console.error('OnlineMenu: Profile load error', err);
        setProfileError(true);
      }
    };
    
    loadProfile();
  }, []); // Empty dependency array - run only once on mount
  
  // Friend search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  
  // Lobby
  const [lobbyCount, setLobbyCount] = useState(0);

  // Invite state
  const [receivedInvites, setReceivedInvites] = useState([]);
  const [sentInvites, setSentInvites] = useState([]);
  const [sendingInvite, setSendingInvite] = useState(null);
  const [processingInvite, setProcessingInvite] = useState(null);
  
  // Shareable invite link state
  const [inviteLinks, setInviteLinks] = useState([]);
  const [friendName, setFriendName] = useState('');
  const [creatingLink, setCreatingLink] = useState(false);
  const [showInviteLink, setShowInviteLink] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState(null);
  
  // Pending rematch requests state
  const [pendingRematches, setPendingRematches] = useState([]);
  const [processingRematch, setProcessingRematch] = useState(null);
  
  // Error message state (for in-GUI display instead of alert)
  const [inviteError, setInviteError] = useState(null);
  
  // Notification state
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  
  // Social features state
  const [showFriendsList, setShowFriendsList] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showSpectateList, setShowSpectateList] = useState(false);
  const [viewingPlayerId, setViewingPlayerId] = useState(null);
  const [viewingPlayerData, setViewingPlayerData] = useState(null);
  const [showRecentGames, setShowRecentGames] = useState(false);
  const [showActiveGames, setShowActiveGames] = useState(false);
  const [showRatingInfo, setShowRatingInfo] = useState(false);
  const [pendingFriendRequests, setPendingFriendRequests] = useState(0);
  const [unlockedAchievement, setUnlockedAchievement] = useState(null);
  
  // Final Board View state
  const [selectedGameForFinalView, setSelectedGameForFinalView] = useState(null);

  // Initialize notifications
  // Auto-request notification permission on first online visit (mobile only)
  useEffect(() => {
    const initNotifications = async () => {
      await notificationService.init();
      setNotificationsEnabled(notificationService.isEnabled());
      
      // Only auto-prompt on mobile - desktop notifications require browser to be open
      // so they're less useful and we don't want to be annoying
      if (!notificationService.isMobileDevice()) {
        setShowNotificationPrompt(false);
        return;
      }
      
      // Check if this is first time in online mode and notifications not yet decided
      const hasAskedBefore = localStorage.getItem('deadblock_notification_asked');
      const permission = notificationService.permission;
      
      if (!hasAskedBefore && permission === 'default' && notificationService.isPushSupported()) {
        // Mark that we've asked (so we only auto-ask once)
        localStorage.setItem('deadblock_notification_asked', 'true');
        
        // Small delay to let the page load, then auto-trigger permission request
        setTimeout(async () => {
          const result = await notificationService.requestPermission();
          setNotificationsEnabled(result === 'granted');
          // Don't show the manual prompt since we just asked
          setShowNotificationPrompt(false);
        }, 1500);
      } else {
        // For subsequent visits, show prompt only if they haven't decided yet
        setShowNotificationPrompt(notificationService.shouldPrompt());
      }
    };
    initNotifications();
  }, []);

  // Auto-scroll when Challenge section expands
  useEffect(() => {
    if (showSearch) {
      // Small delay to let the content render
      setTimeout(() => {
        const challengeSection = document.getElementById('challenge-section');
        if (challengeSection) {
          challengeSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
  }, [showSearch]);

  // Fetch lobby/matchmaking count periodically
  useEffect(() => {
    const fetchLobbyCount = async () => {
      if (!profile?.id) return;
      try {
        // Get count of players currently in matchmaking queue
        const { data } = await gameSyncService.getMatchmakingCount?.();
        setLobbyCount(data?.count || 0);
      } catch (e) {
        // Silently ignore - lobby count is optional
      }
    };
    
    fetchLobbyCount();
    const interval = setInterval(fetchLobbyCount, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [profile?.id]);

  // Load friend requests function
  const loadFriendRequests = async () => {
    if (!sessionReady || !profile?.id) return;
    const { data } = await friendsService.getPendingRequests(profile.id);
    setPendingFriendRequests(data?.length || 0);
  };

  // Load friend request count on mount
  useEffect(() => {
    loadFriendRequests();
  }, [sessionReady, profile?.id]);

  // Load games and invites
  useEffect(() => {
    // Wait for session to be verified AND profile to exist
    if (!sessionReady || !profile?.id) {
      return;
    }
    
    // Set loading only on initial load
    setLoading(true);
    
    const load = async () => {
      await loadGames();
      await loadInvites();
    };
    
    load();
    
    // Periodic refresh every 45 seconds (reduced from 15s to save battery/CPU)
    const refreshInterval = setInterval(() => {
      loadGames();
      loadInvites();
    }, 45000);
    
    // Also refresh when tab becomes visible again (but throttle)
    let lastRefresh = Date.now();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Only refresh if more than 10 seconds since last refresh
        if (Date.now() - lastRefresh > 10000) {
          lastRefresh = Date.now();
          loadGames();
          loadInvites();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Refresh when window gets focus (but throttle)
    const handleFocus = () => {
      // Only refresh if more than 10 seconds since last refresh
      if (Date.now() - lastRefresh > 10000) {
        lastRefresh = Date.now();
        loadGames();
        loadInvites();
      }
    };
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [sessionReady, profile?.id]);
  
  // Subscribe to invite updates
  useEffect(() => {
    if (!sessionReady || !profile?.id) return;
    
    const subscription = inviteService.subscribeToInvites(
      profile.id,
      // On new invite received
      async (newInvite) => {
        await loadInvites();
        soundManager.playButtonClick();
        
        // Send notification for new invite
        if (notificationService.isEnabled() && newInvite?.from_user_id) {
          // Get inviter info
          const { data: invites } = await inviteService.getReceivedInvites(profile.id);
          const invite = invites?.find(i => i.id === newInvite.id);
          if (invite?.from_user) {
            const inviterName = invite.from_user.username || invite.from_user.display_name;
            notificationService.notifyGameInvite(inviterName, newInvite.id);
          }
        }
      },
      // On invite updated
      async (updatedInvite) => {
        await loadInvites();
        // If an invite was accepted and created a game, refresh games
        if (updatedInvite.status === 'accepted' && updatedInvite.game_id) {
          await loadGames();
          
          // Notify that invite was accepted (if we sent it)
          if (notificationService.isEnabled() && updatedInvite.from_user_id === profile.id) {
            const { data: game } = await gameSyncService.getGame(updatedInvite.game_id);
            if (game) {
              const opponentName = game.player1_id === profile.id 
                ? (game.player2?.username || game.player2?.display_name)
                : (game.player1?.username || game.player1?.display_name);
              notificationService.notifyInviteAccepted(opponentName || 'Opponent', updatedInvite.game_id);
            }
          }
        }
      }
    );
    
    // ADDED: Subscribe to email invite updates (for invite links)
    const emailInviteHandler = realtimeManager.on('emailInviteUpdated', async (updatedInvite) => {
      await loadInvites();
      
      // If accepted, refresh games to show the new game
      if (updatedInvite?.status === 'accepted' && updatedInvite?.game_id) {
        await loadGames();
        soundManager.playSound('notification');
      }
    });
    
    // Subscribe to rematch request updates
    const rematchHandler = realtimeManager.on('rematchRequest', async (rematchData) => {
      await loadInvites();
      
      // Send push notification for new rematch request (if we're the receiver)
      if (rematchData?.to_user_id === profile.id && rematchData?.status === 'pending') {
        soundManager.playSound('notification');
        
        if (notificationService.isEnabled()) {
          // Get the requester's name from the original game
          const { data: game } = await gameSyncService.getGame(rematchData.game_id);
          if (game) {
            const requesterName = game.player1_id === rematchData.from_user_id 
              ? (game.player1?.username || game.player1?.display_name)
              : (game.player2?.username || game.player2?.display_name);
            notificationService.notifyRematchRequest(requesterName || 'Opponent', rematchData.game_id, rematchData.id);
          }
        }
      }
      
      // If rematch was accepted, navigate to the new game
      if (rematchData?.status === 'accepted' && rematchData?.new_game_id) {
        console.log('[OnlineMenu] Rematch accepted! New game:', rematchData.new_game_id);
        
        // v7.15: Refresh BOTH games AND invites to clear pending rematch
        await Promise.all([loadGames(), loadInvites()]);
        
        // v7.15: Also clear from local state immediately for instant UI update
        setPendingRematches(prev => prev.filter(r => r.id !== rematchData.id));
        
        soundManager.playSound('notification');
        
        // Send notification to the requester that rematch was accepted
        if (notificationService.isEnabled() && rematchData?.from_user_id === profile.id) {
          const { data: newGame } = await gameSyncService.getGame(rematchData.new_game_id);
          if (newGame) {
            const accepterName = newGame.player1_id === profile.id
              ? (newGame.player2?.username || newGame.player2?.display_name)
              : (newGame.player1?.username || newGame.player1?.display_name);
            notificationService.notifyRematchAccepted(accepterName || 'Opponent', rematchData.new_game_id);
          }
        }
      }
    });
    
    return () => {
      inviteService.unsubscribeFromInvites(subscription);
      if (emailInviteHandler) emailInviteHandler();
      if (rematchHandler) rematchHandler();
    };
  }, [sessionReady, profile?.id]);

  // v7.14: Real-time subscription for active games updates
  // This makes "Your turn" indicators update instantly when opponent makes a move
  useEffect(() => {
    if (!sessionReady || !profile?.id || !supabase) return;
    
    console.log('[OnlineMenu] Setting up real-time game updates subscription');
    
    // Subscribe to games where user is player1
    const player1Channel = supabase
      .channel(`menu-games-p1-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `player1_id=eq.${profile.id}`
        },
        (payload) => {
          const game = payload.new;
          const oldGame = payload.old;
          
          // Refresh on turn change or status change
          if (game?.current_player !== oldGame?.current_player || 
              game?.status !== oldGame?.status) {
            console.log('[OnlineMenu] Game update (p1): turn/status changed, refreshing');
            loadGames();
            
            // v7.15: If game just completed, also refresh invites to clear related rematches
            if (game?.status === 'completed' && oldGame?.status !== 'completed') {
              loadInvites();
            }
          }
        }
      )
      .subscribe();
    
    // Subscribe to games where user is player2
    const player2Channel = supabase
      .channel(`menu-games-p2-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `player2_id=eq.${profile.id}`
        },
        (payload) => {
          const game = payload.new;
          const oldGame = payload.old;
          
          // Refresh on turn change or status change
          if (game?.current_player !== oldGame?.current_player || 
              game?.status !== oldGame?.status) {
            console.log('[OnlineMenu] Game update (p2): turn/status changed, refreshing');
            loadGames();
            
            // v7.15: If game just completed, also refresh invites to clear related rematches
            if (game?.status === 'completed' && oldGame?.status !== 'completed') {
              loadInvites();
            }
          }
        }
      )
      .subscribe();
    
    // Also subscribe to new games being created (INSERT)
    const newGamesChannel = supabase
      .channel(`menu-new-games-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'games',
          filter: `player1_id=eq.${profile.id}`
        },
        () => {
          console.log('[OnlineMenu] New game created (p1), refreshing');
          loadGames();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'games',
          filter: `player2_id=eq.${profile.id}`
        },
        () => {
          console.log('[OnlineMenu] New game created (p2), refreshing');
          loadGames();
        }
      )
      .subscribe();
    
    return () => {
      player1Channel.unsubscribe();
      player2Channel.unsubscribe();
      newGamesChannel.unsubscribe();
    };
  }, [sessionReady, profile?.id]);

  const loadInvites = async () => {
    if (!profile?.id) return;
    
    try {
      const [received, sent, links, rematches] = await Promise.all([
        inviteService.getReceivedInvites(profile.id),
        inviteService.getSentInvites(profile.id),
        inviteService.getInviteLinks(profile.id),
        rematchService.getPendingRematchRequests(profile.id)
      ]);
      
      setReceivedInvites(received.data || []);
      setSentInvites(sent.data || []);
      // inviteService now returns properly formatted data with recipientName and inviteLink
      // Filter out links that have a game_id (game already started)
      const activeLinks = (links.data || []).filter(link => !link.game_id);
      setInviteLinks(activeLinks);
      setPendingRematches(rematches.data || []);
    } catch (err) {
      console.error('Error loading invites:', err);
    }
  };

  // Track if loadGames is currently running to prevent duplicate calls
  const loadGamesInProgress = useRef(false);
  
  const loadGames = async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }
    
    // Prevent duplicate calls while one is in progress
    if (loadGamesInProgress.current) {
      return;
    }
    
    loadGamesInProgress.current = true;

    try {
      // Check for stale games once per session (every 6 hours)
      const lastStaleCheck = localStorage.getItem('deadblock_last_stale_check');
      const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000);
      
      if (!lastStaleCheck || parseInt(lastStaleCheck) < sixHoursAgo) {
        const { forfeited } = await gameSyncService.checkAndForfeitStaleGames(profile.id);
        if (forfeited?.length > 0) {
          console.log(`[OnlineMenu] Auto-forfeited ${forfeited.length} stale game(s)`);
        }
        localStorage.setItem('deadblock_last_stale_check', Date.now().toString());
      }
      
      // Get active games + unviewed completed games (v7.12)
      const { data: active } = await gameSyncService.getActiveAndUnviewedGames(profile.id);
      
      // v7.15: Safety filter - ensure no fully-viewed completed games slip through
      // A game should only appear in activeGames if:
      // 1. It's status === 'active', OR
      // 2. It's completed but has unviewed_by_loser === true (loser hasn't seen final board yet)
      const filteredActive = (active || []).filter(g => {
        if (g.status === 'active') return true;
        // For completed games, only include if unviewed by loser
        if (g.status === 'completed' && g.unviewed_by_loser === true) return true;
        return false;
      });
      
      setActiveGames(filteredActive);

      // Get recent completed games - UPDATED: Increased from 5 to 10
      const { data: recent } = await gameSyncService.getPlayerGames(profile.id, 10);
      const completedGames = (recent || []).filter(g => g.status === 'completed');
      setRecentGames(completedGames);
    } catch (err) {
      console.error('Error loading games:', err);
    }
    
    loadGamesInProgress.current = false;
    setLoading(false);
  };

  const handleSignOut = async () => {
    soundManager.playButtonClick();
    try {
      const { error } = await signOut();
      if (error) {
        console.error('Sign out error:', error);
        // Still navigate back even on error - user may be partially signed out
      }
    } catch (err) {
      console.error('Sign out exception:', err);
    }
    onBack();
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    soundManager.playButtonClick();
    // Refresh profile to get latest data
    if (refreshProfile) {
      await refreshProfile();
    }
    await loadGames();
    await loadInvites();
    setRefreshing(false);
  };

  const handleFindMatch = () => {
    soundManager.playButtonClick();
    onFindMatch();
  };

  const handleBack = () => {
    soundManager.playButtonClick();
    onBack();
  };

  // Username editing handlers
  const handleOpenUsernameEdit = () => {
    setNewUsername(profile?.username || '');
    setUsernameError('');
    setShowUsernameEdit(true);
    soundManager.playButtonClick();
  };

  const handleUsernameChange = async (value) => {
    setNewUsername(value);
    setUsernameError('');
    
    // Validate format
    if (value.length < 3) {
      setUsernameError('Name must be at least 3 characters');
      return;
    }
    if (value.length > 20) {
      setUsernameError('Name must be 20 characters or less');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      setUsernameError('Only letters, numbers, and underscores allowed');
      return;
    }
    
    // Check availability for both username AND display_name
    if (value.toLowerCase() !== profile?.username?.toLowerCase()) {
      setCheckingUsername(true);
      
      try {
        // Check if username OR display_name is taken (case-insensitive)
        const { available: usernameAvailable, error: usernameError } = await checkUsernameAvailable(value);
        
        if (usernameError) {
          setUsernameError('Error checking availability');
          setCheckingUsername(false);
          return;
        }
        
        if (!usernameAvailable) {
          setUsernameError('This name is already taken');
          setCheckingUsername(false);
          return;
        }
        
        // Also check display_name directly (for users who have different display_name than username)
        const headers = {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        };
        const authData = localStorage.getItem(`sb-${import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`);
        if (authData) {
          try {
            const parsed = JSON.parse(authData);
            if (parsed?.access_token) {
              headers['Authorization'] = `Bearer ${parsed.access_token}`;
            }
          } catch (e) {}
        }
        
        const displayNameUrl = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?select=id&display_name=ilike.${encodeURIComponent(value)}&id=neq.${profile?.id}&limit=1`;
        const displayNameResponse = await fetch(displayNameUrl, { headers });
        
        if (displayNameResponse.ok) {
          const existing = await displayNameResponse.json();
          if (existing && existing.length > 0) {
            setUsernameError('This name is already taken');
            setCheckingUsername(false);
            return;
          }
        }
      } catch (err) {
        console.error('Error checking name availability:', err);
        setUsernameError('Error checking availability');
      }
      
      setCheckingUsername(false);
    }
  };

  const handleSaveUsername = async () => {
    if (usernameError || checkingUsername || !newUsername) return;
    
    setSavingUsername(true);
    // Update both username (lowercased for uniqueness) and display_name (preserves casing)
    const { error } = await updateProfile({ 
      username: newUsername.toLowerCase(), 
      display_name: newUsername 
    });
    setSavingUsername(false);
    
    if (error) {
      // Handle specific database errors
      const errorMsg = error.message || '';
      if (errorMsg.includes('unique') || errorMsg.includes('duplicate') || errorMsg.includes('already')) {
        setUsernameError('This name is already taken');
      } else if (errorMsg.includes('length') || errorMsg.includes('too short') || errorMsg.includes('too long')) {
        setUsernameError('Name must be 3-20 characters');
      } else {
        setUsernameError(errorMsg || 'Failed to update name');
      }
    } else {
      soundManager.playSound('success');
      setShowUsernameEdit(false);
    }
  };

  // Search for users
  const handleSearch = useCallback(async (query) => {
    setSearchQuery(query);
    
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    const { data } = await inviteService.searchUsers(query, profile?.id);
    setSearchResults(data || []);
    setSearching(false);
  }, [profile?.id]);

  // Send invite to a user
  const handleSendInvite = async (toUserId) => {
    if (!profile?.id) return;
    
    setSendingInvite(toUserId);
    soundManager.playButtonClick();
    
    const { data, error } = await inviteService.sendInvite(profile.id, toUserId);
    
    if (error) {
      console.error('Error sending invite:', error);
      // Show themed error message instead of alert
      setInviteError(error.message || 'Failed to send invite');
      // Auto-clear after 5 seconds
      setTimeout(() => setInviteError(null), 5000);
    } else if (data?.game) {
      // If the other user had already invited us, a game was created
      soundManager.playSound('win');
      onResumeGame(data.game);
    } else {
      // Invite sent successfully
      soundManager.playClickSound('confirm');
      await loadInvites();
      // Remove from search results
      setSearchResults(prev => prev.filter(u => u.id !== toUserId));
    }
    
    setSendingInvite(null);
  };

  // Accept an invite
  const handleAcceptInvite = async (invite) => {
    if (!profile?.id) return;
    
    setProcessingInvite(invite.id);
    soundManager.playButtonClick();
    
    try {
      // v7.10: Pass 'invitee' so the person accepting the invite goes first
      // This ensures they can immediately start playing after clicking Accept
      const { data, error } = await inviteService.acceptInvite(invite.id, profile.id, 'invitee');
      
      if (error) {
        console.error('Error accepting invite:', error);
        setInviteError(error.message || 'Failed to accept invite');
        setTimeout(() => setInviteError(null), 5000);
        setProcessingInvite(null);
        return;
      }
      
      if (data?.game) {
        soundManager.playSound('win');
        
        // v7.10: Clear the invite from local state immediately so it disappears from the list
        setReceivedInvites(prev => prev.filter(i => i.id !== invite.id));
        
        // Clear spinner before navigation
        setProcessingInvite(null);
        
        // Refresh invites in background (in case user comes back)
        loadInvites().catch(() => {});
        
        // Small delay to ensure state updates are flushed
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Navigate to game
        onResumeGame(data.game);
      } else {
        console.error('handleAcceptInvite: No game in response', data);
        setInviteError('Error: Game was not created properly. Please try again.');
        setTimeout(() => setInviteError(null), 5000);
        setProcessingInvite(null);
      }
    } catch (err) {
      console.error('handleAcceptInvite: Exception', err);
      setInviteError('An unexpected error occurred: ' + (err.message || 'Unknown error'));
      setTimeout(() => setInviteError(null), 5000);
      setProcessingInvite(null);
    }
  };

  // Decline an invite
  const handleDeclineInvite = async (invite) => {
    if (!profile?.id) return;
    
    setProcessingInvite(invite.id);
    soundManager.playButtonClick();
    
    await inviteService.declineInvite(invite.id, profile.id);
    await loadInvites();
    
    setProcessingInvite(null);
  };

  // Cancel a sent invite
  const handleCancelInvite = async (invite) => {
    if (!profile?.id) return;
    
    setProcessingInvite(invite.id);
    soundManager.playButtonClick();
    
    try {
      const { error } = await inviteService.cancelInvite(invite.id, profile.id);
      
      if (error) {
        setInviteError(error.message || 'Failed to cancel invite');
        setTimeout(() => setInviteError(null), 5000);
      }
      
      await loadInvites();
    } catch (err) {
      console.error('handleCancelInvite error:', err);
      setInviteError('Failed to cancel invite');
      setTimeout(() => setInviteError(null), 5000);
    }
    
    setProcessingInvite(null);
  };

  // Create a shareable invite link
  const handleCreateInviteLink = async () => {
    if (!profile?.id) return;
    
    setCreatingLink(true);
    soundManager.playButtonClick();
    
    try {
      const { data, error } = await inviteService.createInviteLink(profile.id, friendName.trim());
      
      if (error) {
        setInviteError(error.message || 'Failed to create invite link');
        setTimeout(() => setInviteError(null), 5000);
        setCreatingLink(false);
        return;
      }
      
      soundManager.playClickSound('confirm');
      setFriendName('');
      await loadInvites();
      
      // Auto-copy to clipboard
      if (data?.inviteLink) {
        try {
          await navigator.clipboard.writeText(data.inviteLink);
          setCopiedLinkId(data.id);
          setTimeout(() => setCopiedLinkId(null), 2000);
        } catch (clipErr) {
          // Silent fail - clipboard access might be restricted
        }
      }
    } catch (err) {
      console.error('handleCreateInviteLink error:', err);
      setInviteError('Failed to create invite: ' + err.message);
      setTimeout(() => setInviteError(null), 5000);
    }
    
    setCreatingLink(false);
  };

  // Copy invite link to clipboard
  const handleCopyLink = async (invite) => {
    try {
      await navigator.clipboard.writeText(invite.inviteLink);
      setCopiedLinkId(invite.id);
      soundManager.playClickSound('confirm');
      
      // Mark as shared
      await inviteService.markInviteLinkShared(invite.id, profile.id);
      
      setTimeout(() => setCopiedLinkId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback: show the link in an error banner - user can manually copy
      setInviteError(`Could not auto-copy. Link: ${invite.inviteLink}`);
      setTimeout(() => setInviteError(null), 8000);
    }
  };

  // Share link using native share (mobile)
  const handleShareLink = async (invite) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Play Deadblock with me!',
          text: `${profile?.username || profile?.display_name || 'A friend'} wants to challenge you to Deadblock!`,
          url: invite.inviteLink
        });
        soundManager.playClickSound('confirm');
        await inviteService.markInviteLinkShared(invite.id, profile.id);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      // Fallback to copy
      handleCopyLink(invite);
    }
  };

  // Cancel an invite link
  const handleCancelInviteLink = async (invite) => {
    if (!profile?.id) return;
    
    setProcessingInvite(invite.id);
    soundManager.playButtonClick();
    
    await inviteService.cancelInviteLink(invite.id, profile.id);
    await loadInvites();
    
    setProcessingInvite(null);
  };

  // Accept a rematch request
  const handleAcceptRematch = async (rematch) => {
    if (!profile?.id || !rematch?.id) return;
    
    setProcessingRematch(rematch.id);
    soundManager.playButtonClick();
    
    try {
      const { data, error } = await rematchService.acceptRematchRequest(rematch.id, profile.id);
      
      if (error) {
        console.error('Error accepting rematch:', error);
        setInviteError(error.message || 'Failed to accept rematch');
        setTimeout(() => setInviteError(null), 5000);
        setProcessingRematch(null);
        return;
      }
      
      if (data?.game) {
        soundManager.playSound('win');
        await loadInvites();
        await loadGames();
        
        // Navigate to the new game
        onResumeGame(data.game);
      }
    } catch (err) {
      console.error('handleAcceptRematch error:', err);
      setInviteError('Failed to accept rematch: ' + err.message);
      setTimeout(() => setInviteError(null), 5000);
    }
    
    setProcessingRematch(null);
  };

  // Decline a rematch request
  const handleDeclineRematch = async (rematch) => {
    if (!profile?.id || !rematch?.id) return;
    
    setProcessingRematch(rematch.id);
    soundManager.playButtonClick();
    
    try {
      await rematchService.declineRematchRequest(rematch.id, profile.id);
      await loadInvites();
    } catch (err) {
      console.error('handleDeclineRematch error:', err);
    }
    
    setProcessingRematch(null);
  };

  // Cancel a rematch request (if you sent it)
  const handleCancelRematch = async (rematch) => {
    if (!profile?.id || !rematch?.id) return;
    
    setProcessingRematch(rematch.id);
    soundManager.playButtonClick();
    
    try {
      await rematchService.cancelRematchRequest(rematch.id, profile.id);
      await loadInvites();
    } catch (err) {
      console.error('handleCancelRematch error:', err);
    }
    
    setProcessingRematch(null);
  };

  const getOpponentName = (game) => {
    if (!game) return 'Unknown';
    if (game.player1_id === profile?.id) {
      return game.player2?.username || game.player2?.display_name || 'Unknown';
    }
    return game.player1?.username || game.player1?.display_name || 'Unknown';
  };

  // Get opponent ID from game
  const getOpponentId = (game) => {
    if (!game) return null;
    if (game.player1_id === profile?.id) {
      return game.player2_id;
    }
    return game.player1_id;
  };

  // Get opponent data from game
  const getOpponentData = (game) => {
  if (!game || !profile?.id) return { id: null, username: 'Unknown', displayName: 'Unknown' };
  if (game.player1_id === profile.id) {
    return { 
      id: game.player2_id,
      username: game.player2?.username || 'Unknown',
      displayName: game.player2?.username || game.player2?.display_name || 'Unknown',
      data: game.player2
    };
  }
  return { 
    id: game.player1_id,
    username: game.player1?.username || 'Unknown',
    displayName: game.player1?.username || game.player1?.display_name || 'Unknown',
    data: game.player1
  };
};

  const getGameResult = (game) => {
    if (!game) return { text: 'Unknown', color: 'text-slate-400' };
    if (!game.winner_id) return { text: 'Draw', color: 'text-slate-400' };
    if (game.winner_id === profile?.id) return { text: 'Won', color: 'text-green-400' };
    return { text: 'Lost', color: 'text-red-400' };
  };

  // Check if there are games where it's the user's turn
  const hasMyTurnGames = activeGames?.some(game => game && gameSyncService.isPlayerTurn(game, profile?.id)) || false;

  return (
    <div 
      // v7.10: Fixed scroll container - only ONE element should have scroll properties
      className="fixed inset-0 bg-transparent overflow-y-auto overflow-x-hidden"
      style={{ 
        WebkitOverflowScrolling: 'touch', 
        overscrollBehavior: 'contain',
        // Remove touchAction from outer - let iOS handle naturally
      }}
    >
      {/* Themed glow orbs */}
      <div className={`fixed ${theme.glow1.pos} w-80 h-80 ${theme.glow1.color} rounded-full blur-3xl pointer-events-none`} />
      <div className={`fixed ${theme.glow2.pos} w-72 h-72 ${theme.glow2.color} rounded-full blur-3xl pointer-events-none`} />
      <div className={`fixed ${theme.glow3.pos} w-64 h-64 ${theme.glow3.color} rounded-full blur-3xl pointer-events-none`} />

      {/* Active Game Prompt Modal */}
      {showActivePrompt && hasMyTurnGames && !loading && (
        <ActiveGamePrompt
          games={activeGames}
          profile={profile}
          onResume={(game) => {
            setShowActivePrompt(false);
            onResumeGame(game);
          }}
          onDismiss={() => setShowActivePrompt(false)}
        />
      )}

      {/* Content - v7.10: Removed duplicate scroll styles, let parent handle scrolling */}
      <div 
        className="relative flex flex-col items-center px-3 sm:px-4 pt-6 sm:pt-8 pb-32"
        style={{ 
          minHeight: '100%',
          paddingBottom: 'max(160px, calc(env(safe-area-inset-bottom) + 160px))',
          paddingTop: 'max(24px, env(safe-area-inset-top))',
          // v7.10: NO scroll styles here - parent handles all scrolling
        }}
      >
        <div className="w-full max-w-md">
          
          {/* Title - Centered and Enlarged */}
          <div className="text-center mb-6 sm:mb-8">
            <NeonTitle size="xlarge" />
            <NeonSubtitle text="ONLINE" size="large" className="mt-2" />
          </div>

          {/* Profile Loading/Error State */}
          {(profileError || (!profile && user)) && (
            <div className={`${theme.cardBg} backdrop-blur-md rounded-2xl p-5 border ${theme.cardBorder} ${theme.cardShadow} mb-4`}>
              <div className="text-center py-8">
                {profileError ? (
                  <>
                    <div className="text-red-400 mb-4">
                      <X size={48} className="mx-auto mb-2" />
                      <p className="text-lg font-bold">Failed to load profile</p>
                      <p className="text-sm text-slate-400 mt-1">There was an issue connecting to the server</p>
                    </div>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={async () => {
                          setProfileError(false);
                          setRefreshing(true);
                          const result = await refreshProfile();
                          if (!result) setProfileError(true);
                          setRefreshing(false);
                        }}
                        disabled={refreshing}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold flex items-center gap-2"
                      >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                        Retry
                      </button>
                      <button
                        onClick={handleBack}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold"
                      >
                        Back
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-amber-300 font-medium">Loading profile...</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Main Card - Only show when profile is loaded */}
          {profile && (
            <div className={`${theme.cardBg} backdrop-blur-md rounded-2xl p-5 border ${theme.cardBorder} ${theme.cardShadow}`}>
            
            {/* User Stats Card with Tier Info */}
            <div className="bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-700/50">
              {/* Top row: Avatar and actions */}
              <div className="flex items-center gap-4 mb-3">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-amber-500/30">
                  {(profile?.username || profile?.display_name)?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-white font-bold text-lg">{profile?.username || profile?.display_name || 'Player'}</h2>
                    <button
                      onClick={handleOpenUsernameEdit}
                      className="p-1 text-slate-500 hover:text-amber-400 transition-colors"
                      title="Edit Username"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-slate-500">{profile?.games_played || 0} games</span>
                    <span className="text-green-400">{profile?.games_won || 0} wins</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className={`p-2 text-slate-500 hover:text-amber-400 transition-colors ${refreshing ? 'animate-spin' : ''}`}
                    title="Refresh"
                  >
                    <RefreshCw size={18} />
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut size={20} />
                  </button>
                </div>
              </div>
              
              {/* Rating/Tier display */}
         {(() => {
   const tier = ratingService.getRatingTier(profile?.rating || 1000);
  const glowColor = tier?.glowColor || '#22d3ee';
  
  const hexToRgba = (hex, alpha) => {
    if (!hex?.startsWith('#')) return `rgba(100, 116, 139, ${alpha})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  
  const getTierBackground = () => {
    const backgrounds = {
      '#f59e0b': 'rgba(30, 20, 60, 0.95)',
      '#a855f7': 'rgba(20, 40, 40, 0.95)',
      '#3b82f6': 'rgba(40, 25, 20, 0.95)',
      '#22d3ee': 'rgba(40, 20, 40, 0.95)',
      '#22c55e': 'rgba(40, 20, 35, 0.95)',
      '#38bdf8': 'rgba(35, 25, 45, 0.95)',
      '#2dd4bf': 'rgba(40, 25, 50, 0.95)',
    };
    return backgrounds[glowColor] || 'rgba(15, 23, 42, 0.95)';
  };
  
  return (
    <div 
      className="flex items-center justify-between rounded-lg px-3 py-3"
      style={{
        background: `linear-gradient(135deg, ${getTierBackground()} 0%, ${hexToRgba(glowColor, 0.15)} 100%)`,
        border: `2px solid ${hexToRgba(glowColor, 0.4)}`,
        boxShadow: `0 0 20px ${hexToRgba(glowColor, 0.2)}, inset 0 0 30px ${hexToRgba(glowColor, 0.05)}`
      }}
    >
      <div className="flex items-center gap-3">
        <div 
          className="w-11 h-11 rounded-full flex items-center justify-center"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${getTierBackground()}, rgba(10, 15, 25, 0.98))`,
            border: `2px solid ${hexToRgba(glowColor, 0.5)}`,
            boxShadow: `0 0 15px ${hexToRgba(glowColor, 0.35)}, inset 0 0 10px ${hexToRgba(glowColor, 0.1)}`
          }}
        >
          <TierIcon shape={tier.shape} glowColor={tier.glowColor} size="medium" />
        </div>
        <div>
          <div 
            className="font-bold text-base"
            style={{ color: glowColor, textShadow: `0 0 10px ${hexToRgba(glowColor, 0.5)}` }}
          >
            {tier.name}
          </div>
          <div className="text-xs text-slate-500">Rating Tier</div>
        </div>
      </div>
      <div className="text-right">
        <div 
          className="text-2xl font-black"
          style={{ color: glowColor, textShadow: `0 0 12px ${hexToRgba(glowColor, 0.5)}` }}
        >
          {profile?.rating || 1000}
        </div>
        <div className="text-xs text-slate-500">ELO</div>
      </div>
      <button
        onClick={() => {
          soundManager.playButtonClick();
          setShowRatingInfo(true);
        }}
        className="p-2 rounded-lg transition-all hover:bg-slate-800/50"
        style={{ color: hexToRgba(glowColor, 0.6) }}
        title="How Ratings Work"
      >
        <HelpCircle size={18} />
      </button>
    </div>
  );
})()}
            </div>
            
           {/* Compact Quick Actions - Under Player Box */}
<div className="flex gap-2 mb-3">
  <button
    onClick={() => { soundManager.playButtonClick(); onViewProfile(); }}
    className="flex-1 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 border group"
    style={{
      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(30, 41, 59, 0.8) 100%)',
      borderColor: 'rgba(59, 130, 246, 0.3)',
      boxShadow: '0 0 15px rgba(59, 130, 246, 0.1), inset 0 1px 0 rgba(255,255,255,0.05)'
    }}
  >
    <User size={14} className="text-blue-400 group-hover:scale-110 transition-transform" />
    <span className="text-slate-300 group-hover:text-blue-300 transition-colors">Profile</span>
  </button>
  <button
    onClick={() => { soundManager.playButtonClick(); setShowAchievements(true); }}
    className="flex-1 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 border group"
    style={{
      background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(30, 41, 59, 0.8) 100%)',
      borderColor: 'rgba(251, 191, 36, 0.3)',
      boxShadow: '0 0 15px rgba(251, 191, 36, 0.1), inset 0 1px 0 rgba(255,255,255,0.05)'
    }}
  >
    <Trophy size={14} className="text-amber-400 group-hover:scale-110 transition-transform" />
    <span className="text-slate-300 group-hover:text-amber-300 transition-colors text-[11px]">Achievements</span>
  </button>
  <button
    onClick={() => { soundManager.playButtonClick(); setShowFriendsList(true); }}
    className="flex-1 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 border group relative"
    style={{
      background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.15) 0%, rgba(30, 41, 59, 0.8) 100%)',
      borderColor: 'rgba(34, 211, 238, 0.3)',
      boxShadow: '0 0 15px rgba(34, 211, 238, 0.1), inset 0 1px 0 rgba(255,255,255,0.05)'
    }}
  >
    <Users size={14} className="text-cyan-400 group-hover:scale-110 transition-transform" />
    <span className="text-slate-300 group-hover:text-cyan-300 transition-colors">Friends</span>
    {pendingFriendRequests > 0 && (
      <span className="absolute -top-1.5 -right-1 bg-red-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-bold px-1 shadow-lg shadow-red-500/50">
        {pendingFriendRequests}
      </span>
    )}
  </button>
</div>

{/* View Leaderboard - Gold Glow Orb Style */}
<button
  onClick={() => {
    soundManager.playButtonClick();
    onViewLeaderboard();
  }}
  className="w-full p-3 mb-3 rounded-xl transition-all duration-300 relative overflow-hidden group
    border-2 border-yellow-500/50
    hover:border-yellow-400/70 hover:ring-4 ring-yellow-500/30
    active:scale-[0.98]"
  style={{ 
    background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.25) 0%, rgba(161, 98, 7, 0.3) 100%)',
    boxShadow: '0 0 30px rgba(234, 179, 8, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.boxShadow = '0 0 50px rgba(234, 179, 8, 0.6)';
    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(234, 179, 8, 0.4) 0%, rgba(161, 98, 7, 0.5) 100%)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.boxShadow = '0 0 30px rgba(234, 179, 8, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)';
    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(234, 179, 8, 0.25) 0%, rgba(161, 98, 7, 0.3) 100%)';
  }}
>
  <div className="absolute inset-0 overflow-hidden rounded-xl opacity-0 group-hover:opacity-100">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shine" />
  </div>
  <div className="relative flex items-center justify-center gap-2">
    <Trophy size={20} className="text-yellow-400" />
    <span className="font-black tracking-wide text-sm text-yellow-300 group-hover:text-white transition-colors">
      VIEW LEADERBOARD
    </span>
  </div>
</button>

{/* Find Match - Glow Orb Style - Cyan */}
<button
  onClick={handleFindMatch}
  className="w-full p-3 mb-2 rounded-xl transition-all duration-300 relative overflow-hidden group
    bg-cyan-900/30 border-2 border-cyan-500/40
    hover:border-white/40 hover:ring-4 ring-cyan-500/50
    active:scale-[0.98]"
  style={{ 
    boxShadow: '0 0 25px rgba(34,211,238,0.3)',
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.boxShadow = '0 0 40px rgba(34,211,238,0.6)';
    e.currentTarget.style.background = 'linear-gradient(to right, #06b6d4, #0891b2)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.boxShadow = '0 0 25px rgba(34,211,238,0.3)';
    e.currentTarget.style.background = '';
  }}
>
  <div className="absolute inset-0 overflow-hidden rounded-xl opacity-0 group-hover:opacity-100">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shine" />
  </div>
  
  <div className="relative flex items-center justify-center gap-3">
    <span className="font-black tracking-wide text-sm text-cyan-300 group-hover:text-white transition-colors">
      FIND MATCH
    </span>
    
    {lobbyCount > 0 && (
      <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-normal text-white">
        {lobbyCount} in queue
      </span>
    )}
  </div>
</button>

            {/* Error Banner - Themed in-GUI message */}
            {inviteError && (
              <div className="mb-3 p-3 bg-red-900/40 border border-red-500/50 rounded-xl animate-scaleIn">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-red-500/20 rounded-lg shrink-0">
                    <X size={16} className="text-red-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-red-300 text-sm font-medium">{inviteError}</p>
                  </div>
                  <button 
                    onClick={() => setInviteError(null)}
                    className="text-red-400/60 hover:text-red-300 transition-colors p-1"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Challenge a Player - Purple Glow Orb Button */}
            <button
              onClick={() => {
                soundManager.playButtonClick();
                setShowSearch(!showSearch);
                if (!showSearch) {
                  setSearchQuery('');
                  setSearchResults([]);
                }
              }}
              className="w-full p-3 mb-2 rounded-xl transition-all duration-300 relative overflow-hidden group
                bg-purple-900/30 border-2 border-purple-500/40
                hover:border-white/40 hover:ring-4 ring-purple-500/50
                active:scale-[0.98]"
              style={{ 
                boxShadow: '0 0 25px rgba(168,85,247,0.3)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 0 40px rgba(168,85,247,0.6)';
                e.currentTarget.style.background = 'linear-gradient(to right, #a855f7, #9333ea)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 0 25px rgba(168,85,247,0.3)';
                e.currentTarget.style.background = '';
              }}
            >
              <div className="absolute inset-0 overflow-hidden rounded-xl opacity-0 group-hover:opacity-100">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shine" />
              </div>
              <div className="relative flex items-center justify-center gap-2">
                <span className="font-black tracking-wide text-sm text-purple-300 group-hover:text-white transition-colors">
                  CHALLENGE A PLAYER
                </span>
                <ChevronRight 
                  size={16} 
                  className={`text-purple-400 group-hover:text-white transition-all ${showSearch ? 'rotate-90' : ''}`} 
                />
              </div>
            </button>
              
            {/* Expanded Challenge Options */}
            {showSearch && (
              <div 
                className="bg-slate-800/60 rounded-xl p-3 mb-2 border border-purple-500/30 space-y-3" 
                style={{ 
                  boxShadow: '0 0 15px rgba(168,85,247,0.15)',
                  touchAction: 'pan-y',
                  WebkitOverflowScrolling: 'touch',
                }}>
                {/* Option 1: Search by Username/Email */}
                <div className="bg-slate-900/50 rounded-lg p-3 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Search size={14} className="text-purple-400" />
                    <span className="text-purple-300 text-xs font-bold tracking-wide">SEARCH EXISTING ACCOUNTS</span>
                  </div>
                  <p className="text-slate-400 text-xs mb-3">
                    Find players by their username or email address
                  </p>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="Enter username or email..."
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-800 rounded-lg text-white text-sm border border-slate-700/50 focus:border-purple-500/50 focus:outline-none placeholder:text-slate-600"
                      style={{ touchAction: 'manipulation' }}
                    />
                    {searching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  
                  {/* Search Results - v7.11: Android scroll fix */}
                  {searchResults.length > 0 && (
                    <div 
                      className="space-y-2 mt-3 max-h-48 overflow-y-auto" 
                      style={{ 
                        WebkitOverflowScrolling: 'touch', 
                        overscrollBehavior: 'contain',
                        touchAction: 'pan-y',
                        transform: 'translate3d(0, 0, 0)'
                      }}
                    >                      {searchResults.map(user => {
                        const alreadyInvited = sentInvites.some(i => i.to_user_id === user.id);
                        const displayName = user.username || user.display_name;
                        return (
                          <div
                            key={user.id}
                            className="flex items-center justify-between p-2.5 bg-slate-800/60 rounded-lg border border-slate-700/30"
                          >
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
                                  {displayName?.[0]?.toUpperCase() || '?'}
                                </div>
                                <div>
                                  <div className="text-white text-sm font-medium">{displayName}</div>
                                  <div className="text-cyan-400/70 text-xs flex items-center gap-1">
                                    <TierIcon shape={ratingService.getRatingTier(user.rating || 1000).shape} glowColor={ratingService.getRatingTier(user.rating || 1000).glowColor} size="small" />
                                    <span>{user.rating || 1000}</span>
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleSendInvite(user.id)}
                                disabled={sendingInvite === user.id || alreadyInvited}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                                  alreadyInvited
                                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                    : 'bg-cyan-500 text-white hover:bg-cyan-400 active:scale-95'
                                }`}
                              >
                                {sendingInvite === user.id ? (
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : alreadyInvited ? (
                                  <>
                                    <Clock size={12} />
                                    Sent
                                  </>
                                ) : (
                                  <>
                                    <Send size={12} />
                                    Challenge
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* No Results */}
                    {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                      <p className="text-slate-500 text-xs text-center py-2 mt-2">No players found</p>
                    )}
                  </div>
                  
                  {/* Option 2: Share Invite Link */}
                  <div className="bg-slate-900/50 rounded-lg p-3 border border-purple-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Link size={14} className="text-purple-400" />
                      <span className="text-purple-300 text-xs font-bold tracking-wide">INVITE VIA LINK</span>
                    </div>
                    <p className="text-slate-400 text-xs mb-3">
                      Create a shareable link for friends who don't have an account yet
                    </p>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <UserPlus size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={friendName}
                          onChange={(e) => setFriendName(e.target.value)}
                          placeholder="Friend's name (optional)"
                          className="w-full pl-9 pr-4 py-2.5 bg-slate-800 rounded-lg text-white text-sm border border-slate-700/50 focus:border-purple-500/50 focus:outline-none placeholder:text-slate-600"
                          style={{ touchAction: 'manipulation' }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleCreateInviteLink();
                            }
                          }}
                        />
                      </div>
                      <button
                        onClick={handleCreateInviteLink}
                        disabled={creatingLink}
                        className="px-4 py-2.5 bg-purple-500 text-white rounded-lg font-medium text-sm hover:bg-purple-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {creatingLink ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Link size={14} />
                            Create
                          </>
                        )}
                      </button>
                    </div>

                    {/* Active Invite Links */}
                    {inviteLinks.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-700/50">
                        <p className="text-slate-400 text-xs mb-2 font-medium">Your active invite links:</p>
                        <div 
                          className="space-y-2 max-h-40 overflow-y-auto" 
                          style={{ 
                            WebkitOverflowScrolling: 'touch', 
                            overscrollBehavior: 'contain',
                            touchAction: 'pan-y',
                            transform: 'translate3d(0, 0, 0)'
                          }}
                        >
                          {inviteLinks.map(invite => (
                            <div
                              key={invite.id}
                              className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/30"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-white text-sm font-medium">
                                    {invite.recipientName || 'Friend'}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                    invite.status === 'sent' 
                                      ? 'bg-blue-900/50 text-blue-400' 
                                      : 'bg-amber-900/50 text-amber-400'
                                  }`} title={invite.status === 'sent' ? 'Link has been copied/shared' : 'Link created, ready to share'}>
                                    {invite.status === 'sent' ? 'Copied' : 'New'}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleCancelInviteLink(invite)}
                                  disabled={processingInvite === invite.id}
                                  className="text-slate-500 hover:text-red-400 transition-colors p-1 disabled:opacity-50"
                                  title="Delete invite link"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleCopyLink(invite)}
                                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                                    copiedLinkId === invite.id
                                      ? 'bg-green-600 text-white'
                                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                  }`}
                                >
                                  {copiedLinkId === invite.id ? (
                                    <>
                                      <Check size={12} />
                                      Copied!
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={12} />
                                      Copy Link
                                    </>
                                  )}
                                </button>
                                {navigator.share && (
                                  <button
                                    onClick={() => handleShareLink(invite)}
                                    className="flex-1 py-2 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-400 transition-all flex items-center justify-center gap-1.5"
                                  >
                                    <Share2 size={12} />
                                    Share
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
              </div>
            )}

            {/* Pending Rematch Requests - v7.11: Android scroll fix */}
            {pendingRematches.length > 0 && (
              <div className="bg-orange-900/20 rounded-xl p-4 mb-4 border border-orange-500/30">
                <h3 className="text-orange-400 font-bold text-sm mb-3 flex items-center gap-2">
                  <RefreshCw size={16} />
                  REMATCH REQUESTS ({pendingRematches.length})
                </h3>
                <div 
                  className="space-y-2 max-h-60 overflow-y-auto pr-1"
                  style={{ 
                    WebkitOverflowScrolling: 'touch', 
                    overscrollBehavior: 'contain',
                    touchAction: 'pan-y',
                    transform: 'translate3d(0, 0, 0)'
                  }}
                >
                  {pendingRematches.map(rematch => {
                    // rematchService provides: is_sender, opponent_name, opponent_id
                    const isSender = rematch.is_sender;
                    const opponentName = rematch.opponent_name || 'Opponent';
                    const initial = opponentName?.[0]?.toUpperCase() || '?';
                    
                    return (
                      <div
                        key={rematch.id}
                        className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg border border-orange-500/20"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white text-xs font-bold">
                            {initial}
                          </div>
                          <div>
                            <div className="text-white text-sm font-medium">{opponentName}</div>
                            <div className="text-orange-400/70 text-xs">
                              {isSender ? 'Waiting for response...' : 'Wants a rematch!'}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {isSender ? (
                            // You sent the request - show cancel button
                            <button
                              onClick={() => handleCancelRematch(rematch)}
                              disabled={processingRematch === rematch.id}
                              className="px-3 py-1.5 text-xs bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-all active:scale-95 disabled:opacity-50"
                            >
                              {processingRematch === rematch.id ? (
                                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                'Cancel'
                              )}
                            </button>
                          ) : (
                            // You received the request - show accept/decline
                            <>
                              <button
                                onClick={() => handleAcceptRematch(rematch)}
                                disabled={processingRematch === rematch.id}
                                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-all active:scale-95 disabled:opacity-50"
                              >
                                {processingRematch === rematch.id ? (
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Check size={16} />
                                )}
                              </button>
                              <button
                                onClick={() => handleDeclineRematch(rematch)}
                                disabled={processingRematch === rematch.id}
                                className="p-2 bg-slate-700 text-slate-400 rounded-lg hover:bg-slate-600 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                              >
                                <X size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Received Invites - v7.10: iOS scroll fix */}
            {receivedInvites.length > 0 && (
              <div className="bg-green-900/20 rounded-xl p-4 mb-4 border border-green-500/30">
                <h3 className="text-green-400 font-bold text-sm mb-3 flex items-center gap-2">
                  <Mail size={16} />
                  GAME INVITES ({receivedInvites.length})
                </h3>
                <div 
                  className="space-y-2 max-h-60 overflow-y-auto pr-1"
                  style={{ 
                    WebkitOverflowScrolling: 'touch', 
                    overscrollBehavior: 'contain',
                    touchAction: 'pan-y',
                    transform: 'translate3d(0, 0, 0)'
                  }}
                >
                  {receivedInvites.map(invite => {
                    const inviterName = invite.from_user?.username || invite.from_user?.display_name || 'Unknown';
                    return (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg border border-green-500/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold">
                          {inviterName?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="text-white text-sm font-medium">{inviterName}</div>
                          <div className="text-green-400/70 text-xs">wants to play!</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptInvite(invite)}
                          disabled={processingInvite === invite.id}
                          className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-all active:scale-95 disabled:opacity-50"
                        >
                          {processingInvite === invite.id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Check size={16} />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeclineInvite(invite)}
                          disabled={processingInvite === invite.id}
                          className="p-2 bg-slate-700 text-slate-400 rounded-lg hover:bg-slate-600 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  );
                  })}
                </div>
              </div>
            )}

            {/* Sent Invites (Pending) */}
            {/* Sent Invites - v7.10: iOS scroll fix */}
            {sentInvites.length > 0 && (
              <div className="bg-slate-800/30 rounded-xl p-4 mb-4 border border-slate-700/50">
                <h3 className="text-slate-400 font-bold text-sm mb-3 flex items-center gap-2">
                  <Clock size={16} />
                  PENDING INVITES ({sentInvites.length})
                </h3>
                <div 
                  className="space-y-2 max-h-40 overflow-y-auto pr-1"
                  style={{ 
                    WebkitOverflowScrolling: 'touch', 
                    overscrollBehavior: 'contain',
                    touchAction: 'pan-y',
                    transform: 'translate3d(0, 0, 0)'
                  }}
                >
                  {sentInvites.map(invite => {
                    // Get the best display name available - prefer display_name over username
                    const displayName = invite.to_user?.display_name 
                      || invite.to_user?.username 
                      || invite.recipientName
                      || 'Player';
                    const initial = displayName?.[0]?.toUpperCase() || '?';
                    
                    return (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between p-2.5 bg-slate-900/40 rounded-lg border border-slate-700/30"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-amber-600/80 flex items-center justify-center text-white text-xs font-bold">
                            {initial}
                          </div>
                          <div>
                            <div className="text-slate-300 text-sm font-medium">{displayName}</div>
                            <div className="text-slate-500 text-xs">Waiting for response...</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleCancelInvite(invite)}
                          disabled={processingInvite === invite.id}
                          className="text-xs text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50 px-2 py-1"
                        >
                          Cancel
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active Games Button - Glow Orb Style */}
            {activeGames.length > 0 && (() => {
              const myTurnCount = activeGames.filter(g => gameSyncService.isPlayerTurn(g, profile?.id)).length;
              const waitingCount = activeGames.length - myTurnCount;
              return (
                <button
                  onClick={() => {
                    soundManager.playButtonClick();
                    setShowActiveGames(true);
                  }}
                  className="w-full p-3 mb-2 rounded-xl transition-all duration-300 relative overflow-hidden group
                    bg-green-900/30 border-2 border-green-500/40
                    hover:border-white/40 hover:ring-4 ring-green-500/50
                    active:scale-[0.98]"
                  style={{ 
                    boxShadow: '0 0 25px rgba(34,197,94,0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 40px rgba(34,197,94,0.6)';
                    e.currentTarget.style.background = 'linear-gradient(to right, #22c55e, #16a34a)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 25px rgba(34,197,94,0.3)';
                    e.currentTarget.style.background = '';
                  }}
                >
                  <div className="absolute inset-0 overflow-hidden rounded-xl opacity-0 group-hover:opacity-100">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shine" />
                  </div>
                  <div className="relative flex items-center justify-center gap-2">
                    <span className="font-black tracking-wide text-sm text-green-300 group-hover:text-white transition-colors">
                      ACTIVE GAMES ({activeGames.length})
                    </span>
                    {myTurnCount > 0 && (
                      <span className="bg-amber-500/80 px-2 py-0.5 rounded-full text-xs font-bold text-white animate-pulse">
                        {myTurnCount} your turn!
                      </span>
                    )}
                  </div>
                </button>
              );
            })()}

            {/* Recent Games Button - Red Glow Orb Style */}
            {recentGames.length > 0 && (
              <button
                onClick={() => {
                  soundManager.playButtonClick();
                  setShowRecentGames(true);
                }}
                className="w-full p-3 mb-2 rounded-xl transition-all duration-300 relative overflow-hidden group
                  bg-rose-900/30 border-2 border-rose-500/40
                  hover:border-white/40 hover:ring-4 ring-rose-500/50
                  active:scale-[0.98]"
                style={{ 
                  boxShadow: '0 0 25px rgba(244,63,94,0.3)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 40px rgba(244,63,94,0.6)';
                  e.currentTarget.style.background = 'linear-gradient(to right, #e11d48, #be123c)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 25px rgba(244,63,94,0.3)';
                  e.currentTarget.style.background = '';
                }}
              >
                <div className="absolute inset-0 overflow-hidden rounded-xl opacity-0 group-hover:opacity-100">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shine" />
                </div>
                <div className="relative flex items-center justify-center gap-2">
                  <span className="font-black tracking-wide text-sm text-rose-300 group-hover:text-white transition-colors">
                    RECENT GAMES ({recentGames.length})
                  </span>
                </div>
              </button>
            )}

            {/* Back button - Themed */}
            <button
              onClick={handleBack}
              className="w-full mt-3 py-2 px-4 rounded-xl font-bold text-sm text-slate-300 bg-slate-800/70 hover:bg-slate-700/70 transition-all border border-slate-600/50 hover:border-slate-500/50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(100,116,139,0.2)]"
            >
              <ArrowLeft size={16} />
              GAME MENU
            </button>
          </div>
          )}
          
          {/* Back button when profile error */}
          {(profileError || (!profile && user)) && (
            <button
              onClick={handleBack}
              className="w-full mt-4 py-3 px-4 rounded-xl font-bold text-base text-slate-300 bg-slate-800/70 hover:bg-slate-700/70 transition-all border border-slate-600/50 hover:border-slate-500/50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(100,116,139,0.2)]"
            >
              <ArrowLeft size={18} />
              BACK TO MENU
            </button>
          )}
        </div>
        
        {/* v7.10: Explicit scroll sentinel - ensures iOS can scroll to very bottom */}
        <div className="h-40 w-full flex-shrink-0" aria-hidden="true" />
      </div>
      
      {/* Notification Prompt */}
      {showNotificationPrompt && (
        <NotificationPrompt onDismiss={() => setShowNotificationPrompt(false)} />
      )}
      
      {/* Game Invite Notifications */}
      {profile?.id && (
        <GameInviteNotification
          userId={profile.id}
          onAccept={async (notification) => {
            if (notification.type === 'invite') {
              // v7.10: Use acceptInvite with invitee option so acceptor goes first
              const { data, error } = await inviteService.acceptInvite(notification.id, profile.id, 'invitee');
              if (!error && data?.game) {
                soundManager.playSound('success');
                // v7.10: Clear invite from local state and refresh list
                setReceivedInvites(prev => prev.filter(i => i.id !== notification.id));
                loadInvites().catch(() => {});
                onResumeGame?.(data.game);
              }
            } else if (notification.type === 'friend_request') {
              // Accept friend request
              await friendsService.acceptFriendRequest(notification.id, profile.id);
              loadFriendRequests();
              soundManager.playSound('success');
            }
          }}
          onDecline={(notification) => {
            if (notification.type === 'friend_request') {
              friendsService.declineFriendRequest(notification.id, profile.id);
            }
          }}
        />
      )}
      
      {/* Rating Info Modal */}
      {showRatingInfo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-xl max-w-sm w-full overflow-hidden border border-amber-500/30 shadow-[0_0_50px_rgba(251,191,36,0.2)]">
            {/* Header - Centered */}
            <div className="p-4 border-b border-amber-500/20">
              <div className="flex items-center justify-center gap-2 relative">
                <Trophy size={20} className="text-amber-400" />
                <h2 className="text-lg font-bold text-amber-300">What is ELO?</h2>
                <button
                  onClick={() => setShowRatingInfo(false)}
                  className="absolute right-0 p-1 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            
            {/* Content - v7.11: Android scroll fix */}
            <div 
              className="p-4 space-y-4 max-h-[70vh] overflow-y-auto"
              style={{ 
                WebkitOverflowScrolling: 'touch', 
                overscrollBehavior: 'contain',
                touchAction: 'pan-y',
                transform: 'translate3d(0, 0, 0)',
                willChange: 'scroll-position'
              }}
            >
            >
              {/* What is ELO explanation */}
              <div className="space-y-2">
                <p className="text-sm text-slate-300">
                  <span className="text-amber-400 font-bold">ELO</span> is a skill rating system named after <span className="text-amber-300">Arpad Elo</span>, the physicist who created it for chess. It measures your relative skill level compared to other players.
                </p>
                <p className="text-sm text-slate-400">
                  When you win, you gain points. When you lose, you lose points. The amount depends on your opponent's rating:
                </p>
                <ul className="text-sm text-slate-400 space-y-1 ml-4">
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">▲</span>
                    <span>Beat a <span className="text-amber-300">stronger</span> player = big gain</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">▲</span>
                    <span>Beat a <span className="text-slate-300">weaker</span> player = small gain</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400">▼</span>
                    <span>Lose to a <span className="text-amber-300">stronger</span> player = small loss</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400">▼</span>
                    <span>Lose to a <span className="text-slate-300">weaker</span> player = big loss</span>
                  </li>
                </ul>
              </div>
              
              {/* Tier List */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-300 mb-2">Rating Tiers</h3>
                {[
                  { min: 2200, name: 'Grandmaster', shape: 'X', color: 'text-amber-400', glowColor: '#f59e0b', bg: 'bg-amber-500/10 border-amber-500/30' },
                  { min: 2000, name: 'Master', shape: 'W', color: 'text-purple-400', glowColor: '#a855f7', bg: 'bg-purple-500/10 border-purple-500/30' },
                  { min: 1800, name: 'Expert', shape: 'T', color: 'text-blue-400', glowColor: '#3b82f6', bg: 'bg-blue-500/10 border-blue-500/30' },
                  { min: 1600, name: 'Advanced', shape: 'Y', color: 'text-cyan-400', glowColor: '#22d3ee', bg: 'bg-cyan-500/10 border-cyan-500/30' },
                  { min: 1400, name: 'Intermediate', shape: 'L', color: 'text-green-400', glowColor: '#22c55e', bg: 'bg-green-500/10 border-green-500/30' },
                  { min: 1200, name: 'Beginner', shape: 'I', color: 'text-sky-400', glowColor: '#38bdf8', bg: 'bg-sky-500/10 border-sky-500/30' },
                  { min: 0, name: 'Novice', shape: 'O', color: 'text-teal-400', glowColor: '#2dd4bf', bg: 'bg-teal-500/10 border-teal-500/30' },
                ].map((tier) => (
                  <div key={tier.name} className={`flex items-center justify-between p-2 rounded-lg border ${tier.bg}`}>
                    <div className="flex items-center gap-3">
                      <TierIcon shape={tier.shape} glowColor={tier.glowColor} size="default" />
                      <span className={`font-bold ${tier.color}`}>{tier.name}</span>
                    </div>
                    <span className="text-xs text-slate-500">{tier.min}+</span>
                  </div>
                ))}
              </div>
              
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30">
                <p className="text-xs text-slate-500">
                  All players start at <span className="text-amber-400 font-bold">1000 ELO</span>. Your rating adjusts faster during your first 30 games, then stabilizes as your true skill level emerges.
                </p>
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-amber-500/20">
              <button
                onClick={() => setShowRatingInfo(false)}
                className="w-full py-2.5 rounded-lg font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 transition-all"
              >
                Got It!
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Username Edit Modal */}
      {showUsernameEdit && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-xl max-w-sm w-full overflow-hidden border border-amber-500/30 shadow-[0_0_50px_rgba(251,191,36,0.2)]">
            {/* Header */}
            <div className="p-4 border-b border-amber-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pencil size={20} className="text-amber-400" />
                <h2 className="text-lg font-bold text-amber-300">Edit Username</h2>
              </div>
              <button
                onClick={() => setShowUsernameEdit(false)}
                className="p-1 text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Form */}
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">New Username</label>
                <div className="relative">
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="Enter username"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                    maxLength={20}
                  />
                  {checkingUsername && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader size={18} className="text-amber-400 animate-spin" />
                    </div>
                  )}
                </div>
                {usernameError && (
                  <p className="mt-2 text-sm text-red-400">{usernameError}</p>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  3-20 characters. Letters, numbers, and underscores only.
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUsernameEdit(false)}
                  className="flex-1 py-3 rounded-lg font-bold text-slate-400 bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveUsername}
                  disabled={!!usernameError || checkingUsername || savingUsername || !newUsername || newUsername === profile?.username}
                  className="flex-1 py-3 rounded-lg font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {savingUsername ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Active Games Modal */}
      {showActiveGames && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={(e) => {
            // Close modal when clicking backdrop
            if (e.target === e.currentTarget) setShowActiveGames(false);
          }}
        >
          <div 
            className="bg-slate-900 rounded-xl max-w-md w-full max-h-[80vh] flex flex-col border border-amber-500/30 shadow-[0_0_50px_rgba(251,191,36,0.2)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - Fixed */}
            <div className="p-4 border-b border-amber-500/20 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Swords size={24} className="text-amber-400" />
                <h2 className="text-lg font-bold text-amber-300">Active Games</h2>
                {activeGames.length > 0 && (
                  <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
                    {activeGames.length}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowActiveGames(false)}
                className="p-1 text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Games List - v7.12: Enhanced scroll handling for mobile */}
            <div 
              className="flex-1 overflow-y-auto overscroll-contain"
              style={{ 
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
                touchAction: 'pan-y',
                // Force hardware acceleration and contain scroll
                transform: 'translateZ(0)',
                willChange: 'scroll-position',
                // Prevent iOS bounce effect from propagating
                position: 'relative',
                isolation: 'isolate'
              }}
              onTouchStart={(e) => {
                // Allow scroll to start from any touch position
                e.currentTarget.style.scrollBehavior = 'auto';
              }}
              onTouchEnd={(e) => {
                // Restore smooth scrolling after touch
                e.currentTarget.style.scrollBehavior = 'smooth';
              }}
            >
              <div className="p-4 space-y-3">
                {activeGames.length === 0 ? (
                  <div className="text-center py-8">
                    <Swords className="mx-auto text-slate-600 mb-2" size={40} />
                    <p className="text-slate-400">No active games</p>
                  </div>
                ) : (
                <div className="space-y-3">
                  {/* v7.12: Separate unviewed completed games from active games */}
                  {(() => {
                    const unviewedCompleted = activeGames.filter(g => g?._isUnviewedResult);
                    const reallyActive = activeGames.filter(g => g && !g._isUnviewedResult);
                    
                    return (
                      <>
                        {/* UNVIEWED COMPLETED GAMES - Show first with highlighting */}
                        {unviewedCompleted.length > 0 && (
                          <>
                            <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                              <span>Game Results</span>
                              <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">
                                {unviewedCompleted.length} new
                              </span>
                            </div>
                            
                            {unviewedCompleted.map(game => {
                              const opponentName = getOpponentName(game);
                              const isLoss = game._isLoss;
                              
                              return (
                                <button
                                  key={game.id}
                                  onClick={() => {
                                    soundManager.playButtonClick();
                                    setShowActiveGames(false);
                                    onResumeGame(game);
                                  }}
                                  className={`w-full p-4 rounded-lg flex items-center justify-between transition-all ${
                                    isLoss 
                                      ? 'bg-gradient-to-r from-red-900/40 to-red-800/30 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse'
                                      : 'bg-gradient-to-r from-green-900/40 to-emerald-900/30 border border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    {/* Result Icon */}
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                      isLoss 
                                        ? 'bg-red-500/30 text-red-400' 
                                        : 'bg-green-500/30 text-green-400'
                                    }`}>
                                      {isLoss ? <Skull size={20} /> : <Trophy size={20} />}
                                    </div>
                                    
                                    {/* Game Info */}
                                    <div className="text-left">
                                      <div className="text-white font-medium flex items-center gap-2">
                                        vs {opponentName}
                                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                          isLoss 
                                            ? 'bg-red-500/30 text-red-300' 
                                            : 'bg-green-500/30 text-green-300'
                                        }`}>
                                          {isLoss ? 'LOSS' : 'WIN'}
                                        </span>
                                      </div>
                                      <div className={`text-sm ${isLoss ? 'text-red-300' : 'text-green-300'}`}>
                                        Tap to view final board
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <ChevronRight size={20} className={isLoss ? 'text-red-400' : 'text-green-400'} />
                                </button>
                              );
                            })}
                            
                            {/* Divider if there are also active games */}
                            {reallyActive.length > 0 && (
                              <div className="border-t border-slate-700/50 my-3" />
                            )}
                          </>
                        )}
                        
                        {/* ACTIVE GAMES */}
                        {reallyActive.length > 0 && (
                          <>
                            {unviewedCompleted.length > 0 && (
                              <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                                Active Games
                              </div>
                            )}
                            
                            {reallyActive.map(game => {
                              const isMyTurn = gameSyncService.isPlayerTurn(game, profile?.id);
                              const opponentName = getOpponentName(game);
                              
                              return (
                                <button
                                  key={game.id}
                                  onClick={() => {
                                    soundManager.playButtonClick();
                                    setShowActiveGames(false);
                                    onResumeGame(game);
                                  }}
                                  className={`w-full p-4 rounded-lg flex items-center justify-between transition-all ${
                                    isMyTurn 
                                      ? 'bg-gradient-to-r from-amber-600/30 to-orange-600/30 border border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.3)]' 
                                      : 'bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                                      isMyTurn ? 'bg-amber-500' : 'bg-purple-600'
                                    }`}>
                                      {opponentName?.[0]?.toUpperCase() || '?'}
                                    </div>
                                    <div className="text-left">
                                      <div className="text-white font-medium">vs {opponentName}</div>
                                      <div className={`text-sm flex items-center gap-1 ${
                                        isMyTurn ? 'text-amber-300 font-medium' : 'text-slate-500'
                                      }`}>
                                        {isMyTurn ? (
                                          <>🎮 Your turn!</>
                                        ) : (
                                          <><Clock size={12} /> Waiting for opponent...</>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <ChevronRight size={20} className={isMyTurn ? 'text-amber-400' : 'text-slate-600'} />
                                </button>
                              );
                            })}
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Recent Games Modal */}
      {showRecentGames && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowRecentGames(false);
          }}
        >
          <div 
            className="bg-slate-900 rounded-xl max-w-md w-full max-h-[80vh] flex flex-col border border-amber-500/30 shadow-[0_0_50px_rgba(251,191,36,0.2)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - Fixed */}
            <div className="p-4 border-b border-amber-500/20 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <History size={24} className="text-amber-400" />
                <h2 className="text-lg font-bold text-amber-300">Recent Games</h2>
                {recentGames.length > 0 && (
                  <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
                    {recentGames.length}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowRecentGames(false)}
                className="p-1 text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Games List - v7.12: Enhanced scroll handling */}
            <div 
              className="flex-1 overflow-y-auto overscroll-contain"
              style={{ 
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
                touchAction: 'pan-y',
                transform: 'translateZ(0)',
                willChange: 'scroll-position',
                position: 'relative',
                isolation: 'isolate'
              }}
              onTouchStart={(e) => {
                e.currentTarget.style.scrollBehavior = 'auto';
              }}
              onTouchEnd={(e) => {
                e.currentTarget.style.scrollBehavior = 'smooth';
              }}
            >
              <div className="p-4">
              {recentGames.length === 0 ? (
                <div className="text-center py-8">
                  <History className="mx-auto text-slate-600 mb-2" size={40} />
                  <p className="text-slate-400">No recent games</p>
                </div>
              ) : (
                <div className="space-y-3">
             {recentGames.filter(g => g).map(game => {
  const result = getGameResult(game);
  const opponent = getOpponentData(game);
  return (
    <div
      key={game.id}
      className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/30 hover:border-slate-600/50 transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        {/* Opponent info - clickable to view profile */}
        <button 
          onClick={() => {
            if (opponent.id) {
              soundManager.playButtonClick();
              setShowRecentGames(false);
              setViewingPlayerId(opponent.id);
              setViewingPlayerData(opponent.data || null);
            }
          }}
          className={`flex items-center gap-3 text-left ${opponent.id ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'} transition-opacity`}
          disabled={!opponent.id}
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-slate-300 font-bold border border-slate-600/50">
            {opponent.displayName?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div className="text-slate-200 font-medium flex items-center gap-1">
              vs {opponent.displayName}
              {opponent.id && <ChevronRight size={14} className="text-slate-500" />}
            </div>
            <div className="text-slate-500 text-xs">
              {game.created_at ? new Date(game.created_at).toLocaleDateString() : 'Unknown date'}
            </div>
          </div>
        </button>
        <span className={`text-lg font-bold ${result.color}`}>
          {result.text}
        </span>
      </div>
      {/* Action buttons */}
      <div className="flex justify-end gap-2">
        {/* Challenge Again button */}
        {opponent.id && (
          <button
            onClick={async () => {
              soundManager.playButtonClick();
              setSendingInvite(opponent.id);
              const { error } = await inviteService.sendInvite(profile.id, opponent.id);
              setSendingInvite(null);
              if (!error) {
                setShowRecentGames(false);
              }
            }}
            disabled={sendingInvite === opponent.id}
            className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 text-amber-300 rounded-lg hover:bg-amber-500/30 transition-colors text-sm disabled:opacity-50"
            title="Challenge to rematch"
          >
            {sendingInvite === opponent.id ? (
              <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Swords size={16} />
            )}
            Challenge
          </button>
        )}
        {/* Final Board View button */}
        <button
          onClick={() => {
            soundManager.playButtonClick();
            setSelectedGameForFinalView(game);
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors text-sm"
          title="View final board state"
        >
          <LayoutGrid size={16} />
          Final
        </button>
      </div>
    </div>
  );
})}

                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Friends List Modal */}
      {showFriendsList && (
        <FriendsList
          userId={profile?.id}
          onInviteFriend={async (friend) => {
            // Send game invite to friend
            setSendingInvite(friend.id);
            const { error } = await inviteService.sendInvite(profile.id, friend.id);
            setSendingInvite(null);
            if (!error) {
              soundManager.playSound('success');
              setShowFriendsList(false);
            }
          }}
          onSpectate={(gameId) => {
            setShowFriendsList(false);
            onSpectateGame?.(gameId);
          }}
          onViewProfile={(playerId, playerData) => {
            setViewingPlayerId(playerId);
            setViewingPlayerData(playerData || null);
          }}
          onClose={() => setShowFriendsList(false)}
        />
      )}
      
      {/* View Player Profile Modal */}
      {viewingPlayerId && (
        <ViewPlayerProfile
          playerId={viewingPlayerId}
          playerData={viewingPlayerData}
          currentUserId={profile?.id}
          onInviteToGame={async (player) => {
            const { error } = await inviteService.sendInvite(profile.id, player.id);
            if (!error) {
              soundManager.playSound('success');
              setViewingPlayerId(null);
              setViewingPlayerData(null);
            }
          }}
          onClose={() => {
            setViewingPlayerId(null);
            setViewingPlayerData(null);
          }}
        />
      )}
      
      {/* Achievements Modal */}
      {showAchievements && (
        <Achievements
          userId={profile?.id}
          onClose={() => setShowAchievements(false)}
        />
      )}
      
      {/* Spectatable Games List */}
      {showSpectateList && (
        <SpectatableGamesList
          userId={profile?.id}
          onSpectate={(gameId) => {
            setShowSpectateList(false);
            onSpectateGame?.(gameId);
          }}
          onClose={() => setShowSpectateList(false)}
        />
      )}
      
      {/* Achievement Unlock Popup */}
      {unlockedAchievement && (
        <AchievementPopup
          achievement={unlockedAchievement}
          onClose={() => setUnlockedAchievement(null)}
        />
      )}
      
      {/* Final Board View Modal */}
      {selectedGameForFinalView && (
        <FinalBoardView
          isOpen={true}
          onClose={() => setSelectedGameForFinalView(null)}
          board={selectedGameForFinalView.board}
          boardPieces={selectedGameForFinalView.board_pieces}
          winner={selectedGameForFinalView.winner_id === selectedGameForFinalView.player1_id ? 'player1' : 
                  selectedGameForFinalView.winner_id === selectedGameForFinalView.player2_id ? 'player2' : null}
          player1Name={selectedGameForFinalView.player1?.username || selectedGameForFinalView.player1?.display_name || 'Player 1'}
          player2Name={selectedGameForFinalView.player2?.username || selectedGameForFinalView.player2?.display_name || 'Player 2'}
          viewerIsPlayer1={selectedGameForFinalView.player1_id === profile?.id}
        />
      )}
      
      {/* Shine animation for glowing orb buttons */}
      <style>{`
        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .group:hover .group-hover\\:animate-shine {
          animation: shine 1.5s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default OnlineMenu;
