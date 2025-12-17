// Online Menu - Hub for online features
// UPDATED: Added clickable opponents in Recent Games modal
import { useState, useEffect, useCallback, useRef } from 'react';
import { Swords, Trophy, User, LogOut, History, ChevronRight, X, Zap, Search, UserPlus, Mail, Check, Clock, Send, Bell, Link, Copy, Share2, Users, Eye, Award, PlayCircle, RefreshCw, Pencil, Loader, HelpCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { gameSyncService } from '../services/gameSync';
import { inviteService } from '../services/inviteService';
import { notificationService } from '../services/notificationService';
import { friendsService } from '../services/friendsService';
import { ratingService } from '../services/ratingService';
import NeonTitle from './NeonTitle';
import NeonSubtitle from './NeonSubtitle';
import TierIcon from './TierIcon';
import NotificationPrompt from './NotificationPrompt';
import FriendsList from './FriendsList';
import ViewPlayerProfile from './ViewPlayerProfile';
import Achievements, { AchievementPopup } from './Achievements';
import { SpectatableGamesList } from './SpectatorView';
import GameInviteNotification from './GameInviteNotification';
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
      return game.player2?.username || 'Unknown';
    }
    return game.player1?.username || 'Unknown';
  };

  const game = myTurnGames[0]; // Show the first game where it's their turn
  if (!game) return null;

  const displayName = profile?.username;

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
  
  // Refresh profile on mount to ensure fresh data
  useEffect(() => {
    const loadProfile = async () => {
      if (refreshProfile) {
        console.log('OnlineMenu: Refreshing profile on mount');
        setProfileError(false);
        
        try {
          const result = await refreshProfile();
          console.log('OnlineMenu: Profile refresh result', { hasProfile: !!result });
          
          // If profile is still null after refresh and we have a user, retry
          if (!result && user) {
            console.log('OnlineMenu: Profile still null, will retry...');
            // Wait and retry once more
            await new Promise(r => setTimeout(r, 1000));
            const retryResult = await refreshProfile();
            console.log('OnlineMenu: Profile retry result', { hasProfile: !!retryResult });
            
            if (!retryResult) {
              console.error('OnlineMenu: Failed to load profile after retry');
              setProfileError(true);
            }
          }
        } catch (err) {
          console.error('OnlineMenu: Profile load error', err);
          setProfileError(true);
        }
      }
    };
    loadProfile();
  }, [refreshProfile, user]);
  
  // Friend search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  
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

  // Initialize notifications
  useEffect(() => {
    const initNotifications = async () => {
      await notificationService.init();
      setNotificationsEnabled(notificationService.isEnabled());
      setShowNotificationPrompt(notificationService.shouldPrompt());
    };
    initNotifications();
  }, []);

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
      console.log('OnlineMenu: Waiting for session/profile', { sessionReady, hasProfile: !!profile?.id });
      return;
    }
    
    console.log('OnlineMenu: Session ready, loading data for', profile.id);
    
    // Set loading only on initial load
    setLoading(true);
    
    const load = async () => {
      await loadGames();
      await loadInvites();
    };
    
    load();
    
    // Periodic refresh every 30 seconds for active games
    const refreshInterval = setInterval(() => {
      loadGames();
      loadInvites();
    }, 30000);
    
    return () => clearInterval(refreshInterval);
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
          if (invite?.from_user?.username) {
            notificationService.notifyGameInvite(invite.from_user.username, newInvite.id);
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
                ? game.player2?.username 
                : game.player1?.username;
              notificationService.notifyInviteAccepted(opponentName || 'Opponent', updatedInvite.game_id);
            }
          }
        }
      }
    );
    
    return () => {
      inviteService.unsubscribeFromInvites(subscription);
    };
  }, [sessionReady, profile?.id]);

  const loadInvites = async () => {
    if (!profile?.id) return;
    
    try {
      const [received, sent, links] = await Promise.all([
        inviteService.getReceivedInvites(profile.id),
        inviteService.getSentInvites(profile.id),
        inviteService.getInviteLinks(profile.id)
      ]);
      
      setReceivedInvites(received.data || []);
      setSentInvites(sent.data || []);
      setInviteLinks(links.data || []);
    } catch (err) {
      console.error('Error loading invites:', err);
    }
  };

  // Track if loadGames is currently running to prevent duplicate calls
  const loadGamesInProgress = useRef(false);
  
  const loadGames = async () => {
    if (!profile?.id) {
      console.log('OnlineMenu.loadGames: No profile ID');
      setLoading(false);
      return;
    }
    
    // Prevent duplicate calls while one is in progress
    if (loadGamesInProgress.current) {
      console.log('OnlineMenu.loadGames: Already loading, skipping');
      return;
    }
    
    loadGamesInProgress.current = true;
    console.log('OnlineMenu.loadGames: Loading games for', profile.id);

    try {
      // Get active games
      const { data: active, error: activeError } = await gameSyncService.getActiveGames(profile.id);
      console.log('OnlineMenu.loadGames: Active games result', { 
        count: active?.length, 
        error: activeError?.message,
        gameIds: active?.map(g => g.id)
      });
      setActiveGames(active || []);

      // Get recent completed games
      const { data: recent, error: recentError } = await gameSyncService.getPlayerGames(profile.id, 5);
      const completedGames = (recent || []).filter(g => g.status === 'completed');
      console.log('OnlineMenu.loadGames: Recent games', { 
        total: recent?.length, 
        completed: completedGames.length,
        error: recentError?.message
      });
      setRecentGames(completedGames);
    } catch (err) {
      console.error('OnlineMenu.loadGames: Error loading games:', err);
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
    soundManager.playClickSound('select');
  };

  const handleCheckUsername = async (username) => {
    if (!username || username.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return;
    }
    if (username.length > 20) {
      setUsernameError('Username must be 20 characters or less');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameError('Only letters, numbers, and underscores');
      return;
    }
    
    setCheckingUsername(true);
    setUsernameError('');
    
    const { available, error } = await checkUsernameAvailable(username);
    
    if (error) {
      setUsernameError('Could not check username');
    } else if (!available) {
      setUsernameError('Username already taken');
    } else {
      setUsernameError('');
    }
    
    setCheckingUsername(false);
  };

  const handleSaveUsername = async () => {
    if (usernameError || checkingUsername) return;
    if (!newUsername || newUsername === profile?.username) {
      setShowUsernameEdit(false);
      return;
    }
    
    setSavingUsername(true);
    
    const { error } = await updateProfile({ username: newUsername.toLowerCase() });
    
    if (error) {
      setUsernameError(error.message || 'Failed to update username');
    } else {
      soundManager.playClickSound('confirm');
      setShowUsernameEdit(false);
    }
    
    setSavingUsername(false);
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
      alert(error.message || 'Failed to send invite');
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
      console.log('handleAcceptInvite: Starting', { inviteId: invite.id, profileId: profile.id });
      
      const { data, error } = await inviteService.acceptInvite(invite.id, profile.id);
      
      console.log('handleAcceptInvite: Result', { data, error, hasGame: !!data?.game });
      
      if (error) {
        console.error('Error accepting invite:', error);
        alert(error.message || 'Failed to accept invite');
        setProcessingInvite(null);
        return;
      }
      
      if (data?.game) {
        console.log('handleAcceptInvite: Game created successfully', { 
          gameId: data.game.id,
          player1: data.game.player1?.username,
          player2: data.game.player2?.username
        });
        soundManager.playSound('win');
        
        // Clear spinner immediately before navigation
        setProcessingInvite(null);
        
        // Small delay to ensure state updates are flushed
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Navigate to game
        console.log('handleAcceptInvite: Navigating to game...');
        onResumeGame(data.game);
      } else {
        console.error('handleAcceptInvite: No game in response', data);
        alert('Error: Game was not created properly. Please try again.');
        setProcessingInvite(null);
      }
    } catch (err) {
      console.error('handleAcceptInvite: Exception', err);
      alert('An unexpected error occurred: ' + (err.message || 'Unknown error'));
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
    
    await inviteService.cancelInvite(invite.id, profile.id);
    await loadInvites();
    
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
        alert(error.message || 'Failed to create invite link');
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
          console.log('Could not auto-copy:', clipErr);
        }
      }
    } catch (err) {
      console.error('handleCreateInviteLink error:', err);
      alert('Failed to create invite: ' + err.message);
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
      // Fallback: show the link in an alert
      alert(`Copy this link:\n${invite.inviteLink}`);
    }
  };

  // Share link using native share (mobile)
  const handleShareLink = async (invite) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Play Deadblock with me!',
          text: `${profile?.username || 'A friend'} wants to challenge you to Deadblock!`,
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

  // =====================================================
  // HELPER FUNCTIONS FOR GAME DATA
  // =====================================================
  
  const getOpponentName = (game) => {
    if (!game) return 'Unknown';
    if (game.player1_id === profile?.id) {
      return game.player2?.username || 'Unknown';
    }
    return game.player1?.username || 'Unknown';
  };

  // NEW: Get opponent ID and data for clickable profile
  const getOpponentData = (game) => {
    if (!game || !profile?.id) return { id: null, data: null };
    if (game.player1_id === profile.id) {
      return { 
        id: game.player2_id, 
        data: game.player2 
      };
    }
    return { 
      id: game.player1_id, 
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

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div 
      className="fixed inset-0 bg-slate-950"
      style={{ 
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch', 
        touchAction: 'pan-y pinch-zoom',
        overscrollBehavior: 'contain',
        height: '100%',
        width: '100%',
      }}
    >
      {/* Themed Grid background */}
      <div className="fixed inset-0 opacity-40 pointer-events-none" style={{
        backgroundImage: `linear-gradient(${theme.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${theme.gridColor} 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }} />
      
      {/* Themed glow orbs */}
      <div className={`fixed ${theme.glow1.pos} w-80 h-80 ${theme.glow1.color} rounded-full blur-3xl pointer-events-none`} />
      <div className={`fixed ${theme.glow2.pos} w-72 h-72 ${theme.glow2.color} rounded-full blur-3xl pointer-events-none`} />
      <div className={`fixed ${theme.glow3.pos} w-64 h-64 ${theme.glow3.color} rounded-full blur-3xl pointer-events-none`} />
      
      {/* Main content */}
      <div className="relative z-10 min-h-full p-4 pb-8">
        <div className="max-w-md mx-auto">
          
          {/* Back button & title */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleBack}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <NeonSubtitle text="ONLINE" color="amber" />
            <div className="w-10" /> {/* Spacer */}
          </div>
          
          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          
          {/* Profile error state */}
          {profileError && !loading && (
            <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4 mb-4 text-center">
              <p className="text-red-300 mb-3">Unable to load your profile</p>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-400 transition-colors"
              >
                Retry
              </button>
            </div>
          )}
          
          {/* Main content when loaded */}
          {!loading && !profileError && (
            <>
              {/* Profile section */}
              <div className={`${theme.cardBg} rounded-2xl p-4 ${theme.cardBorder} border ${theme.cardShadow} mb-4`}>
                {/* Profile header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg">
                      {profile?.username?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-white font-bold text-lg">{profile?.username || 'Player'}</h2>
                        <button
                          onClick={handleOpenUsernameEdit}
                          className="p-1 text-slate-500 hover:text-amber-400 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                      <p className="text-slate-500 text-xs">{profile?.games_played || 0} games played</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className={`p-2 text-slate-500 hover:text-amber-400 transition-all ${refreshing ? 'animate-spin' : ''}`}
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
                  const glowColor = tier?.glowColor || '#f59e0b';
                  
                  // Helper to convert hex to rgba
                  const hexToRgba = (hex, alpha) => {
                    if (!hex?.startsWith('#')) return `rgba(251, 191, 36, ${alpha})`;
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);
                    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                  };
                  
                  // Get contrasting background based on tier
                  const getTierBackground = () => {
                    const backgrounds = {
                      '#f59e0b': 'rgba(30, 20, 60, 0.95)',   // Grandmaster amber → dark purple
                      '#a855f7': 'rgba(20, 40, 40, 0.95)',   // Master purple → dark teal
                      '#3b82f6': 'rgba(40, 25, 20, 0.95)',   // Expert blue → dark brown
                      '#22d3ee': 'rgba(40, 20, 40, 0.95)',   // Advanced cyan → dark magenta
                      '#22c55e': 'rgba(40, 20, 35, 0.95)',   // Intermediate green → dark rose
                      '#38bdf8': 'rgba(35, 25, 45, 0.95)',   // Beginner sky → dark purple
                      '#2dd4bf': 'rgba(40, 25, 50, 0.95)',   // Novice teal → dark violet
                    };
                    return backgrounds[glowColor] || 'rgba(15, 23, 42, 0.95)';
                  };
                  
                  return (
                    <div 
                      className="flex items-center justify-between rounded-xl px-4 py-3 transition-all"
                      style={{
                        background: `linear-gradient(135deg, ${getTierBackground()} 0%, ${hexToRgba(glowColor, 0.15)} 100%)`,
                        border: `2px solid ${hexToRgba(glowColor, 0.4)}`,
                        boxShadow: `0 0 25px ${hexToRgba(glowColor, 0.25)}, inset 0 0 30px ${hexToRgba(glowColor, 0.05)}`
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

              {/* Find Match - Primary CTA */}
              <button
                onClick={handleFindMatch}
                className="w-full p-4 mb-4 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl font-black tracking-wider text-lg text-white hover:from-amber-400 hover:to-orange-500 transition-all shadow-[0_0_30px_rgba(251,191,36,0.5)] active:scale-[0.98]"
              >
                FIND MATCH
              </button>

              {/* Challenge a Player Section */}
              <div className="bg-slate-800/40 rounded-xl p-4 mb-4 border border-slate-700/50">
                {/* Header */}
                <button
                  onClick={() => {
                    setShowSearch(!showSearch);
                    if (!showSearch) {
                      setSearchQuery('');
                      setSearchResults([]);
                    }
                  }}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-2">
                    <Swords size={18} className="text-amber-400" />
                    <span className="text-sm font-medium text-slate-300">Challenge a Player</span>
                  </div>
                  <ChevronRight 
                    size={18} 
                    className={`text-slate-500 transition-transform ${showSearch ? 'rotate-90' : ''}`} 
                  />
                </button>
                
                {/* Expanded Content */}
                {showSearch && (
                  <div className="mt-3 space-y-4">
                    {/* Option 1: Search by Username */}
                    <div className="bg-slate-900/50 rounded-lg p-3 border border-cyan-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Search size={14} className="text-cyan-400" />
                        <span className="text-cyan-300 text-xs font-medium">SEARCH BY USERNAME OR NAME</span>
                      </div>
                      <p className="text-slate-500 text-xs mb-3">
                        Find and challenge players who already have an account
                      </p>
                      <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => handleSearch(e.target.value)}
                          placeholder="Search by username or name..."
                          className="w-full pl-9 pr-4 py-2.5 bg-slate-800 rounded-lg text-white text-sm border border-slate-700/50 focus:border-cyan-500/50 focus:outline-none placeholder:text-slate-600"
                        />
                        {searching && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                      
                      {/* Search Results */}
                      {searchResults.length > 0 && (
                        <div className="space-y-2 mt-3 max-h-48 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                          {searchResults.map(user => {
                            const alreadyInvited = sentInvites.some(i => i.to_user_id === user.id);
                            return (
                              <div
                                key={user.id}
                                className="flex items-center justify-between p-2.5 bg-slate-800/60 rounded-lg border border-slate-700/30"
                              >
                                <button
                                  onClick={() => {
                                    soundManager.playClickSound?.('select');
                                    setViewingPlayerId(user.id);
                                    setViewingPlayerData(user);
                                  }}
                                  className="flex items-center gap-2 hover:opacity-80"
                                >
                                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
                                    {user.username?.[0]?.toUpperCase() || '?'}
                                  </div>
                                  <div className="text-left">
                                    <div className="text-white text-sm font-medium">{user.username}</div>
                                    {user.display_name && user.display_name !== user.username && (
                                      <div className="text-slate-500 text-xs">{user.display_name}</div>
                                    )}
                                  </div>
                                </button>
                                <button
                                  onClick={() => handleSendInvite(user.id)}
                                  disabled={sendingInvite === user.id || alreadyInvited}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                                    alreadyInvited 
                                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                      : 'bg-amber-500 text-white hover:bg-amber-400'
                                  }`}
                                >
                                  {sendingInvite === user.id ? (
                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  ) : alreadyInvited ? (
                                    <>
                                      <Check size={12} />
                                      Invited
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
                      
                      {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                        <p className="text-slate-500 text-xs mt-3 text-center">No players found</p>
                      )}
                    </div>
                    
                    {/* Option 2: Send Invite Link */}
                    <div className="bg-slate-900/50 rounded-lg p-3 border border-amber-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Link size={14} className="text-amber-400" />
                        <span className="text-amber-300 text-xs font-medium">INVITE LINK</span>
                      </div>
                      <p className="text-slate-500 text-xs mb-3">
                        Create a link to share with friends. They'll join after signing up!
                      </p>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <UserPlus size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                          <input
                            type="text"
                            value={friendName}
                            onChange={(e) => setFriendName(e.target.value)}
                            placeholder="Friend's name (optional)"
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-800 rounded-lg text-white text-sm border border-slate-700/50 focus:border-amber-500/50 focus:outline-none placeholder:text-slate-600"
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
                          className="px-4 py-2.5 bg-amber-500 text-white rounded-lg font-medium text-sm hover:bg-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                      
                      {/* Created Links */}
                      {inviteLinks.length > 0 && (
                        <div className="space-y-2 mt-3">
                          {inviteLinks.map(invite => (
                            <div
                              key={invite.id}
                              className="p-2.5 bg-slate-800/60 rounded-lg border border-amber-500/20"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-white text-sm font-medium">
                                  {invite.recipientName || 'Friend'}
                                </span>
                                <button
                                  onClick={() => handleCancelInviteLink(invite)}
                                  disabled={processingInvite === invite.id}
                                  className="text-slate-500 hover:text-red-400 text-xs"
                                >
                                  {processingInvite === invite.id ? '...' : 'Cancel'}
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
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Received Invites */}
              {receivedInvites.length > 0 && (
                <div className="bg-green-900/20 rounded-xl p-4 mb-4 border border-green-500/30">
                  <h3 className="text-green-400 font-bold text-sm mb-3 flex items-center gap-2">
                    <Mail size={16} />
                    GAME INVITES ({receivedInvites.length})
                  </h3>
                  <div 
                    className="space-y-2 max-h-60 overflow-y-auto pr-1"
                    style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
                  >
                    {receivedInvites.map(invite => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg border border-green-500/20"
                      >
                        <button
                          onClick={() => {
                            soundManager.playClickSound?.('select');
                            setViewingPlayerId(invite.from_user?.id);
                            setViewingPlayerData(invite.from_user);
                          }}
                          className="flex items-center gap-3 hover:opacity-80"
                        >
                          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold">
                            {invite.from_user?.username?.[0]?.toUpperCase() || '?'}
                          </div>
                          <span className="text-white text-sm font-medium">{invite.from_user?.username}</span>
                        </button>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDeclineInvite(invite)}
                            disabled={processingInvite === invite.id}
                            className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-xs hover:bg-slate-600 transition-colors"
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => handleAcceptInvite(invite)}
                            disabled={processingInvite === invite.id}
                            className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-400 transition-all flex items-center gap-1"
                          >
                            {processingInvite === invite.id ? (
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <Check size={12} />
                                Accept
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sent Invites */}
              {sentInvites.length > 0 && (
                <div className="bg-slate-800/40 rounded-xl p-4 mb-4 border border-slate-700/50">
                  <h3 className="text-slate-400 font-bold text-sm mb-3 flex items-center gap-2">
                    <Clock size={16} />
                    PENDING INVITES ({sentInvites.length})
                  </h3>
                  <div className="space-y-2">
                    {sentInvites.map(invite => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg border border-slate-700/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs font-bold">
                            {invite.to_user?.username?.[0]?.toUpperCase() || '?'}
                          </div>
                          <span className="text-slate-300 text-sm">{invite.to_user?.username}</span>
                        </div>
                        <button
                          onClick={() => handleCancelInvite(invite)}
                          disabled={processingInvite === invite.id}
                          className="px-3 py-1.5 bg-slate-700 text-slate-400 rounded-lg text-xs hover:bg-slate-600 hover:text-slate-300 transition-colors"
                        >
                          {processingInvite === invite.id ? '...' : 'Cancel'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Games Button */}
              {(() => {
                const myTurnCount = activeGames.filter(g => g && gameSyncService.isPlayerTurn(g, profile?.id)).length;
                const waitingCount = activeGames.length - myTurnCount;
                
                if (activeGames.length === 0) return null;
                
                return (
                  <button
                    onClick={() => {
                      soundManager.playButtonClick();
                      setShowActiveGames(true);
                    }}
                    className={`w-full p-4 rounded-xl flex items-center justify-between border transition-all group mb-4 ${
                      myTurnCount > 0
                        ? 'bg-gradient-to-r from-green-900/40 to-emerald-900/40 border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.2)]'
                        : 'bg-slate-800/40 border-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        myTurnCount > 0 ? 'bg-green-500/30' : 'bg-slate-700/50'
                      }`}>
                        <Swords size={20} className={myTurnCount > 0 ? 'text-green-400' : 'text-slate-400'} />
                      </div>
                      <div className="text-left">
                        <div className="text-amber-300 font-medium text-sm">Active Games ({activeGames.length})</div>
                        <div className="text-xs flex items-center gap-2">
                          {myTurnCount > 0 && (
                            <span className="text-green-400 font-medium">{myTurnCount} your turn</span>
                          )}
                          {myTurnCount > 0 && waitingCount > 0 && (
                            <span className="text-slate-600">•</span>
                          )}
                          {waitingCount > 0 && (
                            <span className="text-slate-500">{waitingCount} waiting</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-amber-500/60 group-hover:text-amber-400 transition-colors" />
                  </button>
                );
              })()}

              {/* Recent Games Button */}
              {recentGames.length > 0 && (
                <button
                  onClick={() => {
                    soundManager.playButtonClick();
                    setShowRecentGames(true);
                  }}
                  className="w-full p-4 bg-slate-800/40 rounded-xl flex items-center justify-between border border-slate-700/50 hover:border-slate-600 transition-all group mb-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center group-hover:bg-slate-600/50 transition-colors">
                      <History size={20} className="text-slate-400" />
                    </div>
                    <div className="text-left">
                      <div className="text-slate-300 font-medium text-sm">Recent Games</div>
                      <div className="text-slate-500 text-xs">{recentGames.length} completed {recentGames.length === 1 ? 'game' : 'games'}</div>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                </button>
              )}

              {/* Quick Links */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Friends */}
                <button
                  onClick={() => {
                    soundManager.playButtonClick();
                    setShowFriendsList(true);
                  }}
                  className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50 hover:border-purple-500/50 transition-all flex flex-col items-center gap-2 group relative"
                >
                  <Users size={24} className="text-purple-400" />
                  <span className="text-slate-300 text-sm font-medium group-hover:text-purple-300 transition-colors">Friends</span>
                  {pendingFriendRequests > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {pendingFriendRequests}
                    </div>
                  )}
                </button>

                {/* Achievements */}
                <button
                  onClick={() => {
                    soundManager.playButtonClick();
                    setShowAchievements(true);
                  }}
                  className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50 hover:border-amber-500/50 transition-all flex flex-col items-center gap-2 group"
                >
                  <Award size={24} className="text-amber-400" />
                  <span className="text-slate-300 text-sm font-medium group-hover:text-amber-300 transition-colors">Achievements</span>
                </button>

                {/* Spectate */}
                <button
                  onClick={() => {
                    soundManager.playButtonClick();
                    setShowSpectateList(true);
                  }}
                  className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50 hover:border-cyan-500/50 transition-all flex flex-col items-center gap-2 group"
                >
                  <Eye size={24} className="text-cyan-400" />
                  <span className="text-slate-300 text-sm font-medium group-hover:text-cyan-300 transition-colors">Spectate</span>
                </button>

                {/* Leaderboard */}
                <button
                  onClick={() => {
                    soundManager.playButtonClick();
                    onViewLeaderboard?.();
                  }}
                  className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50 hover:border-amber-500/50 transition-all flex flex-col items-center gap-2 group"
                >
                  <Trophy size={24} className="text-amber-400" />
                  <span className="text-slate-300 text-sm font-medium group-hover:text-amber-300 transition-colors">Leaderboard</span>
                </button>
              </div>

              {/* Notification prompt */}
              {showNotificationPrompt && (
                <NotificationPrompt
                  onEnable={async () => {
                    const granted = await notificationService.requestPermission();
                    setNotificationsEnabled(granted);
                    setShowNotificationPrompt(false);
                  }}
                  onDismiss={() => {
                    notificationService.dismissPrompt();
                    setShowNotificationPrompt(false);
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Active Game Prompt */}
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

      {/* Username Edit Modal */}
      {showUsernameEdit && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-xl max-w-sm w-full p-5 border border-amber-500/30">
            <h3 className="text-lg font-bold text-amber-300 mb-4">Edit Username</h3>
            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => {
                    setNewUsername(e.target.value);
                    handleCheckUsername(e.target.value);
                  }}
                  placeholder="Enter new username"
                  className="w-full px-4 py-3 bg-slate-800 rounded-lg text-white border border-slate-700 focus:border-amber-500 focus:outline-none"
                  maxLength={20}
                />
                {usernameError && (
                  <p className="text-red-400 text-xs mt-1">{usernameError}</p>
                )}
                {checkingUsername && (
                  <p className="text-slate-400 text-xs mt-1">Checking availability...</p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUsernameEdit(false)}
                  className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveUsername}
                  disabled={!!usernameError || checkingUsername || savingUsername || !newUsername}
                  className="flex-1 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {savingUsername ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rating Info Modal */}
      {showRatingInfo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-xl max-w-sm w-full max-h-[80vh] overflow-hidden border border-amber-500/30">
            <div className="p-4 border-b border-amber-500/20 flex items-center justify-between">
              <h3 className="text-lg font-bold text-amber-300">Rating System</h3>
              <button
                onClick={() => setShowRatingInfo(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]" style={{ WebkitOverflowScrolling: 'touch' }}>
              <p className="text-slate-300 text-sm mb-4">
                Your rating is calculated using the ELO system. Win against higher-rated players to gain more points!
              </p>
              <div className="space-y-2">
                {ratingService.getAllTiers().map(tier => (
                  <div
                    key={tier.name}
                    className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50"
                  >
                    <TierIcon shape={tier.shape} glowColor={tier.glowColor} size="small" />
                    <div className="flex-1">
                      <span className="text-white text-sm font-medium">{tier.name}</span>
                      <span className="text-slate-500 text-xs ml-2">{tier.minRating}+ ELO</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Games Modal */}
      {showActiveGames && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden border border-amber-500/30 shadow-[0_0_50px_rgba(251,191,36,0.2)]">
            {/* Header */}
            <div className="p-4 border-b border-amber-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Swords size={24} className="text-amber-400" />
                <h2 className="text-lg font-bold text-amber-300">Active Games</h2>
              </div>
              <button
                onClick={() => setShowActiveGames(false)}
                className="p-1 text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Games List */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {activeGames.length === 0 ? (
                <div className="text-center py-8">
                  <Swords className="mx-auto text-slate-600 mb-2" size={40} />
                  <p className="text-slate-400">No active games</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeGames.filter(g => g).map(game => {
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
                          <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                            {opponentName?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="text-left">
                            <div className="text-white font-medium">vs {opponentName}</div>
                            <div className={`text-sm ${isMyTurn ? 'text-amber-300 font-medium' : 'text-slate-500'}`}>
                              {isMyTurn ? '🎮 Your turn!' : 'Waiting for opponent...'}
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={20} className={`${isMyTurn ? 'text-amber-400' : 'text-slate-600'}`} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Recent Games Modal - UPDATED WITH CLICKABLE OPPONENTS */}
      {showRecentGames && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden border border-amber-500/30 shadow-[0_0_50px_rgba(251,191,36,0.2)]">
            {/* Header */}
            <div className="p-4 border-b border-amber-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History size={24} className="text-amber-400" />
                <h2 className="text-lg font-bold text-amber-300">Recent Games</h2>
              </div>
              <button
                onClick={() => setShowRecentGames(false)}
                className="p-1 text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Games List */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {recentGames.length === 0 ? (
                <div className="text-center py-8">
                  <History className="mx-auto text-slate-600 mb-2" size={40} />
                  <p className="text-slate-400">No recent games</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentGames.filter(g => g).map(game => {
                    const result = getGameResult(game);
                    const opponentName = getOpponentName(game);
                    const opponent = getOpponentData(game);
                    
                    return (
                      <div
                        key={game.id}
                        className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/30 hover:border-slate-600/50 transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          {/* CLICKABLE OPPONENT */}
                          <button
                            onClick={() => {
                              soundManager.playClickSound?.('select');
                              setShowRecentGames(false);
                              setViewingPlayerId(opponent.id);
                              setViewingPlayerData(opponent.data);
                            }}
                            className="flex items-center gap-3 hover:bg-slate-700/30 rounded-lg p-1 -m-1 transition-colors group"
                          >
                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold group-hover:bg-slate-600 transition-colors">
                              {opponentName?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div className="text-left">
                              <div className="text-slate-200 font-medium group-hover:text-amber-300 transition-colors flex items-center gap-1">
                                vs {opponentName}
                                <ChevronRight size={14} className="text-slate-500 group-hover:text-amber-400 transition-colors" />
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
                        
                        <div className="flex justify-end">
                          <button
                            onClick={() => {
                              soundManager.playButtonClick();
                              setShowRecentGames(false);
                              onViewReplay?.(game.id);
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-pink-500/20 text-pink-300 rounded-lg hover:bg-pink-500/30 transition-colors text-sm"
                          >
                            <PlayCircle size={16} />
                            Watch Replay
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
    </div>
  );
};

export default OnlineMenu;
