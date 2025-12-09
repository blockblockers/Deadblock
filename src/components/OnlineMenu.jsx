// Online Menu - Hub for online features
import { useState, useEffect, useCallback } from 'react';
import { Swords, Trophy, User, LogOut, History, ChevronRight, X, Zap, Search, UserPlus, Mail, Check, Clock, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { gameSyncService } from '../services/gameSync';
import { inviteService } from '../services/inviteService';
import NeonTitle from './NeonTitle';
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
                  {profile?.username?.[0]?.toUpperCase() || '?'}
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
  onBack 
}) => {
  const { profile, signOut } = useAuth();
  const { needsScroll } = useResponsiveLayout(700);
  const [activeGames, setActiveGames] = useState([]);
  const [recentGames, setRecentGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showActivePrompt, setShowActivePrompt] = useState(true);
  
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

  // Load games and invites
  useEffect(() => {
    loadGames();
    loadInvites();
  }, [profile?.id]);
  
  // Subscribe to invite updates
  useEffect(() => {
    if (!profile?.id) return;
    
    const subscription = inviteService.subscribeToInvites(
      profile.id,
      // On new invite received
      async () => {
        await loadInvites();
        soundManager.playButtonClick();
      },
      // On invite updated
      async (updatedInvite) => {
        await loadInvites();
        // If an invite was accepted and created a game, refresh games
        if (updatedInvite.status === 'accepted' && updatedInvite.game_id) {
          await loadGames();
        }
      }
    );
    
    return () => {
      inviteService.unsubscribeFromInvites(subscription);
    };
  }, [profile?.id]);

  const loadInvites = async () => {
    if (!profile?.id) return;
    
    try {
      const [received, sent] = await Promise.all([
        inviteService.getReceivedInvites(profile.id),
        inviteService.getSentInvites(profile.id)
      ]);
      
      setReceivedInvites(received.data || []);
      setSentInvites(sent.data || []);
    } catch (err) {
      console.error('Error loading invites:', err);
    }
  };

  const loadGames = async () => {
    if (!profile?.id) {
      console.log('OnlineMenu.loadGames: No profile ID');
      setLoading(false);
      return;
    }

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
    
    setLoading(false);
  };

  const handleSignOut = async () => {
    soundManager.playButtonClick();
    await signOut();
    onBack();
  };

  const handleFindMatch = () => {
    soundManager.playButtonClick();
    onFindMatch();
  };

  const handleBack = () => {
    soundManager.playButtonClick();
    onBack();
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
    
    const { data, error } = await inviteService.acceptInvite(invite.id, profile.id);
    
    if (error) {
      console.error('Error accepting invite:', error);
      alert(error.message || 'Failed to accept invite');
    } else if (data?.game) {
      soundManager.playSound('win');
      await loadGames();
      onResumeGame(data.game);
    }
    
    setProcessingInvite(null);
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

  const getOpponentName = (game) => {
    if (!game) return 'Unknown';
    if (game.player1_id === profile?.id) {
      return game.player2?.username || 'Unknown';
    }
    return game.player1?.username || 'Unknown';
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
      className={needsScroll ? 'min-h-screen bg-slate-950' : 'h-screen bg-slate-950 overflow-hidden'}
      style={needsScroll ? { overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' } : {}}
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
      <div className={`relative ${needsScroll ? 'min-h-screen' : 'h-full'} flex flex-col items-center justify-center px-4 ${needsScroll ? 'py-8' : 'py-4'}`}>
        <div className="w-full max-w-md">
          
          {/* Title - Centered and Large */}
          <div className="text-center mb-6">
            <NeonTitle size="large" />
            <p className="text-amber-400/80 text-sm mt-2 font-medium">Online Multiplayer</p>
          </div>

          {/* Main Card */}
          <div className={`${theme.cardBg} backdrop-blur-md rounded-2xl p-5 border ${theme.cardBorder} ${theme.cardShadow}`}>
            
            {/* User Stats Card */}
            <div className="bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-700/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-amber-500/30">
                  {profile?.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1">
                  <h2 className="text-white font-bold text-lg">{profile?.username || 'Player'}</h2>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-amber-400 font-medium">⭐ {profile?.rating || 1000}</span>
                    <span className="text-slate-500">{profile?.games_played || 0} games</span>
                    <span className="text-green-400">{profile?.games_won || 0} wins</span>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                  title="Sign Out"
                >
                  <LogOut size={20} />
                </button>
              </div>
            </div>

            {/* Find Match - Primary CTA */}
            <button
              onClick={handleFindMatch}
              className="w-full p-4 mb-4 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl font-black tracking-wider text-lg text-white hover:from-amber-400 hover:to-orange-500 transition-all shadow-[0_0_30px_rgba(251,191,36,0.5)] active:scale-[0.98]"
            >
              FIND MATCH
            </button>

            {/* Friend Search / Invite Section */}
            <div className="bg-slate-800/40 rounded-xl p-4 mb-4 border border-slate-700/50">
              {/* Toggle Search */}
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
                  <UserPlus size={18} className="text-amber-400" />
                  <span className="text-sm font-medium text-slate-300">Invite a Friend</span>
                </div>
                <ChevronRight 
                  size={18} 
                  className={`text-slate-500 transition-transform ${showSearch ? 'rotate-90' : ''}`} 
                />
              </button>
              
              {/* Search Input & Results */}
              {showSearch && (
                <div className="mt-3 space-y-3">
                  {/* Search Input */}
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="Search by username..."
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-900/80 rounded-lg text-white text-sm border border-slate-700/50 focus:border-amber-500/50 focus:outline-none placeholder:text-slate-600"
                    />
                    {searching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  
                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {searchResults.map(user => {
                        const alreadyInvited = sentInvites.some(i => i.to_user_id === user.id);
                        return (
                          <div
                            key={user.id}
                            className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-lg border border-slate-700/30"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
                                {user.username?.[0]?.toUpperCase() || '?'}
                              </div>
                              <div>
                                <div className="text-white text-sm font-medium">{user.username}</div>
                                <div className="text-amber-400/70 text-xs">⭐ {user.rating || 1000}</div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleSendInvite(user.id)}
                              disabled={sendingInvite === user.id || alreadyInvited}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                                alreadyInvited
                                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                  : 'bg-amber-500 text-white hover:bg-amber-400 active:scale-95'
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
                                  Invite
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
                    <p className="text-slate-500 text-xs text-center py-2">No players found</p>
                  )}
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
                <div className="space-y-2">
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
                <div className="space-y-2">
                  {sentInvites.map(invite => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between p-2.5 bg-slate-900/40 rounded-lg border border-slate-700/30"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs">
                          {invite.to_user?.username?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="text-slate-400 text-sm">{invite.to_user?.username || 'Unknown'}</div>
                      </div>
                      <button
                        onClick={() => handleCancelInvite(invite)}
                        disabled={processingInvite === invite.id}
                        className="text-xs text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Secondary actions */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => {
                  soundManager.playButtonClick();
                  onViewLeaderboard();
                }}
                className="p-3 bg-slate-800/70 rounded-xl text-slate-300 hover:bg-slate-700/70 transition-all flex items-center justify-center gap-2 border border-slate-700/50"
              >
                <Trophy size={18} className="text-amber-400" />
                <span className="text-sm font-medium">Leaderboard</span>
              </button>
              <button
                onClick={() => {
                  soundManager.playButtonClick();
                  onViewProfile();
                }}
                className="p-3 bg-slate-800/70 rounded-xl text-slate-300 hover:bg-slate-700/70 transition-all flex items-center justify-center gap-2 border border-slate-700/50"
              >
                <User size={18} className="text-amber-400" />
                <span className="text-sm font-medium">Profile</span>
              </button>
            </div>

            {/* Active Games */}
            {activeGames.length > 0 && (
              <div className="bg-amber-900/20 rounded-xl p-4 mb-4 border border-amber-500/30">
                <h3 className="text-amber-400 font-bold text-sm mb-3 flex items-center gap-2">
                  <Swords size={16} />
                  ACTIVE GAMES ({activeGames.length})
                </h3>
                <div className="space-y-2">
                  {activeGames.filter(g => g).map(game => {
                    const isMyTurn = gameSyncService.isPlayerTurn(game, profile?.id);
                    const opponentName = getOpponentName(game);
                    return (
                      <button
                        key={game.id}
                        onClick={() => {
                          soundManager.playButtonClick();
                          onResumeGame(game);
                        }}
                        className={`w-full p-3 rounded-lg flex items-center justify-between transition-all group ${
                          isMyTurn 
                            ? 'bg-gradient-to-r from-amber-600/30 to-orange-600/30 border border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.2)]' 
                            : 'bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
                            {opponentName?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="text-left">
                            <div className="text-white text-sm font-medium">vs {opponentName}</div>
                            <div className={`text-xs ${isMyTurn ? 'text-amber-300 font-medium' : 'text-slate-500'}`}>
                              {isMyTurn ? '🎮 Your turn!' : 'Waiting for opponent...'}
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={18} className={`transition-colors ${
                          isMyTurn ? 'text-amber-400' : 'text-slate-600 group-hover:text-amber-400'
                        }`} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Games */}
            {recentGames.length > 0 && (
              <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                <h3 className="text-slate-400 font-bold text-sm mb-3 flex items-center gap-2">
                  <History size={16} />
                  RECENT GAMES
                </h3>
                <div className="space-y-2">
                  {recentGames.slice(0, 3).filter(g => g).map(game => {
                    const result = getGameResult(game);
                    const opponentName = getOpponentName(game);
                    return (
                      <div
                        key={game.id}
                        className="p-3 bg-slate-800/50 rounded-lg flex items-center justify-between border border-slate-700/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-xs font-bold">
                            {opponentName?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="text-left">
                            <div className="text-slate-300 text-sm">vs {opponentName}</div>
                            <div className="text-slate-600 text-xs">
                              {game.created_at ? new Date(game.created_at).toLocaleDateString() : 'Unknown date'}
                            </div>
                          </div>
                        </div>
                        <span className={`text-sm font-bold ${result.color}`}>
                          {result.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Back button */}
            <button
              onClick={handleBack}
              className="w-full mt-4 py-2.5 text-slate-400 hover:text-slate-200 text-sm transition-colors"
            >
              ← Back to Menu
            </button>
          </div>
        </div>
        {needsScroll && <div className="h-8 flex-shrink-0" />}
      </div>
    </div>
  );
};

export default OnlineMenu;
