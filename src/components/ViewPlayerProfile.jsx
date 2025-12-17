// View Player Profile - View another player's public stats
// FIXES:
// 1. Uses username priority
// 2. Enhanced tier-based theming
// 3. Match history with clickable opponents
// 4. Proper stats loading
import { useState, useEffect } from 'react';
import { X, User, Trophy, Target, Zap, Gamepad2, TrendingUp, Swords, Clock, Send, UserPlus, Crown, Award, Star, Calendar, ChevronRight } from 'lucide-react';
import { getRankInfo } from '../utils/rankUtils';
import { friendsService } from '../services/friendsService';
import { inviteService } from '../services/inviteService';
import { gameSyncService } from '../services/gameSync';
import TierIcon from './TierIcon';
import { soundManager } from '../utils/soundManager';

// Supabase direct fetch config
const AUTH_KEY = 'sb-oyeibyrednwlolmsjlwk-auth-token';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://oyeibyrednwlolmsjlwk.supabase.co';
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Helper to get auth headers
const getAuthHeaders = () => {
  try {
    const authData = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
    if (!authData?.access_token || !ANON_KEY) return null;
    return {
      'Authorization': `Bearer ${authData.access_token}`,
      'apikey': ANON_KEY,
      'Content-Type': 'application/json'
    };
  } catch (e) {
    return null;
  }
};

// Direct fetch helper
const dbSelect = async (table, options = {}) => {
  const headers = getAuthHeaders();
  if (!headers) return { data: null, error: 'Not authenticated' };
  
  let url = `${SUPABASE_URL}/rest/v1/${table}?`;
  if (options.select) url += `select=${encodeURIComponent(options.select)}&`;
  if (options.eq) {
    Object.entries(options.eq).forEach(([key, value]) => {
      url += `${key}=eq.${value}&`;
    });
  }
  if (options.or) url += `or=${encodeURIComponent(options.or)}&`;
  if (options.order) url += `order=${options.order}&`;
  if (options.limit) url += `limit=${options.limit}&`;
  
  try {
    const response = await fetch(url, { 
      headers: options.single 
        ? { ...headers, 'Accept': 'application/vnd.pgrst.object+json' }
        : headers 
    });
    if (!response.ok) return { data: null, error: 'Fetch failed' };
    const data = await response.json();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
};

// Helper to convert hex to rgba
const hexToRgba = (hex, alpha) => {
  if (!hex || !hex.startsWith('#')) return `rgba(34, 211, 238, ${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Get contrasting background for tier
const getTierBackground = (glowColor) => {
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

const ViewPlayerProfile = ({ playerId, playerData, onClose, onInviteToGame, currentUserId, onViewPlayer }) => {
  const [profile, setProfile] = useState(playerData || null);
  const [playerStats, setPlayerStats] = useState(null);
  const [recentGames, setRecentGames] = useState([]);
  const [achievementStats, setAchievementStats] = useState(null);
  const [loading, setLoading] = useState(!playerData);
  const [friendStatus, setFriendStatus] = useState(null);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [invitingToGame, setInvitingToGame] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteError, setInviteError] = useState(null);

  // Get tier info for theming
  const rankInfo = profile ? getRankInfo(profile.rating || 1000) : null;
  const glowColor = rankInfo?.glowColor || '#22d3ee';

  useEffect(() => {
    if (playerId) {
      loadPlayerData();
    }
  }, [playerId]);

  const loadPlayerData = async () => {
    setLoading(true);
    
    try {
      // Load profile if not provided
      let profileData = playerData;
      if (!profileData) {
        const { data } = await dbSelect('profiles', {
          select: 'id,username,display_name,avatar_url,rating,games_won,games_played,created_at',
          eq: { id: playerId },
          single: true
        });
        profileData = data;
      }
      
      if (profileData) {
        setProfile(profileData);
      }

      // Load player_stats for detailed stats
      try {
        const { data: stats } = await dbSelect('player_stats', {
          select: '*',
          eq: { user_id: playerId },
          single: true
        });
        if (stats) {
          setPlayerStats(stats);
        }
      } catch (e) {
        console.log('Player stats not available');
      }

      // Load recent games for match history
      try {
        const { data: games } = await dbSelect('games', {
          select: 'id,player1_id,player2_id,winner_id,status,created_at,player1:profiles!games_player1_id_fkey(id,username,display_name,rating),player2:profiles!games_player2_id_fkey(id,username,display_name,rating)',
          or: `player1_id.eq.${playerId},player2_id.eq.${playerId}`,
          order: 'created_at.desc',
          limit: 10
        });
        if (games) {
          setRecentGames(games.filter(g => g.status === 'completed'));
        }
      } catch (e) {
        console.log('Recent games not available');
      }

      // Load achievement stats
      try {
        const { data: achieveData } = await dbSelect('achievement_stats', {
          select: '*',
          eq: { user_id: playerId },
          single: true
        });
        if (achieveData) {
          setAchievementStats(achieveData);
        }
      } catch (e) {
        console.log('Achievement stats not available');
      }

      // Check friend status
      if (currentUserId && currentUserId !== playerId) {
        try {
          const status = await friendsService.getFriendshipStatus(currentUserId, playerId);
          setFriendStatus(status);
        } catch (e) {
          console.log('Friend status not available');
        }
      }
    } catch (err) {
      console.error('Error loading player data:', err);
    }
    
    setLoading(false);
  };

  const handleSendFriendRequest = async () => {
    if (!currentUserId || sendingRequest) return;
    
    setSendingRequest(true);
    soundManager.playButtonClick();
    
    try {
      const { error } = await friendsService.sendFriendRequest(currentUserId, playerId);
      if (!error) {
        setFriendStatus('pending_sent');
        soundManager.playSound('success');
      }
    } catch (err) {
      console.error('Error sending friend request:', err);
    }
    
    setSendingRequest(false);
  };

  const handleInviteToGame = async () => {
    if (!currentUserId || invitingToGame) return;
    
    setInvitingToGame(true);
    setInviteError(null);
    soundManager.playButtonClick();
    
    try {
      // Use parent callback if provided
      if (onInviteToGame) {
        await onInviteToGame(profile);
        setInviteSent(true);
      } else {
        // Direct invite
        const { error, data } = await inviteService.sendInvite(currentUserId, playerId);
        if (error) {
          if (error.includes('already') || error.includes('exists')) {
            setInviteError('Invite already sent');
          } else {
            setInviteError(error);
          }
        } else {
          setInviteSent(true);
          soundManager.playSound('success');
          
          // Check if game was created (mutual invite)
          if (data?.game_id) {
            setTimeout(() => onClose?.(), 1000);
          }
        }
      }
    } catch (err) {
      setInviteError(err.message || 'Failed to send invite');
    }
    
    setInvitingToGame(false);
  };

  // Handle viewing opponent profile
  const handleViewOpponent = (opponent) => {
    soundManager.playButtonClick();
    if (onViewPlayer) {
      onViewPlayer(opponent.id, opponent);
    }
  };

  // Get opponent info from game
  const getOpponentInfo = (game) => {
    if (game.player1_id === playerId) {
      return {
        id: game.player2_id,
        name: game.player2?.username || game.player2?.display_name || 'Unknown',
        rating: game.player2?.rating || 1000,
        data: game.player2
      };
    }
    return {
      id: game.player1_id,
      name: game.player1?.username || game.player1?.display_name || 'Unknown',
      rating: game.player1?.rating || 1000,
      data: game.player1
    };
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div 
          className="rounded-xl p-8"
          style={{
            background: getTierBackground(glowColor),
            border: `2px solid ${hexToRgba(glowColor, 0.4)}`
          }}
        >
          <div 
            className="w-8 h-8 border-2 rounded-full animate-spin mx-auto"
            style={{ borderColor: hexToRgba(glowColor, 0.3), borderTopColor: glowColor }}
          />
          <p className="text-slate-400 mt-3">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
          <p className="text-slate-400">Player not found</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-slate-800 rounded-lg text-white">
            Close
          </button>
        </div>
      </div>
    );
  }

  // FIX: Use username priority
  const displayName = profile.username || profile.display_name || 'Player';
  const winRate = profile.games_played > 0 
    ? Math.round((profile.games_won / profile.games_played) * 100) 
    : 0;

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-sm max-h-[85vh] rounded-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{
          background: `linear-gradient(135deg, ${getTierBackground(glowColor)} 0%, rgba(15, 23, 42, 0.98) 50%, ${hexToRgba(glowColor, 0.05)} 100%)`,
          border: `2px solid ${hexToRgba(glowColor, 0.4)}`,
          boxShadow: `0 0 60px ${hexToRgba(glowColor, 0.3)}, inset 0 0 40px ${hexToRgba(glowColor, 0.05)}`
        }}
      >
        {/* Header */}
        <div 
          className="p-4 flex-shrink-0"
          style={{ 
            background: `linear-gradient(135deg, ${hexToRgba(glowColor, 0.15)} 0%, rgba(15, 23, 42, 0.9) 100%)`,
            borderBottom: `1px solid ${hexToRgba(glowColor, 0.3)}`
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Avatar with Tier Icon */}
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${getTierBackground(glowColor)}, rgba(10, 15, 25, 0.98))`,
                  border: `3px solid ${hexToRgba(glowColor, 0.6)}`,
                  boxShadow: `0 0 20px ${hexToRgba(glowColor, 0.4)}`
                }}
              >
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : rankInfo ? (
                  <TierIcon shape={rankInfo.shape} glowColor={rankInfo.glowColor} size="medium" />
                ) : (
                  <User size={24} className="text-slate-400" />
                )}
              </div>
              
              <div>
                <h2 
                  className="font-bold text-lg"
                  style={{ color: '#f1f5f9', textShadow: `0 0 10px ${hexToRgba(glowColor, 0.5)}` }}
                >
                  {displayName}
                </h2>
                {rankInfo && (
                  <div className="flex items-center gap-2">
                    <span 
                      className="text-sm font-bold uppercase tracking-wider"
                      style={{ color: glowColor, textShadow: `0 0 8px ${hexToRgba(glowColor, 0.5)}` }}
                    >
                      {rankInfo.name}
                    </span>
                    <span className="text-slate-500 text-sm">{profile.rating || 1000} ELO</span>
                  </div>
                )}
              </div>
            </div>
            
            <button 
              onClick={onClose}
              className="p-1 transition-colors"
              style={{ color: hexToRgba(glowColor, 0.6) }}
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div 
          className="flex-1 p-4 space-y-4 overflow-y-auto"
          style={{ 
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            minHeight: 0
          }}
        >
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div 
              className="rounded-xl p-3 text-center"
              style={{ 
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: `1px solid ${hexToRgba(glowColor, 0.2)}`
              }}
            >
              <Trophy size={16} className="mx-auto mb-1 text-amber-400" />
              <div className="text-white font-bold">{profile.games_won || 0}</div>
              <div className="text-slate-500 text-xs">Wins</div>
            </div>
            
            <div 
              className="rounded-xl p-3 text-center"
              style={{ 
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: `1px solid ${hexToRgba(glowColor, 0.2)}`
              }}
            >
              <Target size={16} className="mx-auto mb-1 text-cyan-400" />
              <div className="text-white font-bold">{profile.games_played || 0}</div>
              <div className="text-slate-500 text-xs">Games</div>
            </div>
            
            <div 
              className="rounded-xl p-3 text-center"
              style={{ 
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: `1px solid ${hexToRgba(glowColor, 0.2)}`
              }}
            >
              <TrendingUp size={16} className="mx-auto mb-1 text-green-400" />
              <div className="text-white font-bold">{winRate}%</div>
              <div className="text-slate-500 text-xs">Win Rate</div>
            </div>
          </div>

          {/* Extra Stats from player_stats */}
          {playerStats && (
            <div className="grid grid-cols-2 gap-2">
              {(playerStats.ai_easy_wins + playerStats.ai_medium_wins + playerStats.ai_hard_wins) > 0 && (
                <div 
                  className="rounded-xl p-3"
                  style={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    border: `1px solid ${hexToRgba(glowColor, 0.2)}`
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Gamepad2 size={14} className="text-purple-400" />
                    <span className="text-slate-400 text-xs">AI Wins</span>
                  </div>
                  <div className="text-white font-bold">
                    {(playerStats.ai_easy_wins || 0) + (playerStats.ai_medium_wins || 0) + (playerStats.ai_hard_wins || 0)}
                  </div>
                </div>
              )}

              {(playerStats.puzzles_easy_solved + playerStats.puzzles_medium_solved + playerStats.puzzles_hard_solved) > 0 && (
                <div 
                  className="rounded-xl p-3"
                  style={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    border: `1px solid ${hexToRgba(glowColor, 0.2)}`
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Zap size={14} className="text-green-400" />
                    <span className="text-slate-400 text-xs">Puzzles</span>
                  </div>
                  <div className="text-white font-bold">
                    {(playerStats.puzzles_easy_solved || 0) + (playerStats.puzzles_medium_solved || 0) + (playerStats.puzzles_hard_solved || 0)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Achievements */}
          {achievementStats && (
            <div 
              className="rounded-xl p-3"
              style={{ 
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: `1px solid ${hexToRgba(glowColor, 0.2)}`
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Award size={14} className="text-amber-400" />
                <span className="text-slate-400 text-xs">Achievements</span>
              </div>
              <div className="text-white font-bold">
                {achievementStats.unlocked_count || 0}/{achievementStats.total_achievements || 0}
              </div>
              <div className="text-amber-400 text-xs">
                {achievementStats.earned_points || 0} points
              </div>
            </div>
          )}

          {/* Match History with Clickable Opponents */}
          {recentGames.length > 0 && (
            <div 
              className="rounded-xl p-3"
              style={{ 
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: `1px solid ${hexToRgba(glowColor, 0.2)}`
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Calendar size={14} style={{ color: glowColor }} />
                <span className="text-slate-300 text-sm font-medium">Recent Matches</span>
              </div>
              
              <div className="space-y-2">
                {recentGames.slice(0, 5).map(game => {
                  const won = game.winner_id === playerId;
                  const opponent = getOpponentInfo(game);
                  const opponentRankInfo = getRankInfo(opponent.rating);
                  const isClickable = opponent.id !== currentUserId && onViewPlayer;
                  
                  return (
                    <button
                      key={game.id}
                      onClick={() => isClickable && handleViewOpponent(opponent)}
                      disabled={!isClickable}
                      className={`w-full p-2 rounded-lg flex items-center justify-between transition-all ${
                        won 
                          ? 'bg-green-900/20 border border-green-500/30' 
                          : 'bg-red-900/20 border border-red-500/30'
                      } ${isClickable ? 'hover:scale-[1.02] cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${won ? 'bg-green-400' : 'bg-red-400'}`} />
                        
                        {/* Opponent mini avatar */}
                        <div 
                          className="w-6 h-6 rounded-full flex items-center justify-center"
                          style={{
                            background: getTierBackground(opponentRankInfo?.glowColor || '#64748b'),
                            border: `1px solid ${hexToRgba(opponentRankInfo?.glowColor || '#64748b', 0.5)}`
                          }}
                        >
                          {opponentRankInfo ? (
                            <TierIcon shape={opponentRankInfo.shape} glowColor={opponentRankInfo.glowColor} size="tiny" />
                          ) : (
                            <User size={10} className="text-slate-400" />
                          )}
                        </div>
                        
                        <div className="text-left">
                          <div className="text-slate-300 text-xs font-medium">vs {opponent.name}</div>
                          <div className="text-slate-600 text-xs">{formatDate(game.created_at)}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <span className={`text-xs font-bold ${won ? 'text-green-400' : 'text-red-400'}`}>
                          {won ? 'W' : 'L'}
                        </span>
                        {isClickable && (
                          <ChevronRight size={12} className="text-slate-600" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Member Since */}
          <div className="text-center text-slate-500 text-xs">
            Member since {new Date(profile.created_at).toLocaleDateString()}
          </div>
        </div>

        {/* Action Buttons */}
        {currentUserId && currentUserId !== playerId && (
          <div 
            className="p-4 space-y-2 flex-shrink-0"
            style={{ borderTop: `1px solid ${hexToRgba(glowColor, 0.2)}` }}
          >
            {/* Invite Error/Success Message */}
            {inviteError && (
              <div className="text-red-400 text-sm text-center mb-2">{inviteError}</div>
            )}
            {inviteSent && (
              <div className="text-green-400 text-sm text-center mb-2">Challenge sent!</div>
            )}
            
            {/* Challenge Button */}
            <button
              onClick={handleInviteToGame}
              disabled={invitingToGame || inviteSent}
              className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${glowColor} 0%, ${hexToRgba(glowColor, 0.7)} 100%)`,
                boxShadow: `0 0 20px ${hexToRgba(glowColor, 0.4)}`
              }}
            >
              {invitingToGame ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </>
              ) : inviteSent ? (
                <>
                  <Star size={18} />
                  Sent!
                </>
              ) : (
                <>
                  <Swords size={18} />
                  Challenge to Game
                </>
              )}
            </button>
            
            {/* Friend Request Button */}
            {friendStatus !== 'friends' && friendStatus !== 'pending_sent' && (
              <button
                onClick={handleSendFriendRequest}
                disabled={sendingRequest || friendStatus === 'pending_received'}
                className="w-full py-2.5 rounded-xl font-bold text-slate-300 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{
                  backgroundColor: 'rgba(30, 41, 59, 0.8)',
                  border: `1px solid ${hexToRgba(glowColor, 0.3)}`
                }}
              >
                {sendingRequest ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
                    Sending...
                  </>
                ) : friendStatus === 'pending_received' ? (
                  <>
                    <Clock size={16} />
                    Request Pending
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    Add Friend
                  </>
                )}
              </button>
            )}
            
            {friendStatus === 'pending_sent' && (
              <div className="text-center text-slate-500 text-sm">
                Friend request sent
              </div>
            )}
            
            {friendStatus === 'friends' && (
              <div className="text-center text-green-400 text-sm flex items-center justify-center gap-1">
                <Star size={14} />
                Friends
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewPlayerProfile;
