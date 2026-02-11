// ViewPlayerProfile - View another player's profile
// v7.17: Fixed scroll by removing touchAction blocking on backdrop
// v7.12: Added full stats display (AI wins, puzzle stats) for all players
// v7.12: Added player_stats loading from profiles table
// v7.12: Final Board View now fetches moves for full replay functionality
import { useState, useEffect } from 'react';
import { X, Trophy, Target, Swords, Clock, UserPlus, UserCheck, UserX, Loader, ChevronRight, Award, Gamepad2, Zap, LayoutGrid, Bot, Flame } from 'lucide-react';
import { friendsService } from '../services/friendsService';
import { ratingService } from '../services/ratingService';
import achievementService from '../services/achievementService';
import TierIcon from './TierIcon';
import FinalBoardView from './FinalBoardView';
import StreakDisplay from './StreakDisplay';
import { soundManager } from '../utils/soundManager';

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

// Direct database select helper
const dbSelect = async (table, options = {}) => {
  const headers = getAuthHeaders();
  if (!headers) return { data: null, error: 'Not authenticated' };
  
  try {
    let url = `${SUPABASE_URL}/rest/v1/${table}?`;
    
    if (options.select) url += `select=${encodeURIComponent(options.select)}&`;
    if (options.eq) {
      Object.entries(options.eq).forEach(([key, value]) => {
        url += `${key}=eq.${encodeURIComponent(value)}&`;
      });
    }
    if (options.or) url += `or=(${encodeURIComponent(options.or)})&`;
    if (options.order) url += `order=${options.order}&`;
    if (options.limit) url += `limit=${options.limit}&`;
    
    const response = await fetch(url.slice(0, -1), { 
      headers: options.single 
        ? { ...headers, 'Accept': 'application/vnd.pgrst.object+json' }
        : headers 
    });
    
    if (!response.ok) {
      return { data: null, error: response.statusText };
    }
    
    const data = await response.json();
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e.message };
  }
};

// Direct fetch helper for game moves (v7.12)
const fetchGameMoves = async (gameId) => {
  const headers = getAuthHeaders();
  if (!headers) return [];
  
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/game_moves?game_id=eq.${gameId}&order=move_number.asc`,
      { headers }
    );
    
    if (response.ok) {
      return await response.json();
    }
    return [];
  } catch (err) {
    console.error('Error fetching game moves:', err);
    return [];
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
  const [friendshipId, setFriendshipId] = useState(null);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [removingFriend, setRemovingFriend] = useState(false);
  const [achievementStats, setAchievementStats] = useState(null);
  const [showAchievements, setShowAchievements] = useState(false);
  const [calculatedStats, setCalculatedStats] = useState({ wins: 0, totalGames: 0 });
  const [headToHead, setHeadToHead] = useState(null);
  const [selectedGameForFinalView, setSelectedGameForFinalView] = useState(null);
  const [loadingMoves, setLoadingMoves] = useState(false);
  const [gameMoves, setGameMoves] = useState([]);
  const [playerStats, setPlayerStats] = useState(null); // v7.12: Full stats from profiles table

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
      setPlayerStats(null);
      loadPlayerData();
    }
  }, [playerId]);

  const loadPlayerData = async () => {
    setLoading(true);
    
    try {
      // Load profile with ALL stats from profiles table (v7.12: expanded select)
      let profileData = playerData;
      if (!profileData) {
        const { data } = await dbSelect('profiles', {
          select: `id,username,display_name,avatar_url,rating,games_won,games_played,created_at,
                   puzzles_easy_solved,puzzles_easy_attempted,puzzles_medium_solved,puzzles_medium_attempted,
                   puzzles_hard_solved,puzzles_hard_attempted,speed_best_streak,speed_total_puzzles,
                   ai_easy_wins,ai_easy_losses,ai_medium_wins,ai_medium_losses,ai_hard_wins,ai_hard_losses,
                   local_games_played`,
          eq: { id: playerId },
          single: true
        });
        profileData = data;
      }
      
      if (profileData) {
        setProfile(profileData);
        // v7.12: Set player stats from the profile data
        setPlayerStats({
          puzzles_easy_solved: profileData.puzzles_easy_solved || 0,
          puzzles_medium_solved: profileData.puzzles_medium_solved || 0,
          puzzles_hard_solved: profileData.puzzles_hard_solved || 0,
          ai_easy_wins: profileData.ai_easy_wins || 0,
          ai_medium_wins: profileData.ai_medium_wins || 0,
          ai_hard_wins: profileData.ai_hard_wins || 0,
          ai_easy_losses: profileData.ai_easy_losses || 0,
          ai_medium_losses: profileData.ai_medium_losses || 0,
          ai_hard_losses: profileData.ai_hard_losses || 0,
          speed_best_streak: profileData.speed_best_streak || 0,
          local_games_played: profileData.local_games_played || 0
        });
      }

      // Load recent games
      try {
        // Get games where player is player1
        const { data: gamesAsPlayer1 } = await dbSelect('games', {
          select: 'id,player1_id,player2_id,winner_id,status,created_at,board,board_pieces',
          eq: { player1_id: playerId, status: 'completed' },
          order: 'created_at.desc',
          limit: 100
        });
        
        // Get games where player is player2
        const { data: gamesAsPlayer2 } = await dbSelect('games', {
          select: 'id,player1_id,player2_id,winner_id,status,created_at,board,board_pieces',
          eq: { player2_id: playerId, status: 'completed' },
          order: 'created_at.desc',
          limit: 100
        });
        
        // Merge and sort by created_at
        const allGames = [...(gamesAsPlayer1 || []), ...(gamesAsPlayer2 || [])];
        allGames.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        // Calculate actual wins from games
        const wins = allGames.filter(g => g.winner_id === playerId).length;
        setCalculatedStats({ wins, totalGames: allGames.length });
        
        // Calculate head-to-head stats
        if (currentUserId && currentUserId !== playerId) {
          const h2hGames = allGames.filter(g => 
            (g.player1_id === currentUserId || g.player2_id === currentUserId)
          );
          if (h2hGames.length > 0) {
            const myWins = h2hGames.filter(g => g.winner_id === currentUserId).length;
            const theirWins = h2hGames.filter(g => g.winner_id === playerId).length;
            setHeadToHead({ myWins, theirWins, total: h2hGames.length });
          }
        }
        
        // Get opponent profiles for display
        const opponentIds = [...new Set(allGames.slice(0, 10).map(g => 
          g.player1_id === playerId ? g.player2_id : g.player1_id
        ))];
        
        let opponentProfiles = {};
        if (opponentIds.length > 0) {
          const { data: opponents } = await dbSelect('profiles', {
            select: 'id,username,display_name,rating'
          });
          if (opponents) {
            opponents.forEach(p => { opponentProfiles[p.id] = p; });
          }
        }
        
        // Attach opponent data to games
        const gamesWithOpponents = allGames.slice(0, 10).map(game => {
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

      // Load achievement stats
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

  // Handle opening Final Board View - fetch moves first (v7.12)
  const handleOpenFinalBoardView = async (game) => {
    soundManager.playButtonClick();
    setLoadingMoves(true);
    setSelectedGameForFinalView(game);
    
    try {
      const moves = await fetchGameMoves(game.id);
      setGameMoves(moves);
    } catch (err) {
      console.error('Error fetching moves:', err);
      setGameMoves([]);
    }
    
    setLoadingMoves(false);
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

  const handleRemoveFriend = async () => {
    if (!currentUserId || removingFriend || !friendshipId) return;
    
    setRemovingFriend(true);
    soundManager.playButtonClick();
    
    try {
      const { error } = await friendsService.removeFriend(friendshipId);
      if (!error) {
        setFriendStatus(null);
        setFriendshipId(null);
        soundManager.playSound('success');
      }
    } catch (err) {
      console.error('Error removing friend:', err);
    }
    
    setRemovingFriend(false);
  };

  const handleInviteToGame = async () => {
    if (!onInviteToGame || !profile) return;
    soundManager.playButtonClick();
    await onInviteToGame(profile);
  };

  // Calculate derived stats for display
  const totalAiWins = (playerStats?.ai_easy_wins || 0) + (playerStats?.ai_medium_wins || 0) + (playerStats?.ai_hard_wins || 0);
  const totalAiGames = totalAiWins + (playerStats?.ai_easy_losses || 0) + (playerStats?.ai_medium_losses || 0) + (playerStats?.ai_hard_losses || 0);
  const totalPuzzlesSolved = (playerStats?.puzzles_easy_solved || 0) + (playerStats?.puzzles_medium_solved || 0) + (playerStats?.puzzles_hard_solved || 0);

  if (!playerId) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div 
          className="bg-slate-900 rounded-xl max-w-md w-full overflow-hidden border shadow-2xl max-h-[90vh] flex flex-col"
          style={{ 
            borderColor: hexToRgba(glowColor, 0.3),
            boxShadow: `0 0 50px ${hexToRgba(glowColor, 0.2)}`,
            touchAction: 'pan-y',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div 
            className="p-4 border-b flex items-center justify-between flex-shrink-0"
            style={{ borderColor: hexToRgba(glowColor, 0.2) }}
          >
            <h2 className="text-lg font-bold text-white">Player Profile</h2>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          
          {/* Content - Scrollable */}
          <div 
            className="p-4 overflow-y-auto flex-1 overscroll-contain"
            style={{ 
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain',
              touchAction: 'pan-y',
            }}
          >
            {loading ? (
              <div className="text-center py-8">
                <Loader size={32} className="animate-spin mx-auto text-cyan-400 mb-3" />
                <p className="text-slate-400">Loading profile...</p>
              </div>
            ) : !profile ? (
              <div className="text-center py-8">
                <p className="text-slate-400">Player not found</p>
              </div>
            ) : (
              <>
                {/* Profile Header */}
                <div className="flex items-center gap-4 mb-4">
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                    style={{ 
                      background: `linear-gradient(135deg, ${hexToRgba(glowColor, 0.3)}, ${hexToRgba(glowColor, 0.1)})`,
                      border: `2px solid ${hexToRgba(glowColor, 0.5)}`,
                      color: glowColor
                    }}
                  >
                    {(profile.username || profile.display_name)?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white">
                      {profile.username || profile.display_name || 'Unknown'}
                    </h3>
                    {rankInfo && (
                      <div className="flex items-center gap-2 mt-1">
                        <TierIcon shape={rankInfo.shape} glowColor={glowColor} size="small" />
                        <span style={{ color: glowColor }} className="font-bold text-sm">
                          {rankInfo.name}
                        </span>
                        <span className="text-slate-500 text-sm">
                          {profile.rating || 1000} ELO
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Online Stats */}
                <div 
                  className="rounded-xl p-4 mb-4"
                  style={{ 
                    backgroundColor: getTierBackground(glowColor),
                    border: `1px solid ${hexToRgba(glowColor, 0.3)}`
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Swords size={16} style={{ color: glowColor }} />
                    <span className="font-bold text-white">Online Stats</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{displayGames}</div>
                      <div className="text-xs text-slate-400">Games</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">{displayWins}</div>
                      <div className="text-xs text-slate-400">Wins</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold" style={{ color: glowColor }}>{winRate}%</div>
                      <div className="text-xs text-slate-400">Win Rate</div>
                    </div>
                  </div>
                </div>

                {/* v7.12: Play Streak */}
                <div className="mb-4">
                  <StreakDisplay userId={playerId} variant="badge" />
                </div>

                {/* v7.12: Full Stats Section - Always visible */}
                {playerStats && (totalAiGames > 0 || totalPuzzlesSolved > 0 || playerStats.speed_best_streak > 0) && (
                  <div 
                    className="rounded-xl p-4 mb-4"
                    style={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.6)',
                      border: `1px solid ${hexToRgba(glowColor, 0.2)}`
                    }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Target size={16} className="text-cyan-400" />
                      <span className="font-bold text-white">Player Stats</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {/* AI Stats */}
                      {totalAiGames > 0 && (
                        <div 
                          className="rounded-lg p-3"
                          style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)' }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Bot size={14} className="text-purple-400" />
                            <span className="text-slate-400 text-xs">AI Battles</span>
                          </div>
                          <div className="text-white font-bold">{totalAiWins} / {totalAiGames}</div>
                          <div className="text-slate-500 text-xs">wins</div>
                        </div>
                      )}
                      
                      {/* Puzzle Stats */}
                      {totalPuzzlesSolved > 0 && (
                        <div 
                          className="rounded-lg p-3"
                          style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)' }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Zap size={14} className="text-green-400" />
                            <span className="text-slate-400 text-xs">Puzzles</span>
                          </div>
                          <div className="text-white font-bold">{totalPuzzlesSolved}</div>
                          <div className="text-slate-500 text-xs">solved</div>
                        </div>
                      )}
                      
                      {/* Speed Streak */}
                      {playerStats.speed_best_streak > 0 && (
                        <div 
                          className="rounded-lg p-3"
                          style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)' }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Flame size={14} className="text-orange-400" />
                            <span className="text-slate-400 text-xs">Speed Streak</span>
                          </div>
                          <div className="text-white font-bold">{playerStats.speed_best_streak}</div>
                          <div className="text-slate-500 text-xs">best</div>
                        </div>
                      )}
                      
                      {/* Local Games */}
                      {playerStats.local_games_played > 0 && (
                        <div 
                          className="rounded-lg p-3"
                          style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)' }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Gamepad2 size={14} className="text-pink-400" />
                            <span className="text-slate-400 text-xs">Local Games</span>
                          </div>
                          <div className="text-white font-bold">{playerStats.local_games_played}</div>
                          <div className="text-slate-500 text-xs">played</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Head to Head */}
                {headToHead && (
                  <div 
                    className="rounded-xl p-3 mb-4"
                    style={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.6)',
                      border: `1px solid ${hexToRgba(glowColor, 0.2)}`
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">Head to Head</span>
                      <div className="flex items-center gap-2">
                        <span className="text-green-400 font-bold">{headToHead.myWins}</span>
                        <span className="text-slate-600">-</span>
                        <span className="text-red-400 font-bold">{headToHead.theirWins}</span>
                        <span className="text-slate-500 text-xs">({headToHead.total} games)</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Achievements */}
                {achievementStats && (
                  <div 
                    className="rounded-xl p-3 mb-4"
                    style={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.6)',
                      border: `1px solid ${hexToRgba(glowColor, 0.2)}`
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy size={14} className="text-amber-400" />
                      <span className="text-slate-400 text-xs">Achievements</span>
                    </div>
                    <div className="text-white font-bold">
                      {achievementStats.unlocked_count} / {achievementStats.total_achievements}
                    </div>
                  </div>
                )}

                {/* Recent Games */}
                {recentGames.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={14} className="text-slate-400" />
                      <span className="text-slate-400 text-xs font-medium">Recent Games</span>
                    </div>
                    <div className="space-y-2">
                      {recentGames.slice(0, 5).map((game) => {
                        const won = game.winner_id === playerId;
                        const opponent = game.opponent;
                        const opponentName = opponent?.username || opponent?.display_name || 'Unknown';
                        const isClickable = !!opponent?.id && onViewPlayer;
                        
                        return (
                          <div key={game.id}>
                            <button
                              onClick={() => {
                                if (isClickable) {
                                  soundManager.playButtonClick();
                                  onViewPlayer(opponent.id, opponent);
                                }
                              }}
                              disabled={!isClickable}
                              className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                                isClickable ? 'hover:bg-slate-800/70 cursor-pointer' : 'cursor-default'
                              }`}
                              style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)' }}
                            >
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                                  style={{ 
                                    backgroundColor: hexToRgba(glowColor, 0.2),
                                    color: glowColor
                                  }}
                                >
                                  {opponentName[0]?.toUpperCase() || '?'}
                                </div>
                                <div className="text-left">
                                  <div className="text-white text-sm">{opponentName}</div>
                                  <div className="text-slate-500 text-xs">
                                    {new Date(game.created_at).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold ${won ? 'text-green-400' : 'text-red-400'}`}>
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
                                  handleOpenFinalBoardView(game);
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
                
                {/* Bottom spacing for scroll breathing room */}
                <div className="h-4" />
              </>
            )}
          </div>

          {/* Actions */}
          {currentUserId && currentUserId !== playerId && !loading && profile && (
            <div className="p-4 border-t border-slate-800 space-y-2 flex-shrink-0">
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
                  <UserPlus size={18} />
                  <span className="text-sm font-medium">Wants to be friends</span>
                </div>
              ) : (
                <button
                  onClick={handleSendFriendRequest}
                  disabled={sendingRequest}
                  className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-all"
                >
                  {sendingRequest ? (
                    <Loader size={16} className="animate-spin" />
                  ) : (
                    <>
                      <UserPlus size={16} />
                      <span>Add Friend</span>
                    </>
                  )}
                </button>
              )}

              {/* Invite to Game */}
              {onInviteToGame && (
                <button
                  onClick={handleInviteToGame}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/30"
                >
                  <Swords size={16} />
                  <span>Challenge to Game</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Final Board View Modal */}
      {selectedGameForFinalView && (
        <FinalBoardView
          onClose={() => {
            setSelectedGameForFinalView(null);
            setGameMoves([]);
          }}
          board={selectedGameForFinalView.board}
          boardPieces={selectedGameForFinalView.board_pieces}
          moveHistory={gameMoves}
          isLoadingMoves={loadingMoves}
          player1={selectedGameForFinalView.player1}
          player2={selectedGameForFinalView.player2}
          player1Name={selectedGameForFinalView.player1?.username || selectedGameForFinalView.player1?.display_name || 'Player 1'}
          player2Name={selectedGameForFinalView.player2?.username || selectedGameForFinalView.player2?.display_name || 'Player 2'}
          player1Rating={selectedGameForFinalView.player1?.rating || selectedGameForFinalView.player1?.elo_rating || 1200}
          player2Rating={selectedGameForFinalView.player2?.rating || selectedGameForFinalView.player2?.elo_rating || 1200}
          winner={selectedGameForFinalView.winner_id === selectedGameForFinalView.player1_id ? 'player1' : 
                  selectedGameForFinalView.winner_id === selectedGameForFinalView.player2_id ? 'player2' : null}
          winnerId={selectedGameForFinalView.winner_id}
          gameDate={selectedGameForFinalView.updated_at || selectedGameForFinalView.created_at}
        />
      )}
    </>
  );
};

export default ViewPlayerProfile;
