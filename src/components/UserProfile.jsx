// User Profile Screen - Enhanced with ELO changes in match history and proper Final Board View
// FIXES:
// 1. Shows +/- ELO changes in match history boxes (with fallback calculation)
// 2. Fetches game moves for Final Board View
// 3. Uses username priority (same as PlayerProfileCard)
// 4. Tier-colored styling throughout
// 5. Clickable opponents in match history
// 6. v7.7: Fixed title centering in header
// 7. v7.7: ELO change fallback calculation when rating_history missing
import { useState, useEffect } from 'react';
import { ArrowLeft, Edit2, Save, X, Trophy, Target, Percent, Calendar, User, TrendingUp, TrendingDown, Swords, Award, Gamepad2, Zap, LayoutGrid, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { gameSyncService } from '../services/gameSync';
import { ratingService } from '../services/ratingService';
import { getRankInfo } from '../utils/rankUtils';
import NeonTitle from './NeonTitle';
import TierIcon from './TierIcon';
import ViewPlayerProfile from './ViewPlayerProfile';
import FinalBoardView from './FinalBoardView';
import { soundManager } from '../utils/soundManager';

// Direct fetch helper for game moves
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const fetchGameMoves = async (gameId) => {
  const token = localStorage.getItem('supabase_access_token');
  if (!token || !SUPABASE_URL) return [];
  
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/game_moves?game_id=eq.${gameId}&order=move_number.asc`,
      {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
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
  if (!hex || !hex.startsWith('#')) return `rgba(34, 211, 238, ${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Get contrasting background for tier
const getTierBackground = (glowColor) => {
  const backgrounds = {
    '#f59e0b': 'rgba(30, 20, 60, 0.95)',   // Grandmaster
    '#a855f7': 'rgba(20, 40, 40, 0.95)',   // Master
    '#3b82f6': 'rgba(40, 25, 20, 0.95)',   // Expert
    '#22d3ee': 'rgba(40, 20, 40, 0.95)',   // Advanced
    '#22c55e': 'rgba(40, 20, 35, 0.95)',   // Intermediate
    '#38bdf8': 'rgba(35, 25, 45, 0.95)',   // Beginner
    '#2dd4bf': 'rgba(40, 25, 50, 0.95)',   // Novice
  };
  return backgrounds[glowColor] || 'rgba(15, 23, 42, 0.95)';
};

const UserProfile = ({ onBack }) => {
  const { profile, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.username || profile?.display_name || '');
  const [saving, setSaving] = useState(false);
  const [recentGames, setRecentGames] = useState([]);
  const [ratingHistory, setRatingHistory] = useState([]); // ELO changes per game
  const [stats, setStats] = useState({
    totalGames: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    currentStreak: 0,
    bestStreak: 0
  });
  
  // State for viewing opponent profile
  const [viewingOpponent, setViewingOpponent] = useState(null);
  
  // State for Final Board View
  const [selectedGameForFinalView, setSelectedGameForFinalView] = useState(null);
  const [loadingMoves, setLoadingMoves] = useState(false);
  const [gameMoves, setGameMoves] = useState([]);

  // Get tier info for theming
  const rankInfo = profile ? getRankInfo(profile.rating || 1000) : null;
  const glowColor = rankInfo?.glowColor || '#22d3ee';

  useEffect(() => {
    if (profile) {
      // FIX: Use username priority
      setDisplayName(profile.username || profile.display_name || 'Player');
      loadStats();
      loadRatingHistory();
    }
  }, [profile]);

  const loadStats = async () => {
    if (!profile?.id) return;

    try {
      const { data: games } = await gameSyncService.getPlayerGames(profile.id, 50);
      
      if (games) {
        const completed = games.filter(g => g.status === 'completed');
        const wins = completed.filter(g => g.winner_id === profile.id).length;
        const losses = completed.length - wins;
        
        // Calculate streak
        let currentStreak = 0;
        let bestStreak = 0;
        let streak = 0;
        
        for (const game of completed) {
          if (game.winner_id === profile.id) {
            streak++;
            bestStreak = Math.max(bestStreak, streak);
          } else {
            if (currentStreak === 0 && streak > 0) {
              currentStreak = streak;
            }
            streak = 0;
          }
        }
        if (streak > 0) currentStreak = streak;

        setStats({
          totalGames: completed.length,
          wins,
          losses,
          winRate: completed.length > 0 ? Math.round((wins / completed.length) * 100) : 0,
          currentStreak,
          bestStreak
        });

        setRecentGames(completed.slice(0, 10));
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  // Load rating history for ELO changes
  const loadRatingHistory = async () => {
    if (!profile?.id) return;
    
    try {
      const { data } = await ratingService.getRatingHistory(profile.id, 50);
      if (data) {
        console.log('[UserProfile] Loaded rating history:', data.length, 'entries');
        setRatingHistory(data);
      }
    } catch (err) {
      console.error('Error loading rating history:', err);
    }
  };

  // Get ELO change for a specific game
  // Falls back to calculated estimate if no history entry exists
  const getEloChangeForGame = (gameId, game) => {
    // First try to find from rating history
    const historyEntry = ratingHistory.find(h => h.game_id === gameId);
    if (historyEntry) {
      return historyEntry.change;
    }
    
    // Fallback: Calculate estimated change based on ratings using ELO formula
    if (game && profile) {
      const won = game.winner_id === profile.id;
      const playerRating = profile.rating || profile.elo_rating || 1000;
      
      // Get opponent rating from game data
      let opponentRating = 1000;
      if (game.player1_id === profile.id) {
        opponentRating = game.player2?.elo_rating || game.player2?.rating || 1000;
      } else {
        opponentRating = game.player1?.elo_rating || game.player1?.rating || 1000;
      }
      
      // ELO calculation: K-factor of 32
      const kFactor = 32;
      const expected = 1.0 / (1.0 + Math.pow(10, (opponentRating - playerRating) / 400));
      const result = won ? 1 : 0;
      const estimatedChange = Math.round(kFactor * (result - expected));
      
      return estimatedChange;
    }
    
    return null;
  };

  const handleSave = async () => {
    setSaving(true);
    soundManager.playButtonClick();
    
    const { error } = await updateProfile({ 
      username: displayName.toLowerCase(),
      display_name: displayName 
    });
    
    if (!error) {
      setEditing(false);
    }
    
    setSaving(false);
  };

  const handleBack = () => {
    soundManager.playButtonClick();
    onBack();
  };

  // FIX: Get opponent info with username priority
  const getOpponentInfo = (game) => {
    if (game.player1_id === profile?.id) {
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

  // Handle clicking on opponent
  const handleViewOpponent = (opponent) => {
    soundManager.playButtonClick();
    setViewingOpponent(opponent);
  };

  // Handle opening Final Board View - fetch moves first
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

  // FIX: Display name uses username priority
  const playerDisplayName = profile?.username || profile?.display_name || 'Player';

  return (
    <div 
      className="scroll-page bg-slate-950"
    >
      <style>{`
        .scroll-page {
          /* v7.8: Don't use position:fixed - breaks iOS scroll */
          min-height: 100vh;
          min-height: 100dvh;
          width: 100%;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          touch-action: pan-y pinch-zoom;
        }
        
        /* Allow scroll pass-through on interactive elements */
        button, [role="button"], input, textarea, select, a {
          touch-action: manipulation;
        }
      `}</style>
      <div className="p-4 pb-8 max-w-md mx-auto">
        {/* Header - Title centered with absolute positioning */}
        <div className="relative flex items-center justify-center mb-6">
          {/* Back button - absolute left */}
          <button
            onClick={handleBack}
            className="absolute left-0 flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm">Back</span>
          </button>
          
          {/* Centered Title */}
          <NeonTitle text="PROFILE" size="medium" />
        </div>

        {/* Profile Card - Tier themed */}
        <div 
          className="backdrop-blur-md rounded-2xl p-6 mb-6"
          style={{
            background: `linear-gradient(135deg, ${getTierBackground(glowColor)} 0%, rgba(15, 23, 42, 0.95) 100%)`,
            border: `1px solid ${hexToRgba(glowColor, 0.4)}`,
            boxShadow: `0 0 30px ${hexToRgba(glowColor, 0.15)}`
          }}
        >
          {/* Avatar & Tier */}
          <div className="flex items-center gap-4 mb-4">
            <div 
              className="w-16 h-16 rounded-xl flex items-center justify-center"
              style={{
                background: getTierBackground(glowColor),
                border: `2px solid ${hexToRgba(glowColor, 0.5)}`,
                boxShadow: `0 0 20px ${hexToRgba(glowColor, 0.3)}`
              }}
            >
              {rankInfo ? (
                <TierIcon shape={rankInfo.shape} glowColor={glowColor} size="large" />
              ) : (
                <User size={32} className="text-slate-400" />
              )}
            </div>
            
            <div className="flex-1">
              {editing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-slate-800/80 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-lg w-full"
                    autoFocus
                    maxLength={20}
                  />
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="p-2 bg-green-600 hover:bg-green-500 rounded-lg transition-colors"
                  >
                    <Save size={16} className="text-white" />
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setDisplayName(profile?.username || profile?.display_name || '');
                    }}
                    className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    <X size={16} className="text-white" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">{playerDisplayName}</h2>
                  <button
                    onClick={() => setEditing(true)}
                    className="p-1.5 text-slate-400 hover:text-white transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
              )}
              
              {/* Tier name and rating */}
              <div className="flex items-center gap-2 mt-1">
                <span 
                  className="text-sm font-medium"
                  style={{ color: glowColor }}
                >
                  {rankInfo?.name || 'Unranked'}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400 text-sm">{profile?.rating || 1000} ELO</span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div 
              className="rounded-lg p-4 text-center"
              style={{ 
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: `1px solid ${hexToRgba(glowColor, 0.2)}`
              }}
            >
              <Gamepad2 size={20} style={{ color: glowColor }} className="mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{stats.totalGames}</div>
              <div className="text-slate-500 text-xs">Games</div>
            </div>
            <div 
              className="rounded-lg p-4 text-center"
              style={{ 
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: `1px solid ${hexToRgba(glowColor, 0.2)}`
              }}
            >
              <Percent size={20} className="text-green-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{stats.winRate}%</div>
              <div className="text-slate-500 text-xs">Win Rate</div>
            </div>
            <div 
              className="rounded-lg p-4 text-center"
              style={{ 
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: `1px solid ${hexToRgba(glowColor, 0.2)}`
              }}
            >
              <Trophy size={20} className="text-amber-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{stats.wins}</div>
              <div className="text-slate-500 text-xs">Victories</div>
            </div>
          </div>
          
          {/* Streak info */}
          {(stats.currentStreak > 0 || stats.bestStreak > 0) && (
            <div className="flex justify-center gap-6 mt-4 pt-4" style={{ borderTop: `1px solid ${hexToRgba(glowColor, 0.2)}` }}>
              {stats.currentStreak > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔥</span>
                  <div>
                    <div className="text-white font-bold">{stats.currentStreak}</div>
                    <div className="text-slate-500 text-xs">Current Streak</div>
                  </div>
                </div>
              )}
              {stats.bestStreak > 0 && (
                <div className="flex items-center gap-2">
                  <Award size={20} className="text-amber-400" />
                  <div>
                    <div className="text-white font-bold">{stats.bestStreak}</div>
                    <div className="text-slate-500 text-xs">Best Streak</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Match History - Tier themed with clickable opponents and ELO changes */}
        <div 
          className="backdrop-blur-md rounded-2xl p-4"
          style={{
            background: `linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, ${hexToRgba(glowColor, 0.05)} 100%)`,
            border: `1px solid ${hexToRgba(glowColor, 0.3)}`,
            boxShadow: `0 0 20px ${hexToRgba(glowColor, 0.1)}`
          }}
        >
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: glowColor }}>
            <Calendar size={16} />
            MATCH HISTORY
          </h3>

          {recentGames.length === 0 ? (
            <p className="text-slate-600 text-center py-8">No games played yet</p>
          ) : (
            <div className="space-y-2">
              {recentGames.map(game => {
                const won = game.winner_id === profile?.id;
                const opponent = getOpponentInfo(game);
                const opponentRankInfo = getRankInfo(opponent.rating);
                const eloChange = getEloChangeForGame(game.id, game);
                
                return (
                  <div
                    key={game.id}
                    className={`w-full p-3 rounded-lg transition-all ${
                      won 
                        ? 'bg-green-900/20 border border-green-500/30' 
                        : 'bg-red-900/20 border border-red-500/30'
                    }`}
                  >
                    {/* Clickable opponent info row */}
                    <button
                      onClick={() => handleViewOpponent(opponent)}
                      className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${won ? 'bg-green-400' : 'bg-red-400'}`} />
                        
                        {/* Opponent avatar with tier icon */}
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{
                            background: getTierBackground(opponentRankInfo?.glowColor || '#64748b'),
                            border: `2px solid ${hexToRgba(opponentRankInfo?.glowColor || '#64748b', 0.5)}`
                          }}
                        >
                          {opponentRankInfo ? (
                            <TierIcon shape={opponentRankInfo.shape} glowColor={opponentRankInfo.glowColor} size="small" />
                          ) : (
                            <User size={14} className="text-slate-400" />
                          )}
                        </div>
                        
                        <div className="text-left">
                          <div className="text-slate-300 text-sm font-medium">vs {opponent.name}</div>
                          <div className="text-slate-600 text-xs flex items-center gap-2">
                            <span>{formatDate(game.created_at)}</span>
                            <span style={{ color: opponentRankInfo?.glowColor || '#64748b' }}>
                              {opponent.rating} ELO
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* ELO Change Display */}
                        {eloChange !== null && (
                          <div className={`flex items-center gap-1 text-sm font-bold ${
                            eloChange > 0 ? 'text-green-400' : eloChange < 0 ? 'text-red-400' : 'text-slate-400'
                          }`}>
                            {eloChange > 0 ? (
                              <TrendingUp size={14} />
                            ) : eloChange < 0 ? (
                              <TrendingDown size={14} />
                            ) : null}
                            <span>{eloChange > 0 ? '+' : ''}{eloChange}</span>
                          </div>
                        )}
                        
                        <span className={`text-sm font-bold ${won ? 'text-green-400' : 'text-red-400'}`}>
                          {won ? 'WIN' : 'LOSS'}
                        </span>
                        <div className="text-slate-600">›</div>
                      </div>
                    </button>
                    
                    {/* Final Board View button */}
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenFinalBoardView(game);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors text-xs"
                        title="View final board state"
                      >
                        <LayoutGrid size={14} />
                        Final Board
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Member since */}
        <p className="text-center text-slate-600 text-xs mt-6">
          Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
        </p>
      </div>
      
      {/* View Opponent Profile Modal */}
      {viewingOpponent && (
        <ViewPlayerProfile
          playerId={viewingOpponent.id}
          playerData={viewingOpponent.data}
          currentUserId={profile?.id}
          onClose={() => setViewingOpponent(null)}
        />
      )}
      
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
          winner={selectedGameForFinalView.winner_id === selectedGameForFinalView.player1_id ? 'player1' : 
                  selectedGameForFinalView.winner_id === selectedGameForFinalView.player2_id ? 'player2' : null}
          winnerId={selectedGameForFinalView.winner_id}
          player1={selectedGameForFinalView.player1}
          player2={selectedGameForFinalView.player2}
          player1Name={selectedGameForFinalView.player1?.username || selectedGameForFinalView.player1?.display_name || 'Player 1'}
          player2Name={selectedGameForFinalView.player2?.username || selectedGameForFinalView.player2?.display_name || 'Player 2'}
          player1Rating={selectedGameForFinalView.player1?.elo_rating || selectedGameForFinalView.player1_rating_before || 1200}
          player2Rating={selectedGameForFinalView.player2?.elo_rating || selectedGameForFinalView.player2_rating_before || 1200}
          viewerIsPlayer1={selectedGameForFinalView.player1_id === profile?.id}
          gameDate={selectedGameForFinalView.created_at}
        />
      )}
    </div>
  );
};

export default UserProfile;
