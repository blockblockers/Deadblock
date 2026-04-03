// ViewPlayerProfile - View another player's profile
// v7.33: overflow-y-scroll (was auto) — scroll always active on iOS regardless of content height
// v7.31: Fixed modal appearing at bottom - added scrollRef to reset scroll position on open
// v7.30: Fixed crash - removed undefined setShowAIDetails/setShowPuzzleDetails calls
// v7.29: Stats layout aligned with PlayerStatsModal - collapsible sections for all categories
// v7.28: Performance - Single RPC call (get_player_profile) with fallback to original loading
// v7.26: Fixed stats - ALWAYS fetch full profile from DB, use service calls for streak/weekly
// v7.21: Enhanced stats display with all non-online stats (AI breakdown, puzzles, streak, weekly, creator)
// v7.20: Refactored - FinalBoardView now handled by parent OnlineMenu via onViewGame callback
// v7.19: Hide modal when FinalBoardView shown (prevents visual interference), robust mobile scroll
// v7.18: Fixed scroll - removed flex layout, use explicit overflow-y-auto with max-height
// v7.12: Added full stats display (AI wins, puzzle stats) for all players
// v7.12: Added player_stats loading from profiles table
// v7.12: Final Board View now fetches moves for full replay functionality
import { useState, useEffect, useRef } from 'react';
import { X, Trophy, Target, Swords, Clock, UserPlus, UserCheck, UserX, Loader, ChevronRight, ChevronDown, ChevronUp, Award, Gamepad2, Zap, LayoutGrid, Bot, Flame, Medal, TrendingUp, Sparkles } from 'lucide-react';
import { friendsService } from '../services/friendsService';
import { ratingService } from '../services/ratingService';
import achievementService from '../services/achievementService';
import { streakService } from '../services/streakService';
import { weeklyChallengeService } from '../services/weeklyChallengeService';
import TierIcon from './TierIcon';
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

// v7.29: StatCard Component (matching PlayerStatsModal)
const StatCard = ({ icon: Icon, label, value, subValue, color = 'cyan' }) => {
  const colors = {
    cyan: { bg: 'rgba(34, 211, 238, 0.1)', border: 'rgba(34, 211, 238, 0.2)', text: '#22d3ee' },
    amber: { bg: 'rgba(251, 191, 36, 0.1)', border: 'rgba(251, 191, 36, 0.2)', text: '#fbbf24' },
    green: { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.2)', text: '#22c55e' },
    purple: { bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.2)', text: '#a855f7' },
    orange: { bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.2)', text: '#f97316' },
    red: { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)', text: '#ef4444' },
  };
  const c = colors[color] || colors.cyan;
  
  return (
    <div 
      className="p-2.5 rounded-lg"
      style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon size={12} style={{ color: c.text }} />
        <span className="text-slate-400 text-[10px]">{label}</span>
      </div>
      <div className="text-base font-bold text-white">{value}</div>
      {subValue && <div className="text-[10px] text-slate-500">{subValue}</div>}
    </div>
  );
};

// v7.29: Collapsible Section Component (matching PlayerStatsModal)
const Section = ({ id, title, icon: Icon, color, children, expanded, onToggle }) => {
  const colors = {
    cyan: '#22d3ee',
    amber: '#fbbf24',
    green: '#22c55e',
    purple: '#a855f7',
    orange: '#f97316',
  };
  const c = colors[color] || colors.cyan;
  
  return (
    <div className="rounded-xl overflow-hidden mb-2" style={{ border: `1px solid ${c}30` }}>
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between p-2.5"
        style={{ backgroundColor: `${c}10` }}
      >
        <div className="flex items-center gap-2">
          <Icon size={14} style={{ color: c }} />
          <span className="font-bold text-xs" style={{ color: c }}>{title}</span>
        </div>
        {expanded ? (
          <ChevronUp size={14} style={{ color: c }} />
        ) : (
          <ChevronDown size={14} style={{ color: c }} />
        )}
      </button>
      {expanded && (
        <div className="p-2.5 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
};

const ViewPlayerProfile = ({ 
  playerId, 
  playerData,
  currentUserId, 
  onInviteToGame, 
  onClose,
  onViewPlayer,
  onViewGame
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
  const [playerStats, setPlayerStats] = useState(null); // v7.12: Full stats from profiles table
  
  // v7.31: Ref for scrollable content to reset scroll position on open
  const scrollRef = useRef(null);
  
  // v7.29: Collapsible sections matching PlayerStatsModal
  const [expandedSection, setExpandedSection] = useState('overview');
  const [playStreak, setPlayStreak] = useState({ current: 0, longest: 0 });
  const [weeklyStats, setWeeklyStats] = useState({ first: 0, second: 0, third: 0, total: 0 });
  const [creatorStats, setCreatorStats] = useState({ totalCompleted: 0, totalPuzzles: 100 });

  // v7.29: Section toggle handler
  const handleSectionToggle = (sectionId) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  // Use calculated stats from actual games (more accurate than profile.games_won)
  const displayWins = calculatedStats.totalGames > 0 ? calculatedStats.wins : (profile?.games_won || 0);
  const displayGames = calculatedStats.totalGames > 0 ? calculatedStats.totalGames : (profile?.games_played || 0);
  const winRate = displayGames > 0 ? Math.round((displayWins / displayGames) * 100) : 0;

  // Get rank info
  const rankInfo = profile ? getRankInfo(profile.rating || 1000) : null;
  const glowColor = rankInfo?.glowColor || '#22d3ee';

  useEffect(() => {
    if (playerId) {
      // v7.31: Reset scroll position to top when viewing a new profile
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
      
      // Reset stats when viewing a different player
      setCalculatedStats({ wins: 0, totalGames: 0 });
      setRecentGames([]);
      setHeadToHead(null);
      setPlayerStats(null);
      setExpandedSection('overview'); // v7.30: Reset to overview (replaced removed showAIDetails/showPuzzleDetails)
      setPlayStreak({ current: 0, longest: 0 });
      setWeeklyStats({ first: 0, second: 0, third: 0, total: 0 });
      setCreatorStats({ totalCompleted: 0, totalPuzzles: 100 });
      loadPlayerData();
    }
  }, [playerId]);

  const loadPlayerData = async () => {
    setLoading(true);
    
    try {
      // v7.28: Try single RPC call first (8x faster than multiple API calls)
      const headers = getAuthHeaders();
      if (headers) {
        try {
          const rpcResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/rpc/get_player_profile`,
            {
              method: 'POST',
              headers: {
                ...headers,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
              },
              body: JSON.stringify({
                p_player_id: playerId,
                p_viewer_id: currentUserId || null
              })
            }
          );
          
          if (rpcResponse.ok) {
            const data = await rpcResponse.json();
            
            if (data && data.profile) {
              // Process all data from single RPC call
              setProfile(data.profile);
              setPlayerStats({
                puzzles_easy_solved: data.profile.puzzles_easy_solved || 0,
                puzzles_medium_solved: data.profile.puzzles_medium_solved || 0,
                puzzles_hard_solved: data.profile.puzzles_hard_solved || 0,
                ai_easy_wins: data.profile.ai_easy_wins || 0,
                ai_medium_wins: data.profile.ai_medium_wins || 0,
                ai_hard_wins: data.profile.ai_hard_wins || 0,
                ai_easy_losses: data.profile.ai_easy_losses || 0,
                ai_medium_losses: data.profile.ai_medium_losses || 0,
                ai_hard_losses: data.profile.ai_hard_losses || 0,
                speed_best_streak: data.profile.speed_best_streak || 0,
                local_games_played: data.profile.local_games_played || 0
              });
              
              if (data.recent_games && Array.isArray(data.recent_games)) {
                const gamesWithOpponents = data.recent_games.map(game => {
                  const isPlayer1 = game.player1_id === playerId;
                  return { ...game, opponent: isPlayer1 ? game.player2 : game.player1 };
                });
                setRecentGames(gamesWithOpponents);
                const wins = data.recent_games.filter(g => g.winner_id === playerId).length;
                setCalculatedStats({ wins, totalGames: data.recent_games.length });
              }
              
              if (data.achievements) {
                setAchievementStats({
                  unlocked_count: data.achievements.unlocked_count || 0,
                  total_achievements: data.achievements.total_achievements || 0,
                  earned_points: data.achievements.earned_points || 0
                });
              }
              
              if (data.streak) {
                setPlayStreak({ current: data.streak.current_streak || 0, longest: data.streak.longest_streak || 0 });
              }
              
              if (data.weekly) {
                setWeeklyStats({ first: data.weekly.first || 0, second: data.weekly.second || 0, third: data.weekly.third || 0, total: data.weekly.total || 0 });
              }
              
              if (data.creator) {
                setCreatorStats({ totalCompleted: data.creator.total_completed || 0, totalPuzzles: data.creator.total_puzzles || 100 });
              }
              
              if (data.friend) {
                setFriendStatus(data.friend.status || 'none');
                setFriendshipId(data.friend.friendship_id || null);
              }
              
              if (data.head_to_head && data.head_to_head.total > 0) {
                setHeadToHead({ myWins: data.head_to_head.my_wins || 0, theirWins: data.head_to_head.their_wins || 0, total: data.head_to_head.total || 0 });
              }
              
              setLoading(false);
              return; // RPC success - skip fallback
            }
          }
        } catch (rpcError) {
          // console.log('RPC not available, using fallback:', rpcError.message);
        }
      }
      
      // FALLBACK: Original sequential loading (if RPC not available)
      const { data: fullProfileData } = await dbSelect('profiles', {
        select: 'id,username,display_name,avatar_url,rating,games_won,games_played,created_at,puzzles_easy_solved,puzzles_easy_attempted,puzzles_medium_solved,puzzles_medium_attempted,puzzles_hard_solved,puzzles_hard_attempted,speed_best_streak,speed_total_puzzles,ai_easy_wins,ai_easy_losses,ai_medium_wins,ai_medium_losses,ai_hard_wins,ai_hard_losses,local_games_played',
        eq: { id: playerId },
        single: true
      });
      
      // Use fetched data, fall back to passed playerData for display only
      const profileData = fullProfileData || playerData;
      
      if (profileData) {
        setProfile(profileData);
        // v7.26: Use fullProfileData for stats (has all fields)
        const statsSource = fullProfileData || {};
        setPlayerStats({
          puzzles_easy_solved: statsSource.puzzles_easy_solved || 0,
          puzzles_medium_solved: statsSource.puzzles_medium_solved || 0,
          puzzles_hard_solved: statsSource.puzzles_hard_solved || 0,
          ai_easy_wins: statsSource.ai_easy_wins || 0,
          ai_medium_wins: statsSource.ai_medium_wins || 0,
          ai_hard_wins: statsSource.ai_hard_wins || 0,
          ai_easy_losses: statsSource.ai_easy_losses || 0,
          ai_medium_losses: statsSource.ai_medium_losses || 0,
          ai_hard_losses: statsSource.ai_hard_losses || 0,
          speed_best_streak: statsSource.speed_best_streak || 0,
          local_games_played: statsSource.local_games_played || 0
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
        // console.log('Recent games not available:', e);
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
        // console.log('Achievement stats not available');
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
          // console.log('Friend status not available');
        }
      }
      
      // v7.26: Fetch additional stats using services (not direct table access)
      // Play streak - use streakService
      try {
        const streakResult = await streakService.getStreak(playerId);
        if (streakResult?.data) {
          setPlayStreak({
            current: streakResult.data.current_streak || 0,
            longest: streakResult.data.longest_streak || 0
          });
        }
      } catch (e) {
        // console.log('Play streak not available:', e);
      }
      
      // Weekly challenge stats - use weeklyChallengeService
      try {
        const weeklyResult = await weeklyChallengeService.getUserPodiumBreakdown?.(playerId);
        if (weeklyResult?.data) {
          setWeeklyStats({
            first: weeklyResult.data.first || 0,
            second: weeklyResult.data.second || 0,
            third: weeklyResult.data.third || 0,
            total: (weeklyResult.data.first || 0) + (weeklyResult.data.second || 0) + (weeklyResult.data.third || 0)
          });
        }
      } catch (e) {
        // console.log('Weekly stats not available:', e);
      }
      
      // Creator puzzle completions
      const creatorHeaders = getAuthHeaders();
      if (creatorHeaders) {
        try {
          const creatorRes = await fetch(
            `${SUPABASE_URL}/rest/v1/creator_puzzle_completions?user_id=eq.${playerId}&select=puzzle_number`,
            { headers: creatorHeaders }
          );
          if (creatorRes.ok) {
            const creatorData = await creatorRes.json();
            setCreatorStats({
              totalCompleted: creatorData?.length || 0,
              totalPuzzles: 100
            });
          }
        } catch (e) {
          // console.log('Creator puzzle stats not available');
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
      {/* Backdrop - completely separate, no touch interference */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        style={{ zIndex: 50 }}
        onClick={onClose}
      />
      
      {/* Modal - fixed positioning with explicit dimensions */}
      <div 
        className="fixed bg-slate-900 rounded-xl border shadow-2xl"
        style={{ 
          zIndex: 51,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'calc(100% - 32px)',
          maxWidth: '448px',
          maxHeight: 'calc(100vh - 32px)',
          maxHeight: 'calc(100dvh - 32px)',
          borderColor: hexToRgba(glowColor, 0.3),
          boxShadow: `0 0 50px ${hexToRgba(glowColor, 0.2)}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed at top */}
        <div 
          className="p-4 border-b flex items-center justify-between"
          style={{ 
            borderColor: hexToRgba(glowColor, 0.2),
            flexShrink: 0,
          }}
            >
              <h2 className="text-lg font-bold text-white">Player Profile</h2>
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Scrollable Content Area - v7.32: Added Tailwind classes for cross-device scroll */}
            <div 
              ref={scrollRef}
              className="p-4 flex-1 min-h-0 overflow-y-scroll"
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

                {/* v7.21: Full Stats Section - Enhanced with dropdowns */}
                {/* v7.29: Collapsible Stats Sections - Matching PlayerStatsModal */}
                {playerStats && (
                  <div className="mb-4">
                    {/* Overview Section */}
                    <Section 
                      id="overview" 
                      title="Overview" 
                      icon={TrendingUp} 
                      color="cyan"
                      expanded={expandedSection === 'overview'}
                      onToggle={handleSectionToggle}
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <StatCard 
                          icon={Trophy} 
                          label="Online Wins" 
                          value={displayWins}
                          subValue={`${winRate}% win rate`}
                          color="amber"
                        />
                        <StatCard 
                          icon={Target} 
                          label="Puzzles Solved" 
                          value={totalPuzzlesSolved + creatorStats.totalCompleted}
                          subValue="generated + creator"
                          color="green"
                        />
                        <StatCard 
                          icon={Bot} 
                          label="AI Wins" 
                          value={totalAiWins}
                          subValue={`of ${totalAiGames} games`}
                          color="purple"
                        />
                        <StatCard 
                          icon={Zap} 
                          label="Speed Best" 
                          value={playerStats.speed_best_streak || 0}
                          subValue="puzzles in a row"
                          color="orange"
                        />
                      </div>
                    </Section>
                    
                    {/* AI Battles Section */}
                    {totalAiGames > 0 && (
                      <Section 
                        id="ai_battles" 
                        title="AI Battles" 
                        icon={Bot} 
                        color="purple"
                        expanded={expandedSection === 'ai_battles'}
                        onToggle={handleSectionToggle}
                      >
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <StatCard 
                            icon={Trophy} 
                            label="Total Wins" 
                            value={totalAiWins}
                            subValue={`of ${totalAiGames} games`}
                            color="purple"
                          />
                          <StatCard 
                            icon={Target} 
                            label="Win Rate" 
                            value={totalAiGames > 0 ? Math.round((totalAiWins / totalAiGames) * 100) : 0}
                            subValue="%"
                            color="cyan"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                            <div className="text-green-400 text-sm font-bold">{playerStats.ai_easy_wins || 0}</div>
                            <div className="text-[10px] text-slate-500">Beginner</div>
                            <div className="text-[9px] text-slate-600">{(playerStats.ai_easy_wins || 0) + (playerStats.ai_easy_losses || 0)} games</div>
                          </div>
                          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                            <div className="text-amber-400 text-sm font-bold">{playerStats.ai_medium_wins || 0}</div>
                            <div className="text-[10px] text-slate-500">Intermediate</div>
                            <div className="text-[9px] text-slate-600">{(playerStats.ai_medium_wins || 0) + (playerStats.ai_medium_losses || 0)} games</div>
                          </div>
                          <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
                            <div className="text-purple-400 text-sm font-bold">{playerStats.ai_hard_wins || 0}</div>
                            <div className="text-[10px] text-slate-500">Expert</div>
                            <div className="text-[9px] text-slate-600">{(playerStats.ai_hard_wins || 0) + (playerStats.ai_hard_losses || 0)} games</div>
                          </div>
                        </div>
                      </Section>
                    )}
                    
                    {/* Generated Puzzles Section */}
                    {totalPuzzlesSolved > 0 && (
                      <Section 
                        id="gen_puzzles" 
                        title="Generated Puzzles" 
                        icon={Zap} 
                        color="green"
                        expanded={expandedSection === 'gen_puzzles'}
                        onToggle={handleSectionToggle}
                      >
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <StatCard 
                            icon={Target} 
                            label="Total Solved" 
                            value={totalPuzzlesSolved}
                            color="green"
                          />
                          <StatCard 
                            icon={Zap} 
                            label="Speed Best" 
                            value={playerStats.speed_best_streak || 0}
                            subValue="in a row"
                            color="orange"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                            <div className="text-green-400 text-sm font-bold">{playerStats.puzzles_easy_solved || 0}</div>
                            <div className="text-[10px] text-slate-500">Beginner</div>
                          </div>
                          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                            <div className="text-amber-400 text-sm font-bold">{playerStats.puzzles_medium_solved || 0}</div>
                            <div className="text-[10px] text-slate-500">Intermediate</div>
                          </div>
                          <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
                            <div className="text-purple-400 text-sm font-bold">{playerStats.puzzles_hard_solved || 0}</div>
                            <div className="text-[10px] text-slate-500">Expert</div>
                          </div>
                        </div>
                      </Section>
                    )}
                    
                    {/* Play Streak Section */}
                    {(playStreak.current > 0 || playStreak.longest > 0) && (
                      <Section 
                        id="streak" 
                        title="Play Streak" 
                        icon={Flame} 
                        color="orange"
                        expanded={expandedSection === 'streak'}
                        onToggle={handleSectionToggle}
                      >
                        <div className="grid grid-cols-2 gap-2">
                          <StatCard 
                            icon={Flame} 
                            label="Current Streak" 
                            value={playStreak.current}
                            subValue="days"
                            color={playStreak.current >= 7 ? 'orange' : playStreak.current >= 3 ? 'red' : 'cyan'}
                          />
                          <StatCard 
                            icon={Award} 
                            label="Longest Streak" 
                            value={playStreak.longest}
                            subValue="days"
                            color="amber"
                          />
                        </div>
                      </Section>
                    )}
                    
                    {/* Weekly Challenge Section */}
                    {weeklyStats.total > 0 && (
                      <Section 
                        id="weekly" 
                        title="Weekly Challenge" 
                        icon={Clock} 
                        color="purple"
                        expanded={expandedSection === 'weekly'}
                        onToggle={handleSectionToggle}
                      >
                        <div className="grid grid-cols-3 gap-2">
                          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                            <div className="text-amber-400 text-lg font-bold">{weeklyStats.first || 0}</div>
                            <div className="text-xs text-slate-500 flex items-center justify-center gap-1">
                              <Medal size={10} className="text-amber-400" /> 1st
                            </div>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-400/10 border border-slate-400/20 text-center">
                            <div className="text-slate-300 text-lg font-bold">{weeklyStats.second || 0}</div>
                            <div className="text-xs text-slate-500 flex items-center justify-center gap-1">
                              <Medal size={10} className="text-slate-300" /> 2nd
                            </div>
                          </div>
                          <div className="p-2 rounded-lg bg-amber-600/10 border border-amber-600/20 text-center">
                            <div className="text-amber-600 text-lg font-bold">{weeklyStats.third || 0}</div>
                            <div className="text-xs text-slate-500 flex items-center justify-center gap-1">
                              <Medal size={10} className="text-amber-600" /> 3rd
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 text-center text-xs text-slate-400">
                          {weeklyStats.total} podium finish{weeklyStats.total !== 1 ? 'es' : ''} total
                        </div>
                      </Section>
                    )}
                    
                    {/* Creator Puzzles Section */}
                    {creatorStats.totalCompleted > 0 && (
                      <Section 
                        id="creator" 
                        title="Creator Puzzles" 
                        icon={Sparkles} 
                        color="cyan"
                        expanded={expandedSection === 'creator'}
                        onToggle={handleSectionToggle}
                      >
                        <div className="mb-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-slate-400">Overall Progress</span>
                            <span className="text-xs text-cyan-400 font-bold">
                              {creatorStats.totalCompleted}/{creatorStats.totalPuzzles}
                            </span>
                          </div>
                          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                              style={{ width: `${(creatorStats.totalCompleted / creatorStats.totalPuzzles) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-center text-xs text-slate-400">
                          {Math.round((creatorStats.totalCompleted / creatorStats.totalPuzzles) * 100)}% complete
                        </div>
                      </Section>
                    )}
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
                                  onViewGame?.(game);
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
    </>
  );
};

export default ViewPlayerProfile;
