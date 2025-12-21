// ViewPlayerProfile.jsx - View another player's profile
// FIXED: Removed queries to non-existent tables (player_stats, achievement_stats)
// FIXED: Fixed games query syntax for PostgREST
// FIXED: Use achievementService for achievement stats
// FIXED: Define dbSelect locally instead of importing from non-existent file
// ADDED: Final Board View button for match history
import { useState, useEffect } from 'react';
import { X, Trophy, Target, TrendingUp, UserPlus, UserCheck, UserMinus, Clock, Swords, Calendar, ChevronRight, Loader, Award, LayoutGrid } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../utils/supabase';
import { friendsService } from '../services/friendsService';
import achievementService from '../services/achievementService';
import { ratingService } from '../services/ratingService';
import TierIcon from './TierIcon';
import { soundManager } from '../utils/soundManager';
import Achievements from './Achievements';
import FinalBoardView from './FinalBoardView';

// Supabase config for direct fetch
const AUTH_KEY = 'sb-oyeibyrednwlolmsjlwk-auth-token';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://oyeibyrednwlolmsjlwk.supabase.co';
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Helper to get auth headers for direct fetch
const getAuthHeaders = () => {
  try {
    const authData = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
    if (!authData?.access_token || !ANON_KEY) {
      return null;
    }
    return {
      'Authorization': `Bearer ${authData.access_token}`,
      'apikey': ANON_KEY,
      'Content-Type': 'application/json'
    };
  } catch (e) {
    return null;
  }
};

// Direct fetch wrapper for database operations
const dbSelect = async (table, options = {}) => {
  const headers = getAuthHeaders();
  if (!headers) return { data: null, error: 'Not authenticated' };
  
  let url = `${SUPABASE_URL}/rest/v1/${table}?`;
  
  if (options.select) url += `select=${encodeURIComponent(options.select)}&`;
  if (options.eq) {
    Object.entries(options.eq).forEach(([key, value]) => {
      // Properly encode the value
      url += `${encodeURIComponent(key)}=eq.${encodeURIComponent(value)}&`;
    });
  }
  if (options.order) url += `order=${encodeURIComponent(options.order)}&`;
  if (options.limit) url += `limit=${options.limit}&`;
  
  console.log('[dbSelect] Query:', table, url);
  
  try {
    const response = await fetch(url, { 
      headers: options.single 
        ? { ...headers, 'Accept': 'application/vnd.pgrst.object+json' }
        : headers 
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[dbSelect] Error:', response.status, errorText);
      return { data: null, error: response.statusText };
    }
    
    const data = await response.json();
    console.log('[dbSelect] Result:', table, 'count:', Array.isArray(data) ? data.length : 1);
    return { data, error: null };
  } catch (e) {
    console.error('[dbSelect] Exception:', e);
    return { data: null, error: e.message };
  }
};

// Helper to convert hex to rgba
const hexToRgba = (hex, alpha) => {
  if (!hex || !hex.startsWith('#')) return `rgba(100, 116, 139, ${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Get contrasting background based on tier
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

// Get rank info from rating service
const getRankInfo = (rating) => {
  return ratingService.getRatingTier(rating);
};

const ViewPlayerProfile = ({ 
  playerId, 
  playerData,
  currentUserId, 
  onInviteToGame, 
  onClose,
  onViewPlayer 
}) => {
  const [profile, setProfile] = useState(playerData || null);
  const [loading, setLoading] = useState(!playerData);
  const [recentGames, setRecentGames] = useState([]);
  const [friendStatus, setFriendStatus] = useState(null);
  const [friendshipId, setFriendshipId] = useState(null); // Store friendship ID for remove friend
  const [sendingRequest, setSendingRequest] = useState(false);
  const [removingFriend, setRemovingFriend] = useState(false);
  const [achievementStats, setAchievementStats] = useState(null);
  const [showAchievements, setShowAchievements] = useState(false); // Show achievements modal
  const [calculatedStats, setCalculatedStats] = useState({ wins: 0, totalGames: 0 });
  const [headToHead, setHeadToHead] = useState(null); // { myWins, theirWins, total }
  const [selectedGameForFinalView, setSelectedGameForFinalView] = useState(null); // Final Board View

  // Use calculated stats from actual games (more accurate than profile.games_won)
  const displayWins = calculatedStats.totalGames > 0 ? calculatedStats.wins : (profile?.games_won || 0);
  const displayGames = calculatedStats.totalGames > 0 ? calculatedStats.totalGames : (profile?.games_played || 0);
  const winRate = displayGames > 0 ? Math.round((displayWins / displayGames) * 100) : 0;

  // Get rank info
  const rankInfo = profile ? getRankInfo(profile.rating || 1000) : null;
  const glowColor = rankInfo?.glowColor || '#22d3ee';

  useEffect(() => {
    if (playerId) {
      // Reset stats when viewing a different player
      setCalculatedStats({ wins: 0, totalGames: 0 });
      setRecentGames([]);
      setHeadToHead(null);
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

      // FIXED: Load recent games - simplified query without foreign key joins
      // The database doesn't have FK relationships with those names
      try {
        console.log('[ViewPlayerProfile] Loading games for player:', playerId);
        
        // Get games where player is player1 (simple query, no joins)
        const { data: gamesAsPlayer1, error: err1 } = await dbSelect('games', {
          select: 'id,player1_id,player2_id,winner_id,status,created_at',
          eq: { player1_id: playerId, status: 'completed' },
          order: 'created_at.desc',
          limit: 100
        });
        
        if (err1) console.warn('[ViewPlayerProfile] Error fetching player1 games:', err1);
        console.log('[ViewPlayerProfile] Games as player1:', gamesAsPlayer1?.length || 0);
        
        // Get games where player is player2
        const { data: gamesAsPlayer2, error: err2 } = await dbSelect('games', {
          select: 'id,player1_id,player2_id,winner_id,status,created_at',
          eq: { player2_id: playerId, status: 'completed' },
          order: 'created_at.desc',
          limit: 100
        });
        
        if (err2) console.warn('[ViewPlayerProfile] Error fetching player2 games:', err2);
        console.log('[ViewPlayerProfile] Games as player2:', gamesAsPlayer2?.length || 0);
        
        // Merge and sort by created_at
        const allGames = [...(gamesAsPlayer1 || []), ...(gamesAsPlayer2 || [])];
        allGames.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        // Calculate actual wins from games (this is more accurate than profile.games_won)
        const wins = allGames.filter(g => g.winner_id === playerId).length;
        console.log('[ViewPlayerProfile] Calculated stats:', { 
          playerId, 
          totalGames: allGames.length, 
          wins,
          sampleWinnerIds: allGames.slice(0, 3).map(g => ({ gameId: g.id, winnerId: g.winner_id }))
        });
        
        setCalculatedStats({ wins, totalGames: allGames.length });
        
        // Calculate head-to-head stats if viewer is logged in
        if (currentUserId && currentUserId !== playerId) {
          const h2hGames = allGames.filter(g => 
            (g.player1_id === currentUserId || g.player2_id === currentUserId)
          );
          if (h2hGames.length > 0) {
            const myWins = h2hGames.filter(g => g.winner_id === currentUserId).length;
            const theirWins = h2hGames.filter(g => g.winner_id === playerId).length;
            setHeadToHead({ myWins, theirWins, total: h2hGames.length });
            console.log('[ViewPlayerProfile] Head-to-head:', { myWins, theirWins, total: h2hGames.length });
          } else {
            setHeadToHead(null);
          }
        }
        
        // For recent games, we need to fetch opponent profiles separately
        const recentGamesList = allGames.slice(0, 10);
        
        // Collect unique opponent IDs
        const opponentIds = new Set();
        recentGamesList.forEach(game => {
          if (game.player1_id !== playerId) opponentIds.add(game.player1_id);
          if (game.player2_id !== playerId) opponentIds.add(game.player2_id);
        });
        
        // Fetch opponent profiles if we have any games
        let opponentProfiles = {};
        if (opponentIds.size > 0) {
          try {
            // Fetch each opponent profile individually (simpler and more reliable)
            for (const oppId of opponentIds) {
              const { data: oppProfile } = await dbSelect('profiles', {
                select: 'id,username,display_name,rating',
                eq: { id: oppId },
                single: true
              });
              if (oppProfile) {
                opponentProfiles[oppId] = oppProfile;
              }
            }
            console.log('[ViewPlayerProfile] Fetched opponent profiles:', Object.keys(opponentProfiles).length);
          } catch (e) {
            console.warn('[ViewPlayerProfile] Error fetching opponent profiles:', e);
          }
        }
        
        // Attach opponent data to games
        const gamesWithOpponents = recentGamesList.map(game => {
          const isPlayer1 = game.player1_id === playerId;
          const opponentId = isPlayer1 ? game.player2_id : game.player1_id;
          const opponent = opponentProfiles[opponentId] || { id: opponentId, username: 'Unknown' };
          return {
            ...game,
            player1: isPlayer1 ? profileData : opponentProfiles[game.player1_id],
            player2: isPlayer1 ? opponentProfiles[game.player2_id] : profileData,
            opponent
          };
        });
        
        setRecentGames(gamesWithOpponents);
      } catch (e) {
        console.log('Recent games not available:', e);
      }

      // FIXED: Use achievementService instead of querying non-existent table
      try {
        if (typeof achievementService?.getAchievementStats === 'function') {
          const { data: achieveData } = await achievementService.getAchievementStats(playerId);
          if (achieveData) {
            setAchievementStats({
              unlocked_count: achieveData.unlockedCount || 0,
              total_achievements: achieveData.totalAchievements || 0,
              earned_points: achieveData.earnedPoints || 0
            });
          }
        }
      } catch (e) {
        console.log('Achievement stats not available');
      }

      // Check friend status
      if (currentUserId && currentUserId !== playerId) {
        try {
          const result = await friendsService.getFriendshipStatus(currentUserId, playerId);
          // Handle both old (string) and new (object) return formats
          if (typeof result === 'object' && result !== null) {
            setFriendStatus(result.status);
            setFriendshipId(result.friendshipId);
          } else {
            setFriendStatus(result);
            setFriendshipId(null);
          }
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
    try {
      await friendsService.sendFriendRequest(currentUserId, playerId);
      setFriendStatus('pending_sent');
      soundManager.playSound('success');
    } catch (err) {
      console.error('Error sending friend request:', err);
    }
    setSendingRequest(false);
  };

  const handleRemoveFriend = async () => {
    if (!currentUserId || !friendshipId || removingFriend) return;
    
    setRemovingFriend(true);
    try {
      await friendsService.removeFriend(friendshipId, currentUserId);
      setFriendStatus(null);
      setFriendshipId(null);
      soundManager.playSound('click');
    } catch (err) {
      console.error('Error removing friend:', err);
    }
    setRemovingFriend(false);
  };

  const handleInvite = () => {
    if (onInviteToGame && profile) {
      soundManager.playButtonClick();
      onInviteToGame(profile);
    }
  };

  // Get opponent info from a game
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

  // Handle viewing opponent profile
  const handleViewOpponent = (opponent) => {
    if (onViewPlayer && opponent.id !== currentUserId) {
      soundManager.playButtonClick();
      onViewPlayer(opponent.id, opponent.data);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-slate-900 rounded-xl p-8 border border-cyan-500/30">
          <Loader size={32} className="animate-spin text-cyan-400 mx-auto" />
          <p className="text-slate-400 mt-3">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-slate-900 rounded-xl p-6 border border-red-500/30 max-w-sm w-full">
          <p className="text-red-400 text-center mb-4">Player not found</p>
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div 
        className="bg-slate-900 rounded-xl max-w-sm w-full max-h-[85vh] overflow-hidden border shadow-lg"
        style={{
          borderColor: hexToRgba(glowColor, 0.4),
          boxShadow: `0 0 40px ${hexToRgba(glowColor, 0.2)}`
        }}
      >
        {/* Header */}
        <div 
          className="p-4 border-b relative"
          style={{ 
            borderColor: hexToRgba(glowColor, 0.2),
            background: `linear-gradient(135deg, ${getTierBackground(glowColor)} 0%, ${hexToRgba(glowColor, 0.1)} 100%)`
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 text-slate-400 hover:text-white transition-colors z-10"
          >
            <X size={20} />
          </button>
          
          {/* Title - Centered at top */}
          <div className="text-center mb-4">
            <h2 
              className="text-lg font-black tracking-wider"
              style={{ 
                color: glowColor,
                textShadow: `0 0 20px ${hexToRgba(glowColor, 0.5)}`
              }}
            >
              PLAYER PROFILE
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Avatar with tier glow */}
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
              style={{
                background: `linear-gradient(135deg, ${hexToRgba(glowColor, 0.3)}, ${hexToRgba(glowColor, 0.1)})`,
                border: `2px solid ${hexToRgba(glowColor, 0.5)}`,
                boxShadow: `0 0 20px ${hexToRgba(glowColor, 0.3)}`,
                color: glowColor
              }}
            >
              {(profile.username || profile.display_name)?.[0]?.toUpperCase() || '?'}
            </div>
            
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white">
                {profile.username || profile.display_name || 'Player'}
              </h3>
              
              {/* Tier Badge */}
              {rankInfo && (
                <div className="flex items-center gap-2 mt-1">
                  <TierIcon shape={rankInfo.shape} glowColor={rankInfo.glowColor} size="small" />
                  <span 
                    className="text-sm font-medium"
                    style={{ color: glowColor }}
                  >
                    {rankInfo.name}
                  </span>
                  <span className="text-slate-500 text-sm">
                    {profile.rating || 1000} ELO
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div 
              className="rounded-xl p-3 text-center"
              style={{ 
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: `1px solid ${hexToRgba(glowColor, 0.2)}`
              }}
            >
              <Trophy size={16} className="mx-auto mb-1 text-amber-400" />
              <div className="text-white font-bold">{displayWins}</div>
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
              <div className="text-white font-bold">{displayGames}</div>
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

          {/* Head-to-Head Stats - only show if viewer is logged in and has played against this player */}
          {headToHead && headToHead.total > 0 && (
            <div 
              className="rounded-xl p-3 mb-4"
              style={{ 
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                boxShadow: '0 0 15px rgba(251, 191, 36, 0.1)'
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Swords size={16} className="text-amber-400" />
                  <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">Head-to-Head</span>
                </div>
                <span className="text-slate-400 text-xs">{headToHead.total} games</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                {/* Your Wins */}
                <div className="text-center">
                  <div className="text-cyan-400 font-bold text-lg">{headToHead.myWins}</div>
                  <div className="text-slate-500 text-[10px]">YOUR WINS</div>
                </div>
                
                {/* Win Rate */}
                <div className="text-center border-x border-slate-700/50">
                  <div className="text-white font-bold text-lg">
                    {headToHead.total > 0 ? Math.round((headToHead.myWins / headToHead.total) * 100) : 0}%
                  </div>
                  <div className="text-slate-500 text-[10px]">YOUR WIN %</div>
                </div>
                
                {/* Their Wins */}
                <div className="text-center">
                  <div className="text-pink-400 font-bold text-lg">{headToHead.theirWins}</div>
                  <div className="text-slate-500 text-[10px]">THEIR WINS</div>
                </div>
              </div>
            </div>
          )}

          {/* Achievement Stats - Clickable to view all achievements */}
          {achievementStats && achievementStats.total_achievements > 0 && (
            <button
              onClick={() => {
                soundManager.playButtonClick();
                setShowAchievements(true);
              }}
              className="w-full rounded-xl p-3 mb-4 flex items-center justify-between hover:opacity-80 transition-opacity group"
              style={{ 
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: `1px solid ${hexToRgba(glowColor, 0.2)}`
              }}
            >
              <div className="flex items-center gap-2">
                <Award size={16} className="text-amber-400" />
                <span className="text-slate-400 text-xs">Achievements</span>
              </div>
              <div className="text-white font-bold">
                {achievementStats.unlocked_count || 0}/{achievementStats.total_achievements || 0}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-amber-400 text-xs">
                  {achievementStats.earned_points || 0} pts
                </span>
                <ChevronRight size={14} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
              </div>
            </button>
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
                    <div
                      key={game.id}
                      className={`w-full p-2 rounded-lg transition-all ${
                        won 
                          ? 'bg-green-900/20 border border-green-500/30' 
                          : 'bg-red-900/20 border border-red-500/30'
                      }`}
                    >
                      {/* Clickable row for opponent info */}
                      <button
                        onClick={() => isClickable && handleViewOpponent(opponent)}
                        disabled={!isClickable}
                        className={`w-full flex items-center justify-between ${isClickable ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}
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
                              <TierIcon 
                                shape={opponentRankInfo.shape} 
                                glowColor={opponentRankInfo.glowColor} 
                                size="tiny" 
                              />
                            ) : (
                              <span className="text-[8px] text-slate-400">
                                {opponent.name?.[0]?.toUpperCase() || '?'}
                              </span>
                            )}
                          </div>
                          
                          <div className="text-left">
                            <div className="text-white text-sm font-medium">vs {opponent.name}</div>
                            <div className="text-slate-500 text-xs">{formatDate(game.created_at)}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${won ? 'text-green-400' : 'text-red-400'}`}>
                            {won ? 'WIN' : 'LOSS'}
                          </span>
                          {isClickable && (
                            <ChevronRight size={14} className="text-slate-600" />
                          )}
                        </div>
                      </button>
                      
                      {/* Final Board View button */}
                      <div className="mt-1.5 flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            soundManager.playButtonClick();
                            setSelectedGameForFinalView(game);
                          }}
                          className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-300 rounded-md hover:bg-purple-500/30 transition-colors text-xs"
                          title="View final board"
                        >
                          <LayoutGrid size={12} />
                          Final
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Member since */}
          {profile.created_at && (
            <div className="mt-4 text-center text-slate-500 text-xs">
              Member since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
          )}
        </div>

        {/* Actions */}
        {currentUserId && currentUserId !== playerId && (
          <div className="p-4 border-t border-slate-800 space-y-2">
            {/* Friend Button */}
            {friendStatus === 'friends' ? (
              <button
                onClick={handleRemoveFriend}
                disabled={removingFriend}
                className="w-full py-2.5 bg-slate-800 hover:bg-red-900/50 text-slate-300 hover:text-red-300 rounded-xl font-medium flex items-center justify-center gap-2 transition-all border border-slate-700 hover:border-red-500/50"
              >
                {removingFriend ? (
                  <Loader size={16} className="animate-spin" />
                ) : (
                  <>
                    <UserCheck size={16} className="text-green-400" />
                    <span>Friends</span>
                    <span className="text-slate-500 text-xs ml-1">(tap to remove)</span>
                  </>
                )}
              </button>
            ) : friendStatus === 'pending_sent' ? (
              <div className="flex items-center justify-center gap-2 py-2 text-amber-400">
                <Clock size={18} />
                <span className="text-sm font-medium">Request Sent</span>
              </div>
            ) : friendStatus === 'pending_received' ? (
              <div className="flex items-center justify-center gap-2 py-2 text-cyan-400">
                <Clock size={18} />
                <span className="text-sm font-medium">Pending Request</span>
              </div>
            ) : (
              <button
                onClick={handleSendFriendRequest}
                disabled={sendingRequest}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium flex items-center justify-center gap-2 transition-all border border-slate-700"
              >
                {sendingRequest ? (
                  <Loader size={16} className="animate-spin" />
                ) : (
                  <UserPlus size={16} />
                )}
                Add Friend
              </button>
            )}

            {/* Invite to Game Button */}
            {onInviteToGame && (
              <button
                onClick={handleInvite}
                className="w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                style={{
                  background: `linear-gradient(135deg, ${hexToRgba(glowColor, 0.3)}, ${hexToRgba(glowColor, 0.1)})`,
                  border: `1px solid ${hexToRgba(glowColor, 0.4)}`,
                  color: glowColor
                }}
              >
                <Swords size={16} />
                Challenge to Game
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Achievements Modal - View all achievements for this player */}
      {showAchievements && (
        <Achievements
          userId={playerId}
          onClose={() => setShowAchievements(false)}
          viewOnly={true}
          playerName={profile?.username || profile?.display_name || 'Player'}
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
          viewerIsPlayer1={selectedGameForFinalView.player1_id === playerId}
        />
      )}
    </div>
  );
};

export default ViewPlayerProfile;
