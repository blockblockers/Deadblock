// Online Menu - Hub for online features
import { useState, useEffect, useCallback, useRef } from 'react';
import { Swords, Trophy, User, LogOut, History, ChevronRight, X, Zap, Search, UserPlus, Mail, Check, Clock, Send, Bell, Link, Copy, Share2, Users, Eye, Award, PlayCircle, RefreshCw, Pencil, Loader, HelpCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { gameSyncService } from '../services/gameSync';
import { inviteService } from '../services/inviteService';
import { notificationService } from '../services/notificationService';
import { friendsService } from '../services/friendsService';
import { ratingService } from '../services/ratingService';
import { matchmakingService } from '../services/matchmaking';
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
import FloatingPieces from './FloatingPieces';

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

// NEW: Get full opponent data including ID for profile viewing
const getOpponentData = (game) => {
  if (!game || !profile?.id) return { id: null, username: 'Unknown', data: null };
  if (game.player1_id === profile.id) {
    return { 
      id: game.player2_id,
      username: game.player2?.username || 'Unknown',
      data: game.player2
    };
  }
  return { 
    id: game.player1_id,
    username: game.player1?.username || 'Unknown',
    data: game.player1
  };
};
*/

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
  const [lobbyCount, setLobbyCount] = useState(0);

  // Initialize notifications
  useEffect(() => {
    const initNotifications = async () => {
      await notificationService.init();
      setNotificationsEnabled(notificationService.isEnabled());
      setShowNotificationPrompt(notificationService.shouldPrompt());
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
      console.log('Lobby count unavailable');
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
      // inviteService now returns properly formatted data with recipientName and inviteLink
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
    soundManager.playButtonClick();
  };

  const handleUsernameChange = async (value) => {
    setNewUsername(value);
    setUsernameError('');
    
    // Validate format
    if (value.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return;
    }
    if (value.length > 20) {
      setUsernameError('Username must be 20 characters or less');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      setUsernameError('Only letters, numbers, and underscores allowed');
      return;
    }
    
    // Check availability (debounced would be better, but keeping it simple)
    if (value.toLowerCase() !== profile?.username?.toLowerCase()) {
      setCheckingUsername(true);
      const { available, error } = await checkUsernameAvailable(value);
      setCheckingUsername(false);
      
      if (error) {
        setUsernameError('Error checking username');
      } else if (!available) {
        setUsernameError('Username is already taken');
      }
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
      setUsernameError(error.message || 'Failed to update username');
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

  const getOpponentName = (game) => {
    if (!game) return 'Unknown';
    if (game.player1_id === profile?.id) {
      return game.player2?.username || 'Unknown';
    }
    return game.player1?.username || 'Unknown';
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
  if (!game || !profile?.id) return { id: null, username: 'Unknown' };
  if (game.player1_id === profile.id) {
    return { 
      id: game.player2_id,
      username: game.player2?.username || 'Unknown',
      data: game.player2
    };
  }
  return { 
    id: game.player1_id,
    username: game.player1?.username || 'Unknown',
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

      {/* Floating pieces background animation */}
      <FloatingPieces count={15} theme="online" minOpacity={0.2} maxOpacity={0.45} />

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

      {/* Content */}
      <div className="relative flex flex-col items-center px-4 pt-8 pb-24"
        style={{ 
          minHeight: '100%',
          paddingBottom: 'max(96px, calc(env(safe-area-inset-bottom) + 96px))'
        }}
      >
        <div className="w-full max-w-md">
          
          {/* Title - Centered and Enlarged */}
          <div className="text-center mb-8">
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
                  {(profile?.username)?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-white font-bold text-lg">{profile?.username || 'Player'}</h2>
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
<div className="flex gap-2 mb-4">
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
      background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(30, 41, 59, 0.8) 100%)',
      borderColor: 'rgba(168, 85, 247, 0.3)',
      boxShadow: '0 0 15px rgba(168, 85, 247, 0.1), inset 0 1px 0 rgba(255,255,255,0.05)'
    }}
  >
    <Award size={14} className="text-purple-400 group-hover:scale-110 transition-transform" />
    <span className="text-slate-300 group-hover:text-purple-300 transition-colors">Awards</span>
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
  <button
    onClick={() => { soundManager.playButtonClick(); setShowSpectateList(true); }}
    className="flex-1 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 border group"
    style={{
      background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(30, 41, 59, 0.8) 100%)',
      borderColor: 'rgba(34, 197, 94, 0.3)',
      boxShadow: '0 0 15px rgba(34, 197, 94, 0.1), inset 0 1px 0 rgba(255,255,255,0.05)'
    }}
  >
    <Eye size={14} className="text-green-400 group-hover:scale-110 transition-transform" />
    <span className="text-slate-300 group-hover:text-green-300 transition-colors">Watch</span>
  </button>
</div>


           {/* Find Match - Compact with Lobby Count */}
<button
  onClick={handleFindMatch}
  className="w-full p-3 mb-4 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl font-bold tracking-wide text-white hover:from-amber-400 hover:to-orange-500 transition-all shadow-[0_0_25px_rgba(251,191,36,0.4)] active:scale-[0.98] flex items-center justify-center gap-3"
>
  <Swords size={20} />
  <span>FIND MATCH</span>
  {lobbyCount > 0 && (
    <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-normal">
      {lobbyCount} in queue
    </span>
  )}
</button>

            {/* Challenge a Player Section */}
          <div 
  className="bg-slate-800/40 rounded-xl p-4 mb-4 border border-slate-700/50"
  style={{ 
    // Ensure this section doesn't break scroll
    position: 'relative',
    zIndex: 1
  }}
>

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
                      <span className="text-cyan-300 text-xs font-medium">SEARCH BY USERNAME</span>
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
                        placeholder="Enter username..."
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
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
                                  {user.username?.[0]?.toUpperCase() || '?'}
                                </div>
                                <div>
                                  <div className="text-white text-sm font-medium">{user.username}</div>
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
                  <div className="bg-slate-900/50 rounded-lg p-3 border border-amber-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Link size={14} className="text-amber-400" />
                      <span className="text-amber-300 text-xs font-medium">INVITE VIA LINK</span>
                    </div>
                    <p className="text-slate-500 text-xs mb-3">
                      Create a shareable link for friends who don't have an account yet. They'll join after signing up!
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

                    {/* Active Invite Links */}
                    {inviteLinks.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-700/50">
                        <p className="text-slate-400 text-xs mb-2 font-medium">Your active invite links:</p>
                        <div className="space-y-2 max-h-40 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
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
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold">
                          {invite.from_user?.username?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="text-white text-sm font-medium">{invite.from_user?.username || 'Unknown'}</div>
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
                  ))}
                </div>
              </div>
            )}

            {/* Sent Invites (Pending) */}
            {sentInvites.length > 0 && (
              <div className="bg-slate-800/30 rounded-xl p-4 mb-4 border border-slate-700/50">
                <h3 className="text-slate-400 font-bold text-sm mb-3 flex items-center gap-2">
                  <Clock size={16} />
                  PENDING INVITES ({sentInvites.length})
                </h3>
                <div 
                  className="space-y-2 max-h-40 overflow-y-auto pr-1"
                  style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
                >
                  {sentInvites.map(invite => {
                    // Get the best display name available
                    const displayName = invite.to_user?.username 
                      || invite.to_user?.display_name 
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

            {/* Leaderboard Button */}
            <button
              onClick={() => {
                soundManager.playButtonClick();
                onViewLeaderboard();
              }}
              className="w-full p-3 mb-4 bg-slate-800/60 rounded-xl text-slate-300 hover:bg-slate-700/60 transition-all flex items-center justify-center gap-2 border border-slate-700/50"
            >
              <Trophy size={18} className="text-amber-400" />
              <span className="text-sm font-medium">View Leaderboard</span>
            </button>

            {/* Active Games Button */}
            {activeGames.length > 0 && (() => {
              const myTurnCount = activeGames.filter(g => gameSyncService.isPlayerTurn(g, profile?.id)).length;
              const waitingCount = activeGames.length - myTurnCount;
              return (
                <button
                  onClick={() => {
                    soundManager.playButtonClick();
                    setShowActiveGames(true);
                  }}
                  className="w-full p-4 mb-4 bg-amber-900/20 rounded-xl flex items-center justify-between border border-amber-500/30 hover:border-amber-400/50 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/30 transition-colors">
                      <Swords size={20} className="text-amber-400" />
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
                className="w-full p-4 bg-slate-800/40 rounded-xl flex items-center justify-between border border-slate-700/50 hover:border-slate-600 transition-all group"
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

            {/* Back button - Themed */}
            <button
              onClick={handleBack}
              className="w-full mt-4 py-3 px-4 rounded-xl font-bold text-base text-slate-300 bg-slate-800/70 hover:bg-slate-700/70 transition-all border border-slate-600/50 hover:border-slate-500/50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(100,116,139,0.2)]"
            >
              <ArrowLeft size={18} />
              BACK TO MENU
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
              // Accept the game invite
              const { data, error } = await inviteService.acceptInviteById(notification.id);
              if (!error && data?.game_id) {
                soundManager.playSound('success');
                onResumeGame?.({ id: data.game_id });
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
                <h2 className="text-lg font-bold text-amber-300">Rating System</h2>
                <button
                  onClick={() => setShowRatingInfo(false)}
                  className="absolute right-0 p-1 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <p className="text-sm text-slate-400">
                Your ELO rating changes based on match results. Beat higher-rated players to gain more points!
              </p>
              
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
                  New players start at 1000 ELO. Win against stronger opponents for bigger gains, lose against weaker opponents for bigger losses.
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
      
      {/* Recent Games Modal */}
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
  const opponent = getOpponentData(game);  // Changed from getOpponentName
  return (
    <div
      key={game.id}
      className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/30 hover:border-slate-600/50 transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        {/* CHANGED: Wrapped opponent info in a clickable button */}
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
            {opponent.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div className="text-slate-200 font-medium flex items-center gap-1">
              vs {opponent.username}
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
